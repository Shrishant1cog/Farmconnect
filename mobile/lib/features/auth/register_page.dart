import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/user.dart';
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
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authControllerProvider.notifier).register(
            name: _nameController.text.trim(),
            phone: _phoneController.text.trim(),
            password: _passwordController.text,
            email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
            role: _role,
            pincode: _pincodeController.text.trim(),
            state: _stateController.text.trim(),
            district: _districtController.text.trim(),
            addressLine: _addressController.text.trim(),
            farmName: _farmNameController.text.trim(),
          );
    } on ApiException catch (error) {
      setState(() => _errorMessage = error.displayMessage);
    } catch (error) {
      setState(() => _errorMessage = error.toString());
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create your account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<UserRole>(
                  segments: const [
                    ButtonSegment(
                      value: UserRole.consumer,
                      label: Text('Buyer'),
                      icon: Icon(Icons.shopping_bag_outlined),
                    ),
                    ButtonSegment(
                      value: UserRole.farmer,
                      label: Text('Cultivator'),
                      icon: Icon(Icons.agriculture_outlined),
                    ),
                  ],
                  selected: {_role},
                  onSelectionChanged: (selection) => setState(() => _role = selection.first),
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
                _field(_nameController, 'Full name', Icons.person_outline_rounded,
                    validator: (value) => (value == null || value.trim().length < 2)
                        ? 'Enter your name'
                        : null),
                _field(_phoneController, 'Mobile number', Icons.phone_iphone_rounded,
                    keyboardType: TextInputType.phone,
                    validator: (value) {
                      final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
                      return digits.length < 10 ? 'Enter a valid 10-digit mobile number' : null;
                    }),
                _field(_emailController, 'Email (optional)', Icons.mail_outline_rounded,
                    keyboardType: TextInputType.emailAddress),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                    suffixIcon: IconButton(
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      ),
                    ),
                  ),
                  validator: (value) => (value == null || value.trim().length < 6)
                      ? 'Password must be at least 6 characters'
                      : null,
                ),
                const SizedBox(height: 16),
                if (_role == UserRole.farmer) ...[
                  _field(_farmNameController, 'Farm name', Icons.home_work_outlined),
                  _field(_addressController, 'Farm address', Icons.location_on_outlined),
                ] else ...[
                  _field(_addressController, 'Delivery address', Icons.location_on_outlined),
                ],
                Row(
                  children: [
                    Expanded(
                      child: _field(_stateController, 'State', Icons.map_outlined),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _field(_districtController, 'District', Icons.location_city_outlined),
                    ),
                  ],
                ),
                _field(_pincodeController, 'PIN code', Icons.pin_outlined,
                    keyboardType: TextInputType.number),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                        )
                      : Text(_role == UserRole.farmer ? 'Register as cultivator' : 'Register as buyer'),
                ),
                const SizedBox(height: 12),
                const Text(
                  'The same account works on the FarmConnect website and on this app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.stone500, fontSize: 12.5),
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
