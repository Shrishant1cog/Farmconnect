'use client';

import React, { useState } from 'react';
import AgriMapExplorer from '../../components/AgriMapExplorer';
import MapSideChat from '../../components/MapSideChat';
import LogisticsProfitDrawer from '../../components/LogisticsProfitDrawer';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function BuyPortal() {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Geo-Logistics & Live Trade Hub</h1>
          <p className="text-stone-600 text-sm mt-0.5">
            Filter procurement pins across Karnataka and negotiate with farmers directly beside the map.
          </p>
        </div>
        <Link 
          href="/checkout" 
          className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-sm w-fit"
        >
          <ShoppingCart className="w-4 h-4" /> Go to Checkout
        </Link>
      </div>

      {/* Side-by-Side Grid: Map on Left (7 cols), Chat on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-7 w-full">
          <AgriMapExplorer onSelectHarvestLocation={(loc) => setSelectedLocation(loc)} />
        </div>

        {/* Right Column: Live Negotiation Chat */}
        <div className="lg:col-span-5 w-full">
          <MapSideChat activeNode={selectedLocation} />
        </div>
      </div>

      {/* Slide-out Logistics Profit Calculation Drawer */}
      {selectedLocation && (
        <LogisticsProfitDrawer 
          cropData={selectedLocation} 
          onClose={() => setSelectedLocation(null)} 
        />
      )}
    </div>
  );
}