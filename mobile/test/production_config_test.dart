import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:farmconnect_mobile/core/config/app_config.dart';

/// Guards the production release configuration.
///
/// The release build must always talk to the deployed Render backend, never to
/// the local emulator address. The URLs are pinned in the build scripts, so
/// this test fails as soon as somebody edits one of them without the other.
void main() {
  const productionApiBaseUrl = 'https://farmconnect-api-sn98.onrender.com/api';
  const productionSocketUrl = 'https://farmconnect-api-sn98.onrender.com';

  group('production release configuration', () {
    test('the Windows build script pins the deployed Render API', () {
      final script = File('tool/build_production.ps1').readAsStringSync();

      expect(script, contains(r'$ApiBaseUrl = '), reason: 'the API URL must be set');
      expect(script, contains(r'$SocketUrl  = '), reason: 'the socket URL must be set');
      expect(script, contains(productionApiBaseUrl));
      expect(script, contains(productionSocketUrl));
    });

    test('the Unix build script pins the deployed Render API', () {
      final script = File('tool/build_production.sh').readAsStringSync();

      expect(script, contains('API_BASE_URL="$productionApiBaseUrl"'));
      expect(script, contains('SOCKET_URL="$productionSocketUrl"'));
    });

    test('the build scripts always pass both dart-defines to the build', () {
      for (final path in ['tool/build_production.ps1', 'tool/build_production.sh']) {
        final script = File(path).readAsStringSync();

        expect(script, contains('API_BASE_URL'),
            reason: '$path must pass API_BASE_URL');
        expect(script, contains('SOCKET_URL'),
            reason: '$path must pass SOCKET_URL');
        expect(script, contains('--release'),
            reason: '$path must build a release artefact');
      }
    });

    test('no build script falls back to the local emulator host', () {
      for (final path in ['tool/build_production.ps1', 'tool/build_production.sh']) {
        final script = File(path).readAsStringSync();

        // The emulator URL may only appear in a comment that explains why it
        // must NOT be used, never as an actual value.
        final assignments = RegExp(
          r'(API_BASE_URL|SOCKET_URL)\s*=\s*["\x27]?([^"\x27\n]+)',
        ).allMatches(script);

        for (final match in assignments) {
          expect(match.group(2), isNot(contains('10.0.2.2')),
              reason: '$path must not point a production build at the emulator');
          expect(match.group(2), isNot(contains('localhost')),
              reason: '$path must not point a production build at localhost');
        }
      }
    });
  });

  group('AppConfig development defaults', () {
    test('the default build targets the Android emulator host', () {
      // These constants are the `String.fromEnvironment` defaults, so they are
      // the values a developer gets when no dart-define is supplied.
      expect(AppConfig.apiBaseUrl, 'http://10.0.2.2:5000/api');
      expect(AppConfig.socketUrl, 'http://10.0.2.2:5000');
      expect(AppConfig.isLocalDevelopment, isTrue);
    });

    test('a local development build is reported as missing a production URL', () {
      expect(AppConfig.isMissingProductionUrl, isTrue);
    });
  });
}
