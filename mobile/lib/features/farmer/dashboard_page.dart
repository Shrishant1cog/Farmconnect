import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/misc.dart';
import '../../../data/models/product.dart';
import '../../../shared/widgets/app_states.dart';

/// Farmer dashboard — parity with `/farmer/dashboard`.
class FarmerDashboardPage extends ConsumerStatefulWidget {
  const FarmerDashboardPage({super.key});

  @override
  ConsumerState<FarmerDashboardPage> createState() => _FarmerDashboardPageState();
}

class _FarmerDashboardPageState extends ConsumerState<FarmerDashboardPage> {
  FarmerDashboard? _dashboard;
  List<Product> _products = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dashboard = await ref.read(catalogRepositoryProvider).fetchFarmerDashboard();
      final products = await ref.read(catalogRepositoryProvider).fetchMyProducts();
      if (!mounted) {
        return;
      }
      setState(() {
        _dashboard = dashboard;
        _products = products;
      });
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = error.displayMessage);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _toggleAvailability(Product product) async {
    try {
      await ref.read(catalogRepositoryProvider).updateProduct(
            product.id,
            isAvailable: !product.isAvailable,
          );
      ref.read(catalogRevisionProvider.notifier).state++;
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(catalogRevisionProvider, (previous, next) {
      if (previous != next) {
        _load();
      }
    });
    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.emerald,
      child: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }

    final dashboard = _dashboard!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        Text(
          dashboard.farmerName,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _statCard('Harvest lots', dashboard.totalProducts, Icons.inventory_2_outlined),
            _statCard('Available', dashboard.availableProducts, Icons.check_circle_outline),
            _statCard('Enquiries', dashboard.totalEnquiries, Icons.forum_outlined),
            _statCard('Profile views', dashboard.profileViews, Icons.visibility_outlined),
          ],
        ),
        const SizedBox(height: 22),
        Row(
          children: [
            const Expanded(
              child: Text(
                'My harvest batches',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
              ),
            ),
            FilledButton.icon(
              onPressed: () => context.push('/farmer/products/new'),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('List lot'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 42),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_products.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(22),
              child: Text(
                'No Harvest Batches Found',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.stone500, fontWeight: FontWeight.w600),
              ),
            ),
          )
        else
          ..._products.map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: AppTheme.stone50,
                          borderRadius: BorderRadius.circular(12),
                          image: product.imageUrl == null
                              ? null
                              : DecorationImage(
                                  image: NetworkImage(product.imageUrl!),
                                  fit: BoxFit.cover,
                                ),
                        ),
                        child: product.imageUrl == null
                            ? const Icon(Icons.agriculture_rounded, color: AppTheme.stone200)
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${Formatters.currency(product.farmerPrice)} · ${Formatters.quantity(product.quantityAvailable, product.quantityUnit)}',
                              style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: product.isAvailable,
                        onChanged: (_) => _toggleAvailability(product),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _statCard(String label, int value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: AppTheme.emeraldDark),
            const SizedBox(height: 8),
            Text(
              '$value',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
            Text(label, style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5)),
          ],
        ),
      ),
    );
  }
}
