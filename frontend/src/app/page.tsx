'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sprout, ShieldCheck, Zap, ArrowRight, MapPin, 
  TrendingUp, ShoppingBag, Truck, CheckCircle2, 
  Sparkles, Calculator, ArrowUpRight, Building2, 
  ChevronRight
} from 'lucide-react';

const MANDI_TICKER_ITEMS = [
  { crop: 'Kolar Mandi Tomato', price: '₹22/kg', change: '+8.5%', type: 'up' },
  { crop: 'Mandya Desi Ragi', price: '₹42/kg', change: '+3.4%', type: 'up' },
  { crop: 'Mysuru Yelakki Bale', price: '₹65/dozen', change: 'Stable', type: 'stable' },
  { crop: 'Dharwad Hybrid Maize', price: '₹24.5/kg', change: '-1.8%', type: 'down' },
  { crop: 'Byadgi Stemless Chilli', price: '₹365/kg', change: '+4.9%', type: 'up' },
  { crop: 'Hubballi Red Onion', price: '₹25/kg', change: '-4.2%', type: 'down' },
  { crop: 'Agra Jyoti Potato', price: '₹16.5/kg', change: 'Stable', type: 'stable' },
  { crop: 'Raichur Sona Masoori', price: '₹34.5/kg', change: '-2.1%', type: 'down' },
];

