'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Loader2, Package } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useI18n } from '../../../hooks/useI18n';
import type { FarmerMapProps } from '../../../components/maps/FarmerMap';

function MapLoading() {
  const { t } = useI18n();

  return (
    <div className="w-full min-h-[520px] bg-stone-100 rounded-3xl flex flex-col items-center justify-center gap-3 border border-stone-200">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
        {t('consumer.map.loadingMapEngine')}
      </span>
    </div>
  );
}

// Explicitly type dynamic import with FarmerMapProps and use direct relative path
const FarmerMap = dynamic<FarmerMapProps>(
  () => import('../../../components/maps/FarmerMap'),
  {
    ssr: false,
    loading: () => <MapLoading />,
  }
);

interface MapFarmer {
  id: string;
  name: string;
  farmName: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  crops: string[];
}

export default function ConsumerMapPage() {
  const { t, formatNumber } = useI18n();
  const [farmers, setFarmers] = useState<MapFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState<MapFarmer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadFarms = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetchApi('/users/farmers');
        const data = res?.data || res?.farmers || (Array.isArray(res) ? res : []);
        if (Array.isArray(data) && data.length > 0) {
          // A cultivator can only be plotted when the shared database really
          // holds their coordinates — a made-up position would put a farm
          // somewhere it does not exist.
          const mapped = data
            .map((f: any, idx: number) => {
              const latitude = Number(f.latitude);
              const longitude = Number(f.longitude);
              const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

              return {
                id: f.id || `f-${idx}`,
                name: f.name || t('consumer.map.cultivatorFallback'),
                farmName: f.farmerProfile?.farmName || t('consumer.map.farmFallback', { name: f.name }),
                district: f.district || t('consumer.map.karnatakaFallback'),
                latitude: hasCoordinates ? latitude : null,
                longitude: hasCoordinates ? longitude : null,
                hasCoordinates,
                crops: f.products?.map((p: any) => p.title) || [t('consumer.map.organicHarvest')],
              };
            })
            .filter((farmer: any) => farmer.hasCoordinates);

          setFarmers(mapped);
          setSelectedFarmer(mapped[0] ?? null);
        } else {
          // Only real cultivators from the shared backend are shown.
          setFarmers([]);
          setSelectedFarmer(null);
        }
      } catch (error: any) {
        setLoadError(error?.message || t('consumer.map.loadError'));
        setFarmers([]);
        setSelectedFarmer(null);
      } finally {
        setLoading(false);
      }
    };

    loadFarms();
  }, [t]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" /> {t('consumer.map.registry')}
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          {t('consumer.map.heading')}
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-1">
          {t('consumer.map.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="min-h-[50vh] bg-white rounded-3xl border border-stone-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            {t('consumer.map.plotting')}
          </span>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-3xl border border-red-200 p-10 text-center text-sm text-stone-600">
          {loadError}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Farm Directory List */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3 max-h-[640px] overflow-y-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
              {t('consumer.map.activeFarms', { count: formatNumber(farmers.length) })}
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
                    {t('consumer.map.designatedYard')}
                  </span>
                  <span className="text-sm font-black text-stone-900 block mt-0.5">
                    {selectedFarmer.farmName} ({selectedFarmer.district}, Karnataka)
                  </span>
                  <p className="text-xs text-stone-500 mt-0.5 font-mono">
                    {t('consumer.map.latitude')}: {selectedFarmer.latitude?.toFixed(4) ?? '—'}° N, {t('consumer.map.longitude')}: {selectedFarmer.longitude?.toFixed(4) ?? '—'}° E
                  </p>
                </div>

                <Link
                  href={`/consumer/explore?search=${encodeURIComponent(selectedFarmer.district)}`}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Package className="w-3.5 h-3.5" /> {t('consumer.map.viewHarvests')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}