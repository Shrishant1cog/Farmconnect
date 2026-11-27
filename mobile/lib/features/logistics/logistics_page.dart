import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/misc.dart';

/// Logistics + profit calculator — parity with `/buy` and the
/// `LogisticsProfitDrawer` component of the website.
class LogisticsPage extends ConsumerStatefulWidget {
  const LogisticsPage({super.key});

  @override
  ConsumerState<LogisticsPage> createState() => _LogisticsPageState();
}

class _LogisticsPageState extends ConsumerState<LogisticsPage> {
  final _quantityController = TextEditingController(text: '100');
  final _priceController = TextEditingController(text: '20');
  final _apmcController = TextEditingController(text: '3200');

  LogisticsQuote? _quote;
  bool _loading = false;
  String? _error;
  String _containerType = 'STANDARD_CRATE';

  // Default route: Mandya farm -> Bengaluru market.
  final double _originLat = 12.5218;
  final double _originLon = 76.8951;
  final double _destLat = 12.9716;
  final double _destLon = 77.5946;

  @override
  void dispose() {
    _quantityController.dispose();
    _priceController.dispose();
    _apmcController.dispose();
    super.dispose();
  }

  Future<void> _calculate() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final quote = await ref.read(catalogRepositoryProvider).fetchLogisticsQuote(
            cropQuantityKg: double.tryParse(_quantityController.text.trim()) ?? 100,
            farmerPricePerKg: double.tryParse(_priceController.text.trim()) ?? 20,
            originLat: _originLat,
            originLon: _originLon,
            destLat: _destLat,
            destLon: _destLon,
            containerType: _containerType,
            apmcModalPricePerQuintal: double.tryParse(_apmcController.text.trim()) ?? 3200,
          );
      if (mounted) {
        setState(() => _quote = quote);
      }
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

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        const Text(
          'Geo-Logistics & Trade Profit Hub',
          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        const Text(
          'Costs are calculated by the shared FarmConnect backend so the website and the '
          'Android app always quote the same logistics.',
          style: TextStyle(color: AppTheme.stone500, height: 1.4),
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _quantityController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Crop quantity (KG)',
                    prefixIcon: Icon(Icons.scale_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _priceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Farmer price per KG',
                    prefixIcon: Icon(Icons.currency_rupee_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _apmcController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'APMC modal price per quintal',
                    prefixIcon: Icon(Icons.query_stats_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _containerType,
                  decoration: const InputDecoration(labelText: 'Container type'),
                  items: const [
                    DropdownMenuItem(value: 'STANDARD_CRATE', child: Text('Standard crate')),
                    DropdownMenuItem(
                      value: 'COLD_CHAIN_REFRIGERATED',
                      child: Text('Cold chain refrigerated'),
                    ),
                    DropdownMenuItem(value: 'MOISTURE_CONTROLLED', child: Text('Moisture controlled')),
                    DropdownMenuItem(value: 'VENTILATED_JUTE', child: Text('Ventilated jute')),
                  ],
                  onChanged: (value) => setState(() => _containerType = value ?? _containerType),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _loading ? null : _calculate,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                        )
                      : const Icon(Icons.calculate_outlined),
                  label: const Text('Calculate logistics & profit'),
                ),
              ],
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(
            _error!,
            style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.w600),
          ),
        ],
        if (_quote != null) ...[
          const SizedBox(height: 18),
          _QuoteCard(quote: _quote!),
        ],
      ],
    );
  }
}

class _QuoteCard extends StatelessWidget {
  const _QuoteCard({required this.quote});

  final LogisticsQuote quote;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Quotation',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            _row('Distance', '${quote.distanceKm.toStringAsFixed(1)} km'),
            _row('Transport cost', Formatters.currency(quote.transportCost)),
            _row('Container cost', Formatters.currency(quote.containerCost)),
            _row('Total logistics cost', Formatters.currency(quote.totalCost)),
            _row('APMC value', Formatters.currency(quote.apmcValue)),
            _row('Estimated transit', '${quote.estimatedDays} days'),
            const Divider(height: 22),
            _row(
              'Estimated profit',
              Formatters.currency(quote.profit),
              highlight: true,
            ),
            _row(
              'Profit margin',
              '${quote.profitMarginPercent.toStringAsFixed(1)}%',
              highlight: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: highlight ? AppTheme.stone900 : AppTheme.stone500,
                fontWeight: highlight ? FontWeight.w800 : FontWeight.w500,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: highlight ? FontWeight.w900 : FontWeight.w700,
              color: highlight ? AppTheme.emeraldDark : AppTheme.stone900,
            ),
          ),
        ],
      ),
    );
  }
}
