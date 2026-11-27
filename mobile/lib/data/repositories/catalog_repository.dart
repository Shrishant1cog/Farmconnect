import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/misc.dart';
import '../models/product.dart';

/// Catalog, discovery, market-rate and logistics repository.
class CatalogRepository {
  CatalogRepository({required ApiClient api})
      // Named parameters cannot start with an underscore, so an initializing
      // formal is not applicable here.
      // ignore: prefer_initializing_formals
      : _api = api;

  final ApiClient _api;

  /// Public product feed with the same filters the website offers.
  Future<List<Product>> fetchProducts({
    String? search,
    String? category,
    String? district,
    String? crop,
  }) async {
    final payload = await _api.get(
      ApiEndpoints.products,
      query: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (district != null && district.isNotEmpty) 'district': district,
        if (crop != null && crop.isNotEmpty) 'crop': crop,
      },
    );

    return ApiClient.extractList(payload, keys: ['data', 'products'])
        .whereType<Map>()
        .map((item) => Product.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  /// Crop categories shared with the website (used by the crop filters).
  Future<List<CropCategory>> fetchCropCategories() async {
    final payload = await _api.get(ApiEndpoints.catalogCategories);
    return ApiClient.extractList(payload, keys: ['data', 'categories'])
        .whereType<Map>()
        .map((item) => CropCategory.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  /// Searchable crop catalogue (English, Kannada and Hindi aliases).
  Future<List<CropSuggestion>> fetchCropSuggestions({
    String? search,
    String? category,
  }) async {
    final payload = await _api.get(
      ApiEndpoints.catalogCrops,
      query: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
      },
    );

    return ApiClient.extractList(payload, keys: ['data', 'crops'])
        .whereType<Map>()
        .map((item) => CropSuggestion.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<Product> fetchProduct(String id) async {
    final payload = await _api.get(ApiEndpoints.product(id));
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['product'] ?? map;
    if (raw is! Map) {
      throw StateError('Product not found.');
    }
    return Product.fromJson(Map<String, dynamic>.from(raw));
  }

  /// Harvest lots owned by the signed-in farmer.
  Future<List<Product>> fetchMyProducts() async {
    final payload = await _api.get(ApiEndpoints.myProducts);
    return ApiClient.extractList(payload, keys: ['data', 'products'])
        .whereType<Map>()
        .map((item) => Product.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<Product> createProduct({
    required String title,
    required String description,
    required double farmerPrice,
    required double quantityAvailable,
    String priceUnit = 'PER_KG',
    String quantityUnit = 'KG',
    double minOrderKg = 10,
    String grade = 'Grade-A Export',
    String location = 'Karnataka',
    bool isOrganic = false,
    String? imageUrl,
    String? categoryId,
    String? cropName,
    String? variety,
  }) async {
    final payload = await _api.post(ApiEndpoints.products, body: {
      'title': title,
      'description': description,
      'farmerPrice': farmerPrice,
      'priceUnit': priceUnit,
      'quantityAvailable': quantityAvailable,
      'quantityUnit': quantityUnit,
      'minOrderKg': minOrderKg,
      'grade': grade,
      'location': location,
      'isOrganic': isOrganic,
      if (imageUrl != null && imageUrl.isNotEmpty) 'imageUrl': imageUrl,
      if (categoryId != null && categoryId.isNotEmpty) 'categoryId': categoryId,
      if (cropName != null && cropName.isNotEmpty) 'cropName': cropName,
      if (variety != null && variety.isNotEmpty) 'variety': variety,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['product'] ?? map;
    if (raw is! Map) {
      throw StateError('The listing could not be created.');
    }
    return Product.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<Product> updateProduct(
    String id, {
    String? title,
    String? description,
    double? farmerPrice,
    double? quantityAvailable,
    String? priceUnit,
    String? quantityUnit,
    double? minOrderKg,
    String? grade,
    String? location,
    bool? isOrganic,
    bool? isAvailable,
    String? imageUrl,
    String? categoryId,
    String? cropName,
    String? variety,
  }) async {
    final payload = await _api.patch(ApiEndpoints.product(id), body: {
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (farmerPrice != null) 'farmerPrice': farmerPrice,
      if (quantityAvailable != null) 'quantityAvailable': quantityAvailable,
      if (priceUnit != null) 'priceUnit': priceUnit,
      if (quantityUnit != null) 'quantityUnit': quantityUnit,
      if (minOrderKg != null) 'minOrderKg': minOrderKg,
      if (grade != null) 'grade': grade,
      if (location != null) 'location': location,
      if (isOrganic != null) 'isOrganic': isOrganic,
      if (isAvailable != null) 'isAvailable': isAvailable,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (categoryId != null && categoryId.isNotEmpty) 'categoryId': categoryId,
      if (cropName != null) 'cropName': cropName,
      if (variety != null) 'variety': variety,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['product'] ?? map;
    if (raw is! Map) {
      throw StateError('The listing could not be updated.');
    }
    return Product.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<void> deleteProduct(String id) async {
    await _api.delete(ApiEndpoints.product(id));
  }

  /// Public farmer directory (used by the consumer map and farmer discovery).
  Future<List<FarmerSummary>> fetchFarmers({String? district, String? search}) async {
    final payload = await _api.get(
      ApiEndpoints.farmerDirectory,
      query: {
        if (district != null && district.isNotEmpty) 'district': district,
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );

    return ApiClient.extractList(payload, keys: ['data', 'farmers'])
        .whereType<Map>()
        .map((item) => FarmerSummary.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  /// Farmers with distance information for the map screen.
  Future<List<FarmerSummary>> fetchFarmersOnMap({
    double? latitude,
    double? longitude,
    double? maxDistanceKm,
  }) async {
    final payload = await _api.get(
      ApiEndpoints.farmerMap,
      query: {
        if (latitude != null) 'lat': latitude,
        if (longitude != null) 'lon': longitude,
        if (maxDistanceKm != null) 'maxDistanceKm': maxDistanceKm,
      },
    );

    return ApiClient.extractList(payload, keys: ['data', 'farmers'])
        .whereType<Map>()
        .map((item) => FarmerSummary.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<FarmerSummary> fetchFarmer(String id) async {
    final payload = await _api.get(ApiEndpoints.farmer(id));
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map['farmer'] ?? map;
    if (raw is! Map) {
      throw StateError('Farmer profile not found.');
    }
    return FarmerSummary.fromJson(Map<String, dynamic>.from(raw));
  }

  /// APMC mandi rates.
  Future<List<MarketRate>> fetchMarketRates() async {
    final payload = await _api.get(ApiEndpoints.apmcRates);
    return ApiClient.extractList(payload, keys: ['data', 'rates'])
        .whereType<Map>()
        .map((item) => MarketRate.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  /// Logistics cost + profit calculation.
  ///
  /// The quantity, the farmer's price and the four coordinates are
  /// **mandatory** — the backend rejects a missing value with HTTP 400
  /// instead of substituting a made-up default.
  ///
  /// [apmcModalPricePerQuintal] is **optional**: when the shared database
  /// holds no published benchmark for the crop the backend reports the
  /// profit assessment as unknown rather than deriving it from the farmer's
  /// own rate.
  Future<LogisticsQuote> fetchLogisticsQuote({
    required double cropQuantityKg,
    required double farmerPricePerKg,
    required double originLat,
    required double originLon,
    required double destLat,
    required double destLon,
    String containerType = 'STANDARD_CRATE',
    double? apmcModalPricePerQuintal,
  }) async {
    final payload = await _api.post(ApiEndpoints.logisticsQuote, body: {
      'cropQuantityKg': cropQuantityKg,
      'farmerPricePerKg': farmerPricePerKg,
      'originLat': originLat,
      'originLon': originLon,
      'destLat': destLat,
      'destLon': destLon,
      'containerType': containerType,
      if (apmcModalPricePerQuintal != null && apmcModalPricePerQuintal > 0)
        'apmcModalPricePerQuintal': apmcModalPricePerQuintal,
    });

    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map;
    if (raw is! Map) {
      throw StateError('The logistics quote could not be calculated.');
    }
    return LogisticsQuote.fromJson(Map<String, dynamic>.from(raw));
  }

  /// Farmer dashboard statistics.
  Future<FarmerDashboard> fetchFarmerDashboard() async {
    final payload = await _api.get(ApiEndpoints.farmerDashboard);
    final map = payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{};
    final raw = map['data'] ?? map;
    if (raw is! Map) {
      throw StateError('Dashboard data is unavailable.');
    }
    return FarmerDashboard.fromJson(Map<String, dynamic>.from(raw));
  }
}
