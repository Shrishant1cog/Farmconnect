import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
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

  Future<void> _toggleFavorite() async {
    try {
      final isFavorite =
          await ref.read(engagementRepositoryProvider).toggleFavoriteFarmer(widget.farmerId);
      if (!mounted) {
        return;
      }
      setState(() => _isFavorite = isFavorite);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isFavorite ? 'Added to favourites' : 'Removed from favourites')),
      );
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_farmer?.farmName ?? 'Cultivator'),
        actions: [
          IconButton(
            onPressed: _toggleFavorite,
            icon: Icon(
              _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: _isFavorite ? const Color(0xFFDC2626) : null,
            ),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final farmer = _farmer!;
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
                    _stat(Icons.place_outlined, farmer.district ?? 'Karnataka'),
                    _stat(Icons.visibility_outlined, '${farmer.profileViews} views'),
                    _stat(Icons.inventory_2_outlined, '${farmer.products.length} lots'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        const Text(
          'Active Harvest Lots',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        if (farmer.products.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(22),
              child: Text(
                'No Active Harvest Lots Ready',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.stone500, fontWeight: FontWeight.w600),
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
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.stone700),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