export default function HomePage() {
  // Interactive Middleman Savings Engine
  const [selectedCrop, setSelectedCrop] = useState<'TOMATO' | 'RAGI' | 'BANANA'>('TOMATO');
  const [volumeKg, setVolumeKg] = useState<number>(200);

  const cropEconomics = {
    TOMATO: {
      name: 'Nati Vine Tomatoes (Mandya)',
      farmerPrice: 28,
      retailPrice: 46,
      mandiBenchmark: 26,
      unit: 'kg',
      region: 'Mandya Hub',
    },
    RAGI: {
      name: 'Desi Brown Finger Millet (Mandya/Mysuru)',
      farmerPrice: 42,
      retailPrice: 68,
      mandiBenchmark: 40,
      unit: 'kg',
      region: 'Mysuru Plains',
    },
    BANANA: {
      name: 'Yelakki Bale (Mysuru Organic)',
      farmerPrice: 65,
      retailPrice: 110,
      mandiBenchmark: 62,
      unit: 'dozen',
      region: 'Nanjangud Belt',
    },
  };

  const activeCrop = cropEconomics[selectedCrop];
  const directFarmerPayout = activeCrop.farmerPrice * volumeKg;
  const speculativeRetailCost = activeCrop.retailPrice * volumeKg;
  const totalBuyerSavings = speculativeRetailCost - directFarmerPayout;
  const savingsPercentage = Math.round((totalBuyerSavings / speculativeRetailCost) * 100);

  return (
    <div className="space-y-20 pb-24 text-stone-900 overflow-hidden">
      
      {/* Dynamic Keyframes for the Moving Ticker */}
      <style>{`
        @keyframes scroll-mandi {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-mandi-scroll {
          display: flex;
          width: max-content;
          animation: scroll-mandi 32s linear infinite;
        }
        .animate-mandi-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 1. Infinite Moving Mandi Ticker Bar */}
      <div className="bg-emerald-950 text-white border-b border-emerald-900/80 overflow-hidden py-2.5 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs">
          
          {/* Static Left Badge */}
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-emerald-400 shrink-0 pr-4 border-r border-emerald-800 z-10 bg-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Mandi Stream:
          </div>

          {/* Marquee Moving Viewport with Edge Masking */}
          <div className="flex-1 overflow-hidden relative mx-3 select-none [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
            <div className="animate-mandi-scroll items-center gap-8 py-0.5">
              {/* Duplicated list for seamless infinite loop */}
              {[...MANDI_TICKER_ITEMS, ...MANDI_TICKER_ITEMS].map((item, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0 font-medium text-stone-300">
                  <span className="text-stone-400">{item.crop}:</span>
                  <strong className="text-white font-bold">{item.price}</strong>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      item.type === 'up'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                        : item.type === 'down'
                        ? 'bg-rose-900/80 text-rose-300 border border-rose-700'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-emerald-800 font-black ml-4">•</span>
                </div>
              ))}
            </div>
          </div>

          {/* Static Right CTA */}
          <Link
            href="/mandi-rates"
            className="hidden md:flex items-center gap-1 text-[11px] font-black text-emerald-400 hover:text-emerald-300 shrink-0 uppercase tracking-wider pl-4 border-l border-emerald-800 z-10 bg-emerald-950"
          >
            All Mandis <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        <div className="relative bg-gradient-to-b from-stone-900 via-stone-900 to-emerald-950 text-white rounded-3xl p-8 sm:p-16 border border-stone-800 shadow-2xl overflow-hidden">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-800/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-900/80 text-emerald-300 border border-emerald-700/80 backdrop-blur-md">
              <Sprout className="w-4 h-4 text-emerald-400" /> Karnataka Direct Agri-Bridge
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              Direct Farm Produce at{' '}
              <span className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-8">
                Farmer Listed Prices
              </span>
            </h1>

            <p className="text-stone-300 text-base sm:text-xl font-medium leading-relaxed max-w-2xl">
              Connecting growers across Mandya, Mysuru, and Dharwad directly with wholesale buyers and consumers. Transparent APMC rate parity, zero middleman deductions, and farm-gate freight.
            </p>

            {/* Action Group */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/consumer/explore"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-emerald-950/40 active:scale-95"
              >
                Browse Live Marketplace <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>

              <Link
                href="/mandi-rates"
                className="px-7 py-4 bg-stone-800 hover:bg-stone-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-stone-700 transition-all flex items-center gap-2 active:scale-95"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Mandi Benchmark Rates
              </Link>

              <Link
                href="/consumer/map"
                className="px-7 py-4 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 font-black text-xs uppercase tracking-wider rounded-2xl border border-emerald-800 transition-all flex items-center gap-2 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-emerald-400" /> Geospatial Farm Map
              </Link>
            </div>

            {/* Platform Credibility Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-stone-800/80">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-white block tracking-tight">100%</span>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Direct Cultivator Payout</span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 block tracking-tight">₹0</span>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Middleman Markups</span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-black text-white block tracking-tight">12 APMC</span>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Mandi Yards Synced</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Core Operational Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">Transparent Infrastructure</span>
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight mt-1">
            Re-engineering the Agricultural Supply Chain
          </h2>
          <p className="text-stone-600 text-sm mt-2">
            Every transaction on FarmConnect is audited against regional mandi prices and authenticated directly from verified agricultural plots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-4 group">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-900 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-emerald-800" />
            </div>
            <h3 className="font-black text-xl text-stone-900">Verified Direct Pricing</h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              All prices are explicitly labeled as <b>Farmer Listed Prices</b>. Cultivators set their own rates based on real harvest yield costs, guaranteeing zero speculative inflation from commission agents.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> 100% Farm-Gate Realization
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-4 group">
            <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-blue-800" />
            </div>
            <h3 className="font-black text-xl text-stone-900">Instant Real-Time Sync</h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              When a farmer adjusts harvest rates, crates available, or pick-up windows from their field, marketplace listings, socket notifications, and active inquiries update instantaneously without refreshing.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-blue-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> WebSocket Live Feeds
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-4 group">
            <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6 text-amber-800" />
            </div>
            <h3 className="font-black text-xl text-stone-900">Hyper-Local Distance Engine</h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              Discover native produce within your district. Geospatial OpenStreetMap routing plots exact distance to Mandya tomato belts, Mysuru banana groves, and Dharwad maize farms to compute precise freight logistics.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> Radius & Cluster Filtering
            </div>
          </div>

        </div>
      </section>

      {/* 4. Interactive Middleman Savings Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 border border-stone-800 shadow-xl space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" /> Economic Impact Visualizer
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                Calculate Direct Trade Savings
              </h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-1">
                See the exact rupee difference when bypassing wholesale commission agents.
              </p>
            </div>

            {/* Crop Selector */}
            <div className="flex items-center gap-1.5 bg-stone-800/90 p-1.5 rounded-2xl border border-stone-700">
              {(['TOMATO', 'RAGI', 'BANANA'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedCrop(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    selectedCrop === key
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {key === 'TOMATO' ? 'Tomatoes' : key === 'RAGI' ? 'Ragi Millet' : 'Elakki Banana'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center pt-4 border-t border-stone-800">
            
            {/* Range Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Procurement Batch Size:
                </label>
                <span className="text-2xl font-black text-emerald-400">
                  {volumeKg} {activeCrop.unit.toUpperCase()}
                </span>
              </div>
              <input
                type="range"
                min={25}
                max={1500}
                step={25}
                value={volumeKg}
                onChange={(e) => setVolumeKg(Number(e.target.value))}
                className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-bold uppercase">
                <span>Direct Family Batch (25 {activeCrop.unit})</span>
                <span>Wholesale Load (1,500 {activeCrop.unit})</span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-stone-800/80 p-5 rounded-2xl border border-stone-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Retail City Rate</span>
                <span className="text-2xl font-black text-stone-300 mt-1 block">
                  ₹{speculativeRetailCost.toLocaleString()}
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">
                  Avg ₹{activeCrop.retailPrice}/{activeCrop.unit} in retail marts
                </span>
              </div>

              <div className="bg-emerald-950/80 p-5 rounded-2xl border border-emerald-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">FarmConnect Rate</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  ₹{directFarmerPayout.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-300 mt-0.5 block">
                  Direct ₹{activeCrop.farmerPrice}/{activeCrop.unit} to cultivator
                </span>
              </div>

              <div className="bg-stone-800/80 p-5 rounded-2xl border border-stone-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Buyer Savings</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  ₹{totalBuyerSavings.toLocaleString()}
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  {savingsPercentage}% saved from middlemen markups
                </span>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 5. Regional Cultivation Hubs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">Cluster Origin Mapping</span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
              Active Karnataka Cultivator Hubs
            </h2>
          </div>
          <Link
            href="/consumer/map"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 self-start sm:self-auto"
          >
            Explore Interactive Geospatial Map <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  Mandya Hub
                </span>
                <h3 className="font-black text-stone-900 text-lg mt-2">Sugar & Native Fields</h3>
                <p className="text-xs text-stone-500">Srirangapatna & Pandavapura Belts</p>
              </div>
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Prime sourcing for heirloom Nati tomatoes, natural jaggery, and unpolished native ragi grains cultivated along Cauvery irrigation canals.
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">Active Growers: <strong>48 Verified</strong></span>
              <Link href="/consumer/explore" className="text-emerald-800 font-bold hover:underline">
                View Crops →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  Mysuru Hub
                </span>
                <h3 className="font-black text-stone-900 text-lg mt-2">Chamundi Organic Basin</h3>
                <p className="text-xs text-stone-500">Nanjangud & Hunsur Orchards</p>
              </div>
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Renowned for authentic Mysore Yelakki bananas, chemical-free greens, and seasonal fruits grown with drip irrigation and natural compost.
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">Active Growers: <strong>36 Verified</strong></span>
              <Link href="/consumer/explore" className="text-emerald-800 font-bold hover:underline">
                View Crops →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  Dharwad Hub
                </span>
                <h3 className="font-black text-stone-900 text-lg mt-2">North Karnataka Plains</h3>
                <p className="text-xs text-stone-500">Hubballi & Byadgi Border</p>
              </div>
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Specialized wholesale pulses, high-curcumin dry turmeric, Byadgi chillies, and organic yellow maize available in bulk quintal volumes.
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">Active Growers: <strong>29 Verified</strong></span>
              <Link href="/consumer/explore" className="text-emerald-800 font-bold hover:underline">
                View Crops →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Dual Platform Onboarding */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-gradient-to-br from-emerald-900 to-stone-900 text-white rounded-3xl p-8 sm:p-10 border border-emerald-800 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center text-white">
                <Sprout className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black">Are You a Cultivator?</h3>
              <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                Take full control of your harvest earnings. List crops at your own rates, benchmark against live APMC yard bids, and chat directly with buyers without paying a rupee to broker cartels.
              </p>
            </div>
            <Link
              href="/farmer/dashboard"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 self-start"
            >
              Open Farmer Control Center <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-900">
                <ShoppingBag className="w-6 h-6 text-emerald-800" />
              </div>
              <h3 className="text-2xl font-black text-stone-900">Procuring for Kitchen or Business?</h3>
              <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
                Whether purchasing 5 kg of fresh table produce or 500 kg for an institution, enjoy transparent farm-gate rates, single-cultivator freight tracking, and zero hidden markups.
              </p>
            </div>
            <Link
              href="/consumer/explore"
              className="px-6 py-3.5 bg-stone-900 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 self-start"
            >
              Explore Harvest Lots <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}