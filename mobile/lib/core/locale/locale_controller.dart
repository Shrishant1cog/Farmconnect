import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import '../providers.dart';
import '../storage/token_storage.dart';

/// Interface languages supported by the Android app.
///
/// The list mirrors the website (`frontend/src/i18n/types.ts`) and the
/// backend (`backend/src/utils/language.ts`) so every client can switch
/// between exactly the same languages.
class AppLocales {
  const AppLocales._();

  static const Locale english = Locale('en');
  static const Locale kannada = Locale('kn');
  static const Locale hindi = Locale('hi');

  static const List<Locale> supported = <Locale>[english, kannada, hindi];

  /// Native name of the language (always shown in its own script).
  static String nativeName(Locale locale) {
    switch (locale.languageCode) {
      case 'kn':
        return 'ಕನ್ನಡ';
      case 'hi':
        return 'हिन्दी';
      default:
        return 'English';
    }
  }

  /// English name, used as an accessible label.
  static String englishName(Locale locale) {
    switch (locale.languageCode) {
      case 'kn':
        return 'Kannada';
      case 'hi':
        return 'Hindi';
      default:
        return 'English';
    }
  }

  /// Normalises any value to a supported locale.
  static Locale normalize(Object? value) {
    if (value is Locale) {
      return supported.firstWhere(
        (locale) => locale.languageCode == value.languageCode,
        orElse: () => english,
      );
    }
    if (value is String) {
      final code = value.trim().toLowerCase().split(RegExp('[-_]')).first;
      return supported.firstWhere(
        (locale) => locale.languageCode == code,
        orElse: () => english,
      );
    }
    return english;
  }
}

/// Controls the interface language of the app.
///
/// * The choice is stored on the device, so it survives restarts and works
///   for signed-out visitors.
/// * For signed-in users the choice is also written to the shared backend,
///   which means the website follows the same language and vice versa.
class LocaleController extends Notifier<Locale> {
  late final TokenStorage _storage;

  @override
  Locale build() {
    _storage = ref.watch(tokenStorageProvider);

    // Follow the session: when a user signs in we adopt the account
    // preference, and when they sign out we keep the local preference.
    ref.listen(authControllerProvider, (previous, next) {
      if (previous?.token != next.token) {
        _handleSessionChange(next);
      }
    });

    Future.microtask(() async {
      await _restoreLocalPreference();

      // The session may already have been restored before this controller was
      // built, in which case the listener above never fires.
      final auth = ref.read(authControllerProvider);
      if (auth.isAuthenticated) {
        _handleSessionChange(auth);
      }
    });

    return AppLocales.english;
  }

  void _handleSessionChange(AuthState auth) {
    if (!auth.isAuthenticated) {
      return;
    }

    _registerSocketListener();

    // The login / register response already carries the account language, so
    // the interface can follow it without an extra round trip.
    final accountLocale = AppLocales.normalize(auth.user?.preferredLanguage);
    if (accountLocale != state) {
      state = accountLocale;
      _storage.writeLocale(accountLocale.languageCode);
    }

    _applyServerPreference();
  }

  Future<void> _restoreLocalPreference() async {
    final stored = await _storage.readLocale();
    if (stored == null) {
      return;
    }
    final locale = AppLocales.normalize(stored);
    if (locale != state) {
      state = locale;
    }
  }

  void _registerSocketListener() {
    try {
      ref.read(socketServiceProvider).on('language_preference_updated', (payload) {
        if (payload is Map) {
          final next = AppLocales.normalize(payload['preferredLanguage']);
          state = next;
          _storage.writeLocale(next.languageCode);
        }
      });
    } catch (error) {
      debugPrint('[LocaleController] socket listener failed: $error');
    }
  }

  Future<void> _applyServerPreference() async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isAuthenticated) {
      return;
    }
    try {
      final profile = await ref.read(userRepositoryProvider).fetchProfile();
      final next = AppLocales.normalize(profile.preferredLanguage);
      if (next != state) {
        state = next;
      }
      await _storage.writeLocale(next.languageCode);
    } catch (error) {
      debugPrint('[LocaleController] could not read the account preference: $error');
    }
  }

  /// Switches the interface language immediately.
  Future<void> setLocale(Locale locale, {bool syncToAccount = true}) async {
    final next = AppLocales.normalize(locale);
    state = next;
    await _storage.writeLocale(next.languageCode);

    if (!syncToAccount) {
      return;
    }

    final auth = ref.read(authControllerProvider);
    if (!auth.isAuthenticated) {
      return;
    }

    try {
      await ref.read(userRepositoryProvider).updatePreferredLanguage(next.languageCode);
    } catch (error) {
      debugPrint('[LocaleController] could not sync the language preference: $error');
    }
  }
}

/// The active interface language.
final localeControllerProvider =
    NotifierProvider<LocaleController, Locale>(LocaleController.new);
