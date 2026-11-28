import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/order.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/farmer_card.dart';

/// Consumer order history — parity with `/consumer/orders`.
class OrdersPage extends ConsumerStatefulWidget {
  const OrdersPage({super.key});

  @override
  ConsumerState<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends ConsumerState<OrdersPage> {
  List<Order> _orders = const [];
  bool _loading = true;
  String? _error;

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
      final orders = await ref.read(orderRepositoryProvider).fetchMyOrders();
      if (!mounted) {
        return;
      }
      setState(() => _orders = orders);
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

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.emerald,
      child: _buildBody(),
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_orders.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.consumerOrdersEmptyTitle,
            message: l10n.consumerOrdersEmptyMessage,
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
                            l10n.consumerOrderNumber(_orderNumber(order.id)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OrderStatusChip(
                          label: _orderStatusLabel(l10n, order.status),
                          color: _statusColor(order.status),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      order.items.map((item) => item.productTitle).join(', '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.stone500),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.schedule_rounded, size: 15, color: AppTheme.stone500),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            _formatDateTime(context, order.createdAt),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatCurrency(context, order.grandTotal),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
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

/// Shared colour mapping for the order lifecycle.
Color orderStatusColor(OrderStatus status) {
  switch (status) {
    case OrderStatus.pending:
      return AppTheme.amber;
    case OrderStatus.confirmed:
      return const Color(0xFF2563EB);
    case OrderStatus.packed:
      return const Color(0xFF0EA5E9);
    case OrderStatus.dispatched:
      return const Color(0xFF7C3AED);
    case OrderStatus.delivered:
      return AppTheme.emeraldDark;
    case OrderStatus.cancelled:
      return const Color(0xFFDC2626);
  }
}

/// Convenience alias used by the order list.
Color _statusColor(OrderStatus status) => orderStatusColor(status);

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

String _orderNumber(String id) {
  final end = id.length < 8 ? id.length : 8;
  return id.substring(0, end);
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

String _formatDateTime(BuildContext context, DateTime? value) {
  if (value == null) {
    return '—';
  }
  final locale = Localizations.localeOf(context).toString();
  return DateFormat('d MMM yyyy, h:mm a', locale).format(value.toLocal());
}
