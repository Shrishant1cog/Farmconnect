import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/misc.dart';

/// Administrative endpoints (ADMIN role only).
class AdminRepository {
  AdminRepository({required ApiClient api})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api;

  final ApiClient _api;

  Future<AdminMetrics> fetchMetrics() async {
    final payload = await _api.get(ApiEndpoints.adminMetrics);
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map;
    if (raw is! Map) {
      throw StateError('Metrics are unavailable.');
    }
    return AdminMetrics.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<List<Map<String, dynamic>>> fetchUsers() async {
    final payload = await _api.get(ApiEndpoints.adminUsers);
    return ApiClient.extractList(payload, keys: ['data', 'users'])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<void> toggleUserStatus(String userId) async {
    await _api.patch(ApiEndpoints.adminUserToggle(userId));
  }

  Future<List<Map<String, dynamic>>> fetchComplaints() async {
    final payload = await _api.get(ApiEndpoints.adminComplaints);
    return ApiClient.extractList(payload, keys: ['data', 'complaints'])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<void> resolveComplaint(String complaintId, {String? notes}) async {
    await _api.patch(
      ApiEndpoints.adminComplaintResolve(complaintId),
      body: {if (notes != null && notes.isNotEmpty) 'adminNotes': notes},
    );
  }
}
