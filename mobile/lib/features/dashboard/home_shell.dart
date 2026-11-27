import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/user.dart';
import '../admin/admin_dashboard_page.dart';
import '../auth/auth_controller.dart';
import '../chat/enquiries_page.dart';
import '../consumer/cart_page.dart';
import '../consumer/explore_page.dart';
import '../consumer/orders_page.dart';
import '../farmer/dashboard_page.dart';
import '../farmer/orders_page.dart';
import '../farmer/products_page.dart';
import '../map/farmer_map_page.dart';
import '../market_rates/market_rates_page.dart';
import '../profile/profile_page.dart';

/// A single bottom-navigation destination.
class _Tab {
  const _Tab({required this.label, required this.icon, required this.title, required this.builder});

  final String label;
  final IconData icon;
  final String title;
  final WidgetBuilder builder;
}

/// Role aware bottom navigation shell.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  List<_Tab> _tabsFor(UserRole role) {
    if (role == UserRole.farmer) {
      return [
        _Tab(
          label: 'Dashboard',
          icon: Icons.dashboard_outlined,
          title: 'Farmer dashboard',
          builder: (_) => const FarmerDashboardPage(),
        ),
        _Tab(
          label: 'Lots',
          icon: Icons.inventory_2_outlined,
          title: 'Harvest inventory',
          builder: (_) => const FarmerProductsPage(),
        ),
        _Tab(
          label: 'Orders',
          icon: Icons.receipt_long_outlined,
          title: 'Incoming orders',
          builder: (_) => const FarmerOrdersPage(),
        ),
        _Tab(
          label: 'Enquiries',
          icon: Icons.forum_outlined,
          title: 'Customer inquiries',
          builder: (_) => const EnquiriesPage(farmerView: true),
        ),
        _Tab(
          label: 'Profile',
          icon: Icons.person_outline_rounded,
          title: 'My profile',
          builder: (_) => const ProfilePage(),
        ),
      ];
    }

    if (role == UserRole.admin) {
      return [
        _Tab(
          label: 'Console',
          icon: Icons.admin_panel_settings_outlined,
          title: 'Admin console',
          builder: (_) => const AdminDashboardPage(),
        ),
        _Tab(
          label: 'Rates',
          icon: Icons.query_stats_rounded,
          title: 'APMC mandi rates',
          builder: (_) => const MarketRatesPage(),
        ),
        _Tab(
          label: 'Profile',
          icon: Icons.person_outline_rounded,
          title: 'My profile',
          builder: (_) => const ProfilePage(),
        ),
      ];
    }

    return [
      _Tab(
        label: 'Explore',
        icon: Icons.shopping_bag_outlined,
        title: 'Marketplace',
        builder: (_) => const ExplorePage(),
      ),
      _Tab(
        label: 'Farm map',
        icon: Icons.map_outlined,
        title: 'Farm map',
        builder: (_) => const FarmerMapPage(),
      ),
      _Tab(
        label: 'Orders',
        icon: Icons.receipt_long_outlined,
        title: 'My orders',
        builder: (_) => const OrdersPage(),
      ),
      _Tab(
        label: 'Cart',
        icon: Icons.shopping_cart_outlined,
        title: 'My cart',
        builder: (_) => const CartPage(),
      ),
      _Tab(
        label: 'Profile',
        icon: Icons.person_outline_rounded,
        title: 'My profile',
        builder: (_) => const ProfilePage(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final role = user?.role ?? UserRole.consumer;
    final tabs = _tabsFor(role);

    if (_index >= tabs.length) {
      _index = 0;
    }

    final tab = tabs[_index];

    return Scaffold(
      appBar: AppBar(
        title: Text(tab.title),
        actions: [
          if (role == UserRole.consumer) ...[
            IconButton(
              onPressed: () => context.push('/market-rates'),
              icon: const Icon(Icons.query_stats_rounded),
              tooltip: 'APMC mandi rates',
            ),
            IconButton(
              onPressed: () => context.push('/notifications'),
              icon: const Icon(Icons.notifications_none_rounded),
              tooltip: 'Notifications',
            ),
          ],
          if (role == UserRole.farmer)
            IconButton(
              onPressed: () => context.push('/notifications'),
              icon: const Icon(Icons.notifications_none_rounded),
              tooltip: 'Notifications',
            ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [for (final item in tabs) item.builder(context)],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => setState(() => _index = index),
        destinations: [
          for (final item in tabs)
            NavigationDestination(
              icon: Icon(item.icon),
              label: item.label,
            ),
        ],
      ),
      floatingActionButton: role == UserRole.farmer && _index == 1
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/farmer/products/new'),
              backgroundColor: AppTheme.emerald,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: const Text('List lot'),
            )
          : null,
    );
  }
}
