import 'package:flutter_test/flutter_test.dart';

import 'package:farmconnect_mobile/routing/app_router.dart';

/// Regression tests for the session-restore redirect.
///
/// The release APK used to hang on the splash screen forever after an app
/// restart: `/splash` was never redirected away from once the session had been
/// restored from secure storage, because a restored session is authenticated
/// while the splash route is not an authentication route.
void main() {
  group('resolveAuthRedirect', () {
    test('every route goes to the splash while the session is restored', () {
      for (final location in ['/home', '/login', '/register', '/splash', '/orders']) {
        expect(
          resolveAuthRedirect(
            isRestoring: true,
            isAuthenticated: false,
            location: location,
          ),
          '/splash',
          reason: '$location must show the splash screen while restoring',
        );
      }
    });

    test('a restored session leaves the splash screen for the home screen', () {
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: true,
          location: '/splash',
        ),
        '/home',
        reason: 'the app must not stay on the splash screen after a restart',
      );
    });

    test('a missing session leaves the splash screen for the login screen', () {
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: false,
          location: '/splash',
        ),
        '/login',
      );
    });

    test('a signed-in user is redirected away from the auth screens', () {
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: true,
          location: '/login',
        ),
        '/home',
      );
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: true,
          location: '/register',
        ),
        '/home',
      );
    });

    test('a signed-out user is redirected away from the protected screens', () {
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: false,
          location: '/home',
        ),
        '/login',
      );
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: false,
          location: '/product/123',
        ),
        '/login',
      );
    });

    test('a signed-out user may stay on the auth screens', () {
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: false,
          location: '/login',
        ),
        isNull,
      );
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: false,
          location: '/register',
        ),
        isNull,
      );
    });

    test('a signed-in user may stay on the protected screens', () {
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: true,
          location: '/home',
        ),
        isNull,
      );
      expect(
        resolveAuthRedirect(
          isRestoring: false,
          isAuthenticated: true,
          location: '/product/123',
        ),
        isNull,
      );
    });
  });
}
