import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:farmconnect_mobile/core/providers.dart';
import 'package:farmconnect_mobile/core/storage/token_storage.dart';
import 'package:farmconnect_mobile/data/models/user.dart';
import 'package:farmconnect_mobile/features/auth/auth_controller.dart';
import 'package:farmconnect_mobile/features/profile/profile_page.dart';
import 'package:farmconnect_mobile/l10n/generated/app_localizations.dart';

/// Builds an account of the given role.
AppUser _user(UserRole role) {
  return AppUser(
    id: 'u_1',
    name: role == UserRole.farmer ? 'Ramesh Gowda' : 'Priya Narayanan',
    email: role == UserRole.farmer
        ? 'ramesh.mandya@farmconnect.org'
        : 'priya.bengaluru@gmail.com',
    phone: '+919448123456',
    role: role,
    district: 'Mandya',
    state: 'Karnataka',
  );
}

/// Renders the profile page for an account of the given role.
Future<void> _pumpProfile(WidgetTester tester, AppUser user) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        tokenStorageProvider.overrideWithValue(
          TokenStorage(storage: InMemorySecureStore()),
        ),
        currentUserProvider.overrideWithValue(user),
      ],
      child: MaterialApp(
        theme: ThemeData(useMaterial3: true),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const ProfilePage(),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('PROFILE: the buyer is offered the favourites', (tester) async {
    await _pumpProfile(tester, _user(UserRole.consumer));

    expect(find.text('My favourites'), findsOneWidget);
  });

  testWidgets('PROFILE: the cultivator is not offered the favourites', (
    tester,
  ) async {
    // The favourites belong to a buyer. The shared backend refuses them
    // for a cultivator (HTTP 403), so the app must not offer an entry
    // that can only fail — the website shows the heart for the same
    // reason.
    await _pumpProfile(tester, _user(UserRole.farmer));

    expect(find.text('My favourites'), findsNothing);
  });
}
