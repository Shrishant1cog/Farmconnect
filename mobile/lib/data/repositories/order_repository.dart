import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/order.dart';

/// Order repository shared by the consumer and the farmer applications.
class OrderRepository {
  OrderRepository({required ApiClient api})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api;

  final ApiClient _api;

  /// Place a wholesale order. Totals are computed by the backend.
  Future<Order> createOrder({
    required String deliveryAddress,
    required List<Map<String, dynamic>> items,
    String? farmerId,
    double transportCost = 0,
    double containerCost = 0,
  }) async {
    final payload = await _api.post(ApiEndpoints.orders, body: {
      'deliveryAddress': deliveryAddress,
      'items': items,
      if (farmerId != null && farmerId.isNotEmpty) 'farmerId': farmerId,
      'transportCost': transportCost,
      'containerCost': containerCost,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['order'] ?? map;
    if (raw is! Map) {
      throw StateError('The order could not be placed.');
    }
    return Order.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<List<Order>> fetchMyOrders() async {
    final payload = await _api.get(ApiEndpoints.myOrders);
    return _parseList(payload);
  }

  Future<List<Order>> fetchFarmerOrders() async {
    final payload = await _api.get(ApiEndpoints.farmerOrders);
    return _parseList(payload);
  }

  Future<Order> fetchOrder(String id) async {
    final payload = await _api.get(ApiEndpoints.order(id));
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['order'] ?? map;
    if (raw is! Map) {
      throw StateError('Order not found.');
    }
    return Order.fromJson(Map<String, dynamic>.from(raw));
  }

  /// Farmer updates the logistics status of an order.
  Future<Order> updateStatus(String id, OrderStatus status) async {
    final payload = await _api.patch(
      ApiEndpoints.orderStatus(id),
      body: {'status': status.wireValue},
    );

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['order'] ?? map;
    if (raw is! Map) {
      throw StateError('The order status could not be updated.');
    }
    return Order.fromJson(Map<String, dynamic>.from(raw));
  }

  /// Consumer confirms the delivery receipt.
  Future<Order> confirmDelivery(String id) async {
    final payload = await _api.patch(ApiEndpoints.orderReceived(id));

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['order'] ?? map;
    if (raw is! Map) {
      throw StateError('The delivery could not be confirmed.');
    }
    return Order.fromJson(Map<String, dynamic>.from(raw));
  }

  List<Order> _parseList(dynamic payload) {
    return ApiClient.extractList(payload, keys: ['data', 'orders'])
        .whereType<Map>()
        .map((item) => Order.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }
}
