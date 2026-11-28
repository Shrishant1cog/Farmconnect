/// Android authentication journey — driven through the **real** interface.
///
/// The end-to-end audit found a complete account takeover on the phone
/// sign-in of the deployed platform: knowing only a phone number was enough
/// to open the session of that account. The Android client was one of the
/// two places where the flaw was reachable, because its second tab sent
/// nothing but the number.
///
/// This test drives the shipped `LoginPage` widget — the real form, the
/// real `AuthController`, the real repositories and the **live** backend —
/// and proves the contract of the fix:
///
///   * the mobile tab signs in with the mobile number **and** the password
///     of the account,
///   * a wrong password opens no session and shows an honest error,
///   * a request without a password is refused by the backend,
///   * the account decides which workspace opens — the role the client
///     sends is only a hint,
///   * signing out really ends the session, and signing in again works,
///   * the session survives a restart of the app.
///
/// ```bash
/// cd mobile && flutter test integration_test/auth_journey_test.dart \
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
import 'package:farmconnect_mobile/core/network/api_client.dart';
import 'package:farmconnect_mobile/core/providers.dart';
import 'package:farmconnect_mobile/core/storage/token_storage.dart';
import 'package:farmconnect_mobile/data/models/user.dart';
import 'package:farmconnect_mobile/data/repositories/auth_repository.dart';
import 'package:farmconnect_mobile/features/auth/auth_controller.dart';
import 'package:farmconnect_mobile/features/auth/login_page.dart';
import 'package:farmconnect_mobile/features/dashboard/home_shell.dart';
import 'package:farmconnect_mobile/l10n/generated/app_localizations.dart';
import 'package:farmconnect_mobile/l10n/generated/app_localizations_en.dart';
import 'package:farmconnect_mobile/routing/app_router.dart';

