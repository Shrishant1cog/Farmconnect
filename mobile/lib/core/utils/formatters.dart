import 'package:intl/intl.dart';

/// Formatting helpers shared by every screen.
class Formatters {
  const Formatters._();

  static final NumberFormat _currency = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  static final DateFormat _date = DateFormat('dd MMM yyyy');
  static final DateFormat _dateTime = DateFormat('dd MMM yyyy, hh:mm a');
  static final DateFormat _time = DateFormat('hh:mm a');

  static String currency(num value) => _currency.format(value).replaceAll('.00', '');

  static String date(DateTime? value) => value == null ? '—' : _date.format(value.toLocal());

  static String dateTime(DateTime? value) =>
      value == null ? '—' : _dateTime.format(value.toLocal());

  static String time(DateTime? value) => value == null ? '—' : _time.format(value.toLocal());

  /// Compact relative time, e.g. "2h ago".
  static String relative(DateTime? value) {
    if (value == null) {
      return '—';
    }
    final difference = DateTime.now().difference(value.toLocal());
    if (difference.inMinutes < 1) {
      return 'just now';
    }
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    }
    if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    }
    if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    }
    return _date.format(value.toLocal());
  }

  /// Human friendly quantity, e.g. "150 KG".
  static String quantity(num value, String unit) {
    final normalized = value % 1 == 0 ? value.toInt().toString() : value.toStringAsFixed(2);
    return '$normalized ${unit.toUpperCase()}';
  }

  /// Distance in kilometres.
  static String distance(num? kilometers) {
    if (kilometers == null) {
      return '—';
    }
    if (kilometers < 1) {
      return '${(kilometers * 1000).round()} m away';
    }
    return '${kilometers.toStringAsFixed(1)} km away';
  }
}
