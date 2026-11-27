import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/farmer_card.dart';
import '../../../shared/widgets/product_card.dart';

/// Favourites — backed by the shared `FavouriteProduct` / `FavouriteFarmer` tables.
class FavoritesPage extends ConsumerStatefulWidget {
  const FavoritesPage({super.key});

  @override
  ConsumerState<FavoritesPage> createState() => _FavoritesPageState();
}

class _FavoritesPageState extends ConsumerState<FavoritesPage> {
  List<Product> _products = const [];
  List<FarmerSummary> _farmers = const [];
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
      final favorites = await ref.read(engagementRepositoryProvider).fetchFavorites();
      if (!mounted) {
        return;
      }
      setState(() {
        _products = favorites.products;
        _farmers = favorites.farmers;
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

  @override
  Widget build(BuildContext context) {
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
    if (_products.isEmpty && _farmers.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No favourites yet',
            message: 'Tap the heart on a listing or a farm to keep it handy for later.',
            icon: Icons.favorite_border_rounded,
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        if (_products.isNotEmpty) ...[
          const Text(
            'Favourite listings',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          ..._products.map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ProductCard(
                product: product,
                onTap: () => context.push('/product/${product.id}'),
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
        if (_farmers.isNotEmpty) ...[
          const Text(
            'Favourite cultivators',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          ..._farmers.map(
            (farmer) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: FarmerCard(
                farmer: farmer,
                onTap: () => context.push('/farmer/${farmer.id}'),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
