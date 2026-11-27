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
    double? latitude,
    double? longitude,
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
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
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
}
