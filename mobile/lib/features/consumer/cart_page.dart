import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/widgets/app_states.dart';
import 'cart_controller.dart';

/// Cart screen — parity with the website cart + `/checkout`.
class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);
    final controller = ref.read(cartControllerProvider.notifier);

    if (cart.isEmpty) {
      return const EmptyState(
        title: 'Your Cart is Empty',
        message: 'Browse the marketplace and add harvest lots to start an order.',
        icon: Icons.shopping_cart_outlined,
      );
    }

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
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${Formatters.currency(line.product.farmerPrice)} / ${line.product.priceUnit.replaceFirst('PER_', '')}',
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
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text(
                                  Formatters.quantity(line.quantity, line.product.quantityUnit),
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
                              ),
                              const Spacer(),
                              Text(
                                Formatters.currency(line.lineTotal),
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
                _summaryRow('Items', cart.totalQuantity.toStringAsFixed(0)),
                const SizedBox(height: 8),
                _summaryRow('Items total', Formatters.currency(cart.itemsTotal)),
                const SizedBox(height: 8),
                _summaryRow(
                  'Transport & container',
                  'Calculated at checkout',
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
          label: const Text('Proceed to checkout'),
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
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: muted ? AppTheme.stone500 : AppTheme.stone900,
          ),
        ),
      ],
    );
  }
}
