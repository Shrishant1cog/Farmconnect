import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/product.dart';
import '../../../shared/widgets/app_states.dart';

/// Harvest inventory management — parity with `/farmer/products`.
class FarmerProductsPage extends ConsumerStatefulWidget {
  const FarmerProductsPage({super.key});

  @override
  ConsumerState<FarmerProductsPage> createState() => _FarmerProductsPageState();
}

class _FarmerProductsPageState extends ConsumerState<FarmerProductsPage> {
  List<Product> _products = const [];
  bool _loading = true;
  bool _onlyAvailable = false;
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
      final products = await ref.read(catalogRepositoryProvider).fetchMyProducts();
      if (!mounted) {
        return;
      }
      setState(() => _products = products);
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

  Future<void> _delete(Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Harvest Lot?'),
        content: Text('"${product.title}" will be removed from the marketplace.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    try {
      await ref.read(catalogRepositoryProvider).deleteProduct(product.id);
      ref.read(catalogRevisionProvider.notifier).state++;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Harvest lot removed')),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  List<Product> get _visibleProducts {
    if (!_onlyAvailable) {
      return _products;
    }
    return _products.where((product) => product.isAvailable).toList();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(catalogRevisionProvider, (previous, next) {
      if (previous != next) {
        _load();
      }
    });
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              FilterChip(
                selected: _onlyAvailable,
                onSelected: (value) => setState(() => _onlyAvailable = value),
                label: const Text('Available only'),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => context.push('/farmer/products/new'),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('New lot'),
                style: FilledButton.styleFrom(minimumSize: const Size(0, 42)),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: AppTheme.emerald,
            child: _buildBody(),
          ),
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_visibleProducts.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No Harvest Lots Found',
            message: 'List your first crop lot to reach buyers on the website and the app.',
            icon: Icons.inventory_2_outlined,
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      itemCount: _visibleProducts.length,
      itemBuilder: (context, index) {
        final product = _visibleProducts[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppTheme.stone50,
                          borderRadius: BorderRadius.circular(14),
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
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${Formatters.currency(product.farmerPrice)} / ${product.priceUnit.replaceFirst('PER_', '')} · ${Formatters.quantity(product.quantityAvailable, product.quantityUnit)}',
                              style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              product.isAvailable
                                  ? 'Available for buyers'
                                  : 'Marked unavailable',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: product.isAvailable
                                    ? AppTheme.emeraldDark
                                    : AppTheme.stone500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => context.push('/farmer/products/${product.id}/edit'),
                        icon: const Icon(Icons.edit_outlined, size: 17),
                        label: const Text('Edit'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 40),
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: () => _delete(product),
                        icon: const Icon(Icons.delete_outline_rounded, size: 17),
                        label: const Text('Remove'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 40),
                          foregroundColor: const Color(0xFFDC2626),
                          backgroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
