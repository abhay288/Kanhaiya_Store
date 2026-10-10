import 'package:flutter/material.dart';

class AppColors {
  // Brand Palette: Warm, Premium Indian Retail Identity
  static const Color primary = Color(0xFF174D3A);          // Deep Forest Green
  static const Color primaryDark = Color(0xFF10382C);      // Dark Evergreen
  static const Color primaryContainer = Color(0xFFE6EDE5); // Muted Sage
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onPrimaryContainer = Color(0xFF10382C);

  // Amber Accent (sparingly used for badges & notice highlights)
  static const Color accent = Color(0xFFC58B43);           // Restrained Amber Accent
  static const Color accentContainer = Color(0xFFFBF4EA);
  static const Color onAccent = Color(0xFFFFFFFF);
  static const Color onAccentContainer = Color(0xFF6E4515);

  // Background & Surfaces
  static const Color background = Color(0xFFFAF8F2);       // Warm Ivory
  static const Color surface = Color(0xFFFFFFFF);          // Pure White
  static const Color surfaceVariant = Color(0xFFF4F1EA);   // Ivory Tint
  static const Color border = Color(0xFFE7E5DD);           // Subtle Border

  // Typography
  static const Color textPrimary = Color(0xFF242823);      // Charcoal
  static const Color textSecondary = Color(0xFF72766F);    // Secondary Text
  static const Color textTertiary = Color(0xFF9EA39B);     // Tertiary Text

  // Semantic
  static const Color success = Color(0xFF174D3A);
  static const Color error = Color(0xFFC23B22);
  static const Color errorContainer = Color(0xFFFCEBE8);
  static const Color warning = Color(0xFFC58B43);

  // Backward compatibility alias
  static const Color secondary = accent;
  static const Color secondaryContainer = accentContainer;
  static const Color onSecondary = onAccent;
  static const Color onSecondaryContainer = onAccentContainer;
}
