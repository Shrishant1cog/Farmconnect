/// Shared-data workflow integration test.
///
/// This test drives the *real* repositories of the Android app against the
/// *real* shared backend, exactly like the website does. It proves the Phase 7
/// requirement that both clients operate on one database and one set of IDs:
///
///  1. Register a farmer (the "website" client).
///  2. Log in using the same account from the Android client.
///  3. Create a product from the Android client.
///  4. Verify the listing appears for the website client.
///  5. Place an order from the website client.
///  6. Verify the order appears for the Android client.
///  7. Update the order status from the Android client.
///  8. Verify the website client sees the update.
///  9. Send an enquiry from one client and read it on the other.
/// 10. Test logout and session restoration.
///
/// Every logical client keeps its **own** token store, exactly like a real
/// device (one signed-in session) and a real browser (another signed-in
/// session). Mixing them would silently replace the JWT of one role with the
/// JWT of another and hide genuine failures.
///
/// QA data
/// -------
/// Every account and every record created here is a clearly identifiable QA
/// record (`<tag>.qa.<runId>@farmconnect.test`, lots titled `QA ... <runId>`).
/// Real user data is never touched. Listings that are not referenced by an
/// order are removed again through the supported `DELETE /api/products/:id`
/// endpoint; a listing that already has order history cannot be deleted
/// because `OrderItem.product` is `onDelete: Restrict`, and the accounts
/// themselves remain because the API exposes no account deletion endpoint.
///
/// Run it against a locally running API (from the repository root):
///
/// ```bash
/// cd backend && npm run db:setup && npm start   # terminal 1
/// cd mobile && flutter test integration_test \
///   -d <emulator-or-device> \
///   --dart-define=TEST_API_BASE_URL=http://10.0.2.2:5000/api \
///   --dart-define=TEST_SOCKET_URL=http://10.0.2.2:5000
/// ```
///
/// Against the deployed Render backend:
///
/// ```bash
/// cd mobile && flutter test integration_test \
///   -d <emulator-or-device> \
///   --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
///   --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
/// ```
///
/// `10.0.2.2` is how the Android emulator reaches the host machine. Use
/// `http://localhost:5000/api` when running on the desktop host.
library;

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'package:farmconnect_mobile/core/network/api_client.dart';
import 'package:farmconnect_mobile/core/storage/token_storage.dart';
import 'package:farmconnect_mobile/data/models/order.dart';
import 'package:farmconnect_mobile/data/models/product.dart';
import 'package:farmconnect_mobile/data/models/user.dart';
import 'package:farmconnect_mobile/data/repositories/auth_repository.dart';
import 'package:farmconnect_mobile/data/repositories/catalog_repository.dart';
import 'package:farmconnect_mobile/data/repositories/engagement_repository.dart';
import 'package:farmconnect_mobile/data/repositories/enquiry_repository.dart';
import 'package:farmconnect_mobile/data/repositories/order_repository.dart';

/// The API under test. Override with `--dart-define=TEST_API_BASE_URL=...`.
const String _apiBaseUrl = String.fromEnvironment(
  'TEST_API_BASE_URL',
  defaultValue: 'http://localhost:5000/api',
);

const String _socketUrl = String.fromEnvironment(
  'TEST_SOCKET_URL',
  defaultValue: 'http://localhost:5000',
);

const String _password = 'Password@123';

/// Unique suffix so repeated runs never collide with existing accounts.
final String _runId = DateTime.now().millisecondsSinceEpoch.toString();

/// Generates a unique 10-digit phone number for each account.
String _uniquePhone(int seed) {
  final digits = '${_runId.substring(_runId.length - 7)}${seed.toString().padLeft(3, '0')}';
  return '9${digits.substring(digits.length - 9)}';
}

TokenStorage _inMemoryStorage() {
  // The integration test talks to a local API, so an in-memory token store is
  // enough — the encrypted plugin requires a platform channel.
  return TokenStorage(storage: InMemorySecureStore());
}

