import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../l10n/generated/app_localizations.dart';
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

  Future<void> _sendEnquiry() async {
    final product = _product;
    if (product == null) {
      return;
    }

    final l10n = AppLocalizations.of(context);
    final subjectController = TextEditingController(
      text: l10n.consumerEnquiryDefaultSubject,
    );
    final messageController = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          l10n.consumerEnquiryTitle,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: subjectController,
                decoration: InputDecoration(labelText: l10n.consumerEnquirySubject),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageController,
                maxLines: 3,
                decoration: InputDecoration(labelText: l10n.consumerEnquiryMessage),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.consumerSendEnquiry),
          ),
        ],
      ),
    );

    final subject = subjectController.text.trim();
    final message = messageController.text.trim();
    subjectController.dispose();
    messageController.dispose();

    if (submitted != true || !mounted) {
      return;
    }

    try {
      final enquiry = await ref.read(enquiryRepositoryProvider).createEnquiry(
            productId: product.id,
            subject: subject.isEmpty
                ? l10n.consumerEnquiryDefaultSubject
                : subject,
            message: message.isEmpty
                ? l10n.consumerEnquiryDefaultMessage(product.title)
                : message,
          );

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.consumerEnquirySent)),
      );
      context.push('/chat/${enquiry.id}');
    } on ApiException catch (error) {
      if (mounted) {
        final currentL10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(currentL10n.consumerRequestFailed(error.message)),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        final currentL10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(currentL10n.commonSomethingWrong)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.consumerListingTitle)),
      body: _buildBody(),
      bottomNavigationBar: _product == null ? null : _buildBottomBar(),
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    final product = _product!;
    final cropName = product.cropName?.trim();
    final variety = product.variety?.trim();
    final categoryName = product.category?.name?.trim();
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
              Chip(
                avatar: const Icon(Icons.eco_rounded, size: 16, color: AppTheme.emeraldDark),
                label: Text(l10n.commonOrganic),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          product.farmName?.trim().isNotEmpty == true
              ? product.farmName!.trim()
              : l10n.commonFarmer,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
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
                        '${_formatCurrency(context, product.farmerPrice)} / ${_priceUnitLabel(l10n, product.priceUnit)}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OrderStatusChip(
                      label: product.farmerPriceNotice?.trim().isNotEmpty == true
                          ? product.farmerPriceNotice!.trim()
                          : l10n.consumerFarmerListedPrice,
                      color: AppTheme.emeraldDark,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (cropName?.isNotEmpty == true)
                  _infoRow(Icons.grass_outlined, l10n.commonCrop, cropName!),
                if (variety?.isNotEmpty == true)
                  _infoRow(Icons.workspace_premium_outlined, l10n.commonVariety, variety!),
                if (categoryName?.isNotEmpty == true)
                  _infoRow(Icons.category_outlined, l10n.commonCategory, categoryName!),
                _infoRow(
                  Icons.inventory_2_outlined,
                  l10n.commonAvailable,
                  _formatQuantity(context, product.quantityAvailable, l10n, product.quantityUnit),
                ),
                _infoRow(
                  Icons.scale_outlined,
                  l10n.commonMinOrder,
                  _formatQuantity(context, product.minOrderKg, l10n, product.quantityUnit),
                ),
                _infoRow(Icons.workspace_premium_outlined, l10n.commonGrade, product.grade),
                _infoRow(Icons.place_outlined, l10n.commonLocation, product.location),
                _infoRow(
                  Icons.calendar_today_outlined,
                  l10n.consumerHarvested,
                  _formatDate(context, product.harvestDate),
                ),
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
          label: Text(
            l10n.consumerEnquiryTitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
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
            child: Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    final l10n = AppLocalizations.of(context);
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
                  '${l10n.commonQuantity}: ${_formatQuantity(context, _quantity, l10n, product.quantityUnit)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
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
                          SnackBar(
                            content: Text(l10n.consumerAddedToCart(product.title)),
                          ),
                        );
                      }
                    : null,
                icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                label: Text(
                  l10n.consumerAddToCart,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
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

    final l10n = AppLocalizations.of(context);
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
            Text(
              l10n.consumerOrderQuantity,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              '${l10n.commonMinOrder}: ${_formatQuantity(context, product.minOrderKg, l10n, product.quantityUnit)}',
              style: const TextStyle(color: AppTheme.stone500),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: '${l10n.commonQuantity} (${_quantityUnitLabel(l10n, product.quantityUnit)})',
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                final value = double.tryParse(controller.text.trim()) ?? _quantity;
                Navigator.of(context).pop(value);
              },
              child: Text(l10n.consumerUpdateQuantity),
            ),
          ],
        ),
      ),
    );
    controller.dispose();

    if (result != null && mounted) {
      setState(() {
        _quantity = result < product.minOrderKg ? product.minOrderKg : result;
      });
    }
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

String _formatDate(BuildContext context, DateTime? value) {
  if (value == null) {
    return '—';
  }
  final locale = Localizations.localeOf(context).toString();
  return DateFormat('d MMM yyyy', locale).format(value.toLocal());
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
