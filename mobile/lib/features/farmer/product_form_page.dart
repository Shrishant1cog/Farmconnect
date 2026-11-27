import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';

/// Create / edit a harvest lot — parity with `AddCropModal` and `EditCropModal`.
class ProductFormPage extends ConsumerStatefulWidget {
  const ProductFormPage({super.key, this.product});

  /// When provided the form edits an existing lot, otherwise it creates one.
  final Product? product;

  @override
  ConsumerState<ProductFormPage> createState() => _ProductFormPageState();
}

class _ProductFormPageState extends ConsumerState<ProductFormPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _priceController;
  late final TextEditingController _quantityController;
  late final TextEditingController _minOrderController;
  late final TextEditingController _gradeController;
  late final TextEditingController _locationController;

  bool _isOrganic = false;
  bool _isSubmitting = false;
  bool _isUploading = false;
  String? _imageUrl;
  String? _error;
  String _priceUnit = 'PER_KG';
  String _quantityUnit = 'KG';

  bool get _isEditing => widget.product != null;

  @override
  void initState() {
    super.initState();
    final product = widget.product;
    _titleController = TextEditingController(text: product?.title ?? '');
    _descriptionController = TextEditingController(text: product?.description ?? '');
    _priceController = TextEditingController(
      text: product == null ? '' : product.farmerPrice.toString(),
    );
    _quantityController = TextEditingController(
      text: product == null ? '' : product.quantityAvailable.toString(),
    );
    _minOrderController = TextEditingController(
      text: product == null ? '10' : product.minOrderKg.toString(),
    );
    _gradeController = TextEditingController(text: product?.grade ?? 'Grade-A Export');
    _locationController = TextEditingController(text: product?.location ?? 'Karnataka');
    _isOrganic = product?.isOrganic ?? false;
    _imageUrl = product?.imageUrl;
    _priceUnit = product?.priceUnit ?? 'PER_KG';
    _quantityUnit = product?.quantityUnit ?? 'KG';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _quantityController.dispose();
    _minOrderController.dispose();
    _gradeController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(source: source, maxWidth: 1400, imageQuality: 85);
      if (file == null) {
        return;
      }

      setState(() => _isUploading = true);

      final response = await ref.read(apiClientProvider).uploadFile(
            '/upload',
            file: File(file.path),
          );

      final map = response is Map ? Map<String, dynamic>.from(response) : <String, dynamic>{};
      final url = map['imageUrl']?.toString();
      if (url == null || url.isEmpty) {
        throw StateError('The image could not be uploaded.');
      }

      if (mounted) {
        setState(() => _imageUrl = url);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error is ApiException ? error.displayMessage : error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final repository = ref.read(catalogRepositoryProvider);
      final price = double.parse(_priceController.text.trim());
      final quantity = double.parse(_quantityController.text.trim());
      final minOrder = double.parse(_minOrderController.text.trim());

      if (_isEditing) {
        await repository.updateProduct(
          widget.product!.id,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          farmerPrice: price,
          quantityAvailable: quantity,
          priceUnit: _priceUnit,
          quantityUnit: _quantityUnit,
          minOrderKg: minOrder,
          grade: _gradeController.text.trim(),
          location: _locationController.text.trim(),
          isOrganic: _isOrganic,
          imageUrl: _imageUrl,
        );
      } else {
        await repository.createProduct(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          farmerPrice: price,
          quantityAvailable: quantity,
          priceUnit: _priceUnit,
          quantityUnit: _quantityUnit,
          minOrderKg: minOrder,
          grade: _gradeController.text.trim(),
          location: _locationController.text.trim(),
          isOrganic: _isOrganic,
          imageUrl: _imageUrl,
        );
      }

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_isEditing ? 'Harvest lot updated' : 'Harvest lot listed')),
      );
      context.pop();
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
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Modify Crop Lot' : 'List Fresh Harvest Lot'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            _buildImagePicker(),
            const SizedBox(height: 18),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Crop title',
                prefixIcon: Icon(Icons.eco_outlined),
              ),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Enter a crop title' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                alignLabelWithHint: true,
              ),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Describe your harvest lot' : null,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _priceController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Price per unit', prefixText: '₹ '),
                    validator: (value) {
                      final parsed = double.tryParse((value ?? '').trim());
                      if (parsed == null || parsed < 0) {
                        return 'Enter a valid price';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _priceUnit,
                    decoration: const InputDecoration(labelText: 'Price unit'),
                    items: const [
                      DropdownMenuItem(value: 'PER_KG', child: Text('Per KG')),
                      DropdownMenuItem(value: 'PER_QUINTAL', child: Text('Per Quintal')),
                      DropdownMenuItem(value: 'PER_DOZEN', child: Text('Per Dozen')),
                      DropdownMenuItem(value: 'PER_TON', child: Text('Per Ton')),
                    ],
                    onChanged: (value) => setState(() => _priceUnit = value ?? _priceUnit),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _quantityController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Quantity available'),
                    validator: (value) {
                      final parsed = double.tryParse((value ?? '').trim());
                      if (parsed == null || parsed < 0) {
                        return 'Enter a valid quantity';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _quantityUnit,
                    decoration: const InputDecoration(labelText: 'Quantity unit'),
                    items: const [
                      DropdownMenuItem(value: 'KG', child: Text('KG')),
                      DropdownMenuItem(value: 'QUINTAL', child: Text('Quintal')),
                      DropdownMenuItem(value: 'DOZEN', child: Text('Dozen')),
                      DropdownMenuItem(value: 'TON', child: Text('Ton')),
                    ],
                    onChanged: (value) => setState(() => _quantityUnit = value ?? _quantityUnit),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _minOrderController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Minimum order quantity',
                prefixIcon: Icon(Icons.scale_outlined),
              ),
              validator: (value) {
                final parsed = double.tryParse((value ?? '').trim());
                if (parsed == null || parsed <= 0) {
                  return 'Minimum order must be greater than zero';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _gradeController,
              decoration: const InputDecoration(
                labelText: 'Grade',
                prefixIcon: Icon(Icons.workspace_premium_outlined),
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Location',
                prefixIcon: Icon(Icons.place_outlined),
              ),
            ),
            const SizedBox(height: 10),
            SwitchListTile(
              value: _isOrganic,
              onChanged: (value) => setState(() => _isOrganic = value),
              title: const Text('Certified organic produce'),
              subtitle: const Text('Organic lots are highlighted in the marketplace'),
              contentPadding: EdgeInsets.zero,
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.w600),
              ),
            ],
            const SizedBox(height: 22),
            FilledButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                    )
                  : Text(_isEditing ? 'Save changes' : 'Publish harvest lot'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePicker() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: _imageUrl == null
                    ? Container(
                        color: AppTheme.stone50,
                        alignment: Alignment.center,
                        child: const Icon(Icons.add_a_photo_outlined,
                            size: 34, color: AppTheme.stone500),
                      )
                    : Image.network(
                        _imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: AppTheme.stone50,
                          alignment: Alignment.center,
                          child: const Icon(Icons.broken_image_outlined,
                              size: 34, color: AppTheme.stone500),
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            if (_isUploading)
              const LinearProgressIndicator()
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickImage(ImageSource.camera),
                      icon: const Icon(Icons.photo_camera_outlined, size: 18),
                      label: const Text('Camera'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 44),
                        backgroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickImage(ImageSource.gallery),
                      icon: const Icon(Icons.photo_library_outlined, size: 18),
                      label: const Text('Gallery'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 44),
                        backgroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
