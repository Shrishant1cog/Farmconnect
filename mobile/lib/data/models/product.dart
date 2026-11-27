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

/// Product category.
class Category {
  const Category({this.id, this.name, this.slug, this.description});

  final String? id;
  final String? name;
  final String? slug;
  final String? description;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString(),
      name: json['name']?.toString(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
    );
  }
}

/// A harvest listing created by a farmer.
///
/// One listing represents exactly one crop, so a farmer can publish several
/// independent crop lots without one overwriting another.
class Product {
  const Product({
    required this.id,
    required this.title,
    required this.description,
    required this.farmerPrice,
    required this.quantityAvailable,
    this.priceUnit = 'PER_KG',
    this.quantityUnit = 'KG',
    this.minOrderKg = 10,
    this.grade = 'Grade-A Export',
    this.location = 'Karnataka',
    this.isAvailable = true,
    this.isOrganic = false,
    this.harvestDate,
    this.containerType = 'STANDARD_CRATE',
    this.containerCostPerKg = 0,
    this.imageUrl,
    this.viewCount = 0,
    this.farmerId,
    this.categoryId,
    this.cropName,
    this.variety,
    this.farmer,
    this.category,
    this.createdAt,
    this.farmerPriceNotice,
  });

  final String id;
  final String title;
  final String description;
  final double farmerPrice;
  final double quantityAvailable;
  final String priceUnit;
  final String quantityUnit;
  final double minOrderKg;
  final String grade;
  final String location;
  final bool isAvailable;
  final bool isOrganic;
  final DateTime? harvestDate;
  final String containerType;
  final double containerCostPerKg;
  final String? imageUrl;
  final int viewCount;
  final String? farmerId;
  final String? categoryId;

  /// Crop this lot represents (e.g. "Tomato").
  final String? cropName;

  /// Variety of the crop where applicable (e.g. "Hybrid").
  final String? variety;
  final Map<String, dynamic>? farmer;
  final Category? category;
  final DateTime? createdAt;
  final String? farmerPriceNotice;

  String get farmerName {
    final user = farmer?['user'];
    if (user is Map && user['name'] != null) {
      return user['name'].toString();
    }
    return farmer?['farmName']?.toString() ?? 'FarmConnect Farmer';
  }

  String? get farmName => farmer?['farmName']?.toString();

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled listing',
      description: json['description']?.toString() ?? '',
      farmerPrice: _toDouble(json['farmerPrice']),
      quantityAvailable: _toDouble(json['quantityAvailable']),
      priceUnit: json['priceUnit']?.toString() ?? 'PER_KG',
      quantityUnit: json['quantityUnit']?.toString() ?? 'KG',
      minOrderKg: _toDouble(json['minOrderKg']),
      grade: json['grade']?.toString() ?? 'Grade-A Export',
      location: json['location']?.toString() ?? 'Karnataka',
      isAvailable: json['isAvailable'] != false,
      isOrganic: json['isOrganic'] == true,
      harvestDate: _toDate(json['harvestDate']),
      containerType: json['containerType']?.toString() ?? 'STANDARD_CRATE',
      containerCostPerKg: _toDouble(json['containerCostPerKg']),
      imageUrl: json['imageUrl']?.toString(),
      viewCount: json['viewCount'] is num ? (json['viewCount'] as num).toInt() : 0,
      farmerId: json['farmerId']?.toString(),
      categoryId: json['categoryId']?.toString(),
      cropName: json['cropName']?.toString(),
      variety: json['variety']?.toString(),
      farmer: json['farmer'] is Map ? Map<String, dynamic>.from(json['farmer']) : null,
      category: json['category'] is Map
          ? Category.fromJson(Map<String, dynamic>.from(json['category']))
          : null,
      createdAt: _toDate(json['createdAt']),
      farmerPriceNotice: json['farmerPriceNotice']?.toString(),
    );
  }

  /// The farmer profile id that owns this listing.
  String? get ownerFarmerProfileId => farmer?['id']?.toString() ?? farmerId;
}

/// A crop category returned by the shared catalogue endpoint.
class CropCategory {
  const CropCategory({
    this.id,
    this.name,
    this.slug,
    this.description,
    this.productCount = 0,
  });

  final String? id;
  final String? name;
  final String? slug;
  final String? description;
  final int productCount;

  factory CropCategory.fromJson(Map<String, dynamic> json) {
    return CropCategory(
      id: json['id']?.toString(),
      name: json['name']?.toString(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
      productCount: json['productCount'] is num
          ? (json['productCount'] as num).toInt()
          : 0,
    );
  }
}

/// A crop from the shared crop catalogue (search assistance for farmers).
class CropSuggestion {
  const CropSuggestion({
    this.name,
    this.category,
    this.aliases = const [],
  });

  final String? name;
  final String? category;
  final List<String> aliases;

  factory CropSuggestion.fromJson(Map<String, dynamic> json) {
    final rawAliases = json['aliases'];
    return CropSuggestion(
      name: json['name']?.toString(),
      category: json['category']?.toString(),
      aliases: rawAliases is List
          ? rawAliases.map((item) => item.toString()).toList()
          : const [],
    );
  }
}

/// A farmer profile as returned by the discovery endpoints.
class FarmerSummary {
  const FarmerSummary({
    required this.id,
    required this.farmName,
    this.farmerName,
    this.phone,
    this.district,
    this.state,
    this.address,
    this.latitude = 0,
    this.longitude = 0,
    this.distanceKm,
    this.isVerified = false,
    this.profileViews = 0,
    this.products = const [],
    this.bio,
  });

  final String id;
  final String farmName;
  final String? farmerName;
  final String? phone;
  final String? district;
  final String? state;
  final String? address;
  final double latitude;
  final double longitude;
  final double? distanceKm;
  final bool isVerified;
  final int profileViews;
  final List<Product> products;
  final String? bio;

  factory FarmerSummary.fromJson(Map<String, dynamic> json) {
    final rawProducts = json['products'] ?? json['availableProducts'];
    final products = rawProducts is List
        ? rawProducts
            .whereType<Map>()
            .map((item) => Product.fromJson(Map<String, dynamic>.from(item)))
            .toList()
        : <Product>[];

    return FarmerSummary(
      id: json['id']?.toString() ?? '',
      farmName: json['farmName']?.toString() ?? 'FarmConnect Farm',
      farmerName: json['farmerName']?.toString() ??
          (json['user'] is Map ? (json['user']['name'] ?? '').toString() : null),
      phone: json['phone']?.toString() ??
          (json['user'] is Map ? (json['user']['phone'] ?? '').toString() : null),
      district: json['district']?.toString(),
      state: json['state']?.toString(),
      address: json['address']?.toString() ?? json['addressLine']?.toString(),
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      distanceKm: json['distanceKm'] == null ? null : _toDouble(json['distanceKm']),
      isVerified: json['isVerified'] == true,
      profileViews: json['profileViews'] is num ? (json['profileViews'] as num).toInt() : 0,
      products: products,
      bio: json['bio']?.toString(),
    );
  }
}
