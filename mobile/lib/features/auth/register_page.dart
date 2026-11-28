import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/user.dart';
import '../../../l10n/generated/app_localizations.dart';
import 'auth_controller.dart';

/// Registration screen for consumers and farmers.
class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _districtController = TextEditingController(text: 'Mandya');
  final _stateController = TextEditingController(text: 'Karnataka');
  final _addressController = TextEditingController();
  final _farmNameController = TextEditingController();

  UserRole _role = UserRole.consumer;
  bool _isSubmitting = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _pincodeController.dispose();
    _districtController.dispose();
    _stateController.dispose();
    _addressController.dispose();
    _farmNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .register(
            name: _nameController.text.trim(),
            phone: _phoneController.text.trim(),
            password: _passwordController.text,
            email: _emailController.text.trim().isEmpty
                ? null
                : _emailController.text.trim(),
            role: _role,
            pincode: _pincodeController.text.trim(),
            state: _stateController.text.trim(),
            district: _districtController.text.trim(),
            addressLine: _addressController.text.trim(),
            farmName: _farmNameController.text.trim(),
          );
    } on ApiException catch (error) {
      setState(
        () => _errorMessage = l10n.commonRequestFailed(error.displayMessage),
      );
    } catch (_) {
      setState(() => _errorMessage = l10n.commonSomethingWrong);
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
      appBar: AppBar(title: Text(l10n.authCreateAccountTitle)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<UserRole>(
                  showSelectedIcon: false,
                  style: const ButtonStyle(
                    visualDensity: VisualDensity.compact,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  segments: [
                    ButtonSegment(
                      value: UserRole.consumer,
                      label: Text(l10n.commonBuyer),
                      icon: const Icon(Icons.shopping_bag_outlined),
                    ),
                    ButtonSegment(
                      value: UserRole.farmer,
                      label: Text(l10n.commonCultivator),
                      icon: const Icon(Icons.agriculture_outlined),
                    ),
                  ],
                  selected: {_role},
                  onSelectionChanged: (selection) =>
                      setState(() => _role = selection.first),
                ),
                const SizedBox(height: 20),
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: Color(0xFF991B1B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                _field(
                  _nameController,
                  l10n.authFullName,
                  Icons.person_outline_rounded,
                  validator: (value) =>
                      (value == null || value.trim().length < 2)
                      ? l10n.authNameRequired
                      : null,
                ),
                _field(
                  _phoneController,
                  l10n.authMobileNumber,
                  Icons.phone_iphone_rounded,
                  keyboardType: TextInputType.phone,
                  validator: (value) {
                    final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
                    return digits.length < 10 ? l10n.authValidMobile : null;
                  },
                ),
                _field(
                  _emailController,
                  l10n.authEmailOptional,
                  Icons.mail_outline_rounded,
                  keyboardType: TextInputType.emailAddress,
                ),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: l10n.commonPassword,
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                    suffixIcon: IconButton(
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                      tooltip: _obscurePassword
                          ? l10n.authShowPassword
                          : l10n.authHidePassword,
                    ),
                  ),
                  validator: (value) =>
                      (value == null || value.trim().length < 6)
                      ? l10n.authPasswordMinLength
                      : null,
                ),
                const SizedBox(height: 16),
                if (_role == UserRole.farmer) ...[
                  _field(
                    _farmNameController,
                    l10n.commonFarmName,
                    Icons.home_work_outlined,
                  ),
                  _field(
                    _addressController,
                    l10n.authFarmAddress,
                    Icons.location_on_outlined,
                  ),
                ] else ...[
                  _field(
                    _addressController,
                    l10n.consumerDeliveryAddress,
                    Icons.location_on_outlined,
                  ),
                ],
                Row(
                  children: [
                    Expanded(
                      child: _field(
                        _stateController,
                        l10n.commonState,
                        Icons.map_outlined,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _field(
                        _districtController,
                        l10n.commonDistrict,
                        Icons.location_city_outlined,
                      ),
                    ),
                  ],
                ),
                _field(
                  _pincodeController,
                  l10n.authPinCode,
                  Icons.pin_outlined,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _role == UserRole.farmer
                              ? l10n.authRegisterAsCultivator
                              : l10n.authRegisterAsBuyer,
                        ),
                ),
                const SizedBox(height: 12),
                Text(
                  l10n.authSameAccountNote,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppTheme.stone500,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    IconData icon, {
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
        validator: validator,
      ),
    );
  }
}
