'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X, Check, Loader2 } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, coords: { lat: number; lng: number }) => void;
  initialCoords?: { lat: number; lng: number };
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords = { lat: 12.9716, lng: 77.5946 }, // Default to Bengaluru
}: LocationPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [currentCoords, setCurrentCoords] = useState(initialCoords);
  const [addressText, setAddressText] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Reverse Geocoding using OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data && data.display_name) {
        setAddressText(data.display_name);
      } else {
        setAddressText(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddressText(`Pinned Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    } finally {
      setIsResolving(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current) return;

      // Fix default Leaflet icon paths
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      if (!leafletInstance.current) {
        const map = L.map(mapRef.current).setView([currentCoords.lat, currentCoords.lng], 13);
        leafletInstance.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([currentCoords.lat, currentCoords.lng], {
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setCurrentCoords({ lat: pos.lat, lng: pos.lng });
          reverseGeocode(pos.lat, pos.lng);
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        reverseGeocode(currentCoords.lat, currentCoords.lng);
      }
    });

    return () => {
      isMounted = false;
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [isOpen]);

  // Handle GPS location trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);

        if (leafletInstance.current && markerRef.current) {
          leafletInstance.current.setView([coords.lat, coords.lng], 15);
          markerRef.current.setLatLng([coords.lat, coords.lng]);
        }

        reverseGeocode(coords.lat, coords.lng);
        setIsLocating(false);
      },
      () => {
        alert('Unable to fetch your GPS coordinates. Please allow location permissions.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    onSelectLocation(addressText, currentCoords);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900">
            <MapPin className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold">Pick Delivery Destination</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Current GPS button */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
          <p className="text-xs text-stone-600 font-medium">
            Click anywhere on the map or drag the marker to your delivery address.
          </p>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 text-emerald-800 border border-stone-300 font-semibold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            )}
            Use My Current Location
          </button>
        </div>

        {/* Leaflet Map */}
        <div ref={mapRef} className="w-full h-80 bg-stone-100 relative" />

        {/* Selected Location Details & Confirm */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-white space-y-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
              Selected Address
            </span>
            <p className="text-xs text-stone-800 font-medium line-clamp-2 min-h-[32px]">
              {isResolving ? (
                <span className="text-stone-400 italic">Resolving address...</span>
              ) : (
                addressText || 'Select a point on the map'
              )}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isResolving || !addressText}
              className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              Confirm Delivery Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}