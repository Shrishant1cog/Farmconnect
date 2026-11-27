import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/misc.dart';
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
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rates = await ref.read(catalogRepositoryProvider).fetchMarketRates();
      if (!mounted) {
        return;
      }
      setState(() => _rates = rates);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = error.displayMessage);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
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
        .where((rate) =>
            rate.commodity.toLowerCase().contains(query) ||
            (rate.district ?? '').toLowerCase().contains(query) ||
            (rate.marketCenter ?? '').toLowerCase().contains(query))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (value) => setState(() => _search = value.trim().toLowerCase()),
            decoration: const InputDecoration(
              hintText: 'Search commodity, district or market centre',
              prefixIcon: Icon(Icons.trending_up_rounded),
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
    if (_loading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ListView(children: [ErrorView(message: _error!, onRetry: _load)]);
    }
    if (_visibleRates.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            title: 'No market rates found',
            message: 'APMC rates are refreshed from the shared backend database.',
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
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5),
                      ),
                    ),
                    Text(
                      '${Formatters.currency(rate.modalPrice)} / quintal',
                      style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.emeraldDark),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [rate.marketCenter, rate.district, rate.state]
                      .where((part) => part != null && part.isNotEmpty)
                      .join(' · '),
                  style: const TextStyle(color: AppTheme.stone500, fontSize: 12.5),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _priceTile('Minimum', rate.minPrice),
                    const SizedBox(width: 10),
                    _priceTile('Modal', rate.modalPrice),
                    const SizedBox(width: 10),
                    _priceTile('Maximum', rate.maxPrice),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Updated ${Formatters.relative(rate.updatedAt)}',
                  style: const TextStyle(color: AppTheme.stone500, fontSize: 11.5),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _priceTile(String label, double value) {
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
            Text(label, style: const TextStyle(color: AppTheme.stone500, fontSize: 11.5)),
            const SizedBox(height: 4),
            Text(
              Formatters.currency(value),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}
