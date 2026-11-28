import 'package:flutter/material.dart';

/// Material 3 theme that mirrors the website palette.
///
/// The website uses a stone/ivory neutral canvas with emerald accents for
/// agriculture actions and amber accents for market information.
class AppTheme {
  const AppTheme._();

  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldDark = Color(0xFF047857);
  static const Color amber = Color(0xFFF59E0B);
  static const Color stone900 = Color(0xFF1C1917);
  static const Color stone700 = Color(0xFF44403C);
  static const Color stone500 = Color(0xFF78716C);
  static const Color stone200 = Color(0xFFE7E5E4);
  static const Color stone50 = Color(0xFFFAFAF9);
  static const Color surfaceGlass = Color(0xFFFFFFFF);

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: emerald,
      brightness: Brightness.light,
    ).copyWith(
      primary: emerald,
      onPrimary: Colors.white,
      secondary: amber,
      surface: surfaceGlass,
      onSurface: stone900,
      outline: stone200,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: stone50,
      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceGlass,
        foregroundColor: stone900,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: stone900,
          fontSize: 20,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceGlass,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: stone200),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceGlass,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: stone200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: stone200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: emerald, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFDC2626)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: emerald,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: stone900,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: stone200),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: stone50,
        selectedColor: emerald.withValues(alpha: 0.14),
        side: const BorderSide(color: stone200),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceGlass,
        indicatorColor: emerald.withValues(alpha: 0.16),
        elevation: 3,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: states.contains(WidgetState.selected) ? emeraldDark : stone500,
          ),
        ),
      ),
      dividerTheme: const DividerThemeData(color: stone200, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
        headlineSmall: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.3),
        titleLarge: TextStyle(fontWeight: FontWeight.w800),
        titleMedium: TextStyle(fontWeight: FontWeight.w700),
        bodyMedium: TextStyle(height: 1.4),
        labelLarge: TextStyle(fontWeight: FontWeight.w700),
      ),
    );
  }
}
