/// Android route coverage test.
///
/// Drives the **real** router of the app on a device or emulator and visits
/// every route of `mobile/lib/routing/app_router.dart`, asserting that the
/// screen really builds and is displayed.
///
/// The test is honest about what it proves:
///
///  * The route resolves to the expected page widget.
///  * The page builds without throwing and is painted.
///  * Every screen is opened with **real** identifiers taken from the live
///    backend (a QA listing, a QA enquiry and a QA order), so the detail
///    screens really load their data instead of showing an error state.
///
/// The authentication state is controlled by a fake session so that both the
/// signed-out routes (`/login`, `/register`) and the signed-in routes can be
/// visited. The data itself always comes from the real backend.
///
/// ```bash
/// cd mobile && flutter test integration_test/route_coverage_test.dart \
///   -d emulator-5554 \
///   --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
///   --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
/// ```
library;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:farmconnect_mobile/core/config/app_config.dart';
import 'package:farmconnect_mobile/core/network/api_client.dart';
import 'package:farmconnect_mobile/core/providers.dart';
import 'package:farmconnect_mobile/core/storage/token_storage.dart';
import 'package:farmconnect_mobile/data/models/user.dart';
import 'package:farmconnect_mobile/data/repositories/auth_repository.dart';
import 'package:farmconnect_mobile/data/repositories/catalog_repository.dart';
import 'package:farmconnect_mobile/data/repositories/enquiry_repository.dart';
import 'package:farmconnect_mobile/data/repositories/order_repository.dart';
import 'package:farmconnect_mobile/features/admin/admin_dashboard_page.dart';
import 'package:farmconnect_mobile/features/auth/auth_controller.dart';
import 'package:farmconnect_mobile/features/auth/login_page.dart';
import 'package:farmconnect_mobile/features/auth/register_page.dart';
import 'package:farmconnect_mobile/features/chat/chat_page.dart';
import 'package:farmconnect_mobile/features/chat/enquiries_page.dart';
import 'package:farmconnect_mobile/features/consumer/cart_page.dart';
import 'package:farmconnect_mobile/features/consumer/checkout_page.dart';
import 'package:farmconnect_mobile/features/consumer/farmer_detail_page.dart';
import 'package:farmconnect_mobile/features/consumer/orders_page.dart';
import 'package:farmconnect_mobile/features/consumer/product_detail_page.dart';
import 'package:farmconnect_mobile/features/dashboard/home_shell.dart';
import 'package:farmconnect_mobile/features/farmer/product_form_page.dart';
import 'package:farmconnect_mobile/features/favorites/favorites_page.dart';
import 'package:farmconnect_mobile/features/logistics/logistics_page.dart';
import 'package:farmconnect_mobile/features/market_rates/market_rates_page.dart';
import 'package:farmconnect_mobile/features/notifications/notifications_page.dart';
import 'package:farmconnect_mobile/features/orders/order_detail_page.dart';
import 'package:farmconnect_mobile/features/profile/complaints_page.dart';
import 'package:farmconnect_mobile/features/profile/profile_page.dart';
import 'package:farmconnect_mobile/l10n/generated/app_localizations.dart';
import 'package:farmconnect_mobile/routing/app_router.dart';

/// The API under test.
///
/// Defaults to the address the app itself is compiled with
/// (`--dart-define=API_BASE_URL=…`), so the test and the screens it drives
/// always talk to the **same** backend. `TEST_API_BASE_URL` can still be used
/// to point only the test harness somewhere else.
const String _apiBaseUrl = String.fromEnvironment(
  'TEST_API_BASE_URL',
  defaultValue: AppConfig.apiBaseUrl,
);

const String _password = 'Password@123';
final String _runId = DateTime.now().millisecondsSinceEpoch.toString();

String _uniquePhone(int seed) {
  final digits = '${_runId.substring(_runId.length - 7)}${seed.toString().padLeft(3, '0')}';
  return '9${digits.substring(digits.length - 9)}';
}

/// A session controller that never touches the network.
///
/// Only the *authentication state* is faked so both the signed-out and the
/// signed-in routes can be visited. Every screen still loads its real data
/// from the live backend through the real repositories.
class _FakeAuthController extends AuthController {
  _FakeAuthController(this.initial);

  AuthState initial;

  @override
  AuthState build() {
    return initial;
  }

  void setSession(AuthState next) {
    initial = next;
    state = next;
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  final storage = TokenStorage(storage: InMemorySecureStore());
  final dio = Dio(
    BaseOptions(
      baseUrl: _apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 45),
      headers: {'Content-Type': 'application/json'},
    ),
  );
  final api = ApiClient(tokenStorage: storage, dio: dio);
  final authRepository = AuthRepository(api: api, storage: storage);

  /// The storage the **app** uses inside the test.
  ///
  /// It only ever holds the cultivator's token, so every screen really talks
  /// to the backend as that farmer — the same account a signed-in device
  /// would use.
  late TokenStorage appStorage;

