import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:farmconnect_mobile/core/locale/locale_controller.dart';
import 'package:farmconnect_mobile/core/providers.dart';
import 'package:farmconnect_mobile/core/storage/token_storage.dart';
import 'package:farmconnect_mobile/features/auth/auth_controller.dart';

void main() {
  group('AppLocales', () {
    test('supports English, Kannada and Hindi', () {
      expect(AppLocales.supported.length, 3);
      expect(
        AppLocales.supported.map((locale) => locale.languageCode).toSet(),
        {'en', 'kn', 'hi'},
      );
    });

    test('shows every language in its own script', () {
      expect(AppLocales.nativeName(const Locale('en')), 'English');
      expect(AppLocales.nativeName(const Locale('kn')), 'ಕನ್ನಡ');
      expect(AppLocales.nativeName(const Locale('hi')), 'हिन्दी');
    });

    test('normalises unsupported or regional values', () {
      expect(AppLocales.normalize('kn-IN').languageCode, 'kn');
      expect(AppLocales.normalize('HI_in').languageCode, 'hi');
      expect(AppLocales.normalize('ta').languageCode, 'en');
      expect(AppLocales.normalize(null).languageCode, 'en');
      expect(AppLocales.normalize(const Locale('kn')).languageCode, 'kn');
    });
  });

  group('LocaleController', () {
    test('keeps the local preference for signed-out visitors', () async {
      final storage = TokenStorage(storage: InMemorySecureStore());
      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(storage),
          authControllerProvider.overrideWith(() => _SignedOutAuth()),
        ],
      );
      addTearDown(container.dispose);

      await container.read(localeControllerProvider.notifier).setLocale(
            const Locale('kn'),
            syncToAccount: false,
          );

      expect(container.read(localeControllerProvider).languageCode, 'kn');
      expect(await storage.readLocale(), 'kn');
    });

    test('restores the stored preference on start', () async {
      final storage = TokenStorage(storage: InMemorySecureStore());
      await storage.writeLocale('hi');

      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(storage),
          authControllerProvider.overrideWith(() => _SignedOutAuth()),
        ],
      );
      addTearDown(container.dispose);

      // Reading the provider starts the controller, which restores the
      // stored preference asynchronously.
      container.read(localeControllerProvider);
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(container.read(localeControllerProvider).languageCode, 'hi');
    });
  });
}

/// Auth controller stub for a signed-out visitor.
class _SignedOutAuth extends AuthController {
  @override
  AuthState build() => const AuthState(isRestoring: false);
}
