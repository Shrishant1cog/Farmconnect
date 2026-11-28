import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';
import 'cart_controller.dart';

/// Cart screen — parity with the website cart + `/checkout`.
class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final cart = ref.watch(cartControllerProvider);
    final controller = ref.read(cartControllerProvider.notifier);

    if (cart.isEmpty) {
      return EmptyState(
        title: l10n.consumerCartEmptyTitle,
        message: l10n.consumerCartEmptyMessage,
        icon: Icons.shopping_cart_outlined,
      );
    }

    final itemCount = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toString(),
    ).format(cart.totalQuantity);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        for (final line in cart.lines)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: AppTheme.stone50,
                        borderRadius: BorderRadius.circular(14),
                        image: line.product.imageUrl == null
                            ? null
                            : DecorationImage(
                                image: NetworkImage(line.product.imageUrl!),
                                fit: BoxFit.cover,
                              ),
                      ),
                      child: line.product.imageUrl == null
                          ? const Icon(Icons.agriculture_rounded, color: AppTheme.stone200)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            line.product.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_formatCurrency(context, line.product.farmerPrice)} / ${_priceUnitLabel(l10n, line.product.priceUnit)}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              IconButton.outlined(
                                onPressed: () => controller.updateQuantity(
                                  line.product.id,
                                  line.quantity - 1,
                                ),
                                icon: const Icon(Icons.remove_rounded, size: 18),
                                visualDensity: VisualDensity.compact,
                                tooltip: l10n.consumerDecreaseQuantity,
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text(
                                  _formatQuantity(
                                    context,
                                    line.quantity,
                                    l10n,
                                    line.product.quantityUnit,
                                  ),
                                  style: const TextStyle(fontWeight: FontWeight.w800),
                                ),
                              ),
                              IconButton.outlined(
                                onPressed: () => controller.updateQuantity(
                                  line.product.id,
                                  line.quantity + 1,
                                ),
                                icon: const Icon(Icons.add_rounded, size: 18),
                                visualDensity: VisualDensity.compact,
                                tooltip: l10n.consumerIncreaseQuantity,
                              ),
                              const Spacer(),
                              Text(
                                _formatCurrency(context, line.lineTotal),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => controller.remove(line.product.id),
                      icon: const Icon(Icons.close_rounded, size: 19),
                      color: AppTheme.stone500,
                      tooltip: l10n.commonDelete,
                    ),
                  ],
                ),
              ),
            ),
          ),
        const SizedBox(height: 6),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _summaryRow(l10n.consumerItems, itemCount),
                const SizedBox(height: 8),
                _summaryRow(
                  l10n.consumerItemsTotal,
                  _formatCurrency(context, cart.itemsTotal),
                ),
                const SizedBox(height: 8),
                _summaryRow(
                  l10n.consumerTransportAndContainer,
                  l10n.consumerCalculatedAtCheckout,
                  muted: true,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: () => context.push('/checkout'),
          icon: const Icon(Icons.local_shipping_outlined),
          label: Text(l10n.consumerProceedToCheckout),
        ),
      ],
    );
  }

  Widget _summaryRow(String label, String value, {bool muted = false}) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: muted ? AppTheme.stone500 : AppTheme.stone700,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: muted ? AppTheme.stone500 : AppTheme.stone900,
            ),
          ),
        ),
      ],
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
  final number = NumberFormat.decimalPattern(
    Localizations.localeOf(context).toString(),
  ).format(value);
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
