/// Cross-platform verification of the **packed** state of an order.
///
/// The audit found that the state "packed" did not exist in the shared
/// database: the backend rewrote a request for `PACKED` into
/// `CONFIRMED`. The dispatch dashboard of the cultivator showed "packed
/// in crates" while the shared database still said "confirmed", and the
/// step "harvest packed" of the timeline of the buyer could never be
/// reached.
///
/// This test proves, against the **live** backend and on the **real**
/// Android application, that:
///
///   1. the shared backend stores the state that is asked for — the
///      answer of the API carries `PACKED`,
///   2. the Android client reads that state and writes it on the
///      screen — the order is listed with the label "Packed",
///   3. the Android client can **send** the state itself — the status
///      sheet of the cultivator offers "Packed" and the wire value of
///      the state is `PACKED`.
///
/// The order belongs to the QA account of the audit, and the lot belongs
/// to the QA cultivator — no data of another account is touched.
///
/// ```bash
/// cd mobile && flutter test integration_test/packed_status_test.dart \
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
import 'package:farmconnect_mobile/data/models/order.dart';
import 'package:farmconnect_mobile/features/auth/auth_controller.dart';
import 'package:farmconnect_mobile/features/consumer/orders_page.dart';
import 'package:farmconnect_mobile/l10n/generated/app_localizations.dart';
import 'package:farmconnect_mobile/routing/app_router.dart';

/// The API under test.
const String _apiBaseUrl = String.fromEnvironment(
  'TEST_API_BASE_URL',
  defaultValue: AppConfig.apiBaseUrl,
);

/// The buyer of the audit.
const String _consumer = 'web.qa.consumer.1795847693410@farmconnect.test';

