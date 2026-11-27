import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/misc.dart';
import '../../../l10n/generated/app_localizations.dart';

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
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final quote = await ref
          .read(catalogRepositoryProvider)
          .fetchLogisticsQuote(
            cropQuantityKg:
                double.tryParse(_quantityController.text.trim()) ?? 100,
            farmerPricePerKg:
                double.tryParse(_priceController.text.trim()) ?? 20,
            originLat: _originLat,
            originLon: _originLon,
            destLat: _destLat,
            destLon: _destLon,
            containerType: _containerType,
            apmcModalPricePerQuintal:
                double.tryParse(_apmcController.text.trim()) ?? 3200,
          );
      if (mounted) {
        setState(() => _quote = quote);
      }
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        Text(
          l10n.logisticsTitle,
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          l10n.logisticsDescription,
          style: const TextStyle(color: AppTheme.stone500, height: 1.4),
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _quantityController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: l10n.logisticsCropQuantityKg,
                    prefixIcon: const Icon(Icons.scale_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _priceController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: l10n.logisticsFarmerPricePerKg,
                    prefixIcon: const Icon(Icons.currency_rupee_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _apmcController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: l10n.logisticsApmcModalPrice,
                    prefixIcon: const Icon(Icons.query_stats_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _containerType,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: l10n.logisticsContainerType,
                  ),
                  items: [
                    DropdownMenuItem(
                      value: 'STANDARD_CRATE',
                      child: Text(
                        l10n.logisticsStandardCrate,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'COLD_CHAIN_REFRIGERATED',
                      child: Text(
                        l10n.logisticsColdChain,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'MOISTURE_CONTROLLED',
                      child: Text(
                        l10n.logisticsMoistureControlled,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'VENTILATED_JUTE',
                      child: Text(
                        l10n.logisticsVentilatedJute,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                  onChanged: (value) =>
                      setState(() => _containerType = value ?? _containerType),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _loading ? null : _calculate,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.calculate_outlined),
                  label: Text(l10n.logisticsCalculate),
                ),
              ],
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(
            _error!,
            style: const TextStyle(
              color: Color(0xFFB91C1C),
              fontWeight: FontWeight.w600,
            ),
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
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toString();
    final numberFormat = NumberFormat.decimalPattern(locale);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.logisticsQuotation,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            _row(
              l10n.logisticsDistance,
              '${numberFormat.format(double.parse(quote.distanceKm.toStringAsFixed(1)))} ${l10n.commonKm}',
            ),
            _row(
              l10n.consumerTransportCost,
              _formatCurrency(context, quote.transportCost),
            ),
            _row(
              l10n.consumerContainerCost,
              _formatCurrency(context, quote.containerCost),
            ),
            _row(
              l10n.logisticsTotalCost,
              _formatCurrency(context, quote.totalCost),
            ),
            _row(
              l10n.logisticsApmcValue,
              _formatCurrency(context, quote.apmcValue),
            ),
            _row(
              l10n.logisticsEstimatedTransit,
              l10n.logisticsTransitDays(
                numberFormat.format(quote.estimatedDays),
              ),
            ),
            const Divider(height: 22),
            _row(
              l10n.logisticsEstimatedProfit,
              _formatCurrency(context, quote.profit),
              highlight: true,
            ),
            _row(
              l10n.logisticsProfitMargin,
              NumberFormat.percentPattern(locale)
                  .format(quote.profitMarginPercent / 100),
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
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontWeight: highlight ? FontWeight.w900 : FontWeight.w700,
                color: highlight ? AppTheme.emeraldDark : AppTheme.stone900,
              ),
            ),
          ),
        ],
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
