/// Cross-platform verification — the website and the Android client share
/// the **same** backend.
///
/// The audit requirement is that a change made on one client is visible on
/// the other, and that the evidence is the API and the database — not two
/// screens that merely look alike.
///
/// This test drives the **real** Android application against the **live**
/// backend and proves both directions:
///
///   1. **Website → Android.** An order is placed with the request the
///      website really sends (`POST /api/orders` with the payload of
///      `frontend/src/app/checkout/page.tsx`). The shared backend is asked
///      for the order of the account (`GET /api/orders/my`) — that is the
///      evidence — and then the **Android** client is signed in with the
///      same account and its real order list is opened. The reference of
///      the order must be on the screen of the phone.
///
///   2. **Android → Website.** An order is placed by the **real**
///      repository of the Android client (`OrderRepository.createOrder`,
///      the code path the app itself uses), and the shared backend is then
///      asked for the order list — the request the website sends. The
///      order must be in that answer.
///
/// The account is a real QA account that already exists on the shared
/// platform; the test never creates an account of its own and never
/// touches data of another account.
///
/// ```bash
/// cd mobile && flutter test integration_test/cross_platform_test.dart \
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

import 'package:farmconnect_mobile/core/config/app_config.dart';
import 'package:farmconnect_mobile/core/providers.dart';
import 'package:farmconnect_mobile/core/storage/token_storage.dart';
import 'package:farmconnect_mobile/features/auth/auth_controller.dart';
import 'package:farmconnect_mobile/features/consumer/orders_page.dart';
import 'package:farmconnect_mobile/features/dashboard/home_shell.dart';
import 'package:farmconnect_mobile/l10n/generated/app_localizations.dart';
import 'package:farmconnect_mobile/routing/app_router.dart';

/// The API under test.
const String _apiBaseUrl = String.fromEnvironment(
  'TEST_API_BASE_URL',
  defaultValue: AppConfig.apiBaseUrl,
);

