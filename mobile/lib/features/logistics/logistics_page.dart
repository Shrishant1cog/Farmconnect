import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/misc.dart';
import '../../../data/models/product.dart';
import '../../../features/auth/auth_controller.dart';
import '../../../l10n/generated/app_localizations.dart';

/// Logistics + profit calculator — parity with `/buy` and the
/// `LogisticsProfitDrawer` component of the website.
///
/// Every value that ends up in the calculation comes from the **shared
/// backend**: the farmer's price and the farm coordinates from the selected
/// listing, the delivery coordinates from the signed-in consumer profile and
/// the APMC benchmark from the published market rates. Nothing is replaced by
/// a made-up default, because a fabricated price or coordinate would produce
/// a fabricated freight cost and a fabricated profit.
class LogisticsPage extends ConsumerStatefulWidget {
  const LogisticsPage({super.key});

  @override
  ConsumerState<LogisticsPage> createState() => _LogisticsPageState();
}

class _LogisticsPageState extends ConsumerState<LogisticsPage> {
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();
  final _apmcController = TextEditingController();

  /// The live crop lots of the shared catalogue.
  List<Product> _listings = const [];

  /// The published APMC rates of the shared database.
  List<MarketRate> _rates = const [];

  String? _selectedListingId;

  /// Where the published benchmark came from — shown to the user.
  String? _benchmarkSource;

  LogisticsQuote? _quote;
  bool _loading = false;
  bool _loadingContext = true;
  String? _error;
  String? _contextError;
  String _containerType = 'STANDARD_CRATE';

  Product? get _selectedListing {
    if (_listings.isEmpty) return null;
    for (final listing in _listings) {
      if (listing.id == _selectedListingId) return listing;
    }
    return _listings.first;
  }

  @override
  void initState() {
    super.initState();
    _loadContext();
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _priceController.dispose();
    _apmcController.dispose();
    super.dispose();
  }

