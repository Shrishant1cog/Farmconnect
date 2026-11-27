double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

DateTime? _toDate(dynamic value) {
  if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
  if (value is DateTime) return value;
  return null;
}

/// Lifecycle of a wholesale order.
enum OrderStatus {
  pending,
  confirmed,
  dispatched,
  delivered,
  cancelled;

  static OrderStatus fromString(String? raw) {
    switch (raw?.toUpperCase()) {
      case 'CONFIRMED':
      case 'PACKED':
        return OrderStatus.confirmed;
      case 'DISPATCHED':
      case 'IN_TRANSIT':
        return OrderStatus.dispatched;
      case 'DELIVERED':
        return OrderStatus.delivered;
      case 'CANCELLED':
        return OrderStatus.cancelled;
      default:
        return OrderStatus.pending;
    }
  }

  String get wireValue {
    switch (this) {
      case OrderStatus.pending:
        return 'PENDING';
      case OrderStatus.confirmed:
        return 'CONFIRMED';
      case OrderStatus.dispatched:
        return 'DISPATCHED';
      case OrderStatus.delivered:
        return 'DELIVERED';
      case OrderStatus.cancelled:
        return 'CANCELLED';
    }
  }

  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Packed';
      case OrderStatus.dispatched:
        return 'Dispatched';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }
}

/// A single line item of an order.
class OrderItem {
  const OrderItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.unitPrice,
    this.product,
  });

  final String id;
  final String productId;
  final double quantity;
  final double unitPrice;
  final Map<String, dynamic>? product;

  String get productTitle => product?['title']?.toString() ?? 'Produce lot';
  String? get productImage => product?['imageUrl']?.toString();

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      quantity: _toDouble(json['quantity']),
      unitPrice: _toDouble(json['unitPrice']),
      product: json['product'] is Map ? Map<String, dynamic>.from(json['product']) : null,
    );
  }
}

/// A wholesale order.
class Order {
  const Order({
    required this.id,
    required this.status,
    required this.totalItemsCost,
    required this.transportCost,
    required this.containerCost,
    required this.grandTotal,
    required this.deliveryAddress,
    this.items = const [],
    this.consumer,
    this.farmer,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final OrderStatus status;
  final double totalItemsCost;
  final double transportCost;
  final double containerCost;
  final double grandTotal;
  final String deliveryAddress;
  final List<OrderItem> items;
  final Map<String, dynamic>? consumer;
  final Map<String, dynamic>? farmer;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get consumerName => consumer?['name']?.toString() ?? 'Buyer';
  String get consumerPhone => consumer?['phone']?.toString() ?? '';
  String get farmerName {
    final user = farmer?['user'];
    if (user is Map && user['name'] != null) {
      return user['name'].toString();
    }
    return farmer?['farmName']?.toString() ?? 'Cultivator';
  }

  String get farmerPhone {
    final user = farmer?['user'];
    if (user is Map && user['phone'] != null) {
      return user['phone'].toString();
    }
    return farmer?['phone']?.toString() ?? '';
  }

  factory Order.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final items = rawItems is List
        ? rawItems
            .whereType<Map>()
            .map((item) => OrderItem.fromJson(Map<String, dynamic>.from(item)))
            .toList()
        : <OrderItem>[];

    return Order(
      id: json['id']?.toString() ?? '',
      status: OrderStatus.fromString(json['status']?.toString()),
      totalItemsCost: _toDouble(json['totalItemsCost']),
      transportCost: _toDouble(json['transportCost']),
      containerCost: _toDouble(json['containerCost']),
      grandTotal: _toDouble(json['grandTotal']),
      deliveryAddress: json['deliveryAddress']?.toString() ?? '',
      items: items,
      consumer: json['consumer'] is Map ? Map<String, dynamic>.from(json['consumer']) : null,
      farmer: json['farmer'] is Map ? Map<String, dynamic>.from(json['farmer']) : null,
      createdAt: _toDate(json['createdAt']),
      updatedAt: _toDate(json['updatedAt']),
    );
  }
}
