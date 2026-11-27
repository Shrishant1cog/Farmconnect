'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sprout, ShieldCheck, Zap, ArrowRight, MapPin, 
  TrendingUp, ShoppingBag, Truck, CheckCircle2, 
  Sparkles, Calculator, ArrowUpRight, Building2, 
  ChevronRight
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

const MANDI_TICKER_ITEMS = [
  { crop: 'Kolar Mandi Tomato', price: 22, unit: 'kg', change: 8.5, type: 'up' },
  { crop: 'Mandya Desi Ragi', price: 42, unit: 'kg', change: 3.4, type: 'up' },
  { crop: 'Mysuru Yelakki Bale', price: 65, unit: 'dozen', change: 0, type: 'stable' },
  { crop: 'Dharwad Hybrid Maize', price: 24.5, unit: 'kg', change: -1.8, type: 'down' },
  { crop: 'Byadgi Stemless Chilli', price: 365, unit: 'kg', change: 4.9, type: 'up' },
  { crop: 'Hubballi Red Onion', price: 25, unit: 'kg', change: -4.2, type: 'down' },
  { crop: 'Agra Jyoti Potato', price: 16.5, unit: 'kg', change: 0, type: 'stable' },
  { crop: 'Raichur Sona Masoori', price: 34.5, unit: 'kg', change: -2.1, type: 'down' },
];