  // QA data that gives the detail screens real identifiers.
  late String farmerEmail;
  late String consumerEmail;
  late String farmerToken;
  late String consumerToken;
  late String farmerUserId;
  late String productId;
  late String farmerProfileId;
  late String enquiryId;
  late String orderId;

  /// The real values the detail screens have to display. They come from the
  /// live backend, so seeing them proves the screen really loaded its data.
  final String farmName = 'Routes QA Fields';
  final String deliveryAddress = 'Indiranagar, Bengaluru';
  final String enquiryMessage = 'Please send the route coverage quotation.';
  late String productTitle;

  setUpAll(() async {
    // The date symbols have to be available before a screen renders a date.
    await initializeDateFormatting();

    farmerEmail = 'routes.qa.farmer.$_runId@farmconnect.test';
    consumerEmail = 'routes.qa.consumer.$_runId@farmconnect.test';

    final farmerSession = await authRepository.register(
      name: 'Routes QA Farmer',
      phone: _uniquePhone(1),
      email: farmerEmail,
      password: _password,
      role: UserRole.farmer,
      pincode: '571401',
      state: 'Karnataka',
      district: 'Mandya',
      addressLine: 'Mandya, Karnataka',
      farmName: farmName,
    );
    farmerToken = farmerSession.token;
    farmerUserId = farmerSession.user.id;
    farmerProfileId = farmerSession.user.farmerProfile?.id ?? '';

    // The app inside the test is signed in as the cultivator.
    appStorage = TokenStorage(storage: _StaticSecureStore(farmerToken));

    final consumerSession = await authRepository.register(
      name: 'Routes QA Consumer',
      phone: _uniquePhone(2),
      email: consumerEmail,
      password: _password,
      role: UserRole.consumer,
      pincode: '560038',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      addressLine: deliveryAddress,
    );
    consumerToken = consumerSession.token;

    // The catalogue endpoints are public, the listing is created by the
    // farmer with the farmer's own token.
    final farmerClient = ApiClient(
      tokenStorage: TokenStorage(storage: _StaticSecureStore(farmerToken)),
      dio: dio,
    );
    final farmerCatalog = CatalogRepository(api: farmerClient);

    final categories = await farmerCatalog.fetchCropCategories();
    final vegetable = categories.firstWhere(
      (category) => category.slug == 'vegetables',
      orElse: () => categories.first,
    );

    productTitle = 'QA Route Coverage Lot $_runId';

    final product = await farmerCatalog.createProduct(
      title: productTitle,
      description: 'A QA lot used by the route coverage test.',
      farmerPrice: 21.5,
      quantityAvailable: 150,
      minOrderKg: 5,
      location: 'Mandya, Karnataka',
      cropName: 'Tomato',
      variety: 'Hybrid',
      categoryId: vegetable.id,
    );
    productId = product.id;

    // The consumer creates an enquiry and an order against that listing.
    final consumerClient = ApiClient(
      tokenStorage: TokenStorage(storage: _StaticSecureStore(consumerToken)),
      dio: dio,
    );
    final consumerEnquiries = EnquiryRepository(api: consumerClient);
    final consumerOrders = OrderRepository(api: consumerClient);

    final enquiry = await consumerEnquiries.createEnquiry(
      productId: productId,
      subject: 'QA route coverage enquiry $_runId',
      message: enquiryMessage,
    );
    enquiryId = enquiry.id;

    final order = await consumerOrders.createOrder(
      deliveryAddress: deliveryAddress,
      items: [
        {'productId': productId, 'quantity': 10, 'unitPrice': product.farmerPrice},
      ],
      farmerId: product.ownerFarmerProfileId,
    );
    orderId = order.id;
  });

