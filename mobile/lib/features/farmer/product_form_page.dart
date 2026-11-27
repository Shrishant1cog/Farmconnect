import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/locale/locale_controller.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../l10n/generated/app_localizations.dart';

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
  late final TextEditingController _cropNameController;
  late final TextEditingController _varietyController;
  late final TextEditingController _cropSearchController;

  bool _isOrganic = false;
  bool _isSubmitting = false;
  bool _isUploading = false;
  bool _loadingCategories = true;
  bool _loadingSuggestions = false;
  bool _hasSearched = false;
  String? _imageUrl;
  String? _error;
  String? _categoryError;
  String? _suggestionError;
  String _priceUnit = 'PER_KG';
  String _quantityUnit = 'KG';
  String? _categoryId;
  List<CropCategory> _categories = const [];
  List<CropSuggestion> _suggestions = const [];
  Timer? _suggestionDebounce;
  int _suggestionRequest = 0;
  bool _localizedDefaultsApplied = false;

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
    _gradeController = TextEditingController(text: product?.grade ?? '');
    _locationController = TextEditingController(text: product?.location ?? '');
    _cropNameController = TextEditingController(text: product?.cropName ?? '');
    _varietyController = TextEditingController(text: product?.variety ?? '');
    _cropSearchController = TextEditingController();
    _isOrganic = product?.isOrganic ?? false;
    _imageUrl = product?.imageUrl;
    _priceUnit = product?.priceUnit ?? 'PER_KG';
    _quantityUnit = product?.quantityUnit ?? 'KG';
    _categoryId = product?.categoryId;
    _loadCategories();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_localizedDefaultsApplied) {
      return;
    }
    _localizedDefaultsApplied = true;
    if (_isEditing) {
      return;
    }
    final l10n = AppLocalizations.of(context);
    _gradeController.text = l10n.farmerDefaultGrade;
    _locationController.text = l10n.farmerDefaultLocation;
  }

  @override
  void dispose() {
    _suggestionDebounce?.cancel();
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _quantityController.dispose();
    _minOrderController.dispose();
    _gradeController.dispose();
    _locationController.dispose();
    _cropNameController.dispose();
    _varietyController.dispose();
    _cropSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await ref
          .read(catalogRepositoryProvider)
          .fetchCropCategories();
      if (!mounted) {
        return;
      }
      setState(() {
        _categories = categories;
        _loadingCategories = false;
        _categoryError = null;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      final l10n = AppLocalizations.of(context);
      setState(() {
        _loadingCategories = false;
        _categoryError = l10n.farmerRequestFailed(error.message);
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      final l10n = AppLocalizations.of(context);
      setState(() {
        _loadingCategories = false;
        _categoryError = l10n.farmerCategoriesLoadError;
      });
    }
  }

  void _scheduleSuggestionSearch(String query) {
    _suggestionDebounce?.cancel();
    final request = ++_suggestionRequest;
    final trimmedQuery = query.trim();

    if (trimmedQuery.isEmpty) {
      setState(() {
        _suggestions = const [];
        _suggestionError = null;
        _loadingSuggestions = false;
        _hasSearched = false;
      });
      return;
    }

    setState(() {
      _loadingSuggestions = true;
      _suggestionError = null;
      _hasSearched = true;
    });
    _suggestionDebounce = Timer(
      const Duration(milliseconds: 300),
      () => _fetchSuggestions(trimmedQuery, request),
    );
  }

  Future<void> _fetchSuggestions(String query, int request) async {
    try {
      final categorySlug = _selectedCategorySlug;
      final suggestions = await ref
          .read(catalogRepositoryProvider)
          .fetchCropSuggestions(
            search: query,
            category: categorySlug,
          );
      if (!mounted || request != _suggestionRequest) {
        return;
      }
      setState(() {
        _suggestions = suggestions;
        _loadingSuggestions = false;
        _suggestionError = null;
      });
    } on ApiException catch (error) {
      if (!mounted || request != _suggestionRequest) {
        return;
      }
      final l10n = AppLocalizations.of(context);
      setState(() {
        _suggestions = const [];
        _loadingSuggestions = false;
        _suggestionError = l10n.farmerRequestFailed(error.message);
      });
    } catch (_) {
      if (!mounted || request != _suggestionRequest) {
        return;
      }
      final l10n = AppLocalizations.of(context);
      setState(() {
        _suggestions = const [];
        _loadingSuggestions = false;
        _suggestionError = l10n.farmerCropCatalogueError;
      });
    }
  }

  String? get _selectedCategorySlug {
    if (_categoryId == null) {
      return null;
    }
    for (final category in _categories) {
      if (category.id == _categoryId && category.slug?.isNotEmpty == true) {
        return category.slug;
      }
    }
    return null;
  }

  void _selectSuggestion(CropSuggestion suggestion) {
    final name = suggestion.name?.trim();
    if (name == null || name.isEmpty) {
      return;
    }

    _suggestionDebounce?.cancel();
    _suggestionRequest++;
    _cropNameController.value = TextEditingValue(
      text: name,
      selection: TextSelection.collapsed(offset: name.length),
    );
    _cropSearchController.clear();
    for (final category in _categories) {
      if (category.slug == suggestion.category && category.id?.isNotEmpty == true) {
        _categoryId = category.id;
        break;
      }
    }
    setState(() {
      _suggestions = const [];
      _suggestionError = null;
      _loadingSuggestions = false;
      _hasSearched = false;
    });
    _formKey.currentState?.validate();
    FocusScope.of(context).unfocus();
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
        final l10n = AppLocalizations.of(context);
        final message = error is ApiException
            ? l10n.farmerRequestFailed(error.message)
            : error is StateError
                ? l10n.farmerFormImageUploadFailed
                : l10n.commonSomethingWrong;
        setState(() => _error = message);
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
      final cropName = _cropNameController.text.trim();
      final variety = _varietyController.text.trim();

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
          cropName: cropName,
          variety: variety,
          categoryId: _categoryId,
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
          cropName: cropName,
          variety: variety,
          categoryId: _categoryId,
        );
      }

      if (!mounted) {
        return;
      }
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _isEditing ? l10n.farmerFormUpdated : l10n.farmerFormListed,
          ),
        ),
      );
      ref.read(catalogRevisionProvider.notifier).state++;
      context.pop();
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
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _isEditing ? l10n.farmerFormEditTitle : l10n.farmerFormCreateTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            _buildImagePicker(l10n),
            const SizedBox(height: 18),
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: l10n.farmerFormCropTitle,
                prefixIcon: const Icon(Icons.eco_outlined),
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? l10n.farmerFormCropTitleRequired
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: l10n.commonDescription,
                alignLabelWithHint: true,
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? l10n.farmerFormDescriptionRequired
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _cropNameController,
              decoration: InputDecoration(
                labelText: l10n.commonCropName,
                prefixIcon: const Icon(Icons.agriculture_outlined),
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? l10n.farmerFormCropNameRequired
                  : null,
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _cropSearchController,
              textInputAction: TextInputAction.search,
              onChanged: _scheduleSuggestionSearch,
              decoration: InputDecoration(
                labelText: l10n.farmerCropSearchHint,
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: IconButton(
                  onPressed: () {
                    _cropSearchController.clear();
                    _scheduleSuggestionSearch('');
                  },
                  tooltip: l10n.commonClear,
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
            ),
            _buildCropSuggestions(l10n),
            const SizedBox(height: 14),
            _buildCategoryChooser(l10n),
            const SizedBox(height: 14),
            TextFormField(
              controller: _varietyController,
              decoration: InputDecoration(
                labelText: l10n.commonVariety,
                prefixIcon: const Icon(Icons.grass_outlined),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _priceController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: l10n.farmerFormPricePerUnit,
                      prefixText: '₹ ',
                    ),
                    validator: (value) {
                      final parsed = double.tryParse((value ?? '').trim());
                      if (parsed == null || parsed < 0) {
                        return l10n.farmerFormValidPrice;
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _priceUnit,
                    decoration: InputDecoration(labelText: l10n.commonPriceUnit),
                    items: [
                      DropdownMenuItem(
                        value: 'PER_KG',
                        child: Text(l10n.commonPerKg),
                      ),
                      DropdownMenuItem(
                        value: 'PER_QUINTAL',
                        child: Text(l10n.farmerPerQuintal),
                      ),
                      DropdownMenuItem(
                        value: 'PER_DOZEN',
                        child: Text(l10n.farmerPerDozen),
                      ),
                      DropdownMenuItem(
                        value: 'PER_TON',
                        child: Text(l10n.farmerPerTon),
                      ),
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
                    decoration: InputDecoration(labelText: l10n.farmerFormQuantityAvailable),
                    validator: (value) {
                      final parsed = double.tryParse((value ?? '').trim());
                      if (parsed == null || parsed < 0) {
                        return l10n.farmerFormValidQuantity;
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _quantityUnit,
                    decoration: InputDecoration(labelText: l10n.commonQuantityUnit),
                    items: [
                      DropdownMenuItem(value: 'KG', child: Text(l10n.commonKg)),
                      DropdownMenuItem(
                        value: 'QUINTAL',
                        child: Text(l10n.farmerQuintal),
                      ),
                      DropdownMenuItem(
                        value: 'DOZEN',
                        child: Text(l10n.farmerDozen),
                      ),
                      DropdownMenuItem(
                        value: 'TON',
                        child: Text(l10n.farmerTon),
                      ),
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
              decoration: InputDecoration(
                labelText: l10n.farmerFormMinimumOrderQuantity,
                prefixIcon: const Icon(Icons.scale_outlined),
              ),
              validator: (value) {
                final parsed = double.tryParse((value ?? '').trim());
                if (parsed == null || parsed <= 0) {
                  return l10n.farmerFormMinimumOrderPositive;
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _gradeController,
              decoration: InputDecoration(
                labelText: l10n.commonGrade,
                prefixIcon: const Icon(Icons.workspace_premium_outlined),
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _locationController,
              decoration: InputDecoration(
                labelText: l10n.commonLocation,
                prefixIcon: const Icon(Icons.place_outlined),
              ),
            ),
            const SizedBox(height: 10),
            SwitchListTile(
              value: _isOrganic,
              onChanged: (value) => setState(() => _isOrganic = value),
              title: Text(l10n.farmerFormOrganicTitle),
              subtitle: Text(l10n.farmerFormOrganicSubtitle),
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
                  : Text(
                      _isEditing ? l10n.farmerSaveChanges : l10n.farmerPublishLot,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChooser(AppLocalizations l10n) {
    final categoryItems = _categories
        .where((category) => category.id?.isNotEmpty == true && category.name?.isNotEmpty == true)
        .toList();
    final hasSelectedCategory = categoryItems.any((category) => category.id == _categoryId);
    final items = <DropdownMenuItem<String>>[
      DropdownMenuItem(
        value: '',
        child: Text(
          l10n.farmerNoCategory,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      if (_categoryId?.isNotEmpty == true && !hasSelectedCategory)
        DropdownMenuItem(
          value: _categoryId,
          child: Text(
            l10n.commonUnknown,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      for (final category in categoryItems)
        DropdownMenuItem(
          value: category.id,
          child: Text(
            category.name!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
    ];

    return InputDecorator(
      decoration: InputDecoration(
        labelText: l10n.commonCategory,
        prefixIcon: const Icon(Icons.category_outlined),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _categoryId ?? '',
          isExpanded: true,
          items: items,
          onChanged: (value) {
            setState(() {
              _categoryId = value == null || value.isEmpty ? null : value;
            });
            _scheduleSuggestionSearch(_cropSearchController.text);
          },
        ),
      ),
    );
  }

  Widget _buildCropSuggestions(AppLocalizations l10n) {
    if (_loadingCategories) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: LinearProgressIndicator(),
      );
    }
    if (_categoryError != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Row(
          children: [
            Expanded(
              child: Text(
                _categoryError!,
                style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12.5),
              ),
            ),
            TextButton(
              onPressed: _loadCategories,
              child: Text(l10n.commonRetry),
            ),
          ],
        ),
      );
    }
    if (_loadingSuggestions) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: LinearProgressIndicator(),
      );
    }
    if (_suggestionError != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Text(
          _suggestionError!,
          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12.5),
        ),
      );
    }
    if (!_hasSearched) {
      return const SizedBox.shrink();
    }
    if (_suggestions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Text(
          l10n.commonNoResults,
          style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.only(top: 10),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.farmerCropSuggestions,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _suggestions.length,
                itemBuilder: (context, index) {
                  final suggestion = _suggestions[index];
                  final name = suggestion.name?.trim();
                  if (name == null || name.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  final displayName = suggestion
                      .displayName(
                        ref.watch(localeControllerProvider).languageCode,
                      )
                      .trim();
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: const Icon(Icons.grass_outlined, size: 19),
                    title: Text(
                      displayName.isEmpty ? name : displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: displayName.isNotEmpty && displayName != name
                        ? Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          )
                        : null,
                    onTap: () => _selectSuggestion(suggestion),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePicker(AppLocalizations l10n) {
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
                      label: Text(
                        l10n.farmerFormCamera,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
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
                      label: Text(
                        l10n.farmerFormGallery,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
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
