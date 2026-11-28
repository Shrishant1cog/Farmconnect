import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/socket_service.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/order.dart';
import '../../../l10n/generated/app_localizations.dart';
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

  /// The socket is cached while the screen is alive.
  ///
  /// `ref` must not be used inside `dispose()`: Flutter unmounts the element
  /// before `dispose()` runs, so Riverpod rejects every access with
  /// "Cannot use \"ref\" after the widget was disposed." — the listener would
  /// never be removed and the room would never be left.
  SocketService? _socket;

  @override
  void initState() {
    super.initState();
    _load();
    _subscribeToSocket();
  }

  void _subscribeToSocket() {
    final socket = ref.read(socketServiceProvider);
    _socket = socket;
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
    final socket = _socket;
    if (socket != null) {
      socket.off('order_status_updated', _handleSocketEvent);
      socket.off('order_delivered', _handleSocketEvent);
      socket.leaveOrder(widget.orderId);
    }
    _socket = null;
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final order = await ref
          .read(orderRepositoryProvider)
          .fetchOrder(widget.orderId);
      if (!mounted) {
        return;
      }
      setState(() => _order = order);
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.commonRequestFailed(error.displayMessage));
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

  Future<void> _confirmDelivery() async {
    final l10n = AppLocalizations.of(context);
    setState(() => _confirming = true);
    try {
      await ref.read(orderRepositoryProvider).confirmDelivery(widget.orderId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.ordersDeliveryReceiptConfirmed)),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.commonRequestFailed(error.displayMessage)),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _confirming = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(currentUserProvider);
    final isConsumer = user?.isConsumer ?? true;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.ordersTrackingTitle)),
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
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.task_alt_rounded),
                        label: Text(
                          l10n.ordersConfirmDeliveryReceipt,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  )
                : null),
    );
  }

  Widget _buildBody(bool isConsumer) {
    final l10n = AppLocalizations.of(context);
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
                        l10n.consumerOrderNumber(
                          order.id.substring(0, order.id.length.clamp(0, 8)),
                        ),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    OrderStatusChip(
                      label: _orderStatusLabel(l10n, order.status),
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
                Text(
                  l10n.consumerItems,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                for (final item in order.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item.productTitle} × ${_formatQuantity(context, item.quantity, l10n)}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            _formatCurrency(
                              context,
                              item.quantity * item.unitPrice,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.end,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ),
                const Divider(height: 20),
                _amountRow(
                  context,
                  l10n.ordersItemsTotal,
                  order.totalItemsCost,
                ),
                _amountRow(
                  context,
                  l10n.ordersTransportCost,
                  order.transportCost,
                ),
                _amountRow(
                  context,
                  l10n.ordersContainerCost,
                  order.containerCost,
                ),
                const Divider(height: 20),
                _amountRow(
                  context,
                  l10n.ordersGrandTotal,
                  order.grandTotal,
                  bold: true,
                ),
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
                Text(
                  l10n.ordersDelivery,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 18,
                      color: AppTheme.stone500,
                    ),
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
                  isConsumer
                      ? l10n.ordersCultivatorLabel(_farmerName(l10n, order))
                      : l10n.ordersBuyerLabel(_consumerName(l10n, order)),
                  style: const TextStyle(color: AppTheme.stone500),
                ),
                if (isConsumer && order.farmerPhone.isNotEmpty)
                  Text(
                    l10n.ordersPhoneLabel(order.farmerPhone),
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
    final l10n = AppLocalizations.of(context);
    final steps = [
      (OrderStatus.pending, l10n.ordersTimelinePlaced),
      (OrderStatus.confirmed, l10n.ordersTimelinePacked),
      (OrderStatus.dispatched, l10n.consumerOrderStatusDispatched),
      (OrderStatus.delivered, l10n.consumerOrderStatusDelivered),
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
                  color: index <= currentIndex
                      ? AppTheme.emeraldDark
                      : AppTheme.stone200,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    steps[index].$2,
                    style: TextStyle(
                      fontWeight: index == currentIndex
                          ? FontWeight.w800
                          : FontWeight.w500,
                      color: index <= currentIndex
                          ? AppTheme.stone900
                          : AppTheme.stone500,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _amountRow(
    BuildContext context,
    String label,
    double value, {
    bool bold = false,
  }) {
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
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              _formatCurrency(context, value),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _orderStatusLabel(AppLocalizations l10n, OrderStatus status) {
  switch (status) {
    case OrderStatus.pending:
      return l10n.consumerOrderStatusPending;
    case OrderStatus.confirmed:
      return l10n.consumerOrderStatusConfirmed;
    case OrderStatus.packed:
      return l10n.consumerOrderStatusPacked;
    case OrderStatus.dispatched:
      return l10n.consumerOrderStatusDispatched;
    case OrderStatus.delivered:
      return l10n.consumerOrderStatusDelivered;
    case OrderStatus.cancelled:
      return l10n.consumerOrderStatusCancelled;
  }
}

String _consumerName(AppLocalizations l10n, Order order) {
  final name = order.consumer?['name']?.toString().trim();
  return name == null || name.isEmpty ? l10n.commonBuyer : name;
}

String _farmerName(AppLocalizations l10n, Order order) {
  final user = order.farmer?['user'];
  final name = user is Map ? user['name']?.toString().trim() : null;
  if (name != null && name.isNotEmpty) {
    return name;
  }
  final farmName = order.farmer?['farmName']?.toString().trim();
  return farmName == null || farmName.isEmpty
      ? l10n.commonCultivator
      : farmName;
}

String _formatQuantity(BuildContext context, num value, AppLocalizations l10n) {
  final locale = Localizations.localeOf(context).toString();
  final number = NumberFormat.decimalPattern(locale).format(value);
  return '$number ${l10n.commonKg}';
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
