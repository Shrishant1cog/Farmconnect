import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/product.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../shared/widgets/app_states.dart';
import '../../../shared/widgets/farmer_card.dart';

/// Farmer discovery map — parity with `/consumer/map`.
class FarmerMapPage extends ConsumerStatefulWidget {
  const FarmerMapPage({super.key});

  @override
  ConsumerState<FarmerMapPage> createState() => _FarmerMapPageState();
}

class _FarmerMapPageState extends ConsumerState<FarmerMapPage> {
  final MapController _mapController = MapController();

  List<FarmerSummary> _farmers = const [];
  bool _loading = true;
  bool _locating = false;
  String? _error;
  LatLng? _deviceLocation;
  LatLng _center = const LatLng(12.5218, 76.8951);

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
      final farmers = await ref
          .read(catalogRepositoryProvider)
          .fetchFarmersOnMap(
            latitude: _deviceLocation?.latitude,
            longitude: _deviceLocation?.longitude,
          );
      if (!mounted) {
        return;
      }
      setState(() => _farmers = farmers);
    } on ApiException catch (error) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.commonRequestFailed(error.displayMessage));
      }
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        setState(() => _error = l10n.commonSomethingWrong);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _locateMe() async {
    final l10n = AppLocalizations.of(context);
    setState(() => _locating = true);
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        final requested = await Geolocator.requestPermission();
        if (requested == LocationPermission.denied ||
            requested == LocationPermission.deniedForever) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(l10n.mapLocationPermissionDenied)),
            );
          }
          return;
        }
      }

      final position = await Geolocator.getCurrentPosition();
      final location = LatLng(position.latitude, position.longitude);
      if (!mounted) {
        return;
      }
      setState(() {
        _deviceLocation = location;
        _center = location;
      });
      _mapController.move(location, 12);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.commonSomethingWrong)));
      }
    } finally {
      if (mounted) {
        setState(() => _locating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toString();
    final numberFormat = NumberFormat.decimalPattern(locale);

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _center,
            initialZoom: 10.5,
            onPositionChanged: (camera, _) {
              if (_deviceLocation == null) {
                setState(() => _center = camera.center);
              }
            },
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'in.farmconnect.farmconnect_mobile',
            ),
            MarkerLayer(
              markers: [
                for (final farmer in _farmers)
                  Marker(
                    point: LatLng(farmer.latitude, farmer.longitude),
                    width: 44,
                    height: 44,
                    child: GestureDetector(
                      onTap: () => context.push('/farmer/${farmer.id}'),
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppTheme.emerald,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x33000000),
                              blurRadius: 6,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.agriculture_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Material(
            elevation: 2,
            borderRadius: BorderRadius.circular(14),
            color: Colors.white,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.storefront_outlined,
                    color: AppTheme.emeraldDark,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _loading
                          ? l10n.mapLoadingNearbyFarms
                          : l10n.mapVerifiedFarmsNearby(
                              numberFormat.format(_farmers.length),
                              numberFormat.format(
                                double.parse(
                                  _center.latitude.toStringAsFixed(2),
                                ),
                              ),
                              numberFormat.format(
                                double.parse(
                                  _center.longitude.toStringAsFixed(2),
                                ),
                              ),
                            ),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _locating ? null : _locateMe,
                    icon: _locating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.2),
                          )
                        : const Icon(Icons.my_location_rounded),
                    tooltip: l10n.mapUseMyLocation,
                  ),
                ],
              ),
            ),
          ),
        ),
        if (_loading) const Positioned.fill(child: LoadingView()),
        if (_error != null)
          Positioned.fill(
            child: ErrorView(message: _error!, onRetry: _load),
          ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: _farmers.isEmpty
              ? const SizedBox.shrink()
              : SizedBox(
                  height: 150,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _farmers.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final farmer = _farmers[index];
                      return SizedBox(
                        width: 280,
                        child: FarmerCard(
                          farmer: farmer,
                          onTap: () => context.push('/farmer/${farmer.id}'),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
