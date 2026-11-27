import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/repositories/admin_repository.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/catalog_repository.dart';
import '../data/repositories/engagement_repository.dart';
import '../data/repositories/enquiry_repository.dart';
import '../data/repositories/order_repository.dart';
import '../data/repositories/user_repository.dart';
import 'network/api_client.dart';
import 'network/socket_service.dart';
import 'storage/token_storage.dart';

/// Dependency graph of the application.
///
/// Every repository talks to the *same* backend that serves the website, which
/// guarantees shared users, products, orders and conversations.
final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
});

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  ref.onDispose(service.disconnect);
  return service;
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    api: ref.watch(apiClientProvider),
    storage: ref.watch(tokenStorageProvider),
  );
});

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  return CatalogRepository(api: ref.watch(apiClientProvider));
});

/// Bumped whenever the signed-in farmer changes their own catalogue (create,
/// update or remove) so every screen listing those lots refreshes instead of
/// showing stale data until the app is restarted.
final catalogRevisionProvider = StateProvider<int>((ref) => 0);

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepository(api: ref.watch(apiClientProvider));
});

final enquiryRepositoryProvider = Provider<EnquiryRepository>((ref) {
  return EnquiryRepository(api: ref.watch(apiClientProvider));
});

final engagementRepositoryProvider = Provider<EngagementRepository>((ref) {
  return EngagementRepository(api: ref.watch(apiClientProvider));
});

final userRepositoryProvider = Provider<UserRepository>((ref) {
  return UserRepository(api: ref.watch(apiClientProvider));
});

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  return AdminRepository(api: ref.watch(apiClientProvider));
});
