'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, Navigation, Layers, RotateCcw, 
  MapPin, Plus, Minus, Check, CheckCircle2,
  Sprout, Building2, Warehouse, Store
} from 'lucide-react';

interface FilterState {
  apmc: boolean;
  vendors: boolean;
  trading: boolean;
  farmers: boolean;
  all: boolean;
}

export interface MapNode {
  id: string;
  name: string;
  type: 'farmers' | 'apmc' | 'trading' | 'vendors';
  lat: number;
  lon: number;
  dist: string;
  produce?: string;
  price?: number;
  priceUnit?: string;
  container?: string;
  modalRate?: string;
  capacity?: string;
  stock?: string;
  isVerified?: boolean;
  raw?: any;
}

export interface FarmerMapProps {
  onSelectHarvestLocation?: (item: any) => void;
  farmers?: any[];
  selectedFarmId?: string | null;
  selectedFarm?: any | null;
}

const DEFAULT_NODES: MapNode[] = [
  {
    id: 'f-1',
    name: 'Ramesh Agro Farm & Orchards',
    type: 'farmers',
    lat: 12.5218,
    lon: 76.8951,
    produce: 'Native Robusta Bananas & Tomatoes',
    price: 22,
    priceUnit: 'PER_KG',
    dist: 'Mandya (115 km)',
    isVerified: true,
  },
  {
    id: 'f-2',
    name: 'Mysuru Organic Cultivator Guild',
    type: 'farmers',
    lat: 12.3051,
    lon: 76.6551,
    produce: 'Mysore Betel Leaves & Ginger',
    price: 45,
    priceUnit: 'PER_KG',
    dist: 'Mysuru (140 km)',
    isVerified: true,
  },
  {
    id: 'f-3',
    name: 'Srirangapatna Paddy Yards',
    type: 'farmers',
    lat: 12.4181,
    lon: 76.6947,
    produce: 'Sona Masoori Rice & Bananas',
    price: 36,
    priceUnit: 'PER_KG',
    dist: 'Mandya District',
    isVerified: true,
  },
  {
    id: 'f-4',
    name: 'Byadgi Spice Estate',
    type: 'farmers',
    lat: 14.6789,
    lon: 75.4862,
    produce: 'Byadgi Red Chilli & Cotton',
    price: 180,
    priceUnit: 'PER_KG',
    dist: 'Haveri District',
    isVerified: true,
  },
  {
    id: 'a-1',
    name: 'APMC Mandya Central Wholesale Yard',
    type: 'apmc',
    lat: 12.5266,
    lon: 76.8990,
    modalRate: '₹3,100 / Quintal',
    dist: 'Mandya Market Hub',
  },
  {
    id: 'a-2',
    name: 'APMC Yeshwanthpur Wholesale Yard',
    type: 'apmc',
    lat: 13.0238,
    lon: 77.5505,
    modalRate: '₹3,450 / Quintal',
    dist: 'Bengaluru North',
  },
  {
    id: 't-1',
    name: 'Cauvery Cold Storage & Freight Hub',
    type: 'trading',
    lat: 12.2958,
    lon: 76.6394,
    capacity: '50 MT Cold Chamber',
    dist: 'Industrial Area, Mysuru',
  },
  {
    id: 'v-1',
    name: 'Bangalore Fresh Agro Distribution Center',
    type: 'vendors',
    lat: 12.9815,
    lon: 77.5921,
    stock: 'Whole-lot Dispatch Node',
    dist: 'Shivajinagar, Bengaluru',
  },
];

