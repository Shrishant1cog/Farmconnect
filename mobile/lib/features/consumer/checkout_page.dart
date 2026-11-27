import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
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
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final address = _addressController.text.trim();
    if (address.isEmpty) {
      setState(() => _error = 'A delivery address is required.');
      return;
    }

    final cart = ref.read(cartControllerProvider);
    if (cart.isEmpty) {
      setState(() => _error = 'Your cart is empty.');
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

      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.check_circle_rounded, color: AppTheme.emerald, size: 42),
          title: const Text('Order placed'),
          content: Text(
            'Order ${order.id.substring(0, order.id.length.clamp(0, 8))} was created with '
            'status ${order.status.label}. The farmer has been notified in real time.',
            textAlign: TextAlign.center,
          ),
          actions: [
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                context.go('/home');
              },
              child: const Text('View orders'),
            ),
          ],
        ),
      );
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
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Direct Wholesale Checkout')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Order summary',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  for (final line in cart.lines)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${line.product.title} × ${Formatters.quantity(line.quantity, line.product.quantityUnit)}',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text(
                            Formatters.currency(line.lineTotal),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                  const Divider(height: 22),
                  Row(
                    children: [
                      const Expanded(
                        child: Text('Items total', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      Text(
                        Formatters.currency(cart.itemsTotal),
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
            decoration: const InputDecoration(
              labelText: 'Delivery address',
              prefixIcon: Icon(Icons.location_on_outlined),
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
                  const Text(
                    'Logistics',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Transport and container charges are computed by the shared backend when '
                    'the farmer confirms the dispatch.',
                    style: TextStyle(color: AppTheme.stone500, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  _costField(
                    label: 'Transport cost',
                    value: _transportCost,
                    onChanged: (value) => setState(() => _transportCost = value),
                  ),
                  const SizedBox(height: 12),
                  _costField(
                    label: 'Container cost',
                    value: _containerCost,
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
                : Text('Place order · ${Formatters.currency(cart.itemsTotal + _transportCost + _containerCost)}'),
          ),
        ],
      ),
    );
  }

  Widget _costField({
    required String label,
    required double value,
    required ValueChanged<double> onChanged,
  }) {
    final controller = TextEditingController(text: value == 0 ? '' : value.toStringAsFixed(2));
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label, prefixText: '₹ '),
      onChanged: (text) => onChanged(double.tryParse(text.trim()) ?? 0),
    );
  }
}
