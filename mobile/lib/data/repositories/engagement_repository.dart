import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/misc.dart';
import '../models/product.dart';

/// Favourites, notifications, complaints and profile endpoints.
class EngagementRepository {
  EngagementRepository({required ApiClient api})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api;

  final ApiClient _api;

  // ---------------------------------------------------------------------------
  // Favourites
  // ---------------------------------------------------------------------------

  Future<({List<Product> products, List<FarmerSummary> farmers})> fetchFavorites() async {
    final payload = await _api.get(ApiEndpoints.favorites);
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final data = map['data'] is Map ? Map<String, dynamic>.from(map['data']) : map;

    final rawProducts = data['products'];
    final products = rawProducts is List
        ? rawProducts
            .whereType<Map>()
            .map((item) {
              final entry = Map<String, dynamic>.from(item);
              final product = entry['product'];
              return Product.fromJson(
                product is Map ? Map<String, dynamic>.from(product) : entry,
              );
            })
            .toList()
        : <Product>[];

    final rawFarmers = data['farmers'];
    final farmers = rawFarmers is List
        ? rawFarmers
            .whereType<Map>()
            .map((item) {
              final entry = Map<String, dynamic>.from(item);
              final farmer = entry['farmer'];
              return FarmerSummary.fromJson(
                farmer is Map ? Map<String, dynamic>.from(farmer) : entry,
              );
            })
            .toList()
        : <FarmerSummary>[];

    return (products: products, farmers: farmers);
  }

  Future<bool> toggleFavoriteProduct(String productId) async {
    final payload = await _api.post(ApiEndpoints.favoriteProduct(productId));
    return _isFavorite(payload);
  }

  Future<bool> toggleFavoriteFarmer(String farmerId) async {
    final payload = await _api.post(ApiEndpoints.favoriteFarmer(farmerId));
    return _isFavorite(payload);
  }

  bool _isFavorite(dynamic payload) {
    if (payload is Map && payload['isFavorite'] is bool) {
      return payload['isFavorite'] as bool;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  Future<List<AppNotification>> fetchNotifications() async {
    final payload = await _api.get(ApiEndpoints.notifications);
    return ApiClient.extractList(payload, keys: ['data', 'notifications'])
        .whereType<Map>()
        .map((item) => AppNotification.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<void> markNotificationRead(String id) async {
    await _api.patch(ApiEndpoints.notificationRead(id));
  }

  Future<void> markAllNotificationsRead() async {
    await _api.patch(ApiEndpoints.notificationsReadAll);
  }

  // ---------------------------------------------------------------------------
  // Complaints
  // ---------------------------------------------------------------------------

  Future<Complaint> createComplaint({
    required String entityType,
    required String entityId,
    required String reason,
    required String details,
  }) async {
    final payload = await _api.post(ApiEndpoints.complaints, body: {
      'entityType': entityType,
      'entityId': entityId,
      'reason': reason,
      'details': details,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['complaint'] ?? map;
    if (raw is! Map) {
      throw StateError('The complaint could not be registered.');
    }
    return Complaint.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<List<Complaint>> fetchMyComplaints() async {
    final payload = await _api.get(ApiEndpoints.myComplaints);
    return ApiClient.extractList(payload, keys: ['data', 'complaints'])
        .whereType<Map>()
        .map((item) => Complaint.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }
}
