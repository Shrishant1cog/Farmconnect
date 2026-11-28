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
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.farmerRequestFailed(error.message));
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

  Future<void> _updateStatus(Order order, OrderStatus status) async {
    setState(() => _updating.add(order.id));
    try {
      await ref.read(orderRepositoryProvider).updateStatus(order.id, status);
      await _load();
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              l10n.farmerOrderStatusUpdated(_orderStatusLabel(l10n, status)),
            ),
          ),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.farmerRequestFailed(error.message))),
        );
      }
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.commonSomethingWrong)),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _updating.remove(order.id));
      }
    }
  }

  Future<void> _showStatusSheet(Order order) async {
    final l10n = AppLocalizations.of(context);
    final options = <OrderStatus>[
      OrderStatus.confirmed,
      OrderStatus.packed,
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
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
              child: Text(
                l10n.farmerOrderStatusSheetTitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
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
                title: Text(_orderStatusLabel(l10n, option)),
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
            title: l10n.farmerOrdersEmptyTitle,
            message: l10n.farmerOrdersEmptyMessage,
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
        final orderNumber = order.id.substring(0, order.id.length.clamp(0, 8));
        final buyerName = order.consumer?['name']?.toString().trim();

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
                            l10n.farmerOrderNumber(orderNumber),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OrderStatusChip(
                          label: _orderStatusLabel(l10n, order.status),
                          color: orderStatusColor(order.status),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.farmerOrderBuyerLabel(
                        buyerName?.isNotEmpty == true ? buyerName! : l10n.commonUnknown,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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
                        Expanded(
                          child: Text(
                            _formatCurrency(context, order.grandTotal),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                          ),
                        ),
                        if (order.status != OrderStatus.delivered &&
                            order.status != OrderStatus.cancelled) ...[
                          const SizedBox(width: 8),
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
                            label: Text(
                              l10n.farmerOrderUpdateStatus,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 40),
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                            ),
                          ),
                        ],
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

String _orderStatusLabel(AppLocalizations l10n, OrderStatus status) {
  switch (status) {
    case OrderStatus.pending:
      return l10n.farmerOrderStatusPending;
    case OrderStatus.confirmed:
      return l10n.farmerOrderStatusConfirmed;
    case OrderStatus.packed:
      return l10n.farmerOrderStatusPacked;
    case OrderStatus.dispatched:
      return l10n.farmerOrderStatusDispatched;
    case OrderStatus.delivered:
      return l10n.farmerOrderStatusDelivered;
    case OrderStatus.cancelled:
      return l10n.farmerOrderStatusCancelled;
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
