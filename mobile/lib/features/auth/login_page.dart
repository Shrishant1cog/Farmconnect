import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/user.dart';
import '../../../l10n/generated/app_localizations.dart';
import 'auth_controller.dart';

/// Login screen mirroring the website's PASSWORD / OTP tabs.
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _isPasswordTab = true;
  bool _isSubmitting = false;
  bool _obscurePassword = true;
  UserRole _otpRole = UserRole.consumer;
  String? _errorMessage;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitPassword() async {
    final l10n = AppLocalizations.of(context);
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final identifier = _identifierController.text.trim();
      final isPhone = identifier.replaceAll(RegExp(r'\D'), '').length >= 10;

      await ref
          .read(authControllerProvider.notifier)
          .login(
            identifier: identifier,
            phone: isPhone ? identifier : null,
            email: isPhone ? null : identifier,
            password: _passwordController.text,
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

  Future<void> _submitPhone() async {
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
          .loginWithPhone(phone: _phoneController.text.trim(), role: _otpRole);
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _BrandHeader(),
                    const SizedBox(height: 28),
                    _ModeTabs(
                      isPasswordTab: _isPasswordTab,
                      onChanged: (value) => setState(() {
                        _isPasswordTab = value;
                        _errorMessage = null;
                      }),
                    ),
                    const SizedBox(height: 24),
                    if (_errorMessage != null) ...[
                      _ErrorBanner(message: _errorMessage!),
                      const SizedBox(height: 16),
                    ],
                    if (_isPasswordTab)
                      ..._buildPasswordFields()
                    else
                      ..._buildPhoneFields(),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _isSubmitting
                          ? null
                          : _isPasswordTab
                          ? _submitPassword
                          : _submitPhone,
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
                              _isPasswordTab
                                  ? l10n.authSignIn
                                  : l10n.authSendOtp,
                            ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            l10n.authNewUserPrompt,
                            textAlign: TextAlign.end,
                            style: const TextStyle(color: AppTheme.stone500),
                          ),
                        ),
                        TextButton(
                          onPressed: () =>
                              Navigator.of(context).pushNamed('/register'),
                          child: Text(l10n.authCreateAccount),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildPasswordFields() {
    final l10n = AppLocalizations.of(context);
    return [
      TextFormField(
        controller: _identifierController,
        keyboardType: TextInputType.text,
        textInputAction: TextInputAction.next,
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.person_outline_rounded),
        ).copyWith(labelText: l10n.authMobileOrEmail),
        validator: (value) => (value == null || value.trim().isEmpty)
            ? l10n.authIdentifierRequired
            : null,
      ),
      const SizedBox(height: 16),
      TextFormField(
        controller: _passwordController,
        obscureText: _obscurePassword,
        textInputAction: TextInputAction.done,
        onFieldSubmitted: (_) => _submitPassword(),
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
        validator: (value) => (value == null || value.trim().length < 6)
            ? l10n.authPasswordMinLength
            : null,
      ),
    ];
  }

  List<Widget> _buildPhoneFields() {
    final l10n = AppLocalizations.of(context);
    return [
      TextFormField(
        controller: _phoneController,
        keyboardType: TextInputType.phone,
        textInputAction: TextInputAction.done,
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.phone_iphone_rounded),
        ).copyWith(labelText: l10n.authMobileNumber),
        validator: (value) {
          final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
          return digits.length < 10 ? l10n.authValidMobile : null;
        },
      ),
      const SizedBox(height: 16),
      SegmentedButton<UserRole>(
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
        selected: {_otpRole},
        onSelectionChanged: (selection) =>
            setState(() => _otpRole = selection.first),
      ),
    ];
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.emerald.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(22),
          ),
          child: const Icon(
            Icons.agriculture_rounded,
            size: 40,
            color: AppTheme.emeraldDark,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.appTitle,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.6,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          l10n.appTagline,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.stone500),
        ),
      ],
    );
  }
}

class _ModeTabs extends StatelessWidget {
  const _ModeTabs({required this.isPasswordTab, required this.onChanged});

  final bool isPasswordTab;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.stone50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.stone200),
      ),
      child: Row(
        children: [
          _tab(
            context,
            l10n.authPasswordTab,
            isPasswordTab,
            () => onChanged(true),
          ),
          _tab(
            context,
            l10n.authPhoneOtpTab,
            !isPasswordTab,
            () => onChanged(false),
          ),
        ],
      ),
    );
  }

  Widget _tab(
    BuildContext context,
    String label,
    bool selected,
    VoidCallback onTap,
  ) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13.5,
              color: selected ? AppTheme.stone900 : AppTheme.stone500,
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFB91C1C),
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Color(0xFF991B1B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
