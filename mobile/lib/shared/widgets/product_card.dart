import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/product.dart';
import '../../l10n/generated/app_localizations.dart';

/// Marketplace tile for a harvest listing (parity with `ProductCard.tsx`).
class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
    this.onAddToCart,
    this.trailing,
  });

  final Product product;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final cropDetails = <String>[
      if (product.cropName?.trim().isNotEmpty == true)
        '${l10n.commonCrop}: ${product.cropName!.trim()}',
      if (product.variety?.trim().isNotEmpty == true)
        '${l10n.commonVariety}: ${product.variety!.trim()}',
    ];
    final producerName = _producerName(product);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 10,
              child: product.imageUrl == null || product.imageUrl!.isEmpty
                  ? const _ImageFallback()
                  : CachedNetworkImage(
                      imageUrl: product.imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const _ImageFallback(),
                      errorWidget: (_, __, ___) => const _ImageFallback(),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          product.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                        ),
                      ),
                      if (product.isOrganic)
                        const Padding(
                          padding: EdgeInsets.only(left: 6),
                          child: Icon(Icons.eco_rounded, size: 17, color: AppTheme.emeraldDark),
                        ),
                    ],
                  ),
                  if (cropDetails.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      cropDetails.join(' · '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.stone700, fontSize: 12.5),
                    ),
                  ],
                  if (producerName != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      producerName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_formatCurrency(context, product.farmerPrice)} / ${_priceUnitLabel(l10n, product.priceUnit)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                                color: AppTheme.stone900,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              product.isAvailable
                                  ? '${_formatQuantity(context, product.quantityAvailable, l10n, product.quantityUnit)} ${l10n.commonAvailable}'
                                  : l10n.commonUnavailable,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: product.isAvailable ? AppTheme.emeraldDark : AppTheme.stone500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (onAddToCart != null)
                        IconButton.filled(
                          onPressed: product.isAvailable ? onAddToCart : null,
                          icon: const Icon(Icons.add_shopping_cart_rounded, size: 19),
                          style: IconButton.styleFrom(
                            backgroundColor: AppTheme.emerald,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      if (trailing != null) trailing!,
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.stone50,
      alignment: Alignment.center,
      child: const Icon(Icons.agriculture_rounded, size: 40, color: AppTheme.stone200),
    );
  }
}

String? _producerName(Product product) {
  final farmName = product.farmName?.trim();
  if (farmName?.isNotEmpty == true) {
    return farmName;
  }
  final user = product.farmer?['user'];
  final userName = user is Map ? user['name']?.toString().trim() : null;
  if (userName?.isNotEmpty == true) {
    return userName;
  }
  return null;
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
