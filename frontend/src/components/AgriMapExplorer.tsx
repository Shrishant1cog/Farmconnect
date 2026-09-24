'use client';

import React, { useState } from 'react';
import { CheckSquare, Square, ArrowRight } from 'lucide-react';

interface FilterState {
  apmc: boolean;
  vendors: boolean;
  trading: boolean;
  farmers: boolean;
  all: boolean;
}

export default function AgriMapExplorer({ onSelectHarvestLocation }: { onSelectHarvestLocation: (item: any) => void }) {
  const [filters, setFilters] = useState<FilterState>({
    apmc: true,
    vendors: true,
    trading: false,
    farmers: true,
    all: false,
  });

  const toggleFilter = (key: keyof FilterState) => {
    if (key === 'all') {
      const nextVal = !filters.all;
      setFilters({ apmc: nextVal, vendors: nextVal, trading: nextVal, farmers: nextVal, all: nextVal });
    } else {
      setFilters(prev => {
        const updated = { ...prev, [key]: !prev[key] };
        updated.all = updated.apmc && updated.vendors && updated.trading && updated.farmers;
        return updated;
      });
    }
  };

  // Simulated geospatial nodes for the UI
  const sampleNodes = [
    { id: '1', name: 'Ramesh Agro Farm', type: 'farmers', lat: 12.5218, lon: 76.8951, produce: 'Tomato (Organic)', price: 18, container: 'VENTILATED_JUTE', dist: '115 km' },
    { id: '2', name: 'APMC Mandya Central Yard', type: 'apmc', lat: 12.5266, lon: 76.8990, modalRate: '₹3,100 / Quintal', dist: '118 km' },
    { id: '3', name: 'Mysuru Organic Trading Point', type: 'trading', lat: 12.2958, lon: 76.6394, capacity: '40 MT', dist: '142 km' },
    { id: '4', name: 'Cauvery Local Retail Vendor', type: 'vendors', lat: 12.9815, lon: 77.5921, stock: 'Ready dispatch', dist: '4 km' },
  ];

  const visibleNodes = sampleNodes.filter(node => filters.all || filters[node.type as keyof FilterState]);

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">Geo-Logistics & Market Network</h2>
        <p className="text-xs text-stone-500 mt-0.5">Toggle network channels to calculate transport and container feasibility.</p>
      </div>

      {/* FILTER BRACKETS / CHECKBOX BAR */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 mb-4">
        <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mr-1">Layer Visibility:</span>
        
        <button type="button" onClick={() => toggleFilter('apmc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.apmc ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ APMC Mandis ]
        </button>

        <button type="button" onClick={() => toggleFilter('vendors')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.vendors ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ Local Vendors ]
        </button>

        <button type="button" onClick={() => toggleFilter('trading')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.trading ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ Trading Hubs ]
        </button>

        <button type="button" onClick={() => toggleFilter('farmers')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 hover:border-emerald-600 transition-colors">
          {filters.farmers ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-stone-400" />}
          [ Farmers ]
        </button>

        <button type="button" onClick={() => toggleFilter('all')} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-black hover:bg-emerald-900 transition-colors ml-auto">
          {filters.all ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          Include All
        </button>
      </div>

      {/* MAP STAGE CONTAINER */}
      <div className="relative w-full h-80 bg-stone-100 rounded-2xl border border-stone-300 overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl relative z-10">
          {visibleNodes.map((node) => (
            <div 
              key={node.id} 
              onClick={() => onSelectHarvestLocation(node)}
              className="p-3 bg-white/90 backdrop-blur rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                  {node.type}
                </span>
                <span className="text-xs font-bold text-stone-500">{node.dist} away</span>
              </div>
              <p className="text-sm font-bold text-stone-900 mt-1.5 group-hover:text-emerald-800">{node.name}</p>
              <div className="mt-2 flex items-center justify-between text-xs font-medium text-stone-600">
                <span>{node.produce || node.modalRate || node.capacity}</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">Select <ArrowRight className="w-3 h-3"/></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}