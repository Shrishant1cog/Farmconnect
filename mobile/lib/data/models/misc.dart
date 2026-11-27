DateTime? _toDate(dynamic value) {
  if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
  if (value is DateTime) return value;
  return null;
}

/// Notification delivered to a user (also used for the live `new_notification` event).
class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.link,
    this.isRead = false,
    this.createdAt,
  });

  final String id;
  final String title;
  final String message;
  final String type;
  final String? link;
  final bool isRead;
  final DateTime? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'FarmConnect',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'GENERAL',
      link: json['link']?.toString(),
      isRead: json['isRead'] == true,
      createdAt: _toDate(json['createdAt']),
    );
  }
}

/// APMC mandi market rate.
class MarketRate {
  const MarketRate({
    required this.id,
    required this.commodity,
    required this.modalPrice,
    required this.minPrice,
    required this.maxPrice,
    this.state,
    this.district,
    this.marketCenter,
    this.updatedAt,
    this.commodityNameKn,
    this.commodityNameHi,
  });

  final String id;
  final String commodity;
  final double modalPrice;
  final double minPrice;
  final double maxPrice;
  final String? state;
  final String? district;
  final String? marketCenter;
  final DateTime? updatedAt;

  /// Kannada display name of the commodity.
  final String? commodityNameKn;

  /// Hindi display name of the commodity.
  final String? commodityNameHi;

  /// The display name that matches the given language code.
  String displayName(String languageCode) {
    if (languageCode == 'kn' && (commodityNameKn ?? '').isNotEmpty) {
      return commodityNameKn!;
    }
    if (languageCode == 'hi' && (commodityNameHi ?? '').isNotEmpty) {
      return commodityNameHi!;
    }
    return commodity;
  }

  factory MarketRate.fromJson(Map<String, dynamic> json) {
    double parse(dynamic value) {
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0;
      return 0;
    }

    return MarketRate(
      id: json['id']?.toString() ?? '',
      commodity: json['commodity']?.toString() ?? '',
      modalPrice: parse(json['modalPrice']),
      minPrice: parse(json['minPrice']),
      maxPrice: parse(json['maxPrice']),
      state: json['state']?.toString(),
      district: json['district']?.toString(),
      marketCenter: json['marketCenter']?.toString(),
      updatedAt: _toDate(json['updatedAt']),
      commodityNameKn: json['commodityNameKn']?.toString(),
      commodityNameHi: json['commodityNameHi']?.toString(),
    );
  }
}

/// A complaint raised by a user.
class Complaint {
  const Complaint({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.reason,
    required this.details,
    required this.status,
    this.adminNotes,
    this.createdAt,
  });

  final String id;
  final String entityType;
  final String entityId;
  final String reason;
  final String details;
  final String status;
  final String? adminNotes;
  final DateTime? createdAt;

  factory Complaint.fromJson(Map<String, dynamic> json) {
    return Complaint(
      id: json['id']?.toString() ?? '',
      entityType: json['entityType']?.toString() ?? 'GENERAL',
      entityId: json['entityId']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      details: json['details']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PENDING',
      adminNotes: json['adminNotes']?.toString(),
      createdAt: _toDate(json['createdAt']),
    );
  }
}

/// Result of the logistics + profit calculation (`POST /api/logistics/quote`).
///
/// The model mirrors the **real** response of the shared backend. The APMC
/// part is optional: when no benchmark was published the backend reports it
/// as `null`, and the screen shows an honest "not published yet" state
/// instead of a made-up profit.
class LogisticsQuote {
  const LogisticsQuote({
    required this.distanceKm,
    required this.transportCost,
    required this.containerCost,
    required this.totalCost,
    required this.produceCost,
    this.apmcModalPrice,
    this.apmcValue,
    this.profit,
    this.profitMarginPercent,
    this.hasApmcBenchmark = false,
  });

  final double distanceKm;
  final double transportCost;
  final double containerCost;
  final double totalCost;
  final double produceCost;

  /// The published APMC benchmark in ₹ per kg — `null` when none exists.
  final double? apmcModalPrice;

  /// The expected market value at that benchmark — `null` when none exists.
  final double? apmcValue;

  /// The profit against the benchmark — `null` when no benchmark exists.
  final double? profit;

  /// The profit margin in percent — `null` when no benchmark exists.
  final double? profitMarginPercent;

  /// True when the calculation really used a published APMC benchmark.
  final bool hasApmcBenchmark;

  factory LogisticsQuote.fromJson(Map<String, dynamic> json) {
    double parse(dynamic value) {
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0;
      return 0;
    }

    double? parseNullable(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) {
        final cleaned = value.replaceAll('%', '').trim();
        final parsed = double.tryParse(cleaned);
        return parsed;
      }
      return null;
    }

    final breakdown = json['breakdown'] is Map
        ? Map<String, dynamic>.from(json['breakdown'] as Map)
        : <String, dynamic>{};
    final assessment = json['profitAssessment'] is Map
        ? Map<String, dynamic>.from(json['profitAssessment'] as Map)
        : <String, dynamic>{};

    return LogisticsQuote(
      distanceKm: parse(json['distanceKm']),
      transportCost: parse(breakdown['baseFreightCost']),
      containerCost: parse(breakdown['specialContainerCost']),
      totalCost: parse(breakdown['totalLandedCost']),
      produceCost: parse(breakdown['farmerProduceCost']),
      apmcModalPrice: parseNullable(assessment['apmcBenchmarkRatePerKg']),
      apmcValue: parseNullable(assessment['expectedApmcValue']),
      profit: parseNullable(assessment['approxNetProfit']),
      profitMarginPercent: parseNullable(assessment['profitMarginPercent']),
      hasApmcBenchmark: assessment['hasApmcBenchmark'] == true,
    );
  }
}

/// Farmer dashboard payload (`GET /api/dashboard/farmer`).
class FarmerDashboard {
  const FarmerDashboard({
    required this.farmerName,
    required this.totalProducts,
    required this.availableProducts,
    required this.totalEnquiries,
    required this.profileViews,
    required this.totalFavorites,
    this.recentEnquiries = const [],
    this.products = const [],
  });

  final String farmerName;
  final int totalProducts;
  final int availableProducts;
  final int totalEnquiries;
  final int profileViews;
  final int totalFavorites;
  final List<dynamic> recentEnquiries;
  final List<dynamic> products;

  factory FarmerDashboard.fromJson(Map<String, dynamic> json) {
    int parse(dynamic value) {
      if (value is num) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    final stats = json['stats'] is Map ? Map<String, dynamic>.from(json['stats']) : <String, dynamic>{};

    return FarmerDashboard(
      farmerName: json['farmerName']?.toString() ?? 'Cultivator',
      totalProducts: parse(stats['totalProducts']),
      availableProducts: parse(stats['availableProducts']),
      totalEnquiries: parse(stats['totalEnquiries']),
      profileViews: parse(stats['profileViews']),
      totalFavorites: parse(stats['totalFavorites']),
      recentEnquiries: json['recentEnquiries'] is List ? json['recentEnquiries'] : const [],
      products: json['products'] is List ? json['products'] : const [],
    );
  }
}

/// Platform metrics shown in the admin console (`GET /api/admin/metrics`).
class AdminMetrics {
  const AdminMetrics({required this.raw});

  final Map<String, dynamic> raw;

  int readInt(String key) {
    final value = raw[key];
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  factory AdminMetrics.fromJson(Map<String, dynamic> json) => AdminMetrics(raw: json);
}
