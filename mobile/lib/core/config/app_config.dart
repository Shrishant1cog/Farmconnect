/// Runtime configuration for the FarmConnect Android client.
///
/// The production values are supplied at build time so that no environment
/// specific host is hardcoded in the repository:
///
/// ```bash
/// flutter build apk --release \
///   --dart-define=API_BASE_URL=https://api.example.com/api \
///   --dart-define=SOCKET_URL=https://api.example.com
/// ```
class AppConfig {
  const AppConfig._();

  /// Base URL of the shared FarmConnect REST API (same backend as the website).
  ///
  /// The Android emulator reaches the host machine through `10.0.2.2`, while a
  /// physical device must use the LAN address of the development machine.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  /// Origin (without `/api`) used for the Socket.IO connection.
  static const String socketUrl = String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  /// Connect / read timeout in seconds.
  static const int connectTimeoutSeconds = 20;
  static const int receiveTimeoutSeconds = 30;

  /// Maximum accepted image upload size in bytes (matches the backend limit).
  static const int maxUploadBytes = 8 * 1024 * 1024;

  /// Returns true when the configured API host is a local development host.
  static bool get isLocalDevelopment {
    final uri = Uri.tryParse(apiBaseUrl);
    final host = uri?.host ?? '';
    return host == 'localhost' ||
        host == '127.0.0.1' ||
        host == '10.0.2.2' ||
        host.endsWith('.local');
  }

  /// True when this build was compiled without a usable production API host.
  ///
  /// Release builds must never point at a local development address. The
  /// placeholder host below uses the RFC 2606 reserved `.invalid` TLD so it
  /// can never resolve to a real server. When a release build still carries
  /// such a value the app explains how to rebuild it instead of failing with a
  /// cryptic network error.
  static bool get isMissingProductionUrl {
    final uri = Uri.tryParse(apiBaseUrl);
    final host = uri?.host ?? '';
    if (host.isEmpty) {
      return true;
    }
    return isLocalDevelopment || host.endsWith('.invalid');
  }

  /// Human readable explanation shown when [isMissingProductionUrl] is true.
  static const String missingProductionUrlMessage =
      'This APK was compiled without a production API address. Rebuild it with '
      '--dart-define=API_BASE_URL=https://<your-render-host>/api and '
      '--dart-define=SOCKET_URL=https://<your-render-host> so the app can reach '
      'the same FarmConnect backend as the website.';
}
