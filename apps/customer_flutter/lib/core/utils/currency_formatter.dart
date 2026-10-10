import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _inrFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  static final NumberFormat _inrWithDecimals = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  /// Formats amount in INR: e.g. 265 -> "₹265", 1450.50 -> "₹1,450.50"
  static String format(num amount) {
    if (amount % 1 == 0) {
      return _inrFormat.format(amount);
    }
    return _inrWithDecimals.format(amount);
  }

  /// Formats amount without the symbol: e.g. 265 -> "265"
  static String formatAmountOnly(num amount) {
    final formatted = format(amount);
    return formatted.replaceAll('₹', '').trim();
  }
}
