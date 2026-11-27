import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/order.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/farmer_card.dart';
import '../consumer/orders_page.dart';

/// Incoming farm orders — parity with `/farmer/orders`.
class FarmerOrdersPage extends ConsumerStatefulWidget {
  const FarmerOrdersPage({super.key});

  @override
  ConsumerState<FarmerOrdersPage> createState() => _FarmerOrdersPageState();
}

class _FarmerOrdersPageState extends ConsumerState<FarmerOrdersPage> {
  List<Order> _orders = const [];
  bool _loading = true;
  String? _error;
  final Set<String> _updating = {};

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
      final orders = await ref.read(orderRepositoryProvider).fetchFarmerOrders();
      if (!mounted) {
        return;
      }
      setState(() => _orders = orders);
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

  Future<void> _updateStatus(Order order, OrderStatus status) async {
    setState(() => _updating.add(order.id));
    try {
      await ref.read(orderRepositoryProvider).updateStatus(order.id, status);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order marked as ${status.label.toLowerCase()}')),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    } finally {
      if (mounted) {
        setState(() => _updating.remove(order.id));
      }
    }
  }

  Future<void> _showStatusSheet(Order order) async {
    final options = <OrderStatus>[
      OrderStatus.confirmed,
      OrderStatus.dispatched,
      OrderStatus.delivered,
      OrderStatus.cancelled,
    ];

    final selected = await showModalBottomSheet<OrderStatus>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 18, 20, 6),
              child: Text(
                'Update dispatch status',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
              ),
            ),
            for (final option in options)
              ListTile(
                leading: Icon(
                  option == OrderStatus.cancelled
                      ? Icons.cancel_outlined
                      : Icons.local_shipping_outlined,
                  color: option == OrderStatus.cancelled
                      ? const Color(0xFFDC2626)
                      : AppTheme.emeraldDark,
                ),
                title: Text(option.label),
                onTap: () => Navigator.of(context).pop(option),
              ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );

    if (selected != null) {
      await _updateStatus(order, selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.emerald,
      child: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_orders.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No Orders Found',
            message: 'Orders placed by buyers on the website or the app will appear here.',
            icon: Icons.receipt_long_outlined,
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        final order = _orders[index];
        final isUpdating = _updating.contains(order.id);

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () => context.push('/order/${order.id}'),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Order #${order.id.substring(0, order.id.length.clamp(0, 8))}',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        OrderStatusChip(
                          label: order.status.label,
                          color: orderStatusColor(order.status),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Buyer: ${order.consumerName}',
                      style: const TextStyle(color: AppTheme.stone500),
                    ),
                    Text(
                      order.items.map((item) => item.productTitle).join(', '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Text(
                          Formatters.currency(order.grandTotal),
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                        ),
                        const Spacer(),
                        if (order.status != OrderStatus.delivered &&
                            order.status != OrderStatus.cancelled)
                          FilledButton.icon(
                            onPressed: isUpdating ? null : () => _showStatusSheet(order),
                            icon: isUpdating
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.local_shipping_outlined, size: 17),
                            label: const Text('Update status'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 40),
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
