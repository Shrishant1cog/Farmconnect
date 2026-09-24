'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Loader2, Package } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import type { FarmerMapProps } from '../../../components/maps/FarmerMap';

// Explicitly type dynamic import with FarmerMapProps and use direct relative path
const FarmerMap = dynamic<FarmerMapProps>(
  () => import('../../../components/maps/FarmerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[520px] bg-stone-100 rounded-3xl flex flex-col items-center justify-center gap-3 border border-stone-200">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
          Loading Interactive Map Engine...
        </span>
      </div>
    ),
  }
);

interface MapFarmer {
  id: string;
  name: string;
  farmName: string;
  district: string;
  latitude: number;
  longitude: number;
  crops: string[];
}

const FALLBACK_FARM_LOCATIONS: MapFarmer[] = [
  {
    id: 'f1',
    name: 'Ramesh Kumar',
    farmName: 'Mandya Sugarcane & Millet Farm',
    district: 'Mandya',
    latitude: 12.5218,
    longitude: 76.8951,
    crops: ['Finger Millet (Ragi)', 'Sugarcane', 'Desi Tomato'],
  },
  {
    id: 'f2',
    name: 'Suresh Gowda',
    farmName: 'Srirangapatna Paddy Yards',
    district: 'Mandya',
    latitude: 12.4181,
    longitude: 76.6947,
    crops: ['Sona Masoori Rice', 'Banana'],
  },
  {
    id: 'f3',
    name: 'Basavaraj Patil',
    farmName: 'Byadgi Spice Estate',
    district: 'Haveri',
    latitude: 14.6819,
    longitude: 75.4858,
    crops: ['Byadgi Red Chilli', 'Cotton'],
  },
  {
    id: 'f4',
    name: 'Anand Murthy',
    farmName: 'Nanjangud Banana Groves',
    district: 'Mysuru',
    latitude: 12.1197,
    longitude: 76.6806,
    crops: ['Yelakki Banana', 'Coconut'],
  },
];

export default function ConsumerMapPage() {
  const [farmers, setFarmers] = useState<MapFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState<MapFarmer | null>(null);

  useEffect(() => {
    const loadFarms = async () => {
      setLoading(true);
      try {
        const res = await fetchApi('/users/farmers');
        const data = res?.data || res?.farmers || (Array.isArray(res) ? res : []);
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((f: any, idx: number) => ({
            id: f.id || `f-${idx}`,
            name: f.name || 'Cultivator',
            farmName: f.farmerProfile?.farmName || `${f.name}'s Farm`,
            district: f.district || 'Karnataka',
            latitude: Number(f.latitude) || 12.5218 + idx * 0.05,
            longitude: Number(f.longitude) || 76.8951 + idx * 0.05,
            crops: f.products?.map((p: any) => p.title) || ['Organic Harvest'],
          }));
          setFarmers(mapped);
          setSelectedFarmer(mapped[0]);
        } else {
          setFarmers(FALLBACK_FARM_LOCATIONS);
          setSelectedFarmer(FALLBACK_FARM_LOCATIONS[0]);
        }
      } catch {
        setFarmers(FALLBACK_FARM_LOCATIONS);
        setSelectedFarmer(FALLBACK_FARM_LOCATIONS[0]);
      } finally {
        setLoading(false);
      }
    };

    loadFarms();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Geospatial Agricultural Registry
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Karnataka Cultivator Plot Map
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-1">
          Locate registered farms, verify harvest locations, and evaluate road transport distances.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[50vh] bg-white rounded-3xl border border-stone-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Plotting Karnataka Farm Coordinates...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Farm Directory List */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3 max-h-[640px] overflow-y-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
              Active Regional Farms ({farmers.length})
            </span>
            {farmers.map((farmer) => {
              const isSelected = selectedFarmer?.id === farmer.id;

              return (
                <div
                  key={farmer.id}
                  onClick={() => setSelectedFarmer(farmer)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-stone-900">{farmer.farmName}</h4>
                      <p className="text-xs text-stone-500 font-medium">
                        {farmer.name} • {farmer.district}
                      </p>
                    </div>
                    <MapPin
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isSelected ? 'text-emerald-700' : 'text-stone-400'
                      }`}
                    />
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {farmer.crops.slice(0, 3).map((crop) => (
                      <span
                        key={crop}
                        className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-bold text-stone-700"
                      >
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Map & Selection Bar */}
          <div className="lg:col-span-2 space-y-4">
            <FarmerMap
              farmers={farmers}
              selectedFarmId={selectedFarmer?.id}
              selectedFarm={selectedFarmer}
              onSelectHarvestLocation={(item: any) => {
                const matched = farmers.find(
                  (f) => f.id === item.id || f.farmName === item.name || f.farmName === item.farmName
                );
                if (matched) {
                  setSelectedFarmer(matched);
                }
              }}
            />

            {selectedFarmer && (
              <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block tracking-wider">
                    Designated Origin Yard
                  </span>
                  <span className="text-sm font-black text-stone-900 block mt-0.5">
                    {selectedFarmer.farmName} ({selectedFarmer.district}, Karnataka)
                  </span>
                  <p className="text-xs text-stone-500 mt-0.5 font-mono">
                    Lat: {selectedFarmer.latitude.toFixed(4)}° N, Lon: {selectedFarmer.longitude.toFixed(4)}° E
                  </p>
                </div>

                <Link
                  href={`/consumer/explore?search=${encodeURIComponent(selectedFarmer.district)}`}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Package className="w-3.5 h-3.5" /> View Active Harvests
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}