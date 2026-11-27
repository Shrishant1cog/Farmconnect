import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/product_card.dart';
import 'cart_controller.dart';

/// Marketplace screen — parity with `/consumer/explore` on the website.
class ExplorePage extends ConsumerStatefulWidget {
  const ExplorePage({super.key});

  @override
  ConsumerState<ExplorePage> createState() => _ExplorePageState();
}

class _ExplorePageState extends ConsumerState<ExplorePage> {
  final _searchController = TextEditingController();

  List<Product> _products = const [];
  bool _loading = true;
  bool _organicOnly = false;
  String? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final products = await ref.read(catalogRepositoryProvider).fetchProducts(search: _search);
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

  List<Product> get _visibleProducts {
    if (!_organicOnly) {
      return _products;
    }
    return _products.where((product) => product.isOrganic).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildSearchBar(),
        _buildFilterBar(),
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

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        textInputAction: TextInputAction.search,
        onSubmitted: (value) {
          setState(() => _search = value.trim());
          _load();
        },
        decoration: InputDecoration(
          hintText: 'Search tomatoes, ragi, farms…',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: IconButton(
            tooltip: 'Search',
            onPressed: () {
              setState(() => _search = _searchController.text.trim());
              _load();
            },
            icon: const Icon(Icons.arrow_forward_rounded),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          FilterChip(
            selected: _organicOnly,
            onSelected: (value) => setState(() => _organicOnly = value),
            avatar: const Icon(Icons.eco_rounded, size: 16),
            label: const Text('Organic only'),
          ),
          const SizedBox(width: 10),
          Text(
            '${_visibleProducts.length} listings',
            style: const TextStyle(color: AppTheme.stone500, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView(message: 'Loading the marketplace…');
    }

    if (_error != null) {
      return ListView(
        children: [ErrorView(message: _error!, onRetry: _load)],
      );
    }

    if (_visibleProducts.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No Produce Listings Found',
            message: 'Try a different search term or clear the organic filter.',
            icon: Icons.shopping_basket_outlined,
          ),
        ],
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 260,
        childAspectRatio: 0.72,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
      ),
      itemCount: _visibleProducts.length,
      itemBuilder: (context, index) {
        final product = _visibleProducts[index];
        return ProductCard(
          product: product,
          onTap: () => context.push('/product/${product.id}'),
          onAddToCart: () {
            ref.read(cartControllerProvider.notifier).add(product);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${product.title} added to the cart')),
            );
          },
        );
      },
    );
  }
}
