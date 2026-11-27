import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/product.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/farmer_card.dart';
import 'cart_controller.dart';

/// Product detail screen — parity with `/products/[id]`.
class ProductDetailPage extends ConsumerStatefulWidget {
  const ProductDetailPage({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends ConsumerState<ProductDetailPage> {
  Product? _product;
  bool _loading = true;
  String? _error;
  double _quantity = 0;

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
      final product = await ref.read(catalogRepositoryProvider).fetchProduct(widget.productId);
      if (!mounted) {
        return;
      }
      setState(() {
        _product = product;
        _quantity = product.minOrderKg > 0 ? product.minOrderKg : 1;
      });
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

  Future<void> _sendEnquiry() async {
    final product = _product;
    if (product == null) {
      return;
    }

    final subjectController = TextEditingController(text: 'Bulk purchase enquiry');
    final messageController = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Send Direct Crop Enquiry to Farmer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: subjectController,
              decoration: const InputDecoration(labelText: 'Subject'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: messageController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Message'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Send enquiry'),
          ),
        ],
      ),
    );

    if (submitted != true || !mounted) {
      return;
    }

    try {
      final enquiry = await ref.read(enquiryRepositoryProvider).createEnquiry(
            productId: product.id,
            subject: subjectController.text.trim().isEmpty
                ? 'Bulk purchase enquiry'
                : subjectController.text.trim(),
            message: messageController.text.trim().isEmpty
                ? 'I am interested in your ${product.title}. Please share the best wholesale rate.'
                : messageController.text.trim(),
          );

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enquiry sent to the farmer')),
      );
      context.push('/chat/${enquiry.id}');
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.displayMessage)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Listing')),
      body: _buildBody(),
      bottomNavigationBar: _product == null ? null : _buildBottomBar(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final product = _product!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: product.imageUrl == null || product.imageUrl!.isEmpty
                ? Container(
                    color: AppTheme.stone50,
                    alignment: Alignment.center,
                    child: const Icon(Icons.agriculture_rounded, size: 52, color: AppTheme.stone200),
                  )
                : Image.network(
                    product.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppTheme.stone50,
                      alignment: Alignment.center,
                      child: const Icon(Icons.agriculture_rounded,
                          size: 52, color: AppTheme.stone200),
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 18),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                product.title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, height: 1.2),
              ),
            ),
            if (product.isOrganic)
              const Chip(
                avatar: Icon(Icons.eco_rounded, size: 16, color: AppTheme.emeraldDark),
                label: Text('Organic'),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          product.farmName ?? product.farmerName,
          style: const TextStyle(color: AppTheme.stone500, fontSize: 14),
        ),
        const SizedBox(height: 18),
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
                        '${Formatters.currency(product.farmerPrice)} / ${product.priceUnit.replaceFirst('PER_', '')}',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                    ),
                    OrderStatusChip(
                      label: product.farmerPriceNotice ?? 'Farmer Listed Price',
                      color: AppTheme.emeraldDark,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _infoRow(Icons.inventory_2_outlined, 'Available',
                    Formatters.quantity(product.quantityAvailable, product.quantityUnit)),
                _infoRow(Icons.scale_outlined, 'Minimum order',
                    Formatters.quantity(product.minOrderKg, product.quantityUnit)),
                _infoRow(Icons.workspace_premium_outlined, 'Grade', product.grade),
                _infoRow(Icons.place_outlined, 'Location', product.location),
                _infoRow(Icons.calendar_today_outlined, 'Harvested',
                    Formatters.date(product.harvestDate)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(product.description, style: const TextStyle(height: 1.5, color: AppTheme.stone700)),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: _sendEnquiry,
          icon: const Icon(Icons.forum_outlined),
          label: const Text('Send Direct Crop Enquiry to Farmer'),
        ),
      ],
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.stone500),
          const SizedBox(width: 10),
          Text('$label: ', style: const TextStyle(color: AppTheme.stone500)),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    final product = _product!;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppTheme.stone200)),
        ),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => _showQuantitySheet(),
                child: Text(
                  'Qty ${Formatters.quantity(_quantity, product.quantityUnit)}',
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                onPressed: product.isAvailable
                    ? () {
                        ref.read(cartControllerProvider.notifier).add(product, quantity: _quantity);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${product.title} added to the cart')),
                        );
                      }
                    : null,
                icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                label: const Text('Add to cart'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showQuantitySheet() async {
    final product = _product;
    if (product == null) {
      return;
    }

    final controller = TextEditingController(text: _quantity.toStringAsFixed(0));
    final result = await showModalBottomSheet<double>(
      context: context,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Order quantity',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'Minimum order is ${Formatters.quantity(product.minOrderKg, product.quantityUnit)}',
              style: const TextStyle(color: AppTheme.stone500),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: 'Quantity (${product.quantityUnit})'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                final value = double.tryParse(controller.text.trim()) ?? _quantity;
                Navigator.of(context).pop(value);
              },
              child: const Text('Update quantity'),
            ),
          ],
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _quantity = result < product.minOrderKg ? product.minOrderKg : result;
      });
    }
  }
}