/// The API under test.
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

  late String consumerPhone;
  late String consumerId;
  late String farmerPhone;

  setUpAll(() async {
    // A real buyer account — the account decides which workspace opens.
    final consumer = await authRepository.register(
      name: 'Auth Journey QA Consumer',
      phone: _uniquePhone(1),
      email: 'auth.journey.consumer.$_runId@farmconnect.test',
      password: _password,
      role: UserRole.consumer,
      pincode: '560038',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      addressLine: 'Indiranagar, Bengaluru',
    );
    consumerPhone = consumer.user.phone;
    consumerId = consumer.user.id;

    // A real cultivator account, used to prove that the role of the
    // **account** wins over the role the client asks for.
    final farmer = await authRepository.register(
      name: 'Auth Journey QA Farmer',
      phone: _uniquePhone(2),
      email: 'auth.journey.farmer.$_runId@farmconnect.test',
      password: _password,
      role: UserRole.farmer,
      pincode: '571401',
      state: 'Karnataka',
      district: 'Mandya',
      addressLine: 'Mandya, Karnataka',
      farmName: 'Auth Journey Fields',
    );
    farmerPhone = farmer.user.phone;
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
    await Future<void>.delayed(const Duration(seconds: 4));
    await pumpFrames(tester);
  }

  /// Builds the app with the **real** session handling.
  ///
  /// Only the keystore is replaced, so the token really is written and
  /// read again — the restart test depends on it.
  Future<void> pumpApp(
    WidgetTester tester,
    TokenStorage appStorage,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStorageProvider.overrideWithValue(appStorage)],
        child: const _TestApp(),
      ),
    );
    await pumpFrames(tester);
    await waitForBackend(tester);
  }

  /// Reads the state of the real session controller.
  AuthState sessionOf(WidgetTester tester) {
    final container = ProviderScope.containerOf(tester.element(find.byType(_TestApp)));
    return container.read(authControllerProvider);
  }

  testWidgets(
    'AUTH: the mobile tab signs in with the number and the password of the account',
    (tester) async {
      final appStorage = TokenStorage(storage: InMemorySecureStore());
      await pumpApp(tester, appStorage);

      // The app starts signed out, on the real login screen.
      expect(sessionOf(tester).isAuthenticated, isFalse);
      expect(find.byType(LoginPage), findsWidgets);

      // Open the "Mobile" tab of the shipped login screen.
      await tester.tap(find.text(AppLocalizationsEn().authMobileTab));
      await pumpFrames(tester);

      // The form asks for the **password** as well — the number alone is
      // never enough.
      expect(find.byType(TextFormField), findsNWidgets(2));
      expect(find.text(AppLocalizationsEn().authMobileSignIn), findsWidgets);
      expect(find.text(AppLocalizationsEn().authMobileSignInHint), findsWidgets);

      // A wrong password must not open a session.
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), consumerPhone);
      await tester.enterText(fields.at(1), 'definitely-not-the-password');
      await tester.tap(find.text(AppLocalizationsEn().authMobileSignIn));
      await waitForBackend(tester);

      expect(sessionOf(tester).isAuthenticated, isFalse);
      expect(find.textContaining('Request failed'), findsWidgets);

      // The correct password opens the account of that number.
      await tester.enterText(fields.at(1), _password);
      await tester.tap(find.text(AppLocalizationsEn().authMobileSignIn));
      await waitForBackend(tester);

      final session = sessionOf(tester);
      expect(session.isAuthenticated, isTrue);
      expect(session.user?.id, consumerId);
      expect(session.user?.role, UserRole.consumer);

      // The workspace of the account is open.
      expect(find.byType(HomeShell), findsWidgets);
    },
  );

  testWidgets(
    'AUTH: a request without the password is refused by the shared backend',
    (tester) async {
      // The regression that closed the account takeover: the endpoint used
      // to answer a session for **any** phone number.
      int? status;
      Object? body;
      try {
        final response = await dio.post(
          '/auth/login-phone',
          data: {'phone': consumerPhone, 'role': 'CONSUMER'},
        );
        status = response.statusCode;
        body = response.data;
      } on DioException catch (error) {
        // Dio throws for every answer that is not a success — the answer
        // itself is the interesting part.
        status = error.response?.statusCode;
        body = error.response?.data;
      }

      expect(status, isNotNull);
      expect(status, greaterThanOrEqualTo(400));

      final payload = body as Map;
      final data = payload['data'];
      final token = data is Map ? data['token'] : null;
      expect(token, isNull);
    },
  );

  testWidgets(
    'AUTH: the account decides which workspace opens, not the requested role',
    (tester) async {
      // The Android client sends the role `CONSUMER` with every mobile
      // sign-in. A cultivator that signs in with its mobile number must
      // therefore still open as a cultivator.
      int? status;
      Object? body;
      try {
        final response = await dio.post(
          '/auth/login-phone',
          data: {
            'phone': farmerPhone,
            'password': _password,
            'role': 'CONSUMER',
          },
        );
        status = response.statusCode;
        body = response.data;
      } on DioException catch (error) {
        status = error.response?.statusCode;
        body = error.response?.data;
      }

      expect(status, 200);
      final payload = body as Map;
      final data = payload['data'] as Map;
      final user = data['user'] as Map;
      expect(user['role'], 'FARMER');
    },
  );

  testWidgets(
    'AUTH: signing out ends the session and signing in again works',
    (tester) async {
      final appStorage = TokenStorage(storage: InMemorySecureStore());
      await pumpApp(tester, appStorage);

      // Sign in through the real controller (the form itself is covered by
      // the first test).
      final container = ProviderScope.containerOf(tester.element(find.byType(_TestApp)));
      await container.read(authControllerProvider.notifier).loginWithPhone(
        phone: consumerPhone,
        password: _password,
        role: UserRole.consumer,
      );
      await pumpFrames(tester);

      expect(sessionOf(tester).isAuthenticated, isTrue);

      // The token really is in the keystore.
      expect(await appStorage.readToken(), isNotNull);

      // Sign out.
      await container.read(authControllerProvider.notifier).logout();
      await pumpFrames(tester);

      expect(sessionOf(tester).isAuthenticated, isFalse);
      expect(await appStorage.readToken(), isNull);

      // Sign in again — the same account opens again.
      await container.read(authControllerProvider.notifier).loginWithPhone(
        phone: consumerPhone,
        password: _password,
        role: UserRole.consumer,
      );
      await pumpFrames(tester);

      expect(sessionOf(tester).isAuthenticated, isTrue);
      expect(sessionOf(tester).user?.id, consumerId);
    },
  );

  testWidgets(
    'AUTH: the session survives a restart of the app',
    (tester) async {
      final appStorage = TokenStorage(storage: InMemorySecureStore());
      await pumpApp(tester, appStorage);

      final container = ProviderScope.containerOf(tester.element(find.byType(_TestApp)));
      await container.read(authControllerProvider.notifier).loginWithPhone(
        phone: consumerPhone,
        password: _password,
        role: UserRole.consumer,
      );
      await pumpFrames(tester);
      expect(sessionOf(tester).isAuthenticated, isTrue);

      // The app is restarted: the widget tree is thrown away and built
      // again, the keystore is **not**.
      await tester.pumpWidget(const SizedBox.shrink());
      await pumpFrames(tester);

      await pumpApp(tester, appStorage);

      final restored = sessionOf(tester);
      expect(restored.isAuthenticated, isTrue);
      expect(restored.user?.id, consumerId);
      expect(find.byType(HomeShell), findsWidgets);
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