  /// Loads the real inputs: the live catalogue, the published market rates and
  /// the delivery coordinates of the signed-in consumer.
  Future<void> _loadContext() async {
    setState(() {
      _loadingContext = true;
      _contextError = null;
    });

    try {
      final repository = ref.read(catalogRepositoryProvider);
      final results = await Future.wait([
        repository.fetchProducts(),
        repository.fetchMarketRates(),
      ]);

      final listings = results[0] as List<Product>;
      final rates = results[1] as List<MarketRate>;

      if (!mounted) return;
      setState(() {
        _listings = listings;
        _rates = rates;
        _selectedListingId = listings.isEmpty ? null : listings.first.id;
        _loadingContext = false;
      });
      _applyListingDefaults();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingContext = false;
        _contextError = error is ApiException
            ? error.displayMessage
            : AppLocalizations.of(context).commonSomethingWrong;
      });
    }
  }

  /// Copies the real values of the selected listing into the form.
  void _applyListingDefaults() {
    final listing = _selectedListing;
    if (listing == null) return;

    // The quantity is the quantity the farmer really offers.
    _quantityController.text = listing.quantityAvailable > 0
        ? listing.quantityAvailable.toStringAsFixed(
            listing.quantityAvailable.truncateToDouble() == listing.quantityAvailable ? 0 : 2,
          )
        : '';

    // The farmer's price is the listed price — never a default of its own.
    _priceController.text = listing.farmerPrice > 0
        ? listing.farmerPrice.toStringAsFixed(
            listing.farmerPrice.truncateToDouble() == listing.farmerPrice ? 0 : 2,
          )
        : '';

    _applyPublishedBenchmark(listing);
  }

  /// Looks up the **published** APMC benchmark of the crop of the listing.
  void _applyPublishedBenchmark(Product listing) {
    final cropName = (listing.cropName ?? '').trim().toLowerCase();

    MarketRate? match;
    if (cropName.isNotEmpty) {
      for (final rate in _rates) {
        if (rate.commodity.trim().toLowerCase() == cropName) {
          match = rate;
          break;
        }
      }
    }

    if (match != null && match.modalPrice > 0) {
      _apmcController.text = match.modalPrice.toStringAsFixed(
        match.modalPrice.truncateToDouble() == match.modalPrice ? 0 : 2,
      );
      _benchmarkSource = match.marketCenter ?? match.state;
      return;
    }

    // The backend resolves the benchmark for the listing as well — it knows
    // the crop aliases ("Green Chilli" → "Chilli"). It is quoted per kg, the
    // field works per quintal.
    final resolved = listing.mandiBenchmark;
    if (resolved != null && resolved > 0) {
      _apmcController.text = (resolved * 100).toStringAsFixed(2);
      _benchmarkSource = listing.mandiBenchmarkMarketCenter ?? listing.mandiBenchmarkState;
      return;
    }

    // Nothing was published for this crop — the field stays empty and the
    // profit against the mandi stays unknown.
    _apmcController.text = '';
    _benchmarkSource = null;
  }

  /// The farm coordinates of the selected listing.
  ({double lat, double lon})? get _origin {
    final listing = _selectedListing;
    final farmer = listing?.farmer;
    if (farmer == null) return null;

    final lat = farmer['latitude'];
    final lon = farmer['longitude'];
    if (lat is! num || lon is! num) return null;
    return (lat: lat.toDouble(), lon: lon.toDouble());
  }

  /// The delivery coordinates of the signed-in consumer profile.
  ({double lat, double lon})? get _destination {
    final user = ref.read(currentUserProvider);
    final profile = user?.consumerProfile;
    final lat = profile?.latitude;
    final lon = profile?.longitude;
    if (lat == null || lon == null) return null;
    return (lat: lat, lon: lon);
  }

  Future<void> _calculate() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final quantity = double.tryParse(_quantityController.text.trim());
      final price = double.tryParse(_priceController.text.trim());
      final origin = _origin;
      final destination = _destination;

      if (quantity == null || quantity <= 0) {
        throw StateError(l10n.logisticsInvalidQuantity);
      }
      if (price == null || price < 0) {
        throw StateError(l10n.logisticsMissingFarmerPrice);
      }
      if (origin == null) {
        throw StateError(l10n.logisticsMissingFarmCoordinates);
      }
      if (destination == null) {
        throw StateError(l10n.logisticsMissingDestinationCoordinates);
      }

      final benchmark = double.tryParse(_apmcController.text.trim());

      final quote = await ref
          .read(catalogRepositoryProvider)
          .fetchLogisticsQuote(
            cropQuantityKg: quantity,
            farmerPricePerKg: price,
            originLat: origin.lat,
            originLon: origin.lon,
            destLat: destination.lat,
            destLon: destination.lon,
            containerType: _containerType,
            // The benchmark is optional — without a published row the
            // backend reports the profit assessment as unknown.
            apmcModalPricePerQuintal:
                (benchmark == null || benchmark <= 0) ? null : benchmark,
          );
      if (mounted) {
        setState(() => _quote = quote);
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = l10n.commonRequestFailed(error.displayMessage));
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString().replaceFirst('Bad state: ', ''));
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
    // The screen is pushed as a full screen route, so it brings its own
    // `Scaffold`. Without the `Material` ancestor the input fields would
    // throw "No Material widget found".
    return Scaffold(
      appBar: AppBar(title: Text(l10n.logisticsTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        children: [
          Text(
            l10n.logisticsDescription,
            style: const TextStyle(color: AppTheme.stone500, height: 1.4),
          ),
          const SizedBox(height: 18),
          if (_loadingContext) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: CircularProgressIndicator(),
              ),
            ),
          ] else if (_contextError != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _contextError!,
                      style: const TextStyle(
                        color: Color(0xFFB91C1C),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _loadContext,
                      icon: const Icon(Icons.refresh),
                      label: Text(l10n.commonRetry),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            _buildForm(l10n),
          ],
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
      ),
    );
  }

  Widget _buildForm(AppLocalizations l10n) {
    final listing = _selectedListing;

    if (_listings.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            l10n.logisticsNoListings,
            style: const TextStyle(color: AppTheme.stone500, height: 1.4),
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            DropdownButtonFormField<String>(
              initialValue: listing?.id,
              isExpanded: true,
              decoration: InputDecoration(
                labelText: l10n.logisticsSelectListing,
              ),
              items: _listings
                  .map(
                    (item) => DropdownMenuItem(
                      value: item.id,
                      child: Text(
                        item.cropName?.isNotEmpty == true
                            ? '${item.cropName} · ${item.title}'
                            : item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _selectedListingId = value;
                  _quote = null;
                });
                _applyListingDefaults();
                setState(() {});
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _quantityController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: l10n.logisticsCropQuantityKg,
                prefixIcon: const Icon(Icons.scale_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _priceController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: l10n.logisticsFarmerPricePerKg,
                prefixIcon: const Icon(Icons.currency_rupee_rounded),
                helperText: l10n.logisticsPriceFromListing,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _apmcController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: l10n.logisticsApmcModalPrice,
                prefixIcon: const Icon(Icons.query_stats_rounded),
                helperText: _benchmarkSource == null
                    ? l10n.logisticsNoPublishedBenchmarkHint
                    : l10n.logisticsBenchmarkSource(_benchmarkSource!),
                helperMaxLines: 3,
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
            const SizedBox(height: 10),
            Text(
              l10n.logisticsCoordinatesHint,
              style: const TextStyle(color: AppTheme.stone500, fontSize: 12),
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
              label: Text(
                l10n.logisticsCalculate,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
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
            const Divider(height: 22),
            _row(
              l10n.logisticsApmcValue,
              quote.apmcValue == null
                  ? l10n.logisticsNotAvailable
                  : _formatCurrency(context, quote.apmcValue!),
              highlight: true,
            ),
            _row(
              l10n.logisticsEstimatedProfit,
              quote.profit == null
                  ? l10n.logisticsNotAvailable
                  : _formatCurrency(context, quote.profit!),
              highlight: true,
            ),
            _row(
              l10n.logisticsProfitMargin,
              quote.profitMarginPercent == null
                  ? l10n.logisticsNotAvailable
                  : NumberFormat.percentPattern(locale)
                      .format(quote.profitMarginPercent! / 100),
              highlight: true,
            ),
            if (!quote.hasApmcBenchmark) ...[
              const SizedBox(height: 8),
              Text(
                l10n.logisticsNoPublishedBenchmarkHint,
                style: const TextStyle(
                  color: Color(0xFFB45309),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
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
