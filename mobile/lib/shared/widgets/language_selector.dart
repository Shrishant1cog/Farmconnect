import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/locale/locale_controller.dart';
import '../../core/theme/app_theme.dart';
import '../../l10n/generated/app_localizations.dart';

/// Language selector used across the app.
///
/// The language names are always written in their own script
/// (English / ಕನ್ನಡ / हिन्दी) so every user can find their language.
class LanguageSelector extends ConsumerWidget {
  const LanguageSelector({super.key, this.showLabel = true, this.compact = false});

  final bool showLabel;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    final l10n = AppLocalizations.of(context);

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => _showSheet(context, ref),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 10 : 14,
          vertical: compact ? 8 : 10,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.translate_rounded, size: 18, color: AppTheme.emeraldDark),
            if (showLabel) ...[
              const SizedBox(width: 8),
              Text(
                l10n.languageSwitch,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
            ],
            const SizedBox(width: 8),
            Text(
              AppLocales.nativeName(locale),
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: AppTheme.emeraldDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showSheet(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final controller = ref.read(localeControllerProvider.notifier);

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: Text(
                  l10n.languageHeading,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
              ),
              for (final option in AppLocales.supported)
                ListTile(
                  leading: Icon(
                    option.languageCode == ref.read(localeControllerProvider).languageCode
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                    color: option.languageCode == ref.read(localeControllerProvider).languageCode
                        ? AppTheme.emeraldDark
                        : AppTheme.stone500,
                  ),
                  title: Text(
                    AppLocales.nativeName(option),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(AppLocales.englishName(option)),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    controller.setLocale(option);
                  },
                ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }
}
