'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchApi } from '../../../lib/api';

// Disable SSR for Leaflet to prevent browser window reference errors
const FarmerMap = dynamic(() => import('../../../components/maps/FarmerMap'), { ssr: false });

export default function MapPage() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/farmers/map')
      .then((res) => setFarmers(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">Karnataka Farm Locator</h1>
        <p className="text-stone-600 text-sm mt-1">
          Explore registered organic and direct cultivators across Mandya, Mysuru, and neighboring districts.
        </p>
      </div>

      {loading ? (
        <div className="w-full h-[550px] bg-stone-200 animate-pulse rounded-2xl flex items-center justify-center text-stone-400">
          Loading OpenStreetMap tiles...
        </div>
      ) : (
        <FarmerMap farmers={farmers} />
      )}
    </div>
  );
}