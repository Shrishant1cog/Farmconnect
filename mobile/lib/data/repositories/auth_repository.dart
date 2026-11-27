import 'dart:convert';

import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/token_storage.dart';
import '../models/user.dart';

/// Result of a successful authentication call.
class AuthSession {
  const AuthSession({required this.token, required this.user});

  final String token;
  final AppUser user;
}

/// Authentication + profile repository.
///
/// The Android app authenticates against exactly the same endpoints as the
/// website, so an account created on one client works on the other.
class AuthRepository {
  AuthRepository({required ApiClient api, required TokenStorage storage})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api,
        // ignore: prefer_initializing_formals
        _storage = storage;

  final ApiClient _api;
  final TokenStorage _storage;

  Future<AuthSession> register({
    required String name,
    required String phone,
    required String password,
    String? email,
    required UserRole role,
    String pincode = '',
    String state = 'Karnataka',
    String district = 'Mandya',
    String taluk = '',
    String addressLine = '',
    double? latitude,
    double? longitude,
    String farmName = '',
  }) async {
    final payload = await _api.post(ApiEndpoints.register, body: {
      'name': name,
      'phone': phone,
      'email': email,
      'password': password,
      'role': role.wireValue,
      'pincode': pincode,
      'state': state,
      'district': district,
      'taluk': taluk,
      'addressLine': addressLine,
      'latitude': latitude,
      'longitude': longitude,
      'showOnMap': role == UserRole.farmer,
      'farmName': farmName,
    });

    return _persist(payload);
  }

  Future<AuthSession> login({
    String? identifier,
    String? email,
    String? phone,
    required String password,
  }) async {
    final payload = await _api.post(ApiEndpoints.login, body: {
      if (identifier != null && identifier.isNotEmpty) 'identifier': identifier,
      if (email != null && email.isNotEmpty) 'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'password': password,
    });

    return _persist(payload);
  }

  /// Phone OTP sign-in (same endpoint the website uses for its OTP tab).
  Future<AuthSession> loginWithPhone({
    required String phone,
    required UserRole role,
  }) async {
    final payload = await _api.post(ApiEndpoints.loginPhone, body: {
      'phone': phone,
      'role': role.wireValue,
    });

    return _persist(payload);
  }

  /// Firebase ID token exchange (used when Firebase phone auth is configured).
  Future<AuthSession> loginWithFirebaseToken({
    required String idToken,
    required UserRole role,
    String? name,
    String district = 'Mandya',
    String state = 'Karnataka',
  }) async {
    final payload = await _api.post(ApiEndpoints.firebasePhone, body: {
      'idToken': idToken,
      'role': role.wireValue,
      'name': name,
      'district': district,
      'state': state,
    });

    return _persist(payload);
  }

  /// Fetch the profile of the signed-in user.
  Future<AppUser> fetchCurrentUser() async {
    final payload = await _api.get(ApiEndpoints.authMe);
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final rawUser = map['user'] ?? (map['data'] is Map ? map['data']['user'] : null);
    if (rawUser is! Map) {
      throw StateError('Profile response did not contain a user object.');
    }
    return AppUser.fromJson(Map<String, dynamic>.from(rawUser));
  }

  /// Restore a session from secure storage (app restart / session persistence).
  Future<AuthSession?> restoreSession() async {
    final token = await _storage.readToken();
    final userJson = await _storage.readUserJson();
    if (token == null || token.isEmpty || userJson == null || userJson.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(userJson);
      if (decoded is! Map) {
        return null;
      }
      return AuthSession(
        token: token,
        user: AppUser.fromJson(Map<String, dynamic>.from(decoded)),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() => _storage.clearAll();

  Future<AuthSession> _persist(dynamic payload) async {
    if (payload is! Map) {
      throw StateError('Unexpected authentication response.');
    }

    final map = Map<String, dynamic>.from(payload);
    final data = map['data'] is Map ? Map<String, dynamic>.from(map['data']) : map;
    final token = (data['token'] ?? map['token'])?.toString();
    final rawUser = data['user'] ?? map['user'];

    if (token == null || token.isEmpty || rawUser is! Map) {
      throw StateError(map['message']?.toString() ?? 'Authentication response was incomplete.');
    }

    final user = AppUser.fromJson(Map<String, dynamic>.from(rawUser));

    await _storage.writeToken(token);
    await _storage.writeUserJson(jsonEncode(user.toJson()));
    await _storage.writeRole(user.role.wireValue);

    return AuthSession(token: token, user: user);
  }
}