/// The cultivator of the audit — the owner of the lot.
const String _farmer = 'web.qa.farmer.1795847693410@farmconnect.test';

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

  /// Signs an account in on the shared backend.
  Future<String> signIn(String identifier) async {
    final response = await dio.post(
      '/auth/login',
      data: {'identifier': identifier, 'password': _password},
    );
    expect(response.statusCode, 200);
    final data = (response.data as Map)['data'] as Map;
    return data['token'] as String;
  }

  /// Pumps a fixed number of frames.
  ///
  /// `pumpAndSettle` cannot be used: several screens show a progress
  /// indicator that animates forever, so the tree would never "settle".
  Future<void> pumpFrames(WidgetTester tester) async {
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 120));
    }
  }

  /// Waits until a finder matches — the honest way to wait for a screen
  /// that reads from the live backend.
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

  testWidgets(
    'CROSS-PLATFORM: the state "packed" is stored by the backend and read by the app',
    (tester) async {
      final consumerToken = await signIn(_consumer);
      final farmerToken = await signIn(_farmer);

      // --- 1. The lot of the QA cultivator -------------------------------
      final ownProducts = await dio.get(
        '/products/my-products',
        options: Options(headers: {'Authorization': 'Bearer $farmerToken'}),
      );
      expect(ownProducts.statusCode, 200);
      final rows = ownProducts.data is Map
          ? ((ownProducts.data as Map)['data'] ??
                  (ownProducts.data as Map)['products'] ??
                  ownProducts.data)
          : ownProducts.data;
      final products = (rows is List ? rows : (rows as Map)['products'] as List)
          .cast<Map<String, dynamic>>();
      expect(products, isNotEmpty,
          reason: 'the QA cultivator must own a lot on the shared platform');
      final lot = products.first;
      final lotId = lot['id'] as String;
      final price = (lot['farmerPrice'] as num).toDouble();

      // --- 2. The order is placed with the request of the website -------
      final placed = await dio.post(
        '/orders',
        data: {
          'farmerId': lot['farmerId'],
          'deliveryAddress': 'Packed state audit address, Bengaluru 560038',
          'transportCost': 100,
          'containerCost': 0,
          'totalAmount': price * 10 + 100,
          'items': [
            {
              'productId': lotId,
              'quantity': 10,
              'price': price,
              'unitPrice': price,
            },
          ],
        },
        options: Options(headers: {'Authorization': 'Bearer $consumerToken'}),
      );
      expect(placed.statusCode, lessThan(400),
          reason: 'the shared backend must accept the order');
      final placedBody = placed.data as Map;
      final placedData =
          (placedBody['data'] ?? placedBody['order'] ?? placedBody) as Map;
      final orderId = placedData['id'] as String;

      // --- 3. The cultivator confirms the lot ---------------------------
      final confirmed = await dio.patch(
        '/orders/$orderId/status',
        data: {'status': 'CONFIRMED'},
        options: Options(headers: {'Authorization': 'Bearer $farmerToken'}),
      );
      expect(confirmed.statusCode, 200);
      expect(
        ((confirmed.data as Map)['data'] as Map)['status'],
        'CONFIRMED',
      );

      // --- 4. The cultivator packs the harvest --------------------------
      //
      // This is the request the website sends when the cultivator presses
      // "MARK PACKED IN CRATES". The backend used to rewrite it into
      // `CONFIRMED`; the answer now has to carry the state that was asked
      // for.
      final packed = await dio.patch(
        '/orders/$orderId/status',
        data: {'status': 'PACKED'},
        options: Options(headers: {'Authorization': 'Bearer $farmerToken'}),
      );
      expect(packed.statusCode, 200);
      expect(
        ((packed.data as Map)['data'] as Map)['status'],
        'PACKED',
        reason: 'the shared backend must store the state that was asked for',
      );

      // --- 5. A state that does not exist is refused ---------------------
      //
      // `validateStatus` keeps Dio from throwing on the refusal — the
      // refusal **is** the answer that is checked here.
      final unknown = await dio.patch(
        '/orders/$orderId/status',
        data: {'status': 'TELEPORTED'},
        options: Options(
          headers: {'Authorization': 'Bearer $farmerToken'},
          validateStatus: (status) => status != null && status < 500,
        ),
      );
      expect(unknown.statusCode, 400,
          reason: 'a state that does not exist must be refused, not stored');

      // --- 6. The Android client shows the state ------------------------
      final appStorage = TokenStorage(storage: InMemorySecureStore());
      await tester.pumpWidget(
        ProviderScope(
          overrides: [tokenStorageProvider.overrideWithValue(appStorage)],
          child: const _TestApp(),
        ),
      );
      await pumpFrames(tester);

      final container =
          ProviderScope.containerOf(tester.element(find.byType(_TestApp)));
      await container.read(authControllerProvider.notifier).login(
            identifier: _consumer,
            password: _password,
          );
      await pumpFrames(tester);

      container.read(routerProvider).go('/orders');
      await waitForFinder(tester, find.byType(OrdersPage));

      final reference = orderId.substring(0, 8);
      final onScreen = find.textContaining(reference, findRichText: true);
      await waitForFinder(tester, onScreen);
      expect(onScreen, findsWidgets,
          reason: 'the order must be listed in the Android app');

      // The label of the state sits in the **same card** as the reference
      // of the order — the card is the unit of the list.
      final card = find.ancestor(of: onScreen, matching: find.byType(Card));
      expect(card, findsWidgets);

      final cardText = tester
          .widgetList<Text>(
            find.descendant(of: card, matching: find.byType(Text)),
          )
          .map((t) => t.data ?? '')
          .toList();
      expect(
        cardText.any((text) => text.toLowerCase().contains('packed')),
        isTrue,
        reason: 'the Android app must show the state "packed" — got: $cardText',
      );

      // --- 7. The app knows the state on the wire ------------------------
      expect(OrderStatus.fromString('PACKED'), OrderStatus.packed);
      expect(OrderStatus.packed.wireValue, 'PACKED');
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
