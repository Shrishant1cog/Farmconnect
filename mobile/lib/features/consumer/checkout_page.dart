import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/order.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../auth/auth_controller.dart';
import 'cart_controller.dart';

/// Checkout screen — parity with `/checkout` on the website.
class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({super.key});

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  final _addressController = TextEditingController();
  final _transportController = TextEditingController();
  final _containerController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;
  double _transportCost = 0;
  double _containerCost = 0;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    final savedAddress = user?.consumerProfile?.deliveryAddress;
    if (savedAddress != null && savedAddress.isNotEmpty) {
      _addressController.text = savedAddress;
      ref.read(cartControllerProvider.notifier).setDeliveryAddress(savedAddress);
    }
  }

  @override
  void dispose() {
    _addressController.dispose();
    _transportController.dispose();
    _containerController.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final l10n = AppLocalizations.of(context);
    final address = _addressController.text.trim();
    if (address.isEmpty) {
      setState(() => _error = l10n.consumerDeliveryAddressRequired);
      return;
    }

    final cart = ref.read(cartControllerProvider);
    if (cart.isEmpty) {
      setState(() => _error = l10n.consumerCartEmpty);
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final items = cart.lines
          .map((line) => {
                'productId': line.product.id,
                'quantity': line.quantity,
                'unitPrice': line.product.farmerPrice,
              })
          .toList();

      final order = await ref.read(orderRepositoryProvider).createOrder(
            deliveryAddress: address,
            items: items,
            farmerId: cart.lines.first.farmerId,
            transportCost: _transportCost,
            containerCost: _containerCost,
          );

      ref.read(cartControllerProvider.notifier).clear();

      if (!mounted) {
        return;
      }

      final orderNumber = _orderNumber(order.id);
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.check_circle_rounded, color: AppTheme.emerald, size: 42),
          title: Text(l10n.consumerOrderPlaced),
          content: Text(
            l10n.consumerOrderPlacedMessage(
              orderNumber,
              _orderStatusLabel(l10n, order.status),
            ),
            textAlign: TextAlign.center,
          ),
          actions: [
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                context.go('/home');
              },
              child: Text(l10n.consumerViewOrders),
            ),
          ],
        ),
      );
    } on ApiException catch (error) {
      if (mounted) {
        final currentL10n = AppLocalizations.of(context);
        setState(() => _error = currentL10n.consumerRequestFailed(error.message));
      }
    } catch (_) {
      if (mounted) {
        final currentL10n = AppLocalizations.of(context);
        setState(() => _error = currentL10n.commonSomethingWrong);
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final cart = ref.watch(cartControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.consumerCheckoutTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.consumerOrderSummary,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  for (final line in cart.lines)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${line.product.title} × ${_formatQuantity(context, line.quantity, l10n, line.product.quantityUnit)}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatCurrency(context, line.lineTotal),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                  const Divider(height: 22),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          l10n.consumerItemsTotal,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(
                        _formatCurrency(context, cart.itemsTotal),
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _addressController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: l10n.consumerDeliveryAddress,
              prefixIcon: const Icon(Icons.location_on_outlined),
              alignLabelWithHint: true,
            ),
            onChanged: (value) =>
                ref.read(cartControllerProvider.notifier).setDeliveryAddress(value),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.consumerLogistics,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.consumerLogisticsDescription,
                    style: const TextStyle(color: AppTheme.stone500, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  _costField(
                    label: l10n.consumerTransportCost,
                    controller: _transportController,
                    onChanged: (value) => setState(() => _transportCost = value),
                  ),
                  const SizedBox(height: 12),
                  _costField(
                    label: l10n.consumerContainerCost,
                    controller: _containerController,
                    onChanged: (value) => setState(() => _containerCost = value),
                  ),
                ],
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(
              _error!,
              style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: 22),
          FilledButton(
            onPressed: _isSubmitting || cart.isEmpty ? null : _placeOrder,
            child: _isSubmitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                  )
                : Text(
                    l10n.consumerPlaceOrder(
                      _formatCurrency(
                        context,
                        cart.itemsTotal + _transportCost + _containerCost,
                      ),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _costField({
    required String label,
    required TextEditingController controller,
    required ValueChanged<double> onChanged,
  }) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label, prefixText: '₹ '),
      onChanged: (text) => onChanged(double.tryParse(text.trim()) ?? 0),
    );
  }
}

String _orderNumber(String id) {
  final end = id.length < 8 ? id.length : 8;
  return id.substring(0, end);
}

String _orderStatusLabel(AppLocalizations l10n, OrderStatus status) {
  switch (status) {
    case OrderStatus.pending:
      return l10n.consumerOrderStatusPending;
    case OrderStatus.confirmed:
      return l10n.consumerOrderStatusConfirmed;
    case OrderStatus.dispatched:
      return l10n.consumerOrderStatusDispatched;
    case OrderStatus.delivered:
      return l10n.consumerOrderStatusDelivered;
    case OrderStatus.cancelled:
      return l10n.consumerOrderStatusCancelled;
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
