import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/locale/locale_controller.dart';
import 'core/theme/app_theme.dart';
import 'l10n/generated/app_localizations.dart';
import 'routing/app_router.dart';

/// FarmConnect Android application.
///
/// The app is a native Flutter client of the same Express/Prisma backend that
/// serves the FarmConnect website: users, listings, orders, enquiries and
/// notifications are shared between both clients in real time.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // The month and weekday names of every supported locale have to be loaded
  // before the first date is formatted. Without this the `intl` package
  // throws a `LocaleDataException` as soon as a screen renders a date — for
  // example the order, enquiry, chat and notification screens.
  await initializeDateFormatting();

  runApp(const ProviderScope(child: FarmConnectApp()));
}

class FarmConnectApp extends ConsumerWidget {
  const FarmConnectApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeControllerProvider);

    return MaterialApp.router(
      title: 'FarmConnect',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
      // Switching the language re-builds the app with the new locale — no
      // restart and no flicker.
      locale: locale,
      supportedLocales: AppLocales.supported,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
