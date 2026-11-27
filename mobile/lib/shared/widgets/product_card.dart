import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/product.dart';

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
                  const SizedBox(height: 4),
                  Text(
                    product.farmName ?? product.farmerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${Formatters.currency(product.farmerPrice)} / ${product.priceUnit.replaceFirst('PER_', '')}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                                color: AppTheme.stone900,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              product.isAvailable
                                  ? '${Formatters.quantity(product.quantityAvailable, product.quantityUnit)} available'
                                  : 'Currently unavailable',
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
