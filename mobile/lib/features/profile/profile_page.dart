import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/user.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/language_selector.dart';
import '../auth/auth_controller.dart';

/// Profile screen — parity with the website profile + identity verification.
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  bool _isSaving = false;

  Future<void> _logout() async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.profileLogoutTitle),
        content: Text(l10n.profileLogoutMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.profileSignOut),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
      if (mounted) {
        context.go('/login');
      }
    }
  }

  Future<void> _editProfile(AppUser user) async {
    final l10n = AppLocalizations.of(context);
    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone);
    final addressController = TextEditingController(
      text:
          user.consumerProfile?.deliveryAddress ??
          user.farmerProfile?.addressLine ??
          '',
    );
    final farmNameController = TextEditingController(
      text: user.farmerProfile?.farmName ?? '',
    );

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.profileEditTitle,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: l10n.commonName),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: l10n.profileMobileNumber,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressController,
                decoration: InputDecoration(
                  labelText: user.isFarmer
                      ? l10n.authFarmAddress
                      : l10n.consumerDeliveryAddress,
                ),
              ),
              if (user.isFarmer) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: farmNameController,
                  decoration: InputDecoration(labelText: l10n.commonFarmName),
                ),
              ],
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text(l10n.farmerSaveChanges),
              ),
            ],
          ),
        ),
      ),
    );

    if (saved != true) {
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref
          .read(userRepositoryProvider)
          .updateProfile(
            name: nameController.text.trim(),
            phone: phoneController.text.trim(),
            deliveryAddress: addressController.text.trim(),
            addressLine: addressController.text.trim(),
            farmName: user.isFarmer ? farmNameController.text.trim() : null,
          );
      await ref.read(authControllerProvider.notifier).refreshProfile();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.profileUpdated)));
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.commonRequestFailed(error.displayMessage)),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _verifyAadhaar() async {
    final l10n = AppLocalizations.of(context);
    final controller = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.profileIdentityVerificationTitle),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          maxLength: 12,
          decoration: InputDecoration(
            labelText: l10n.profileIdentityNumberLabel,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.profileVerify),
          ),
        ],
      ),
    );

    if (submitted != true) {
      return;
    }

    try {
      await ref
          .read(userRepositoryProvider)
          .verifyAadhaar(controller.text.trim());
      await ref.read(authControllerProvider.notifier).refreshProfile();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.profileVerificationCompleted)),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.commonRequestFailed(error.displayMessage)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return Center(child: Text(l10n.profileNotSignedIn));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppTheme.emerald.withValues(alpha: 0.14),
                  child: Text(
                    user.displayName.characters.first.toUpperCase(),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppTheme.emeraldDark,
                      fontSize: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.name.trim().isEmpty
                            ? l10n.commonFarmConnectUser
                            : user.displayName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.phone.isEmpty ? user.email : user.phone,
                        style: const TextStyle(color: AppTheme.stone500),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.emerald.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          _roleLabel(l10n, user.role),
                          style: const TextStyle(
                            color: AppTheme.emeraldDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _isSaving ? null : () => _editProfile(user),
                  icon: const Icon(Icons.edit_outlined),
                  tooltip: l10n.profileEditTitle,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                child: Row(
                  children: [
                    const Icon(
                      Icons.translate_rounded,
                      color: AppTheme.emeraldDark,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppLocalizations.of(context).profileLanguageHeading,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14.5,
                            ),
                          ),
                          Text(
                            AppLocalizations.of(context).profileLanguageHint,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.stone500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const LanguageSelector(),
              const SizedBox(height: 10),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              _tile(
                icon: Icons.favorite_border_rounded,
                title: l10n.profileMyFavorites,
                onTap: () => context.push('/favorites'),
              ),
              const Divider(height: 1),
              _tile(
                icon: Icons.notifications_none_rounded,
                title: l10n.navNotifications,
                onTap: () => context.push('/notifications'),
              ),
              const Divider(height: 1),
              _tile(
                icon: Icons.report_gmailerrorred_outlined,
                title: l10n.profileMyComplaints,
                onTap: () => context.push('/complaints'),
              ),
              const Divider(height: 1),
              _tile(
                icon: Icons.calculate_outlined,
                title: l10n.profileLogisticsCalculator,
                onTap: () => context.push('/logistics'),
              ),
              const Divider(height: 1),
              _tile(
                icon: Icons.query_stats_rounded,
                title: l10n.profileApmcRates,
                onTap: () => context.push('/market-rates'),
              ),
              if (user.isFarmer) ...[
                const Divider(height: 1),
                _tile(
                  icon: Icons.verified_user_outlined,
                  title: l10n.profileVerifyCultivator,
                  onTap: _verifyAadhaar,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: _logout,
          icon: const Icon(Icons.logout_rounded),
          label: Text(l10n.profileSignOut),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFDC2626),
            backgroundColor: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          l10n.profileSharedAccountNote,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.stone500, fontSize: 12),
        ),
      ],
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.stone700),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppTheme.stone500,
      ),
      onTap: onTap,
    );
  }
}

String _roleLabel(AppLocalizations l10n, UserRole role) {
  switch (role) {
    case UserRole.farmer:
      return l10n.commonCultivator;
    case UserRole.admin:
      return l10n.commonAdmin;
    case UserRole.consumer:
      return l10n.commonBuyer;
  }
}
