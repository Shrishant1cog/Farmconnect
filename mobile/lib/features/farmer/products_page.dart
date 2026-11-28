import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../l10n/generated/app_localizations.dart';
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
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.farmerRequestFailed(error.message));
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

  Future<void> _delete(Product product) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.farmerProductsRemoveTitle),
        content: Text(l10n.farmerProductsRemoveMessage(product.title)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: Text(l10n.commonDelete),
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
          SnackBar(content: Text(l10n.farmerProductsRemoved)),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.farmerRequestFailed(error.message))),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.commonSomethingWrong)),
        );
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
    final l10n = AppLocalizations.of(context);
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
              Flexible(
                child: FilterChip(
                  selected: _onlyAvailable,
                  onSelected: (value) => setState(() => _onlyAvailable = value),
                  label: Text(
                    l10n.farmerProductsAvailableOnly,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => context.push('/farmer/products/new'),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(
                  l10n.farmerProductsNewLot,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
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
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_visibleProducts.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.farmerProductsEmptyTitle,
            message: l10n.farmerProductsEmptyMessage,
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
        final cropDetails = <String>[
          if (product.cropName?.trim().isNotEmpty == true)
            '${l10n.commonCrop}: ${product.cropName!.trim()}',
          if (product.variety?.trim().isNotEmpty == true)
            '${l10n.commonVariety}: ${product.variety!.trim()}',
        ];
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
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            if (cropDetails.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                cropDetails.join(' · '),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppTheme.stone700,
                                  fontSize: 12.5,
                                ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              '${_formatCurrency(context, product.farmerPrice)} / ${_priceUnitLabel(l10n, product.priceUnit)} · ${_formatQuantity(context, product.quantityAvailable, l10n, product.quantityUnit)}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              product.isAvailable
                                  ? l10n.farmerProductsAvailableForBuyers
                                  : l10n.farmerProductsMarkedUnavailable,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
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
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/farmer/products/${product.id}/edit'),
                          icon: const Icon(Icons.edit_outlined, size: 17),
                          label: Text(
                            l10n.commonEdit,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            backgroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _delete(product),
                          icon: const Icon(Icons.delete_outline_rounded, size: 17),
                          label: Text(
                            l10n.commonDelete,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            foregroundColor: const Color(0xFFDC2626),
                            backgroundColor: Colors.white,
                          ),
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

String _formatCurrency(BuildContext context, num value) {
  final locale = Localizations.localeOf(context).toString();
  final formatted = NumberFormat.currency(
    locale: locale,
    symbol: '₹',
    decimalDigits: 2,
  ).format(value);
  return formatted.replaceFirst(RegExp(r'\.00$'), '');
}

String _formatQuantity(
  BuildContext context,
  num value,
  AppLocalizations l10n,
  String unit,
) {
  final number = NumberFormat.decimalPattern(Localizations.localeOf(context).toString())
      .format(value);
  return '$number ${_quantityUnitLabel(l10n, unit)}';
}

String _priceUnitLabel(AppLocalizations l10n, String unit) {
  switch (unit.toUpperCase()) {
    case 'PER_KG':
      return l10n.commonPerKg;
    case 'PER_QUINTAL':
      return l10n.farmerPerQuintal;
    case 'PER_DOZEN':
      return l10n.farmerPerDozen;
    case 'PER_TON':
      return l10n.farmerPerTon;
    default:
      return unit.replaceFirst('PER_', '').toLowerCase();
  }
}

String _quantityUnitLabel(AppLocalizations l10n, String unit) {
  switch (unit.toUpperCase()) {
    case 'KG':
      return l10n.commonKg;
    case 'QUINTAL':
      return l10n.farmerQuintal;
    case 'DOZEN':
      return l10n.farmerDozen;
    case 'TON':
      return l10n.farmerTon;
    default:
      return unit.toUpperCase();
  }
}