export default function HomePage() {
  const { t, formatNumber, formatCurrency } = useI18n();

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
            {t('home.liveMandi')}
          </div>

          {/* Marquee Moving Viewport with Edge Masking */}
          <div className="flex-1 overflow-hidden relative mx-3 select-none [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
            <div className="animate-mandi-scroll items-center gap-8 py-0.5">
              {/* Duplicated list for seamless infinite loop */}
              {[...MANDI_TICKER_ITEMS, ...MANDI_TICKER_ITEMS].map((item, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0 font-medium text-stone-300">
                  <span className="text-stone-400">{item.crop}:</span>
                  <strong className="text-white font-bold">
                    {formatCurrency(item.price)}/{t(item.unit === 'dozen' ? 'misc.unit.dozen' : 'misc.unit.kg')}
                  </strong>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      item.type === 'up'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                        : item.type === 'down'
                        ? 'bg-rose-900/80 text-rose-300 border border-rose-700'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {item.type === 'stable'
                      ? t('misc.status.stable')
                      : item.change > 0
                        ? `+${formatNumber(item.change)}%`
                        : `-${formatNumber(Math.abs(item.change))}%`}
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
            {t('home.allMandis')} <ArrowUpRight className="w-3.5 h-3.5" />
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
              <Sprout className="w-4 h-4 text-emerald-400" /> {t('misc.home.badge')}
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              {t('home.heroTitle')}
            </h1>

            <p className="text-stone-300 text-base sm:text-xl font-medium leading-relaxed max-w-2xl">
              {t('home.heroBody')}
            </p>

            {/* Action Group */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/consumer/explore"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-emerald-950/40 active:scale-95"
              >
                {t('home.browseMarketplace')} <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>

              <Link
                href="/mandi-rates"
                className="px-7 py-4 bg-stone-800 hover:bg-stone-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-stone-700 transition-all flex items-center gap-2 active:scale-95"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" /> {t('misc.home.mandiBenchmarkRates')}
              </Link>

              <Link
                href="/consumer/map"
                className="px-7 py-4 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 font-black text-xs uppercase tracking-wider rounded-2xl border border-emerald-800 transition-all flex items-center gap-2 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-emerald-400" /> {t('misc.home.geospatialFarmMap')}
              </Link>
            </div>

            {/* Platform Credibility Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-stone-800/80">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-white block tracking-tight">{formatNumber(100)}%</span>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{t('misc.home.directCultivatorPayout')}</span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 block tracking-tight">{formatCurrency(0)}</span>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{t('misc.home.middlemanMarkups')}</span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-black text-white block tracking-tight">{formatNumber(12)} APMC</span>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{t('misc.home.mandiYardsSynced')}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Core Operational Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">{t('misc.home.transparentInfrastructure')}</span>
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight mt-1">
            {t('home.pillarsTitle')}
          </h2>
          <p className="text-stone-600 text-sm mt-2">
            {t('misc.home.pillarsBody')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-4 group">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-900 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6 text-emerald-800" />
            </div>
            <h3 className="font-black text-xl text-stone-900">{t('home.pillar1Title')}</h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              {t('misc.home.pillar1Body')}
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> {t('misc.home.farmGateRealization')}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-4 group">
            <div className="w-12 h-12 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-blue-800" />
            </div>
            <h3 className="font-black text-xl text-stone-900">{t('home.pillar2Title')}</h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              {t('misc.home.pillar2Body')}
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-blue-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> {t('misc.home.websocketLiveFeeds')}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-4 group">
            <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6 text-amber-800" />
            </div>
            <h3 className="font-black text-xl text-stone-900">{t('home.pillar3Title')}</h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              {t('misc.home.pillar3Body')}
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> {t('misc.home.radiusClusterFiltering')}
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
                <Calculator className="w-4 h-4" /> {t('misc.home.economicImpactVisualizer')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                {t('misc.home.calculateDirectTradeSavings')}
              </h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-1">
                {t('misc.home.calculatorBody')}
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
                  {key === 'TOMATO'
                    ? t('misc.home.tomatoes')
                    : key === 'RAGI'
                      ? t('misc.home.ragiMillet')
                      : t('misc.home.elakkiBanana')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center pt-4 border-t border-stone-800">
            
            {/* Range Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  {t('misc.home.procurementBatchSize')}
                </label>
                <span className="text-2xl font-black text-emerald-400">
                  {formatNumber(volumeKg)} {t(activeCrop.unit === 'dozen' ? 'misc.unit.dozen' : 'misc.unit.kg').toUpperCase()}
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
                <span>{t('misc.home.directFamilyBatch', { quantity: formatNumber(25), unit: t(activeCrop.unit === 'dozen' ? 'misc.unit.dozen' : 'misc.unit.kg') })}</span>
                <span>{t('misc.home.wholesaleLoad', { quantity: formatNumber(1500), unit: t(activeCrop.unit === 'dozen' ? 'misc.unit.dozen' : 'misc.unit.kg') })}</span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-stone-800/80 p-5 rounded-2xl border border-stone-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">{t('misc.home.retailCityRate')}</span>
                <span className="text-2xl font-black text-stone-300 mt-1 block">
                  {formatCurrency(speculativeRetailCost)}
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">
                  {t('misc.home.avgRetailRate', { price: formatCurrency(activeCrop.retailPrice), unit: t(activeCrop.unit === 'dozen' ? 'misc.unit.dozen' : 'misc.unit.kg') })}
                </span>
              </div>

              <div className="bg-emerald-950/80 p-5 rounded-2xl border border-emerald-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">{t('misc.home.farmConnectRate')}</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {formatCurrency(directFarmerPayout)}
                </span>
                <span className="text-[11px] text-emerald-300 mt-0.5 block">
                  {t('misc.home.directCultivatorRate', { price: formatCurrency(activeCrop.farmerPrice), unit: t(activeCrop.unit === 'dozen' ? 'misc.unit.dozen' : 'misc.unit.kg') })}
                </span>
              </div>

              <div className="bg-stone-800/80 p-5 rounded-2xl border border-stone-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">{t('misc.home.totalBuyerSavings')}</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {formatCurrency(totalBuyerSavings)}
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  {t('misc.home.savedFromMiddlemen', { percentage: formatNumber(savingsPercentage) })}
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
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">{t('misc.home.clusterOriginMapping')}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">
              {t('home.hubsTitle')}
            </h2>
          </div>
          <Link
            href="/consumer/map"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 self-start sm:self-auto"
          >
            {t('home.mapCta')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  {t('misc.home.mandyaHub')}
                </span>
                <h3 className="font-black text-stone-900 text-lg mt-2">{t('misc.home.sugarNativeFields')}</h3>
                <p className="text-xs text-stone-500">{t('misc.home.srirangapatnaPandavapura')}</p>
              </div>
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('misc.home.mandyaHubBody')}
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">{t('misc.home.activeGrowers')} <strong>{t('misc.home.verifiedCount', { count: formatNumber(48) })}</strong></span>
              <Link href="/consumer/explore" className="text-emerald-800 font-bold hover:underline">
                {t('misc.home.viewCrops')}
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  {t('misc.home.mysuruHub')}
                </span>
                <h3 className="font-black text-stone-900 text-lg mt-2">{t('misc.home.chamundiOrganicBasin')}</h3>
                <p className="text-xs text-stone-500">{t('misc.home.nanjangudHunsurOrchards')}</p>
              </div>
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('misc.home.mysuruHubBody')}
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">{t('misc.home.activeGrowers')} <strong>{t('misc.home.verifiedCount', { count: formatNumber(36) })}</strong></span>
              <Link href="/consumer/explore" className="text-emerald-800 font-bold hover:underline">
                {t('misc.home.viewCrops')}
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                  {t('misc.home.dharwadHub')}
                </span>
                <h3 className="font-black text-stone-900 text-lg mt-2">{t('misc.home.northKarnatakaPlains')}</h3>
                <p className="text-xs text-stone-500">{t('misc.home.hubballiByadgiBorder')}</p>
              </div>
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('misc.home.dharwadHubBody')}
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 font-semibold">{t('misc.home.activeGrowers')} <strong>{t('misc.home.verifiedCount', { count: formatNumber(29) })}</strong></span>
              <Link href="/consumer/explore" className="text-emerald-800 font-bold hover:underline">
                {t('misc.home.viewCrops')}
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
              <h3 className="text-2xl font-black">{t('misc.home.areYouCultivator')}</h3>
              <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                {t('misc.home.cultivatorBody')}
              </p>
            </div>
            <Link
              href="/farmer/dashboard"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 self-start"
            >
              {t('home.openFarmerHub')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-900">
                <ShoppingBag className="w-6 h-6 text-emerald-800" />
              </div>
              <h3 className="text-2xl font-black text-stone-900">{t('misc.home.procuringKitchenBusiness')}</h3>
              <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
                {t('misc.home.procuringBody')}
              </p>
            </div>
            <Link
              href="/consumer/explore"
              className="px-6 py-3.5 bg-stone-900 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 self-start"
            >
              {t('home.exploreHarvestLots')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}