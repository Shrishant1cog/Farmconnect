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
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
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

    // --- The Android client signed in as a farmer ------------------------
    late TestClient androidFarmer;

    // --- The Android client signed in as a consumer ----------------------
    late TestClient androidConsumer;

    int phoneSeed = 1;

    setUp(() {
      website = TestClient('website');
      androidFarmer = TestClient('android-farmer');
      androidConsumer = TestClient('android-consumer');
    });

    /// Registers a farmer through the *website* client and then signs the same
    /// account in on the *Android* client. Returns the shared session.
    Future<AuthSession> registerFarmerAcrossBothClients({
      required String tag,
      required String farmName,
    }) async {
      final email = '$tag.farmer.$_runId@farmconnect.test';

      await website.auth.register(
        name: '$tag Farmer',
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
      final email = '$tag.consumer.$_runId@farmconnect.test';

      await website.auth.register(
        name: '$tag Consumer',
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

    testWidgets('a farmer registered on one client is usable from the other',
        (tester) async {
      // --- 1. Register the farmer (website client) ------------------------
      final farmerSession = await website.auth.register(
        name: 'Android Parity Farmer',
        phone: _uniquePhone(phoneSeed++),
        email: 'parity.farmer.$_runId@farmconnect.test',
        password: _password,
        role: UserRole.farmer,
        pincode: '571401',
        state: 'Karnataka',
        district: 'Mandya',
        addressLine: 'Mandya, Karnataka',
        farmName: 'Parity Test Fields',
      );

      expect(farmerSession.user.role, UserRole.farmer);
      expect(farmerSession.token, isNotEmpty);

      // --- 2. Log in with the same account (Android client) ----------------
      final androidFarmerSession = await androidFarmer.auth.login(
        email: 'parity.farmer.$_runId@farmconnect.test',
        password: _password,
      );

      expect(androidFarmerSession.user.id, farmerSession.user.id,
          reason: 'Both clients must resolve to the same shared user id');
      expect(androidFarmerSession.user.role, UserRole.farmer);

      // --- Register the consumer (website client) --------------------------
      final consumerSession = await website.auth.register(
        name: 'Android Parity Consumer',
        phone: _uniquePhone(phoneSeed++),
        email: 'parity.consumer.$_runId@farmconnect.test',
        password: _password,
        role: UserRole.consumer,
        pincode: '560038',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        addressLine: 'Indiranagar, Bengaluru',
      );
      expect(consumerSession.user.role, UserRole.consumer);

      // --- 3. Create a product from the Android client --------------------
      final created = await androidFarmer.catalog.createProduct(
        title: 'Parity Test Harvest $_runId',
        description: 'Created by the Android client for the shared-data workflow.',
        farmerPrice: 31.5,
        quantityAvailable: 400,
        minOrderKg: 5,
        location: 'Mandya, Karnataka',
      );

      expect(created.id, isNotEmpty);

      // --- 4. Verify the listing appears for the website client -------------
      final websiteFeed =
          await website.catalog.fetchProducts(search: 'Parity Test Harvest $_runId');
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

    testWidgets('enquiries and messages are shared between both clients',
        (tester) async {
      await registerFarmerAcrossBothClients(
        tag: 'chat',
        farmName: 'Chat Test Fields',
      );
      await registerConsumerAcrossBothClients(tag: 'chat');

      final product = await androidFarmer.catalog.createProduct(
        title: 'Chat Workflow Lot $_runId',
        description: 'Lot used to verify the enquiry workflow.',
        farmerPrice: 19.5,
        quantityAvailable: 250,
        minOrderKg: 5,
        location: 'Mandya, Karnataka',
      );

      // --- 9a. Enquiry from the website client -----------------------------
      final enquiry = await website.enquiries.createEnquiry(
        productId: product.id,
        subject: 'Bulk rate request $_runId',
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
        farmName: 'Engagement Test Fields',
      );
      await registerConsumerAcrossBothClients(tag: 'engage');

      final product = await androidFarmer.catalog.createProduct(
        title: 'Engagement Lot $_runId',
        description: 'Lot used to verify favourites.',
        farmerPrice: 12.0,
        quantityAvailable: 120,
        minOrderKg: 5,
        location: 'Mandya, Karnataka',
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
        reason: 'Quality clarification',
        details: 'Please confirm the grading of this lot before dispatch.',
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
      final email = 'session.consumer.$_runId@farmconnect.test';

      final session = await website.auth.register(
        name: 'Session Consumer',
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
    });

    testWidgets(
        'the Socket.IO server broadcasts order events to the Android client',
        (tester) async {
      // The farmer signs in on the Android client first — the socket must be
      // authenticated with the farmer's JWT so the server can put it in the
      // private room `user_<User.id>`.
      final farmerSession = await registerFarmerAcrossBothClients(
        tag: 'socket',
        farmName: 'Socket Test Fields',
      );
      expect(farmerSession.token, isNotEmpty);

      await registerConsumerAcrossBothClients(tag: 'socket');

      final product = await androidFarmer.catalog.createProduct(
        title: 'Socket Lot $_runId',
        description: 'Lot used to verify the real-time broadcast.',
        farmerPrice: 15.0,
        quantityAvailable: 90,
        minOrderKg: 5,
        location: 'Mandya, Karnataka',
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

      await connected.future.timeout(const Duration(seconds: 20));

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

      final event = await received.future.timeout(const Duration(seconds: 25));

      expect(event['orderId'], isNotNull);
      expect(event['orderId'], isA<String>());

      socket.dispose();
    });
  });
}
