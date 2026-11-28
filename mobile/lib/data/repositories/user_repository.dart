import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/user.dart';

/// Profile management for consumers and farmers.
class UserRepository {
  UserRepository({required ApiClient api})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api;

  final ApiClient _api;

  Future<AppUser> fetchProfile() async {
    final payload = await _api.get(ApiEndpoints.userMe);
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['user'] ?? map;
    if (raw is! Map) {
      throw StateError('Profile not found.');
    }
    return AppUser.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<AppUser> updateProfile({
    String? name,
    String? phone,
    String? email,
    String? state,
    String? district,
    String? taluk,
    String? pincode,
    String? address,
    String? deliveryAddress,
    String? addressLine,
    String? farmName,
  }) async {
    final payload = await _api.patch(ApiEndpoints.userMe, body: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (email != null) 'email': email,
      if (state != null) 'state': state,
      if (district != null) 'district': district,
      if (taluk != null) 'taluk': taluk,
      if (pincode != null) 'pincode': pincode,
      if (address != null) 'address': address,
      if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
      if (addressLine != null) 'addressLine': addressLine,
      if (farmName != null) 'farmName': farmName,
    });

    return _readUser(payload);
  }

  /// Shares the **real** position with the shared backend.
  ///
  /// The position is the farm position of a cultivator and the delivery
  /// position of a buyer. It is stored only when it is really known — a
  /// placeholder would put the farm somewhere it does not exist.
  Future<AppUser> updatePosition({
    required double latitude,
    required double longitude,
  }) async {
    final payload = await _api.patch(ApiEndpoints.userMe, body: {
      'latitude': latitude,
      'longitude': longitude,
    });

    return _readUser(payload);
  }

  /// Clears the position of the account.
  ///
  /// The shared backend keeps the three states apart: an absent position is
  /// left untouched, an explicit `null` clears it and a number stores it.
  /// (`Number(null)` is `0` in JavaScript, so a cleared position must never
  /// be sent as the number `0`.)
  Future<AppUser> clearPosition() async {
    final payload = await _api.patch(ApiEndpoints.userMe, body: {
      'latitude': null,
      'longitude': null,
    });

    return _readUser(payload);
  }

  /// Reads the account from a profile response.
  AppUser _readUser(dynamic payload) {
    final map =
        payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['user'] ?? map;
    if (raw is! Map) {
      throw StateError('The profile could not be updated.');
    }
    return AppUser.fromJson(Map<String, dynamic>.from(raw));
  }

  /// Farmer identity verification (same endpoint as the website).
  Future<void> verifyAadhaar(String aadhaarNumber) async {
    await _api.post(ApiEndpoints.verifyAadhaar, body: {'aadhaarNumber': aadhaarNumber});
  }

  /// Stores the interface language on the shared account so the website and
  /// the Android app always speak the same language.
  Future<String> updatePreferredLanguage(String languageCode) async {
    final payload = await _api.patch(ApiEndpoints.userMe, body: {
      'preferredLanguage': languageCode,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['user'] ?? map;
    if (raw is Map && raw['preferredLanguage'] != null) {
      return raw['preferredLanguage'].toString();
    }
    return languageCode;
  }
}
