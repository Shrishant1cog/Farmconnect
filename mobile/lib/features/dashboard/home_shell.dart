import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/user.dart';
import '../../l10n/generated/app_localizations.dart';
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
import '../../shared/widgets/language_selector.dart';

/// A single bottom-navigation destination.
class _Tab {
  const _Tab({
    required this.label,
    required this.icon,
    required this.title,
    required this.builder,
  });

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

  List<_Tab> _tabsFor(UserRole role, AppLocalizations l10n) {
    if (role == UserRole.farmer) {
      return [
        _Tab(
          label: l10n.navDashboard,
          icon: Icons.dashboard_outlined,
          title: l10n.homeFarmerDashboardTitle,
          builder: (_) => const FarmerDashboardPage(),
        ),
        _Tab(
          label: l10n.navLots,
          icon: Icons.inventory_2_outlined,
          title: l10n.homeHarvestInventoryTitle,
          builder: (_) => const FarmerProductsPage(),
        ),
        _Tab(
          label: l10n.navOrders,
          icon: Icons.receipt_long_outlined,
          title: l10n.homeIncomingOrdersTitle,
          builder: (_) => const FarmerOrdersPage(),
        ),
        _Tab(
          label: l10n.navEnquiries,
          icon: Icons.forum_outlined,
          title: l10n.homeCustomerInquiriesTitle,
          builder: (_) => const EnquiriesPage(farmerView: true),
        ),
        _Tab(
          label: l10n.navProfile,
          icon: Icons.person_outline_rounded,
          title: l10n.profileTitle,
          builder: (_) => const ProfilePage(),
        ),
      ];
    }

    if (role == UserRole.admin) {
      return [
        _Tab(
          label: l10n.homeConsoleLabel,
          icon: Icons.admin_panel_settings_outlined,
          title: l10n.homeAdminConsoleTitle,
          builder: (_) => const AdminDashboardPage(),
        ),
        _Tab(
          label: l10n.homeRatesLabel,
          icon: Icons.query_stats_rounded,
          title: l10n.profileApmcRates,
          builder: (_) => const MarketRatesPage(),
        ),
        _Tab(
          label: l10n.navProfile,
          icon: Icons.person_outline_rounded,
          title: l10n.profileTitle,
          builder: (_) => const ProfilePage(),
        ),
      ];
    }

    return [
      _Tab(
        label: l10n.navExplore,
        icon: Icons.shopping_bag_outlined,
        title: l10n.homeMarketplaceTitle,
        builder: (_) => const ExplorePage(),
      ),
      _Tab(
        label: l10n.navMap,
        icon: Icons.map_outlined,
        title: l10n.navMap,
        builder: (_) => const FarmerMapPage(),
      ),
      _Tab(
        label: l10n.navOrders,
        icon: Icons.receipt_long_outlined,
        title: l10n.homeMyOrdersTitle,
        builder: (_) => const OrdersPage(),
      ),
      _Tab(
        label: l10n.navCart,
        icon: Icons.shopping_cart_outlined,
        title: l10n.homeMyCartTitle,
        builder: (_) => const CartPage(),
      ),
      _Tab(
        label: l10n.navProfile,
        icon: Icons.person_outline_rounded,
        title: l10n.profileTitle,
        builder: (_) => const ProfilePage(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(currentUserProvider);
    final role = user?.role ?? UserRole.consumer;
    final tabs = _tabsFor(role, l10n);

    if (_index >= tabs.length) {
      _index = 0;
    }

    final tab = tabs[_index];

    return Scaffold(
      appBar: AppBar(
        title: Text(tab.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          // The language selector lives in the app bar so it is reachable
          // from every screen of the app, not only from the profile.
          const LanguageSelector(compact: true, showLabel: false),
          if (role == UserRole.consumer) ...[
            IconButton(
              onPressed: () => context.push('/market-rates'),
              icon: const Icon(Icons.query_stats_rounded),
              tooltip: l10n.navMarketRates,
            ),
            IconButton(
              onPressed: () => context.push('/notifications'),
              icon: const Icon(Icons.notifications_none_rounded),
              tooltip: l10n.navNotifications,
            ),
          ],
          if (role == UserRole.farmer)
            IconButton(
              onPressed: () => context.push('/notifications'),
              icon: const Icon(Icons.notifications_none_rounded),
              tooltip: l10n.navNotifications,
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
            NavigationDestination(icon: Icon(item.icon), label: item.label),
        ],
      ),
      floatingActionButton: role == UserRole.farmer && _index == 1
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/farmer/products/new'),
              backgroundColor: AppTheme.emerald,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: Text(l10n.farmerDashboardListLot),
            )
          : null,
    );
  }
}