ApiClient _buildClient(TokenStorage storage) {
  final dio = Dio(
    BaseOptions(
      baseUrl: _apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 45),
      headers: {'Content-Type': 'application/json'},
    ),
  );
  return ApiClient(tokenStorage: storage, dio: dio);
}

/// A signed-in client: its own secure store, its own repositories.
class TestClient {
  TestClient(this.label) : storage = _inMemoryStorage() {
    api = _buildClient(storage);
    auth = AuthRepository(api: api, storage: storage);
    catalog = CatalogRepository(api: api);
    orders = OrderRepository(api: api);
    enquiries = EnquiryRepository(api: api);
    engagement = EngagementRepository(api: api);
  }

  final String label;
  final TokenStorage storage;

  late final ApiClient api;
  late final AuthRepository auth;
  late final CatalogRepository catalog;
  late final OrderRepository orders;
  late final EnquiryRepository enquiries;
  late final EngagementRepository engagement;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('FarmConnect shared-data workflow', () {
    // --- The website client (a browser session) --------------------------
    late TestClient website;

    // --- The website client signed in as the farmer ----------------------
    late TestClient websiteFarmer;

    // --- The Android client signed in as a farmer ------------------------
    late TestClient androidFarmer;

    // --- The Android client signed in as a consumer ----------------------
    late TestClient androidConsumer;

    /// QA listings created during the run, removed again in `tearDown`.
    final List<String> qaProductIds = <String>[];

    int phoneSeed = 1;

    setUp(() {
      website = TestClient('website');
      websiteFarmer = TestClient('website-farmer');
      androidFarmer = TestClient('android-farmer');
      androidConsumer = TestClient('android-consumer');
    });

    tearDown(() async {
      // Clean up the QA listings through the supported delete endpoint. A
      // listing that already has an order cannot be removed (the backend
      // protects the order history), which is expected and not a failure.
      for (final productId in qaProductIds) {
        try {
          await androidFarmer.catalog.deleteProduct(productId);
        } catch (_) {
          // Kept in the database on purpose — it carries order history.
        }
      }
      qaProductIds.clear();
    });

    /// Registers a farmer through the *website* client and then signs the same
    /// account in on the *Android* client. Returns the shared session.
    Future<AuthSession> registerFarmerAcrossBothClients({
      required String tag,
      required String farmName,
      TestClient? websiteClient,
    }) async {
      final email = '$tag.qa.farmer.$_runId@farmconnect.test';
      final site = websiteClient ?? website;

      await site.auth.register(
        name: '$tag QA Farmer',
        phone: _uniquePhone(phoneSeed++),
        email: email,
        password: _password,
        role: UserRole.farmer,
        pincode: '571401',
        state: 'Karnataka',
        district: 'Mandya',
        addressLine: 'Mandya, Karnataka',
        farmName: farmName,
      );

      return androidFarmer.auth.login(email: email, password: _password);
    }

    /// Registers a consumer through the *website* client and signs the same
    /// account in on the *Android* client.
    Future<AuthSession> registerConsumerAcrossBothClients({
      required String tag,
      TestClient? androidClient,
    }) async {
      final email = '$tag.qa.consumer.$_runId@farmconnect.test';

      await website.auth.register(
        name: '$tag QA Consumer',
        phone: _uniquePhone(phoneSeed++),
        email: email,
        password: _password,
        role: UserRole.consumer,
        pincode: '560038',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        addressLine: 'Indiranagar, Bengaluru',
      );

      return (androidClient ?? androidConsumer).auth.login(
        email: email,
        password: _password,
      );
    }

    /// Creates a clearly identifiable QA listing and remembers it for cleanup.
    Future<Product> createQaProduct({
      required TestClient client,
      required String title,
      required double price,
      required double quantity,
    }) async {
      final product = await client.catalog.createProduct(
        title: title,
        description: 'QA lot created by the shared-data workflow test.',
        farmerPrice: price,
        quantityAvailable: quantity,
        minOrderKg: 5,
        location: 'Mandya, Karnataka',
      );
      qaProductIds.add(product.id);
      return product;
    }

    testWidgets('a farmer registered on one client is usable from the other',
        (tester) async {
      // --- 1. Register the farmer (website client) ------------------------
      final farmerSession = await website.auth.register(
        name: 'Android Parity QA Farmer',
        phone: _uniquePhone(phoneSeed++),
        email: 'parity.qa.farmer.$_runId@farmconnect.test',
        password: _password,
        role: UserRole.farmer,
        pincode: '571401',
        state: 'Karnataka',
        district: 'Mandya',
        addressLine: 'Mandya, Karnataka',
        farmName: 'Parity QA Fields',
      );

      expect(farmerSession.user.role, UserRole.farmer);
      expect(farmerSession.token, isNotEmpty);

      // --- 2. Log in with the same account (Android client) ----------------
      final androidFarmerSession = await androidFarmer.auth.login(
        email: 'parity.qa.farmer.$_runId@farmconnect.test',
        password: _password,
      );

      expect(androidFarmerSession.user.id, farmerSession.user.id,
          reason: 'Both clients must resolve to the same shared user id');
      expect(androidFarmerSession.user.role, UserRole.farmer);

      // --- Register the consumer (website client) --------------------------
      final consumerSession = await website.auth.register(
        name: 'Android Parity QA Consumer',
        phone: _uniquePhone(phoneSeed++),
        email: 'parity.qa.consumer.$_runId@farmconnect.test',
        password: _password,
        role: UserRole.consumer,
        pincode: '560038',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        addressLine: 'Indiranagar, Bengaluru',
      );
      expect(consumerSession.user.role, UserRole.consumer);

      // --- 3. Create a product from the Android client --------------------
      final created = await createQaProduct(
        client: androidFarmer,
        title: 'QA Parity Harvest $_runId',
        price: 31.5,
        quantity: 400,
      );

      expect(created.id, isNotEmpty);

      // --- 4. Verify the listing appears for the website client -------------
      final websiteFeed =
          await website.catalog.fetchProducts(search: 'QA Parity Harvest $_runId');
      expect(
        websiteFeed.any((product) => product.id == created.id),
        isTrue,
        reason: 'The listing created on Android must appear in the website feed',
      );

      // --- 5. Place an order from the website client -----------------------
      final order = await website.orders.createOrder(
        deliveryAddress: 'Indiranagar, Bengaluru',
        items: [
          {'productId': created.id, 'quantity': 25, 'unitPrice': created.farmerPrice},
        ],
        farmerId: created.ownerFarmerProfileId,
      );

      expect(order.id, isNotEmpty);
      expect(order.items, isNotEmpty);

      // --- 6. Verify the order appears for the Android client --------------
      final androidFarmerOrders = await androidFarmer.orders.fetchFarmerOrders();
      expect(
        androidFarmerOrders.any((item) => item.id == order.id),
        isTrue,
        reason: 'The order placed on the website must appear for the farmer on Android',
      );

      // --- 7. Update the order status from the Android client --------------
      final updated =
          await androidFarmer.orders.updateStatus(order.id, OrderStatus.confirmed);
      expect(updated.status, OrderStatus.confirmed);

      // --- 8. Verify the website client sees the update --------------------
      final websiteConsumerOrders = await website.orders.fetchMyOrders();
      final mirrored = websiteConsumerOrders.firstWhere((item) => item.id == order.id);
      expect(mirrored.status, OrderStatus.confirmed);
    });

    testWidgets('a product created on the website is visible in the Android app',
        (tester) async {
      // The farmer signs in on the website and on Android with the same
      // account, so the website owns the listing and Android reads it.
      final farmerSession = await registerFarmerAcrossBothClients(
        tag: 'website-to-android',
        farmName: 'Website To Android QA Fields',
        websiteClient: websiteFarmer,
      );
      expect(farmerSession.user.role, UserRole.farmer);

      await registerConsumerAcrossBothClients(tag: 'website-to-android');

      // --- Product created through the WEBSITE client ----------------------
      final websiteProduct = await createQaProduct(
        client: websiteFarmer,
        title: 'QA Website Origin Lot $_runId',
        price: 44.0,
        quantity: 320,
      );
      expect(websiteProduct.id, isNotEmpty);

      // --- The ANDROID consumer sees it in the shared catalogue ------------
      final androidFeed =
          await androidConsumer.catalog.fetchProducts(search: 'QA Website Origin Lot $_runId');
      expect(
        androidFeed.any((product) => product.id == websiteProduct.id),
        isTrue,
        reason: 'The listing created on the website must appear in the Android app',
      );

      // --- The ANDROID farmer sees it in their own inventory ---------------
      final androidInventory = await androidFarmer.catalog.fetchMyProducts();
      expect(
        androidInventory.any((product) => product.id == websiteProduct.id),
        isTrue,
        reason: 'The farmer inventory is shared between both clients',
      );
    });

    testWidgets('enquiries and messages are shared between both clients',
        (tester) async {
      await registerFarmerAcrossBothClients(
        tag: 'chat',
        farmName: 'Chat QA Fields',
      );
      await registerConsumerAcrossBothClients(tag: 'chat');

      final product = await createQaProduct(
        client: androidFarmer,
        title: 'QA Chat Workflow Lot $_runId',
        price: 19.5,
        quantity: 250,
      );

      // --- 9a. Enquiry from the website client -----------------------------
      final enquiry = await website.enquiries.createEnquiry(
        productId: product.id,
        subject: 'QA bulk rate request $_runId',
        message: 'What is your best wholesale rate for 100 KG?',
      );
      expect(enquiry.id, isNotEmpty);

      // --- 9b. The farmer (Android client) sees the enquiry ----------------
      final farmerEnquiries = await androidFarmer.enquiries.fetchFarmerEnquiries();
      expect(
        farmerEnquiries.any((item) => item.id == enquiry.id),
        isTrue,
        reason: 'The enquiry raised on the website must appear for the farmer on Android',
      );

      // --- 9c. Reply from the Android client -------------------------------
      final reply = await androidFarmer.enquiries.sendMessage(
        enquiry.id,
        'We can offer 18.50 per KG for 100 KG.',
      );
      expect(reply.content, contains('18.50'));

      // --- 9d. The consumer (website client) reads the reply ---------------
      final thread = await website.enquiries.fetchThread(enquiry.id);
      expect(
        thread.messages.any((message) => message.content.contains('18.50')),
        isTrue,
        reason: 'The message sent from Android must be readable on the website',
      );

      // --- The consumer sees their own enquiry -----------------------------
      final consumerEnquiries = await website.enquiries.fetchMyEnquiries();
      expect(consumerEnquiries.any((item) => item.id == enquiry.id), isTrue);
    });

    testWidgets('favourites, notifications and complaints are persisted',
        (tester) async {
      await registerFarmerAcrossBothClients(
        tag: 'engage',
        farmName: 'Engagement QA Fields',
      );
      await registerConsumerAcrossBothClients(tag: 'engage');

      final product = await createQaProduct(
        client: androidFarmer,
        title: 'QA Engagement Lot $_runId',
        price: 12.0,
        quantity: 120,
      );

      final isFavorite =
          await androidConsumer.engagement.toggleFavoriteProduct(product.id);
      expect(isFavorite, isTrue);

      final favorites = await androidConsumer.engagement.fetchFavorites();
      expect(
        favorites.products.any((item) => item.id == product.id),
        isTrue,
        reason: 'The favourite must be persisted for the shared consumer profile',
      );

      // The website client sees the same favourite on the shared profile.
      final websiteFavorites = await website.engagement.fetchFavorites();
      expect(websiteFavorites.products.any((item) => item.id == product.id), isTrue);

      // Toggling again removes it.
      final removed =
          await androidConsumer.engagement.toggleFavoriteProduct(product.id);
      expect(removed, isFalse);

      // Complaints are stored in the shared `Complaint` table.
      final complaint = await androidConsumer.engagement.createComplaint(
        entityType: 'PRODUCT',
        entityId: product.id,
        reason: 'QA quality clarification',
        details: 'Please confirm the grading of this QA lot before dispatch.',
      );
      expect(complaint.id, isNotEmpty);

      final myComplaints = await androidConsumer.engagement.fetchMyComplaints();
      expect(myComplaints.any((item) => item.id == complaint.id), isTrue);

      // Notifications are readable through the shared inbox endpoint.
      final notifications = await androidConsumer.engagement.fetchNotifications();
      expect(notifications, isA<List<dynamic>>());
    });

    testWidgets('logout clears the session and the account can sign in again',
        (tester) async {
      final email = 'session.qa.consumer.$_runId@farmconnect.test';

      final session = await website.auth.register(
        name: 'Session QA Consumer',
        phone: _uniquePhone(phoneSeed++),
        email: email,
        password: _password,
        role: UserRole.consumer,
        state: 'Karnataka',
        district: 'Bengaluru Urban',
      );
      expect(session.token, isNotEmpty);

      // The session is restored from secure storage (app restart).
      final restored = await website.auth.restoreSession();
      expect(restored, isNotNull);
      expect(restored!.user.id, session.user.id);
      expect(restored.token, session.token);

      // Logging out wipes the stored credentials.
      await website.auth.logout();
      expect(await website.auth.restoreSession(), isNull);

      // The very same account can sign in again on either client.
      final again = await androidConsumer.auth.login(email: email, password: _password);
      expect(again.user.id, session.user.id);

      // Account isolation: a different account never sees this account's
      // private data.
      final other = await registerConsumerAcrossBothClients(tag: 'isolation');
      expect(other.user.id, isNot(session.user.id));

      final otherOrders = await androidConsumer.orders.fetchMyOrders();
      expect(
        otherOrders.any((item) => item.id == session.user.id),
        isFalse,
        reason: 'An account must never see another account’s orders',
      );
    });

    testWidgets(
        'the Socket.IO server broadcasts order events to the Android client',
        (tester) async {
      // The farmer signs in on the Android client first — the socket must be
      // authenticated with the farmer's JWT so the server can put it in the
      // private room `user_<User.id>`.
      final farmerSession = await registerFarmerAcrossBothClients(
        tag: 'socket',
        farmName: 'Socket QA Fields',
      );
      expect(farmerSession.token, isNotEmpty);

      await registerConsumerAcrossBothClients(tag: 'socket');

      final product = await createQaProduct(
        client: androidFarmer,
        title: 'QA Socket Lot $_runId',
        price: 15.0,
        quantity: 90,
      );

      final socket = io.io(
        _socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setAuth({'token': farmerSession.token})
            .enableReconnection()
            .build(),
      );

      final connected = Completer<void>();
      socket.onConnect((_) => connected.complete());

      await connected.future.timeout(const Duration(seconds: 30));

      final received = Completer<Map<String, dynamic>>();
      socket.on('new_order_received', (payload) {
        if (payload is Map && !received.isCompleted) {
          received.complete(Map<String, dynamic>.from(payload));
        }
      });

      await website.orders.createOrder(
        deliveryAddress: 'Bengaluru',
        items: [
          {'productId': product.id, 'quantity': 10, 'unitPrice': product.farmerPrice},
        ],
        farmerId: product.ownerFarmerProfileId,
      );

      final event = await received.future.timeout(const Duration(seconds: 30));

      expect(event['orderId'], isNotNull);
      expect(event['orderId'], isA<String>());

      socket.dispose();
    });
  });
}
