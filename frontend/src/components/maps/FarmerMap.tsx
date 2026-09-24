'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';

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
  type: string;
  lat: number;
  lon: number;
  dist: string;
  produce?: string;
  price?: number;
  container?: string;
  modalRate?: string;
  capacity?: string;
  stock?: string;
  raw?: any;
}

export interface FarmerMapProps {
  onSelectHarvestLocation?: (item: any) => void;
  farmers?: any[];
}

export default function FarmerMap({ onSelectHarvestLocation, farmers }: FarmerMapProps) {
  const [filters, setFilters] = useState<FilterState>({
    apmc: true,
    vendors: true,
    trading: false,
    farmers: true,
    all: false,
  });

  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  const defaultNodes: MapNode[] = [
    { id: '1', name: 'Ramesh Agro Farm', type: 'farmers', lat: 12.5218, lon: 76.8951, produce: 'Tomato (Organic)', price: 18, container: 'VENTILATED_JUTE', dist: '115 km' },
    { id: '2', name: 'APMC Mandya Central Yard', type: 'apmc', lat: 12.5266, lon: 76.8990, modalRate: '₹3,100 / Quintal', dist: '118 km' },
    { id: '3', name: 'Mysuru Organic Trading Point', type: 'trading', lat: 12.2958, lon: 76.6394, capacity: '40 MT', dist: '142 km' },
    { id: '4', name: 'Cauvery Local Retail Vendor', type: 'vendors', lat: 12.9815, lon: 77.5921, stock: 'Ready dispatch', dist: '4 km' },
  ];

  const activeNodes: MapNode[] = useMemo(() => {
    if (farmers && Array.isArray(farmers) && farmers.length > 0) {
      const mappedFarmers: MapNode[] = farmers.map((f: any) => ({
        id: String(f.id),
        name: f.farmName || f.farmerName || 'Cultivator Lot',
        type: 'farmers',
        lat: f.latitude || 12.5218,
        lon: f.longitude || 76.8951,
        produce: f.availableProducts?.[0]?.title || 'Fresh Harvest',
        dist: f.distanceKm ? `${f.distanceKm} km` : 'Local',
        raw: f,
      }));
      return [...mappedFarmers, ...defaultNodes.filter((n: MapNode) => n.type !== 'farmers')];
    }
    return defaultNodes;
  }, [farmers]);

  // 1. Initialize Leaflet Map securely (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current || leafletInstance.current) return;

      const map = L.map(mapRef.current).setView([12.6, 76.9], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      leafletInstance.current = map;
      setMapReady(true);
    });

    return () => {
      isMounted = false;
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, []);

  // 2. Render & update markers whenever filters or active nodes change
  useEffect(() => {
    if (!mapReady || !leafletInstance.current) return;

    import('leaflet').then((L) => {
      const map = leafletInstance.current;

      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const visibleNodes = activeNodes.filter(
        (node: MapNode) => filters.all || filters[node.type as keyof FilterState]
      );

      visibleNodes.forEach((node: MapNode) => {
        const colors: Record<string, string> = { 
          farmers: '#059669', 
          apmc: '#3b82f6', 
          trading: '#f59e0b', 
          vendors: '#ef4444',
        };
        const bg = colors[node.type] || '#000';

        const icon = L.divIcon({
          html: `<div style="background-color: ${bg}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([node.lat, node.lon], { icon }).addTo(map);

        const popupDiv = document.createElement('div');
        popupDiv.innerHTML = `
          <div style="font-family: sans-serif; min-width: 160px;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: ${bg};">${node.type}</div>
            <strong style="font-size: 15px; color: #1c1917;">${node.name}</strong><br/>
            <span style="font-size: 12px; color: #57534e; font-weight: bold;">${node.dist} away</span><br/>
            <div style="margin-top: 4px; font-size: 12px; color: #444;">${node.produce || node.modalRate || node.capacity || node.stock || ''}</div>
            <button id="btn-${node.id}" style="margin-top: 10px; width: 100%; background: #065f46; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">Select Node</button>
          </div>
        `;

        marker.bindPopup(popupDiv);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-${node.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectHarvestLocation) {
                onSelectHarvestLocation(node);
              }
              map.closePopup();
            };
          }
        });

        markersRef.current.push(marker);
      });
    });
  }, [filters, mapReady, activeNodes, onSelectHarvestLocation]);

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">Geo-Logistics & Market Network</h2>
        <p className="text-xs text-stone-500 mt-0.5">Toggle network channels to calculate transport and container feasibility.</p>
      </div>

      {/* Checkbox Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 mb-4">
        <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mr-1">Layer Visibility:</span>
        
        <button type="button" onClick={() => toggleFilter('apmc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-blue-600 transition-colors">
          {filters.apmc ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ APMC Mandis ]
        </button>

        <button type="button" onClick={() => toggleFilter('vendors')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-red-500 transition-colors">
          {filters.vendors ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ Local Vendors ]
        </button>

        <button type="button" onClick={() => toggleFilter('trading')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-amber-500 transition-colors">
          {filters.trading ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ Trading Hubs ]
        </button>

        <button type="button" onClick={() => toggleFilter('farmers')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.farmers ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ Farmers ]
        </button>

        <button type="button" onClick={() => toggleFilter('all')} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-800 text-white rounded-xl text-xs font-black hover:bg-stone-900 transition-colors ml-auto">
          {filters.all ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          Include All
        </button>
      </div>

      {/* Map Element */}
      <div 
        ref={mapRef} 
        className="w-full h-[400px] bg-stone-100 rounded-2xl border border-stone-300 overflow-hidden z-0 relative"
      >
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
            <p className="text-stone-500 font-bold animate-pulse text-xs uppercase tracking-wider">
              Initializing Geospatial Network Map...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}