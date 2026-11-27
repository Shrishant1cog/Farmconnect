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
import '../../../shared/widgets/product_card.dart';

/// Public farmer profile — parity with `/consumer/farmer/[id]`.
class FarmerDetailPage extends ConsumerStatefulWidget {
  const FarmerDetailPage({super.key, required this.farmerId});

  final String farmerId;

  @override
  ConsumerState<FarmerDetailPage> createState() => _FarmerDetailPageState();
}

class _FarmerDetailPageState extends ConsumerState<FarmerDetailPage> {
  FarmerSummary? _farmer;
  bool _loading = true;
  String? _error;
  bool _isFavorite = false;

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
      final farmer = await ref.read(catalogRepositoryProvider).fetchFarmer(widget.farmerId);
      if (!mounted) {
        return;
      }
      setState(() => _farmer = farmer);
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

  Future<void> _toggleFavorite() async {
    try {
      final isFavorite =
          await ref.read(engagementRepositoryProvider).toggleFavoriteFarmer(widget.farmerId);
      if (!mounted) {
        return;
      }
      final l10n = AppLocalizations.of(context);
      setState(() => _isFavorite = isFavorite);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isFavorite ? l10n.consumerFavoriteAdded : l10n.consumerFavoriteRemoved,
          ),
        ),
      );
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.consumerRequestFailed(error.message))),
        );
      }
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.commonSomethingWrong)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _farmer?.farmName ?? l10n.commonFarmer,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            onPressed: _toggleFavorite,
            icon: Icon(
              _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: _isFavorite ? const Color(0xFFDC2626) : null,
            ),
            tooltip: l10n.navFavorites,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final farmer = _farmer!;
    final locale = Localizations.localeOf(context).toString();
    final numberFormat = NumberFormat.decimalPattern(locale);
    final profileViews = numberFormat.format(farmer.profileViews);
    final harvestLots = numberFormat.format(farmer.products.length);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: AppTheme.emerald.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.agriculture_rounded, color: AppTheme.emeraldDark),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  farmer.farmName,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                                ),
                              ),
                              if (farmer.isVerified) ...[
                                const SizedBox(width: 6),
                                const Icon(Icons.verified_rounded,
                                    size: 17, color: AppTheme.emeraldDark),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            [
                              if (farmer.farmerName != null) farmer.farmerName!,
                              if (farmer.district != null) farmer.district!,
                            ].join(' · '),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppTheme.stone500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (farmer.bio != null && farmer.bio!.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(farmer.bio!, style: const TextStyle(height: 1.5, color: AppTheme.stone700)),
                ],
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _stat(
                      Icons.place_outlined,
                      farmer.district?.trim().isNotEmpty == true
                          ? farmer.district!.trim()
                          : l10n.commonUnknown,
                    ),
                    _stat(
                      Icons.visibility_outlined,
                      l10n.consumerProfileViews(profileViews),
                    ),
                    _stat(
                      Icons.inventory_2_outlined,
                      l10n.consumerHarvestLotsCount(harvestLots),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        Text(
          l10n.consumerActiveHarvestLots,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        if (farmer.products.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Text(
                l10n.consumerNoActiveHarvestLots,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.stone500, fontWeight: FontWeight.w600),
              ),
            ),
          )
        else
          ...farmer.products.map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ProductCard(
                product: product,
                onTap: () => context.push('/product/${product.id}'),
              ),
            ),
          ),
      ],
    );
  }

  Widget _stat(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.stone50,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.stone200),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.65,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppTheme.stone700),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