/// The account of the audit. It exists on the shared platform and is used
/// by the website as well.
const String _identifier = 'web.qa.consumer.1795847693410@farmconnect.test';
const String _password = 'QaPass!2026';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  final dio = Dio(
    BaseOptions(
      baseUrl: _apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 45),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  late String consumerId;
  late String token;

  setUpAll(() async {
    // The account really exists on the shared backend.
    final login = await dio.post(
      '/auth/login',
      data: {'identifier': _identifier, 'password': _password},
    );
    expect(login.statusCode, 200);

    final data = (login.data as Map)['data'] as Map;
    token = data['token'] as String;
    consumerId = (data['user'] as Map)['id'] as String;
  });

  /// Pumps a fixed number of frames.
  ///
  /// `pumpAndSettle` cannot be used: several screens show a progress
  /// indicator that animates forever, so the tree would never "settle".
  Future<void> pumpFrames(WidgetTester tester) async {
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 120));
    }
  }

  /// Waits for the live backend to answer.
  Future<void> waitForBackend(WidgetTester tester) async {
    await Future<void>.delayed(const Duration(seconds: 5));
    await pumpFrames(tester);
  }

  /// Waits until a finder matches — the honest way to wait for a screen
  /// that reads from the live backend.
  ///
  /// A fixed delay is a race: the first round trip of the free tier host
  /// can take fifteen seconds, and a delay that is too short makes the
  /// test fail although the application is correct. The loop polls the
  /// tree until the element is there and gives up only after the timeout.
  Future<bool> waitForFinder(
    WidgetTester tester,
    Finder finder, {
    Duration timeout = const Duration(seconds: 60),
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      await tester.pump(const Duration(milliseconds: 250));
      await Future<void>.delayed(const Duration(milliseconds: 250));
      if (finder.evaluate().isNotEmpty) {
        return true;
      }
    }
    return finder.evaluate().isNotEmpty;
  }

  /// Reads the list of the orders of the account from the shared backend —
  /// the very request the website sends on `/consumer/orders`.
  Future<List<Map<String, dynamic>>> readOrdersFromSharedBackend() async {
    final response = await dio.get(
      '/orders/my',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    expect(response.statusCode, 200);
    final body = response.data as Map;
    final rows = body['data'] ?? body['orders'] ?? body;
    final list = rows is List ? rows : (rows as Map)['orders'] as List;
    return list.cast<Map<String, dynamic>>();
  }

  /// Reads one listing of the shared catalogue.
  Future<Map<String, dynamic>> readListing() async {
    final response = await dio.get('/products', queryParameters: {'limit': 5});
    expect(response.statusCode, 200);
    final body = response.data as Map;
    final rows = body['data'] ?? body;
    final list = rows is List ? rows : (rows as Map)['products'] as List;
    expect(list, isNotEmpty, reason: 'the shared catalogue must have a listing');
    return (list.first as Map).cast<String, dynamic>();
  }

  testWidgets(
    'CROSS-PLATFORM: an order placed on the website is visible in the Android app',
    (tester) async {
      // --- 1. The order is placed with the request of the website ---------
      final listing = await readListing();
      final productId = listing['id'] as String;
      final price = (listing['farmerPrice'] as num).toDouble();
      final quantity = 10.0;

      final placed = await dio.post(
        '/orders',
        data: {
          'farmerId': listing['farmerId'],
          'deliveryAddress': 'Cross platform audit address, Bengaluru 560038',
          'transportCost': 150,
          'containerCost': 5,
          'totalAmount': price * quantity + 155,
          'items': [
            {
              'productId': productId,
              'quantity': quantity,
              'price': price,
              'unitPrice': price,
            },
          ],
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      expect(placed.statusCode, lessThan(400),
          reason: 'the shared backend must accept the order');

      final placedBody = placed.data as Map;
      final placedData = (placedBody['data'] ?? placedBody['order'] ?? placedBody)
          as Map;
      final orderId = placedData['id'] as String;
      expect(orderId, isNotEmpty);

      // --- 2. The shared backend really knows the order -------------------
      final fromApi = await readOrdersFromSharedBackend();
      final apiOrder = fromApi.firstWhere((o) => o['id'] == orderId,
          orElse: () => throw StateError(
              'the order $orderId is missing from the shared backend'));
      expect(apiOrder['status'], isNotNull);

      // --- 3. The Android app shows the same order ------------------------
      final appStorage = TokenStorage(storage: InMemorySecureStore());
      await tester.pumpWidget(
        ProviderScope(
          overrides: [tokenStorageProvider.overrideWithValue(appStorage)],
          child: const _TestApp(),
        ),
      );
      await pumpFrames(tester);
      await waitForBackend(tester);

      final container =
          ProviderScope.containerOf(tester.element(find.byType(_TestApp)));

      // Sign in with the **real** controller of the app.
      await container.read(authControllerProvider.notifier).login(
            identifier: _identifier,
            password: _password,
          );
      await pumpFrames(tester);
      await waitForBackend(tester);

      final session = container.read(authControllerProvider);
      expect(session.isAuthenticated, isTrue);
      expect(session.user?.id, consumerId);
      expect(find.byType(HomeShell), findsWidgets);

      // Open the order list of the consumer.
      container.read(routerProvider).go('/orders');
      await waitForBackend(tester);

      expect(find.byType(OrdersPage), findsWidgets);

      // The reference of the order is the beginning of its id — the same
      // reference the website showed on its confirmation page.
      final reference = orderId.substring(0, 8);
      final onScreen = find.textContaining(reference, findRichText: true);
      await waitForFinder(tester, onScreen);

      final rendered = tester
          .widgetList<Text>(
            find.descendant(
              of: find.byType(OrdersPage),
              matching: find.byType(Text),
            ),
          )
          .map((t) => t.data)
          .where((d) => d != null && d.isNotEmpty)
          .toList();
      // ignore: avoid_print
      print('ORDERS RENDERED (${rendered.length}): ${rendered.join(' | ')}');
      expect(
        onScreen,
        findsWidgets,
        reason:
            'the order placed through the shared API must be listed in the Android app',
      );
    },
  );

  testWidgets(
    'CROSS-PLATFORM: an order placed in the Android app is visible to the website',
    (tester) async {
      // The Android client places the order with its **own** repository —
      // the code path the shipped app uses.
      final appStorage = TokenStorage(storage: InMemorySecureStore());

      final listing = await readListing();
      final productId = listing['id'] as String;
      final price = (listing['farmerPrice'] as num).toDouble();

      // The app is signed in first — the repository must have a session.
      await tester.pumpWidget(
        ProviderScope(
          overrides: [tokenStorageProvider.overrideWithValue(appStorage)],
          child: const _TestApp(),
        ),
      );
      await pumpFrames(tester);
      await waitForBackend(tester);

      final container =
          ProviderScope.containerOf(tester.element(find.byType(_TestApp)));
      await container.read(authControllerProvider.notifier).login(
            identifier: _identifier,
            password: _password,
          );
      await pumpFrames(tester);
      await waitForBackend(tester);

      // The order of the Android client.
      final placed = await container
          .read(orderRepositoryProvider)
          .createOrder(
            deliveryAddress: 'Android client audit address, Bengaluru 560038',
            items: [
              {
                'productId': productId,
                'quantity': 10,
                'price': price,
                'unitPrice': price,
              },
            ],
          );
      expect(placed.id, isNotEmpty);

      // --- The website reads the same list from the shared backend -------
      final fromApi = await readOrdersFromSharedBackend();
      final apiOrder = fromApi.firstWhere((o) => o['id'] == placed.id,
          orElse: () => throw StateError(
              'the order ${placed.id} of the Android client is missing '
              'from the shared backend'));
      expect(apiOrder['status'], isNotNull);

      // --- And the Android app lists it as well ---------------------------
      container.read(routerProvider).go('/orders');
      await waitForBackend(tester);

      final onScreen =
          find.textContaining(placed.id.substring(0, 8), findRichText: true);
      await waitForFinder(tester, onScreen);

      expect(
        onScreen,
        findsWidgets,
        reason: 'the order of the Android client must be listed in the app',
      );
    },
  );
}

/// The app shell without the platform specific bootstrap.
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
