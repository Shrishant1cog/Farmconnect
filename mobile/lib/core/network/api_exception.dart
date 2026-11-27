/// Structured error type shared by every repository call.
class ApiException implements Exception {
  ApiException({
    required this.message,
    this.statusCode,
    this.payload,
    this.isNetworkError = false,
  });

  final String message;
  final int? statusCode;
  final Object? payload;
  final bool isNetworkError;

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;

  /// Human readable message that can be shown directly in the UI.
  String get displayMessage {
    if (isNetworkError) {
      return 'Unable to reach the FarmConnect server. Check your connection and try again.';
    }
    return message;
  }

  @override
  String toString() => 'ApiException($statusCode): $message';
}
