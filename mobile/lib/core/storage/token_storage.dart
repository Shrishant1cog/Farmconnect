import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Minimal abstraction over the platform keystore.
///
/// The production implementation is [FlutterSecureStore]; tests inject an
/// in-memory implementation so they never depend on a platform channel.
abstract class SecureStore {
  Future<String?> read({required String key});

  Future<void> write({required String key, required String? value});

  Future<void> delete({required String key});
}

/// Encrypted keystore backed implementation (Android `EncryptedSharedPreferences`).
class FlutterSecureStore implements SecureStore {
  const FlutterSecureStore([
    this._storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  ]);

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read({required String key}) => _storage.read(key: key);

  @override
  Future<void> write({required String key, required String? value}) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete({required String key}) => _storage.delete(key: key);
}

/// In-memory implementation used by unit and integration tests.
class InMemorySecureStore implements SecureStore {
  final Map<String, String> _values = <String, String>{};

  @override
  Future<String?> read({required String key}) async => _values[key];

  @override
  Future<void> write({required String key, required String? value}) async {
    if (value == null) {
      _values.remove(key);
    } else {
      _values[key] = value;
    }
  }

  @override
  Future<void> delete({required String key}) async => _values.remove(key);
}

/// Secure storage for the JWT and the cached session profile.
///
/// The token is encrypted at rest by the platform keystore, so the Android app
/// stores exactly the same credential the website stores in `localStorage`.
class TokenStorage {
  TokenStorage({SecureStore? storage})
      : _storage = storage ?? const FlutterSecureStore();

  final SecureStore _storage;

  static const _tokenKey = 'farmconnect_token';
  static const _userKey = 'farmconnect_user';
  static const _roleKey = 'farmconnect_role';

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> writeToken(String token) => _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<String?> readUserJson() => _storage.read(key: _userKey);

  Future<void> writeUserJson(String value) => _storage.write(key: _userKey, value: value);

  Future<String?> readRole() => _storage.read(key: _roleKey);

  Future<void> writeRole(String role) => _storage.write(key: _roleKey, value: role);

  Future<void> clearAll() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
    await _storage.delete(key: _roleKey);
  }
}
