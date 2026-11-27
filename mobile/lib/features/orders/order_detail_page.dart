import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/order.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/farmer_card.dart';
import '../auth/auth_controller.dart';
import '../consumer/orders_page.dart';

/// Order tracking detail — parity with the website order detail + confirm receipt.
class OrderDetailPage extends ConsumerStatefulWidget {
  const OrderDetailPage({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  Order? _order;
  bool _loading = true;
  bool _confirming = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _subscribeToSocket();
  }

  void _subscribeToSocket() {
    final socket = ref.read(socketServiceProvider);
    socket.joinOrder(widget.orderId);
    socket.on('order_status_updated', _handleSocketEvent);
    socket.on('order_delivered', _handleSocketEvent);
  }

  void _handleSocketEvent(dynamic _) {
    if (mounted) {
      _load();
    }
  }

  @override
  void dispose() {
    final socket = ref.read(socketServiceProvider);
    socket.off('order_status_updated', _handleSocketEvent);
    socket.off('order_delivered', _handleSocketEvent);
    socket.leaveOrder(widget.orderId);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final order = await ref.read(orderRepositoryProvider).fetchOrder(widget.orderId);
      if (!mounted) {
        return;
      }
      setState(() => _order = order);
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

  Future<void> _confirmDelivery() async {
    setState(() => _confirming = true);
    try {
      await ref.read(orderRepositoryProvider).confirmDelivery(widget.orderId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Delivery receipt confirmed')),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    } finally {
      if (mounted) {
        setState(() => _confirming = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final isConsumer = user?.isConsumer ?? true;

    return Scaffold(
      appBar: AppBar(title: const Text('Order tracking')),
      body: _buildBody(isConsumer),
      bottomNavigationBar: (_order == null || !isConsumer)
          ? null
          : (_order!.status == OrderStatus.dispatched
              ? SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: FilledButton.icon(
                      onPressed: _confirming ? null : _confirmDelivery,
                      icon: _confirming
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                            )
                          : const Icon(Icons.task_alt_rounded),
                      label: const Text('Confirm Delivery Receipt'),
                    ),
                  ),
                )
              : null),
    );
  }

  Widget _buildBody(bool isConsumer) {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final order = _order!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Card(
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
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                    ),
                    OrderStatusChip(
                      label: order.status.label,
                      color: orderStatusColor(order.status),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _statusTimeline(order.status),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Items', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 12),
                for (final item in order.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item.productTitle} × ${Formatters.quantity(item.quantity, 'KG')}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        Text(
                          Formatters.currency(item.quantity * item.unitPrice),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                const Divider(height: 20),
                _amountRow('Items total', order.totalItemsCost),
                _amountRow('Transport', order.transportCost),
                _amountRow('Container', order.containerCost),
                const Divider(height: 20),
                _amountRow('Grand total', order.grandTotal, bold: true),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Delivery',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.location_on_outlined, size: 18, color: AppTheme.stone500),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        order.deliveryAddress,
                        style: const TextStyle(height: 1.4),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  isConsumer ? 'Cultivator: ${order.farmerName}' : 'Buyer: ${order.consumerName}',
                  style: const TextStyle(color: AppTheme.stone500),
                ),
                if (isConsumer && order.farmerPhone.isNotEmpty)
                  Text(
                    'Phone: ${order.farmerPhone}',
                    style: const TextStyle(color: AppTheme.stone500),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _statusTimeline(OrderStatus status) {
    final steps = [
      (OrderStatus.pending, 'Order placed'),
      (OrderStatus.confirmed, 'Packed by farmer'),
      (OrderStatus.dispatched, 'Dispatched'),
      (OrderStatus.delivered, 'Delivered'),
    ];
    final currentIndex = steps.indexWhere((step) => step.$1 == status);

    return Column(
      children: [
        for (var index = 0; index < steps.length; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Icon(
                  index <= currentIndex
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 20,
                  color: index <= currentIndex ? AppTheme.emeraldDark : AppTheme.stone200,
                ),
                const SizedBox(width: 10),
                Text(
                  steps[index].$2,
                  style: TextStyle(
                    fontWeight: index == currentIndex ? FontWeight.w800 : FontWeight.w500,
                    color: index <= currentIndex ? AppTheme.stone900 : AppTheme.stone500,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _amountRow(String label, double value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
                color: bold ? AppTheme.stone900 : AppTheme.stone500,
              ),
            ),
          ),
          Text(
            Formatters.currency(value),
            style: TextStyle(fontWeight: bold ? FontWeight.w900 : FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