export default function FarmerMap({
  onSelectHarvestLocation,
  farmers,
  selectedFarmId,
  selectedFarm,
}: FarmerMapProps) {
  const [filters, setFilters] = useState<FilterState>({
    apmc: true,
    vendors: true,
    trading: true,
    farmers: true,
    all: true,
  });

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const userLocationMarkerRef = useRef<any>(null);

  // 1. Ensure Leaflet CSS is injected once into <head>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const linkId = 'leaflet-css-cdn';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, []);

  // 2. Normalize nodes from incoming props and fallback benchmarks
  const activeNodes: MapNode[] = useMemo(() => {
    const combined: MapNode[] = [];

    if (farmers && Array.isArray(farmers) && farmers.length > 0) {
      farmers.forEach((f: any, idx: number) => {
        const rawLat = Number(f.latitude || f.lat);
        const rawLon = Number(f.longitude || f.lon || f.lng);

        if (!isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0) {
          combined.push({
            id: String(f.id || `farmer-${idx}`),
            name: f.farmName || f.farmerName || f.name || 'Cultivator Node',
            type: 'farmers',
            lat: rawLat,
            lon: rawLon,
            produce: f.availableProducts?.[0]?.title || f.produce || 'Fresh Harvest Produce',
            price: f.availableProducts?.[0]?.farmerPrice || f.price,
            priceUnit: f.availableProducts?.[0]?.priceUnit || 'PER_KG',
            dist: f.district ? `${f.district}, Karnataka` : 'Direct Farm Node',
            isVerified: Boolean(f.isVerified ?? true),
            raw: f,
          });
        }
      });
    }

    // Append benchmark nodes if missing
    DEFAULT_NODES.forEach((defNode) => {
      const exists = combined.some((c) => c.id === defNode.id);
      if (!exists) {
        if (defNode.type !== 'farmers' || combined.length === 0) {
          combined.push(defNode);
        }
      }
    });

    return combined;
  }, [farmers]);

  // 3. Filter nodes based on active category checkboxes and search query
  const filteredNodes = useMemo(() => {
    return activeNodes.filter((node) => {
      const matchesCategory = filters.all || filters[node.type];
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        (node.produce && node.produce.toLowerCase().includes(q)) ||
        node.dist.toLowerCase().includes(q)
      );
    });
  }, [activeNodes, filters, searchQuery]);

  // 4. Initialize Leaflet instance with Google Maps tiles
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let isCancelled = false;

    import('leaflet').then((L) => {
      if (isCancelled || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Initial center: Southern Karnataka agricultural corridor
      const map = L.map(mapContainerRef.current, {
        center: [12.65, 76.95],
        zoom: 9,
        zoomControl: false, // We use custom Google-style zoom UI controls
        attributionControl: false,
      });

      // Google Maps Roadmap Tiles
      const googleRoadTiles = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          subdomains: ['0', '1', '2', '3'],
          maxZoom: 20,
        }
      );

      googleRoadTiles.addTo(map);
      tileLayerRef.current = googleRoadTiles;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = markersGroup;

      leafletMapRef.current = map;
      setMapReady(true);
    });

    return () => {
      isCancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // 5. Toggle Roadmap / Google Satellite Hybrid
  const handleToggleMapType = useCallback((newType: 'roadmap' | 'satellite') => {
    if (!leafletMapRef.current) return;
    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      if (newType === 'satellite') {
        // Google Satellite Imagery with Street & Location Labels
        const satTiles = L.tileLayer(
          'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
          }
        );
        satTiles.addTo(map);
        tileLayerRef.current = satTiles;
      } else {
        // Google Standard Roadmap
        const roadTiles = L.tileLayer(
          'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
          }
        );
        roadTiles.addTo(map);
        tileLayerRef.current = roadTiles;
      }
      setMapType(newType);
    });
  }, []);

  // 6. Render Google Maps SVG Teardrop Pins & Popups
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !markersLayerGroupRef.current) return;

    import('leaflet').then((L) => {
      const markersGroup = markersLayerGroupRef.current;
      markersGroup.clearLayers();
      markersMapRef.current.clear();

      const colorMap: Record<string, { bg: string; icon: string }> = {
        farmers: { bg: '#15803d', icon: '🌱' },
        apmc: { bg: '#2563eb', icon: '🏛️' },
        trading: { bg: '#d97706', icon: '📦' },
        vendors: { bg: '#dc2626', icon: '🛒' },
      };

      filteredNodes.forEach((node) => {
        const theme = colorMap[node.type] || { bg: '#1c1917', icon: '📍' };

        const pinHtml = `
          <div style="position: relative; width: 34px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.18)'" onmouseout="this.style.transform='scale(1)'">
            <svg viewBox="0 0 24 36" width="34" height="44" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 24 12 24s12-15.5 12-24c0-6.63-5.37-12-12-12z" fill="${theme.bg}"/>
              <circle cx="12" cy="12" r="8" fill="#ffffff"/>
            </svg>
            <span style="position: absolute; top: 5px; font-size: 11px; user-select: none;">${theme.icon}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          html: pinHtml,
          className: '',
          iconSize: [34, 44],
          iconAnchor: [17, 44],
          popupAnchor: [0, -42],
        });

        const marker = L.marker([node.lat, node.lon], { icon: customIcon });

        const popupContent = document.createElement('div');
        popupContent.style.minWidth = '230px';
        popupContent.style.padding = '4px';
        popupContent.style.fontFamily = 'system-ui, -apple-system, sans-serif';

        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
            <span style="background: ${theme.bg}15; color: ${theme.bg}; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 6px;">
              ${node.type.toUpperCase()}
            </span>
            ${node.isVerified ? '<span style="color: #15803d; font-size: 11px; font-weight: 700;">✓ Verified</span>' : ''}
          </div>
          <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #1c1917; line-height: 1.3;">
            ${node.name}
          </h4>
          <p style="margin: 3px 0 8px 0; font-size: 11px; color: #78716c; font-weight: 600;">
            📍 ${node.dist}
          </p>
          ${
            node.produce
              ? `<div style="background: #f5f5f4; padding: 6px 9px; border-radius: 8px; margin-bottom: 8px; font-size: 11px; color: #292524;">
                  <strong>Harvest:</strong> ${node.produce}${node.price ? `<div style="color: #15803d; font-weight: 800; margin-top: 2px;">₹${node.price} / ${node.priceUnit === 'PER_KG' ? 'kg' : 'unit'}</div>` : ''}
                </div>`
              : node.modalRate
              ? `<div style="background: #eff6ff; padding: 6px 9px; border-radius: 8px; margin-bottom: 8px; font-size: 11px; color: #1e40af;">
                  <strong>APMC Rate:</strong> ${node.modalRate}
                </div>`
              : node.capacity
              ? `<div style="background: #fef3c7; padding: 6px 9px; border-radius: 8px; margin-bottom: 8px; font-size: 11px; color: #92400e;">
                  <strong>Capacity:</strong> ${node.capacity}
                </div>`
              : ''
          }
          <button id="select-btn-${node.id}" style="width: 100%; background: #047857; hover:background: #065f46; color: white; border: none; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
            Select Location & View Produce
          </button>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`select-btn-${node.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectHarvestLocation) {
                onSelectHarvestLocation(node.raw || node);
              }
              marker.closePopup();
            };
          }
        });

        markersGroup.addLayer(marker);
        markersMapRef.current.set(node.id, marker);
      });
    });
  }, [mapReady, filteredNodes, onSelectHarvestLocation]);

  // 7. Auto-pan to Farm selected from sidebar list
  useEffect(() => {
    const targetId = selectedFarmId || selectedFarm?.id;
    if (!targetId || !leafletMapRef.current) return;

    const targetNode = activeNodes.find((n) => n.id === targetId || n.raw?.id === targetId);
    if (targetNode) {
      leafletMapRef.current.flyTo([targetNode.lat, targetNode.lon], 13, { duration: 1.2 });
      const marker = markersMapRef.current.get(targetNode.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedFarmId, selectedFarm, activeNodes]);

  // 8. Custom Google-Style Zoom Controls
  const handleZoomIn = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
  };

  // 9. Geolocation ("Locate Me" Google Maps Control)
  const handleLocateUser = () => {
    if (!navigator.geolocation || !leafletMapRef.current) {
      alert('Location services are not available in your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const map = leafletMapRef.current;

        import('leaflet').then((L) => {
          map.flyTo([lat, lng], 13, { duration: 1.4 });

          if (userLocationMarkerRef.current) {
            map.removeLayer(userLocationMarkerRef.current);
          }

          const userDotHtml = `
            <div style="position: relative; width: 22px; height: 22px;">
              <div style="position: absolute; inset: -4px; border-radius: 50%; background: #3b82f6; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 14px; height: 14px; margin: 4px; border-radius: 50%; background: #2563eb; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
            </div>
          `;

          const userIcon = L.divIcon({
            html: userDotHtml,
            className: '',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const userMarker = L.marker([lat, lng], { icon: userIcon })
            .addTo(map)
            .bindPopup('<strong>Your Location</strong><br/>Scanning regional harvest nodes.')
            .openPopup();

          userLocationMarkerRef.current = userMarker;
          setIsLocating(false);
        });
      },
      () => {
        setIsLocating(false);
        alert('Could not retrieve your location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleResetView = () => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.flyTo([12.65, 76.95], 9, { duration: 1 });
  };

  const toggleFilter = (key: keyof FilterState) => {
    if (key === 'all') {
      const nextVal = !filters.all;
      setFilters({ apmc: nextVal, vendors: nextVal, trading: nextVal, farmers: nextVal, all: nextVal });
    } else {
      setFilters((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        updated.all = updated.apmc && updated.vendors && updated.trading && updated.farmers;
        return updated;
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Top Header & Layer Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-700" />
            Agricultural Network & Geo-Exchange
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Explore verified cultivators, wholesale APMC yards, and cold storage hubs.
          </p>
        </div>

        {/* Google Maps Layer Switcher */}
        <div className="inline-flex self-start sm:self-auto p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleToggleMapType('roadmap')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mapType === 'roadmap'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Google Map
          </button>
          <button
            type="button"
            onClick={() => handleToggleMapType('satellite')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mapType === 'satellite'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Satellite Hybrid
          </button>
        </div>
      </div>

      {/* Search Input & Category Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search farm, crop (e.g. Rice), or district..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all"
          />
        </div>

        <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleFilter('farmers')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filters.farmers
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-white border-stone-200 text-stone-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Farmers
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('apmc')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filters.apmc
                ? 'bg-blue-50 border-blue-300 text-blue-900'
                : 'bg-white border-stone-200 text-stone-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" /> APMC Mandis
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('trading')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filters.trading
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-stone-200 text-stone-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Trading Hubs
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('vendors')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filters.vendors
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-white border-stone-200 text-stone-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600" /> Retail Vendors
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ml-auto ${
              filters.all
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {filters.all ? 'All Active' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Map Canvas with Floating Google Maps Controls */}
      <div className="relative w-full h-[520px] rounded-2xl border border-stone-300 overflow-hidden shadow-inner bg-stone-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading Spinner */}
        {!mapReady && (
          <div className="absolute inset-0 z-10 bg-stone-100/90 flex flex-col items-center justify-center p-4">
            <div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-black uppercase text-stone-600 tracking-wider">
              Rendering Google Map Engine...
            </p>
          </div>
        )}

        {/* Google Maps Floating Controls (Right Side) */}
        <div className="absolute right-3 bottom-5 z-20 flex flex-col gap-2.5">
          {/* Zoom In/Out Stacked Widget */}
          <div className="bg-white rounded-lg shadow-md border border-stone-200 flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom in"
              className="w-9 h-9 flex items-center justify-center text-stone-700 hover:bg-stone-100 border-b border-stone-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom out"
              className="w-9 h-9 flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Locate Me FAB */}
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={isLocating}
            title="Show your location"
            className="w-9 h-9 bg-white hover:bg-stone-50 text-stone-800 rounded-lg shadow-md border border-stone-200 flex items-center justify-center transition-transform active:scale-95"
          >
            <Navigation className={`w-4 h-4 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
          </button>

          {/* Reset View FAB */}
          <button
            type="button"
            onClick={handleResetView}
            title="Reset regional view"
            className="w-9 h-9 bg-white hover:bg-stone-50 text-stone-800 rounded-lg shadow-md border border-stone-200 flex items-center justify-center transition-transform active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        {/* Marker Counter Badge */}
        <div className="absolute left-3 bottom-3 z-20 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg border border-stone-200 shadow-md text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>{filteredNodes.length} Verified Nodes Visible</span>
        </div>
      </div>
    </div>
  );
}