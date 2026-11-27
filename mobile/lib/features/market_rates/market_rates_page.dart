import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/misc.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';

/// APMC mandi rates — parity with `/mandi-rates`.
class MarketRatesPage extends ConsumerStatefulWidget {
  const MarketRatesPage({super.key});

  @override
  ConsumerState<MarketRatesPage> createState() => _MarketRatesPageState();
}

class _MarketRatesPageState extends ConsumerState<MarketRatesPage> {
  List<MarketRate> _rates = const [];
  bool _loading = true;
  String? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rates = await ref
          .read(catalogRepositoryProvider)
          .fetchMarketRates();
      if (!mounted) {
        return;
      }
      setState(() => _rates = rates);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = l10n.commonRequestFailed(error.displayMessage));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = l10n.commonSomethingWrong);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  List<MarketRate> get _visibleRates {
    if (_search.isEmpty) {
      return _rates;
    }
    final query = _search.toLowerCase();
    return _rates
        .where(
          (rate) =>
              rate.commodity.toLowerCase().contains(query) ||
              (rate.district ?? '').toLowerCase().contains(query) ||
              (rate.marketCenter ?? '').toLowerCase().contains(query),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (value) =>
                setState(() => _search = value.trim().toLowerCase()),
            decoration: InputDecoration(
              hintText: l10n.marketRatesSearchHint,
              prefixIcon: const Icon(Icons.trending_up_rounded),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: AppTheme.emerald,
            child: _buildBody(),
          ),
        ),
      ],
    );
  }

  Widget _buildBody() {
    final l10n = AppLocalizations.of(context);
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(
        children: [ErrorView(message: _error!, onRetry: _load)],
      );
    }
    if (_visibleRates.isEmpty) {
      return ListView(
        children: [
          EmptyState(
            title: l10n.marketRatesEmptyTitle,
            message: l10n.marketRatesEmptyMessage,
            icon: Icons.query_stats_rounded,
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
      itemCount: _visibleRates.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final rate = _visibleRates[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        rate.commodity,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        '${_formatCurrency(context, rate.modalPrice)} / ${l10n.farmerQuintal}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.end,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: AppTheme.emeraldDark,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [rate.marketCenter, rate.district, rate.state]
                      .where((part) => part != null && part.isNotEmpty)
                      .join(' · '),
                  style: const TextStyle(
                    color: AppTheme.stone500,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _priceTile(context, l10n.marketRatesMinimum, rate.minPrice),
                    const SizedBox(width: 10),
                    _priceTile(context, l10n.marketRatesModal, rate.modalPrice),
                    const SizedBox(width: 10),
                    _priceTile(context, l10n.marketRatesMaximum, rate.maxPrice),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '${l10n.commonUpdated} ${_formatRelative(context, l10n, rate.updatedAt)}',
                  style: const TextStyle(
                    color: AppTheme.stone500,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _priceTile(BuildContext context, String label, double value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.stone50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.stone200),
        ),
        child: Column(
          children: [
            Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.stone500, fontSize: 11.5),
            ),
            const SizedBox(height: 4),
            Text(
              _formatCurrency(context, value),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatCurrency(BuildContext context, num value) {
  final locale = Localizations.localeOf(context).toString();
  final formatted = NumberFormat.currency(
    locale: locale,
    symbol: '₹',
    decimalDigits: 2,
  ).format(value);
  return formatted.replaceFirst(RegExp(r'\.00$'), '');
}

String _formatRelative(
  BuildContext context,
  AppLocalizations l10n,
  DateTime? value,
) {
  if (value == null) {
    return '—';
  }
  final locale = Localizations.localeOf(context).toString();
  final numberFormat = NumberFormat.decimalPattern(locale);
  final difference = DateTime.now().difference(value.toLocal());
  if (difference.inMinutes < 1) {
    return l10n.commonJustNow;
  }
  if (difference.inMinutes < 60) {
    return l10n.commonMinutesAgo(numberFormat.format(difference.inMinutes));
  }
  if (difference.inHours < 24) {
    return l10n.commonHoursAgo(numberFormat.format(difference.inHours));
  }
  if (difference.inDays < 7) {
    return l10n.commonDaysAgo(numberFormat.format(difference.inDays));
  }
  return DateFormat.yMMMd(locale).format(value.toLocal());
}
