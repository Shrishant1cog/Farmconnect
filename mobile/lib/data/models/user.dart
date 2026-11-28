/// Domain models mirroring the backend JSON payloads.
library;

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value) ?? 0;
  }
  return 0;
}

int _toInt(dynamic value) {
  if (value is num) {
    return value.toInt();
  }
  if (value is String) {
    return int.tryParse(value) ?? 0;
  }
  return 0;
}

/// Role of a FarmConnect account.
enum UserRole {
  farmer,
  consumer,
  admin;

  static UserRole fromString(String? raw) {
    switch (raw?.toUpperCase()) {
      case 'FARMER':
        return UserRole.farmer;
      case 'ADMIN':
        return UserRole.admin;
      default:
        return UserRole.consumer;
    }
  }

  String get wireValue {
    switch (this) {
      case UserRole.farmer:
        return 'FARMER';
      case UserRole.admin:
        return 'ADMIN';
      case UserRole.consumer:
        return 'CONSUMER';
    }
  }
}

/// Farmer profile attached to a [AppUser].
class FarmerProfile {
  const FarmerProfile({
    this.id,
    this.farmName,
    this.bio,
    this.district,
    this.state,
    this.addressLine,
    this.latitude,
    this.longitude,
    this.isVerified = false,
    this.profileViews = 0,
  });

  final String? id;
  final String? farmName;
  final String? bio;
  final String? district;
  final String? state;
  final String? addressLine;
  final double? latitude;
  final double? longitude;
  final bool isVerified;
  final int profileViews;

  factory FarmerProfile.fromJson(Map<String, dynamic> json) {
    return FarmerProfile(
      id: json['id']?.toString(),
      farmName: json['farmName']?.toString(),
      bio: json['bio']?.toString(),
      district: json['district']?.toString(),
      state: json['state']?.toString(),
      addressLine: json['addressLine']?.toString(),
      latitude: json['latitude'] == null ? null : _toDouble(json['latitude']),
      longitude: json['longitude'] == null ? null : _toDouble(json['longitude']),
      isVerified: json['isVerified'] == true,
      profileViews: _toInt(json['profileViews']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'farmName': farmName,
        'bio': bio,
        'district': district,
        'state': state,
        'addressLine': addressLine,
        'latitude': latitude,
        'longitude': longitude,
        'isVerified': isVerified,
        'profileViews': profileViews,
      };
}

/// Consumer profile attached to a [AppUser].
class ConsumerProfile {
  const ConsumerProfile({
    this.id,
    this.deliveryAddress,
    this.district,
    this.latitude,
    this.longitude,
  });

  final String? id;
  final String? deliveryAddress;
  final String? district;
  final double? latitude;
  final double? longitude;

  factory ConsumerProfile.fromJson(Map<String, dynamic> json) {
    return ConsumerProfile(
      id: json['id']?.toString(),
      deliveryAddress: json['deliveryAddress']?.toString() ?? json['address']?.toString(),
      district: json['district']?.toString(),
      latitude: json['latitude'] == null ? null : _toDouble(json['latitude']),
      longitude: json['longitude'] == null ? null : _toDouble(json['longitude']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'deliveryAddress': deliveryAddress,
        'district': district,
        'latitude': latitude,
        'longitude': longitude,
      };
}

/// Authenticated FarmConnect account.
class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.district,
    this.state,
    this.preferredLanguage = 'en',
    this.farmerProfile,
    this.consumerProfile,
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final UserRole role;
  final String? district;
  final String? state;

  /// Interface language stored on the shared account (en | kn | hi).
  final String preferredLanguage;
  final FarmerProfile? farmerProfile;
  final ConsumerProfile? consumerProfile;

  bool get isFarmer => role == UserRole.farmer;
  bool get isAdmin => role == UserRole.admin;
  bool get isConsumer => role == UserRole.consumer;

  String get displayName => name.isEmpty ? 'FarmConnect User' : name;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      role: UserRole.fromString(json['role']?.toString()),
      district: json['district']?.toString(),
      state: json['state']?.toString(),
      preferredLanguage: json['preferredLanguage']?.toString() ?? 'en',
      farmerProfile: json['farmerProfile'] is Map
          ? FarmerProfile.fromJson(Map<String, dynamic>.from(json['farmerProfile']))
          : null,
      consumerProfile: json['consumerProfile'] is Map
          ? ConsumerProfile.fromJson(Map<String, dynamic>.from(json['consumerProfile']))
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'role': role.wireValue,
        'district': district,
        'state': state,
        'preferredLanguage': preferredLanguage,
        'farmerProfile': farmerProfile?.toJson(),
        'consumerProfile': consumerProfile?.toJson(),
      };
}
