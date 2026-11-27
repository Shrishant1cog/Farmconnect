import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/locale/locale_controller.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../l10n/generated/app_localizations.dart';
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
  List<CropCategory> _categories = const [];
  bool _loading = true;
  bool _loadingCategories = true;
  bool _organicOnly = false;
  String? _error;
  String? _categoryError;
  String? _selectedCategorySlug;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadCategories();
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
      final products = await ref.read(catalogRepositoryProvider).fetchProducts(
            search: _search,
            category: _selectedCategorySlug,
          );
      if (!mounted) {
        return;
      }
      setState(() => _products = products);
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.consumerRequestFailed(error.message));
      }
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.commonSomethingWrong);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadCategories() async {
    setState(() {
      _loadingCategories = true;
      _categoryError = null;
    });

    try {
      final categories = await ref
          .read(catalogRepositoryProvider)
          .fetchCropCategories();
      if (!mounted) {
        return;
      }
      setState(() => _categories = categories);
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _categoryError = l10n.consumerRequestFailed(error.message));
      }
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _categoryError = l10n.consumerCropCategoriesUnavailable);
      }
    } finally {
      if (mounted) {
        setState(() => _loadingCategories = false);
      }
    }
  }

  Future<void> _refresh() async {
    await Future.wait([_load(), _loadCategories()]);
  }

  void _selectCategory(String? slug) {
    if (_selectedCategorySlug == slug) {
      return;
    }
    setState(() => _selectedCategorySlug = slug);
    _load();
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
            onRefresh: _refresh,
            color: AppTheme.emerald,
            child: _buildBody(),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchBar() {
    final l10n = AppLocalizations.of(context);
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
          hintText: l10n.consumerExploreSearchHint,
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: IconButton(
            tooltip: l10n.commonSearch,
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
    final l10n = AppLocalizations.of(context);
    final count = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toString(),
    ).format(_visibleProducts.length);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCategoryFilters(l10n),
          const SizedBox(height: 6),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              FilterChip(
                selected: _organicOnly,
                onSelected: (value) => setState(() => _organicOnly = value),
                avatar: const Icon(Icons.eco_rounded, size: 16),
                label: Text(
                  l10n.consumerOrganicOnly,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                l10n.consumerListingCount(count),
                style: const TextStyle(
                  color: AppTheme.stone500,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryFilters(AppLocalizations l10n) {
    if (_loadingCategories) {
      return const SizedBox(
        height: 40,
        child: Align(
          alignment: Alignment.centerLeft,
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        ),
      );
    }

    if (_categoryError != null) {
      return Row(
        children: [
          Expanded(
            child: Text(
              _categoryError!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
            ),
          ),
          TextButton(
            onPressed: _loadCategories,
            child: Text(l10n.commonRetry),
          ),
        ],
      );
    }

    final categories = _categories
        .where((category) => category.slug?.trim().isNotEmpty == true)
        .toList();
    final languageCode = ref.watch(localeControllerProvider).languageCode;
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          FilterChip(
            selected: _selectedCategorySlug == null,
            onSelected: (_) => _selectCategory(null),
            label: Text(l10n.commonAll),
          ),
          for (final category in categories) ...[
            const SizedBox(width: 8),
            FilterChip(
              selected: _selectedCategorySlug == category.slug,
              onSelected: (_) => _selectCategory(category.slug),
              label: Text(
                category.displayName(languageCode).trim().isNotEmpty
                    ? category.displayName(languageCode).trim()
                    : l10n.commonUnknown,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return LoadingView(message: l10n.consumerExploreLoading);
    }

    if (_error != null) {
      return ListView(
        children: [ErrorView(message: _error!, onRetry: _load)],
      );
    }

    if (_visibleProducts.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.consumerExploreEmptyTitle,
            message: l10n.consumerExploreEmptyMessage,
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
              SnackBar(
                content: Text(l10n.consumerAddedToCart(product.title)),
              ),
            );
          },
        );
      },
    );
  }
}