  /// Pumps a fixed number of frames.
  ///
  /// `pumpAndSettle` cannot be used here: several screens show a progress
  /// indicator that animates forever, so the tree would never "settle" and
  /// the call would time out instead of failing with a useful message.
  Future<void> pumpFrames(WidgetTester tester) async {
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 120));
    }
  }

  /// Waits for the real HTTP request of the screen to finish.
  ///
  /// The integration binding runs the test body in the real asynchronous
  /// zone, so this really waits for the live backend to answer.
  Future<void> waitForBackend(WidgetTester tester) async {
    await Future<void>.delayed(const Duration(seconds: 4));
    await pumpFrames(tester);
  }

  /// Opens the app with the given session and visits [route].
  ///
  /// The app is pumped **once** and keeps a single `ProviderScope`: replacing
  /// the scope would dispose the container while a screen is still waiting
  /// for its answer from the backend, and the screen would then fail with
  /// "Cannot use ref after the widget was disposed". The session is switched
  /// through the fake auth controller instead, which is exactly what a real
  /// sign-in or sign-out does.
  ///
  /// When [expectedText] is given the screen has to display that real value
  /// from the live backend, which proves the screen really loaded its data
  /// instead of showing an empty or error state.
  Future<void> openRoute(
    WidgetTester tester,
    String route, {
    required AuthState session,
    required Type expectedPage,
    String? expectedText,
  }) async {
    final container = ProviderScope.containerOf(
      tester.element(find.byType(_TestApp)),
    );
    final controller =
        container.read(authControllerProvider.notifier) as _FakeAuthController;
    controller.setSession(session);
    await pumpFrames(tester);

    final router = container.read(routerProvider);
    router.go(route);
    await pumpFrames(tester);

    if (expectedText != null) {
      await waitForBackend(tester);
    }

    expect(
      find.byType(expectedPage),
      findsWidgets,
      reason: 'The route $route must open ${expectedPage.toString()} '
          '(landed on ${router.routerDelegate.currentConfiguration.uri})',
    );

    if (expectedText != null) {
      expect(
        find.text(expectedText),
        findsWidgets,
        reason: 'The screen behind $route must show the real value '
            '"$expectedText" from the live backend',
      );
    }

    // No widget may have thrown while the screen was built.
    expect(tester.takeException(), isNull);
  }

  testWidgets('every route of the Android app opens', (tester) async {
    final signedOut = const AuthState(isRestoring: false);
    final farmerUser = AppUser(
      id: farmerUserId,
      name: 'Routes QA Farmer',
      email: farmerEmail,
      phone: _uniquePhone(1),
      role: UserRole.farmer,
    );
    final signedIn = AuthState(user: farmerUser, token: farmerToken, isRestoring: false);

    // The app is started once; the session is switched per route.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tokenStorageProvider.overrideWithValue(appStorage),
          authControllerProvider.overrideWith(() => _FakeAuthController(signedOut)),
        ],
        child: const _TestApp(),
      ),
    );
    await pumpFrames(tester);

    // --- The routes a signed-out visitor may open ------------------------
    await openRoute(tester, '/login', session: signedOut, expectedPage: LoginPage);
    await openRoute(tester, '/register', session: signedOut, expectedPage: RegisterPage);

    // --- The routes of a signed-in account --------------------------------
    await openRoute(tester, '/home', session: signedIn, expectedPage: HomeShell);
    await openRoute(tester, '/product/$productId',
        session: signedIn,
        expectedPage: ProductDetailPage,
        expectedText: productTitle);
    await openRoute(tester, '/farmer/$farmerProfileId',
        session: signedIn,
        expectedPage: FarmerDetailPage,
        expectedText: farmName);
    await openRoute(tester, '/cart', session: signedIn, expectedPage: CartPage);
    await openRoute(tester, '/checkout', session: signedIn, expectedPage: CheckoutPage);
    await openRoute(tester, '/orders', session: signedIn, expectedPage: OrdersPage);
    await openRoute(tester, '/order/$orderId',
        session: signedIn,
        expectedPage: OrderDetailPage,
        expectedText: deliveryAddress);
    await openRoute(tester, '/enquiries', session: signedIn, expectedPage: EnquiriesPage);
    await openRoute(tester, '/chat/$enquiryId',
        session: signedIn,
        expectedPage: ChatPage,
        expectedText: enquiryMessage);
    await openRoute(tester, '/market-rates',
        session: signedIn, expectedPage: MarketRatesPage);
    await openRoute(tester, '/logistics', session: signedIn, expectedPage: LogisticsPage);
    await openRoute(tester, '/favorites', session: signedIn, expectedPage: FavoritesPage);
    await openRoute(tester, '/notifications',
        session: signedIn, expectedPage: NotificationsPage);
    await openRoute(tester, '/profile', session: signedIn, expectedPage: ProfilePage);
    await openRoute(tester, '/complaints', session: signedIn, expectedPage: ComplaintsPage);
    await openRoute(tester, '/admin', session: signedIn, expectedPage: AdminDashboardPage);
    await openRoute(tester, '/farmer/products/new',
        session: signedIn, expectedPage: ProductFormPage);
    await openRoute(tester, '/farmer/products/$productId/edit',
        session: signedIn,
        expectedPage: ProductFormPage,
        expectedText: productTitle);
  });
}

/// The app shell without the platform specific bootstrap.
///
/// It uses the same localisation delegates as `main.dart`, so the screens
/// behave exactly like the shipped application.
class _TestApp extends ConsumerWidget {
  const _TestApp();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'FarmConnect',
      debugShowCheckedModeBanner: false,
      routerConfig: ref.watch(routerProvider),
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}

/// A secure store that always returns the same token.
class _StaticSecureStore implements SecureStore {
  _StaticSecureStore(this.token);

  final String token;

  @override
  Future<String?> read({required String key}) async =>
      key == 'farmconnect_token' ? token : null;

  @override
  Future<void> write({required String key, required String? value}) async {}

  @override
  Future<void> delete({required String key}) async {}
}
