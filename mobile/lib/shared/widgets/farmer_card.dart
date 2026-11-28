import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/product.dart';
import '../../l10n/generated/app_localizations.dart';

/// Farmer tile used by the discovery list and the farmer map sheet.
class FarmerCard extends StatelessWidget {
  const FarmerCard({
    super.key,
    required this.farmer,
    this.onTap,
    this.onFavorite,
    this.isFavorite = false,
  });

  final FarmerSummary farmer;
  final VoidCallback? onTap;
  final VoidCallback? onFavorite;
  final bool isFavorite;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toString();
    final numberFormat = NumberFormat.decimalPattern(locale);

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: AppTheme.emerald.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.agriculture_rounded,
                  color: AppTheme.emeraldDark,
                ),
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
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        if (farmer.isVerified) ...[
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.verified_rounded,
                            size: 16,
                            color: AppTheme.emeraldDark,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (farmer.district != null) farmer.district!,
                        if (farmer.state != null) farmer.state!,
                      ].join(', '),
                      style: const TextStyle(
                        color: AppTheme.stone500,
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _Pill(
                          icon: Icons.inventory_2_outlined,
                          label: l10n.farmerCardLotsCount(
                            numberFormat.format(farmer.products.length),
                          ),
                        ),
                        if (farmer.distanceKm != null)
                          _Pill(
                            icon: Icons.near_me_outlined,
                            label: _formatDistance(
                              l10n,
                              numberFormat,
                              farmer.distanceKm!,
                            ),
                          ),
                        if (farmer.farmerName != null)
                          _Pill(
                            icon: Icons.person_outline,
                            label: farmer.farmerName!,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (onFavorite != null)
                IconButton(
                  onPressed: onFavorite,
                  icon: Icon(
                    isFavorite
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    color: isFavorite
                        ? const Color(0xFFDC2626)
                        : AppTheme.stone500,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatDistance(
  AppLocalizations l10n,
  NumberFormat numberFormat,
  double distanceKm,
) {
  if (distanceKm < 1) {
    return l10n.commonMetersAway(
      numberFormat.format((distanceKm * 1000).round()),
    );
  }
  return l10n.commonKilometersAway(
    numberFormat.format(double.parse(distanceKm.toStringAsFixed(1))),
  );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.stone50,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.stone200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppTheme.stone700),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 180),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: AppTheme.stone700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Coloured chip for an order status.
class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({super.key, required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
