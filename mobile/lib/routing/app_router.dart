import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/providers.dart';
import '../features/admin/admin_dashboard_page.dart';
import '../features/auth/auth_controller.dart';
import '../features/auth/login_page.dart';
import '../features/auth/register_page.dart';
import '../features/chat/chat_page.dart';
import '../features/chat/enquiries_page.dart';
import '../features/consumer/cart_page.dart';
import '../features/consumer/checkout_page.dart';
import '../features/consumer/farmer_detail_page.dart';
import '../features/consumer/orders_page.dart';
import '../features/consumer/product_detail_page.dart';
import '../features/dashboard/home_shell.dart';
import '../features/farmer/product_form_page.dart';
import '../features/favorites/favorites_page.dart';
import '../features/logistics/logistics_page.dart';
import '../features/market_rates/market_rates_page.dart';
import '../features/notifications/notifications_page.dart';
import '../features/orders/order_detail_page.dart';
import '../features/profile/complaints_page.dart';
import '../features/profile/profile_page.dart';

/// Declarative routing for the application.
///
/// The router protects every screen that requires a session and redirects
/// signed-in users away from the authentication screens.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);

  ref.listen<AuthState>(authControllerProvider, (previous, next) {
    refresh.value++;
  });

  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/home',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);

      return resolveAuthRedirect(
        isRestoring: auth.isRestoring,
        isAuthenticated: auth.isAuthenticated,
        location: state.matchedLocation,
      );
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const _SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeShell(),
      ),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) => ProductDetailPage(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/farmer/:id',
        builder: (context, state) => FarmerDetailPage(farmerId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/cart',
        builder: (context, state) => const CartPage(),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => const CheckoutPage(),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersPage(),
      ),
      GoRoute(
        path: '/order/:id',
        builder: (context, state) => OrderDetailPage(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/enquiries',
        builder: (context, state) => const EnquiriesPage(),
      ),
      GoRoute(
        path: '/chat/:id',
        builder: (context, state) => ChatPage(enquiryId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/market-rates',
        builder: (context, state) => const MarketRatesPage(),
      ),
      GoRoute(
        path: '/logistics',
        builder: (context, state) => const LogisticsPage(),
      ),
      GoRoute(
        path: '/favorites',
        builder: (context, state) => const FavoritesPage(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        path: '/complaints',
        builder: (context, state) => const ComplaintsPage(),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardPage(),
      ),
      GoRoute(
        path: '/farmer/products/new',
        builder: (context, state) => const ProductFormPage(),
      ),
      GoRoute(
        path: '/farmer/products/:id/edit',
        builder: (context, state) => _EditProductRoute(productId: state.pathParameters['id']!),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('FarmConnect')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.explore_off_outlined, size: 46, color: Colors.grey),
              const SizedBox(height: 14),
              Text(
                'This screen is not available (${state.error})',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => context.go('/home'),
                child: const Text('Back to home'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
});

/// Resolves the route the user has to be sent to.
///
/// The function is intentionally pure so the session-restore behaviour can be
/// unit tested without building the whole widget tree.
///
/// * While the session is being restored every route redirects to `/splash`.
/// * The splash screen is only a placeholder: as soon as the restore finished
///   the user has to leave it — signed-in users go to `/home`, everybody else
///   to `/login`. Without this the app would stay on the splash screen forever
///   after an app restart, because a restored session is authenticated while
///   the splash route is not an authentication route.
/// * Signed-out users may only stay on the authentication routes, signed-in
///   users are redirected away from them.
String? resolveAuthRedirect({
  required bool isRestoring,
  required bool isAuthenticated,
  required String location,
}) {
  if (isRestoring) {
    return '/splash';
  }

  final isAuthRoute = location == '/login' || location == '/register';

  if (location == '/splash') {
    return isAuthenticated ? '/home' : '/login';
  }

  if (!isAuthenticated && !isAuthRoute) {
    return '/login';
  }

  if (isAuthenticated && isAuthRoute) {
    return '/home';
  }

  return null;
}

class _SplashPage extends StatelessWidget {
  const _SplashPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.agriculture_rounded, size: 54, color: Color(0xFF10B981)),
            SizedBox(height: 18),
            Text(
              'FarmConnect',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 18),
            SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(strokeWidth: 2.4),
            ),
          ],
        ),
      ),
    );
  }
}

/// Loads the product before opening the edit form.
class _EditProductRoute extends ConsumerStatefulWidget {
  const _EditProductRoute({required this.productId});

  final String productId;

  @override
  ConsumerState<_EditProductRoute> createState() => _EditProductRouteState();
}

class _EditProductRouteState extends ConsumerState<_EditProductRoute> {
  late Future<dynamic> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<dynamic> _load() async {
    final repository = ref.read(catalogRepositoryProvider);
    return repository.fetchProduct(widget.productId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<dynamic>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Modify Crop Lot')),
            body: Center(child: Text('${snapshot.error}')),
          );
        }
        return ProductFormPage(product: snapshot.data as dynamic);
      },
    );
  }
}
