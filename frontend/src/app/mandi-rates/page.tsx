'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, TrendingDown, Minus, Search, 
  Building2, Sparkles, ArrowRight, Filter, Info,
  Download, ArrowUpDown, CheckCircle2, ChevronRight,
  Scale, X, MapPin, Calendar, HelpCircle, Layers
} from 'lucide-react';

interface MandiRecord {
  id: string;
  commodity: string;
  variety: string;
  category: 'Vegetables' | 'Fruits' | 'Grains & Millets' | 'Spices & Cash Crops' | 'Pulses' | 'Plantation';
  state: string;
  district: string;
  market: string;
  minPrice: number;       // ₹ per Quintal (100kg)
  maxPrice: number;       // ₹ per Quintal
  modalPrice: number;     // ₹ per Quintal
  farmConnectPrice: number; // Direct farmer rate
  arrivalQtyTonnes: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercent: number;
  lastUpdated: string;
  gradeSpec: string;
  tradingHours: string;
}

const ALL_INDIA_MANDI_DATA: MandiRecord[] = [
  // --- VEGETABLES ---
  {
    id: 'veg-1',
    commodity: 'Tomato (Nati / Local)',
    variety: 'Desi Heirloom',
    category: 'Vegetables',
    state: 'Karnataka',
    district: 'Kolar',
    market: 'Kolar APMC Yard',
    minPrice: 1800,
    maxPrice: 2600,
    modalPrice: 2200,
    farmConnectPrice: 2000,
    arrivalQtyTonnes: 420,
    trend: 'UP',
    trendPercent: 8.5,
    lastUpdated: 'Today, 06:30 AM',
    gradeSpec: 'Grade-A Firm Red, 65mm+ diameter, zero puncture',
    tradingHours: '05:00 AM - 11:30 AM',
  },
  {
    id: 'veg-2',
    commodity: 'Tomato (Organic Field)',
    variety: 'Vine Ripened Semi-Determinate',
    category: 'Vegetables',
    state: 'Karnataka',
    district: 'Mandya',
    market: 'Mandya Central APMC',
    minPrice: 2400,
    maxPrice: 3200,
    modalPrice: 2800,
    farmConnectPrice: 2800,
    arrivalQtyTonnes: 140,
    trend: 'STABLE',
    trendPercent: 0,
    lastUpdated: 'Today, 07:15 AM',
    gradeSpec: 'Naturally ripened, Brix 4.8%+, zero chemical residue',
    tradingHours: '06:00 AM - 12:00 PM',
  },
  {
    id: 'veg-3',
    commodity: 'Onion (Red Bellary)',
    variety: 'Bellary Medium Globe',
    category: 'Vegetables',
    state: 'Karnataka',
    district: 'Hubballi',
    market: 'Amargol APMC Hubballi',
    minPrice: 2100,
    maxPrice: 2850,
    modalPrice: 2500,
    farmConnectPrice: 2400,
    arrivalQtyTonnes: 580,
    trend: 'DOWN',
    trendPercent: -4.2,
    lastUpdated: 'Today, 05:45 AM',
    gradeSpec: '45-55mm cured bulbs, dry outer tunic, <3% neck rot',
    tradingHours: '04:30 AM - 01:00 PM',
  },
  {
    id: 'veg-4',
    commodity: 'Onion (Nashik Red)',
    variety: 'Pola Red Grade-A',
    category: 'Vegetables',
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Lasalgaon Mandi Yard',
    minPrice: 2300,
    maxPrice: 3100,
    modalPrice: 2750,
    farmConnectPrice: 2600,
    arrivalQtyTonnes: 1420,
    trend: 'UP',
    trendPercent: 5.1,
    lastUpdated: 'Today, 06:00 AM',
    gradeSpec: '55mm+ Export grade, cured 72hrs on field bed',
    tradingHours: '06:00 AM - 03:00 PM',
  },
  {
    id: 'veg-5',
    commodity: 'Potato (Agra Jyoti)',
    variety: 'Jyoti Seed Grade',
    category: 'Vegetables',
    state: 'Uttar Pradesh',
    district: 'Agra',
    market: 'Agra Mandi Yard',
    minPrice: 1400,
    maxPrice: 1850,
    modalPrice: 1650,
    farmConnectPrice: 1600,
    arrivalQtyTonnes: 920,
    trend: 'STABLE',
    trendPercent: 0,
    lastUpdated: 'Today, 08:00 AM',
    gradeSpec: 'Oval clean skin, 45mm+, nil greening or hollow heart',
    tradingHours: '07:00 AM - 02:00 PM',
  },
  {
    id: 'veg-6',
    commodity: 'Green Capsicum (Bell Pepper)',
    variety: 'Indra Hybrid',
    category: 'Vegetables',
    state: 'Karnataka',
    district: 'Belagavi',
    market: 'Belagavi APMC Yard',
    minPrice: 3200,
    maxPrice: 4800,
    modalPrice: 4100,
    farmConnectPrice: 3900,
    arrivalQtyTonnes: 95,
    trend: 'UP',
    trendPercent: 6.8,
    lastUpdated: 'Today, 07:45 AM',
    gradeSpec: '3-4 Lobed, dark gloss green, 150g-220g single piece weight',
    tradingHours: '06:30 AM - 11:30 AM',
  },

  // --- GRAINS & MILLETS ---
  {
    id: 'grain-1',
    commodity: 'Finger Millet (Mandya Ragi)',
    variety: 'Desi Brown MR-1',
    category: 'Grains & Millets',
    state: 'Karnataka',
    district: 'Mandya',
    market: 'Pandavapura Mandi',
    minPrice: 3900,
    maxPrice: 4600,
    modalPrice: 4200,
    farmConnectPrice: 4200,
    arrivalQtyTonnes: 95,
    trend: 'UP',
    trendPercent: 3.4,
    lastUpdated: 'Today, 07:00 AM',
    gradeSpec: 'Double-screened clean seeds, Moisture <11%, Nil weed seed',
    tradingHours: '08:00 AM - 02:00 PM',
  },
  {
    id: 'grain-2',
    commodity: 'Sona Masoori Organic Paddy',
    variety: 'BPT-5204 Raw',
    category: 'Grains & Millets',
    state: 'Karnataka',
    district: 'Raichur',
    market: 'Raichur Grain Market',
    minPrice: 3100,
    maxPrice: 3750,
    modalPrice: 3450,
    farmConnectPrice: 3400,
    arrivalQtyTonnes: 680,
    trend: 'DOWN',
    trendPercent: -2.1,
    lastUpdated: 'Today, 06:15 AM',
    gradeSpec: 'Medium slender grain, Moisture 13%, Head rice recovery >64%',
    tradingHours: '07:30 AM - 04:00 PM',
  },
  {
    id: 'grain-3',
    commodity: 'Sharbati Wheat',
    variety: 'Sehore Golden MP',
    category: 'Grains & Millets',
    state: 'Madhya Pradesh',
    district: 'Sehore',
    market: 'Sehore Mandi Yard',
    minPrice: 3600,
    maxPrice: 4400,
    modalPrice: 4050,
    farmConnectPrice: 3950,
    arrivalQtyTonnes: 440,
    trend: 'UP',
    trendPercent: 2.8,
    lastUpdated: 'Today, 07:30 AM',
    gradeSpec: 'Amber bold grain, Protein 12.5%+, 1000 kernel wt 44g',
    tradingHours: '08:30 AM - 03:00 PM',
  },
  {
    id: 'grain-4',
    commodity: 'Basmati Paddy (Pusa 1121)',
    variety: 'Pusa-1121 Export Spec',
    category: 'Grains & Millets',
    state: 'Punjab',
    district: 'Ludhiana',
    market: 'Khanna Grain Yard',
    minPrice: 4200,
    maxPrice: 5100,
    modalPrice: 4750,
    farmConnectPrice: 4600,
    arrivalQtyTonnes: 880,
    trend: 'UP',
    trendPercent: 4.1,
    lastUpdated: 'Today, 08:15 AM',
    gradeSpec: 'Extra long slender 8.4mm milled grain, Moisture 12%',
    tradingHours: '08:00 AM - 05:00 PM',
  },
  {
    id: 'grain-5',
    commodity: 'Yellow Maize / Corn',
    variety: 'Bio-9681 Single Cross',
    category: 'Grains & Millets',
    state: 'Karnataka',
    district: 'Davanagere',
    market: 'Davanagere APMC',
    minPrice: 2150,
    maxPrice: 2650,
    modalPrice: 2450,
    farmConnectPrice: 2350,
    arrivalQtyTonnes: 510,
    trend: 'DOWN',
    trendPercent: -1.8,
    lastUpdated: 'Today, 06:40 AM',
    gradeSpec: 'Dry cob harvest, Moisture <13.5%, Aflatoxin <20ppb',
    tradingHours: '08:00 AM - 02:00 PM',
  },

  // --- FRUITS ---
  {
    id: 'fruit-1',
    commodity: 'Banana (Yelakki / Elakki Bale)',
    variety: 'Mysuru Native Nanjangud',
    category: 'Fruits',
    state: 'Karnataka',
    district: 'Mysuru',
    market: 'Bandipalya APMC Mysuru',
    minPrice: 5200,
    maxPrice: 7200,
    modalPrice: 6500,
    farmConnectPrice: 6500,
    arrivalQtyTonnes: 160,
    trend: 'UP',
    trendPercent: 6.2,
    lastUpdated: 'Today, 06:45 AM',
    gradeSpec: '12-14 fingers per hand, 75% matured green, carbide free',
    tradingHours: '05:30 AM - 11:00 AM',
  },
  {
    id: 'fruit-2',
    commodity: 'Pomegranate (Bhagwa Kesar)',
    variety: 'Deep Ruby Bhagwa',
    category: 'Fruits',
    state: 'Maharashtra',
    district: 'Solapur',
    market: 'Solapur Yard',
    minPrice: 9500,
    maxPrice: 14000,
    modalPrice: 11800,
    farmConnectPrice: 11200,
    arrivalQtyTonnes: 115,
    trend: 'STABLE',
    trendPercent: 0,
    lastUpdated: 'Today, 07:00 AM',
    gradeSpec: '280g-350g single fruit, soft aril, deep red internal aril',
    tradingHours: '07:00 AM - 01:00 PM',
  },
  {
    id: 'fruit-3',
    commodity: 'Papaya (Red Lady 786)',
    variety: 'Red Lady F1 Taiwan',
    category: 'Fruits',
    state: 'Karnataka',
    district: 'Shivamogga',
    market: 'Shivamogga APMC',
    minPrice: 1800,
    maxPrice: 2700,
    modalPrice: 2300,
    farmConnectPrice: 2200,
    arrivalQtyTonnes: 130,
    trend: 'UP',
    trendPercent: 3.7,
    lastUpdated: 'Today, 07:10 AM',
    gradeSpec: '1.2kg - 1.8kg, color break stage 1, latex dry',
    tradingHours: '06:00 AM - 11:30 AM',
  },

  // --- SPICES & CASH CROPS ---
  {
    id: 'spice-1',
    commodity: 'Byadgi Chilli (Kaddi / Stemless)',
    variety: 'Deep Red High Color Kaddi',
    category: 'Spices & Cash Crops',
    state: 'Karnataka',
    district: 'Haveri',
    market: 'Byadgi APMC Mandi',
    minPrice: 28000,
    maxPrice: 42000,
    modalPrice: 36500,
    farmConnectPrice: 35000,
    arrivalQtyTonnes: 92,
    trend: 'UP',
    trendPercent: 4.9,
    lastUpdated: 'Today, 05:30 AM',
    gradeSpec: 'ASTA color value 140-160, capsaicin <0.2%, wrinkled stemless',
    tradingHours: '07:00 AM - 01:30 PM',
  },
  {
    id: 'spice-2',
    commodity: 'Turmeric (Salem Finger)',
    variety: 'Curcumin 5.2% Tested',
    category: 'Spices & Cash Crops',
    state: 'Tamil Nadu',
    district: 'Erode',
    market: 'Erode Regulated Market',
    minPrice: 12500,
    maxPrice: 17500,
    modalPrice: 15200,
    farmConnectPrice: 14800,
    arrivalQtyTonnes: 230,
    trend: 'DOWN',
    trendPercent: -1.8,
    lastUpdated: 'Today, 06:10 AM',
    gradeSpec: 'Double-polished hard finger, bright yellow core, moisture 9%',
    tradingHours: '08:00 AM - 03:00 PM',
  },
  {
    id: 'spice-3',
    commodity: 'Green Cardamom (Small Alleppey)',
    variety: '8.0mm Deep Green Bold',
    category: 'Spices & Cash Crops',
    state: 'Kerala',
    district: 'Idukki',
    market: 'Vandanmettu Spices Yard',
    minPrice: 210000,
    maxPrice: 265000,
    modalPrice: 242000,
    farmConnectPrice: 238000,
    arrivalQtyTonnes: 14,
    trend: 'UP',
    trendPercent: 7.0,
    lastUpdated: 'Today, 08:15 AM',
    gradeSpec: 'Litre weight 435g+, zero thrip markings, non-split capsules',
    tradingHours: '09:00 AM - 02:00 PM',
  },
  {
    id: 'spice-4',
    commodity: 'Black Pepper (Malabar Garbled)',
    variety: 'Tellicherry Garbled Special',
    category: 'Spices & Cash Crops',
    state: 'Karnataka',
    district: 'Uttara Kannada',
    market: 'Sirsi APMC Market',
    minPrice: 58000,
    maxPrice: 66500,
    modalPrice: 63000,
    farmConnectPrice: 61500,
    arrivalQtyTonnes: 45,
    trend: 'STABLE',
    trendPercent: 0,
    lastUpdated: 'Today, 07:20 AM',
    gradeSpec: 'Litre weight 550g+, moisture 10.5%, zero light berries',
    tradingHours: '08:30 AM - 01:30 PM',
  },

  // --- PULSES ---
  {
    id: 'pulse-1',
    commodity: 'Tur / Arhar Dal (Red Gram)',
    variety: 'Kalaburagi Desi Red',
    category: 'Pulses',
    state: 'Karnataka',
    district: 'Kalaburagi',
    market: 'Gulbarga APMC Yard',
    minPrice: 8800,
    maxPrice: 10400,
    modalPrice: 9600,
    farmConnectPrice: 9400,
    arrivalQtyTonnes: 340,
    trend: 'DOWN',
    trendPercent: -2.7,
    lastUpdated: 'Today, 06:50 AM',
    gradeSpec: 'Hard spherical seed, moisture <10%, nil weevil damage',
    tradingHours: '07:00 AM - 02:30 PM',
  },
  {
    id: 'pulse-2',
    commodity: 'Chana (Bengal Gram)',
    variety: 'Desi Bold Grade-1',
    category: 'Pulses',
    state: 'Rajasthan',
    district: 'Bikaner',
    market: 'Bikaner Anaj Mandi',
    minPrice: 5600,
    maxPrice: 6350,
    modalPrice: 6050,
    farmConnectPrice: 5900,
    arrivalQtyTonnes: 470,
    trend: 'UP',
    trendPercent: 1.5,
    lastUpdated: 'Today, 07:10 AM',
    gradeSpec: 'Golden brown seed coat, moisture 9.5%, purity 99%',
    tradingHours: '08:00 AM - 03:00 PM',
  },
  {
    id: 'pulse-3',
    commodity: 'Green Gram (Moong Whole)',
    variety: 'Shining Green Desi',
    category: 'Pulses',
    state: 'Karnataka',
    district: 'Gadag',
    market: 'Gadag APMC Yard',
    minPrice: 7800,
    maxPrice: 8900,
    modalPrice: 8450,
    farmConnectPrice: 8300,
    arrivalQtyTonnes: 190,
    trend: 'UP',
    trendPercent: 2.3,
    lastUpdated: 'Today, 06:40 AM',
    gradeSpec: 'Medium lustrous green grain, 0.5% refractions max',
    tradingHours: '07:30 AM - 01:00 PM',
  },

  // --- PLANTATION ---
  {
    id: 'plant-1',
    commodity: 'Arabica Coffee (Parchment)',
    variety: 'Plantation-A Grade',
    category: 'Plantation',
    state: 'Karnataka',
    district: 'Chikkamagaluru',
    market: 'Chikkamagaluru Coffee Hub',
    minPrice: 19500,
    maxPrice: 24500,
    modalPrice: 22800,
    farmConnectPrice: 22400,
    arrivalQtyTonnes: 38,
    trend: 'UP',
    trendPercent: 5.4,
    lastUpdated: 'Today, 08:30 AM',
    gradeSpec: 'Screen 17 (6.65mm), moisture 10.5%, zero stinkers',
    tradingHours: '09:00 AM - 03:00 PM',
  },
  {
    id: 'plant-2',
    commodity: 'Arecanut (Rashi / Red Supari)',
    variety: 'Malnad Rashi Supari',
    category: 'Plantation',
    state: 'Karnataka',
    district: 'Shivamogga',
    market: 'MAMCOS APMC Shivamogga',
    minPrice: 48000,
    maxPrice: 56500,
    modalPrice: 53200,
    farmConnectPrice: 52000,
    arrivalQtyTonnes: 72,
    trend: 'STABLE',
    trendPercent: 0,
    lastUpdated: 'Today, 07:50 AM',
    gradeSpec: 'Boiled dried red betelnut, sound boiled kernel, nil fungal spots',
    tradingHours: '09:30 AM - 02:00 PM',
  }
];

export default function MandiRatesPage() {
  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'modalPrice' | 'arrivalQtyTonnes' | 'trendPercent'>('modalPrice');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Unit Mode: Quintal (100 kg) or KG (1 kg)
  const [priceUnitMode, setPriceUnitMode] = useState<'QUINTAL' | 'KG'>('KG');

  // Quick Scope Filter: All India vs Karnataka Yards
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'KARNATAKA'>('ALL');

  // Inspection Modal Drawer
  const [inspectRecord, setInspectRecord] = useState<MandiRecord | null>(null);

  const states = useMemo(() => {
    const list = Array.from(new Set(ALL_INDIA_MANDI_DATA.map((item) => item.state)));
    return ['ALL', ...list.sort()];
  }, []);

  const categories = [
    'ALL', 
    'Vegetables', 
    'Fruits', 
    'Grains & Millets', 
    'Spices & Cash Crops', 
    'Pulses', 
    'Plantation'
  ];

  // Filter and Sort Pipeline
  const filteredData = useMemo(() => {
    return ALL_INDIA_MANDI_DATA.filter((item) => {
      const matchSearch = 
        item.commodity.toLowerCase().includes(search.toLowerCase()) ||
        item.market.toLowerCase().includes(search.toLowerCase()) ||
        item.district.toLowerCase().includes(search.toLowerCase());

      const matchState = 
        scopeFilter === 'KARNATAKA' 
          ? item.state === 'Karnataka'
          : selectedState === 'ALL' || item.state === selectedState;

      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

      return matchSearch && matchState && matchCategory;
    }).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortOrder === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
    });
  }, [search, selectedState, selectedCategory, sortField, sortOrder, scopeFilter]);

  // Aggregate Market Stats
  const stats = useMemo(() => {
    const totalArrivals = filteredData.reduce((acc, curr) => acc + curr.arrivalQtyTonnes, 0);
    const topGainer = [...filteredData].sort((a, b) => b.trendPercent - a.trendPercent)[0];
    const karnatakaCount = filteredData.filter((f) => f.state === 'Karnataka').length;
    return {
      totalArrivals,
      topGainer,
      karnatakaCount,
      totalListed: filteredData.length,
    };
  }, [filteredData]);

  // Unit Format Helper
  const formatPrice = (valInQuintal: number) => {
    if (priceUnitMode === 'KG') {
      const perKg = valInQuintal / 100;
      return `₹${perKg % 1 === 0 ? perKg : perKg.toFixed(1)}`;
    }
    return `₹${valInQuintal.toLocaleString()}`;
  };

  const getUnitSuffix = () => (priceUnitMode === 'KG' ? '/kg' : '/quintal');

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['Commodity', 'Variety', 'Category', 'Market', 'District', 'State', 'Min_Price', 'Max_Price', 'Modal_Price', 'FarmConnect_Price', 'Unit', 'Arrivals_Tonnes', 'Trend_Percent'];
    const rows = filteredData.map((d) => [
      `"${d.commodity}"`,
      `"${d.variety}"`,
      `"${d.category}"`,
      `"${d.market}"`,
      `"${d.district}"`,
      `"${d.state}"`,
      d.minPrice,
      d.maxPrice,
      d.modalPrice,
      d.farmConnectPrice,
      'Quintal',
      d.arrivalQtyTonnes,
      `${d.trendPercent}%`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `farmconnect_mandi_benchmarks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* 1. Header Hero Banner */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> APMC Price Intelligence Terminal
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              Karnataka & All-India Yards
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Mandi Wholesale Benchmark Rates
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Live modal auction rates from regulated market committees across Karnataka and major regional trading yards. Verify prices before procurement to secure fair farm-gate transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl flex items-center gap-2 transition-colors border border-stone-200"
            title="Export filtered records to CSV"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <Link
            href="/consumer/explore"
            className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95 shrink-0"
          >
            Procure From Cultivators <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 2. Key APMC Market KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Tracked Commodities</span>
            <Layers className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.totalListed} Lots</p>
          <span className="text-xs text-stone-500 mt-1 block">
            {stats.karnatakaCount} local Karnataka APMCs
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Highest Gainer Today</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-stone-900 truncate">
            {stats.topGainer ? stats.topGainer.commodity.split('(')[0] : 'N/A'}
          </p>
          <span className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
            +{stats.topGainer?.trendPercent}% ({stats.topGainer?.market.split(' ')[0]})
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Arrivals Today</span>
            <Building2 className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-3xl font-black text-stone-900">{stats.totalArrivals.toLocaleString()} MT</p>
          <span className="text-xs text-stone-500 mt-1 block">
            Aggregated metric tonnes in yards
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">Direct Farm Advantage</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-3xl font-black text-emerald-800">0% Cartel Fee</p>
          <span className="text-xs text-stone-500 mt-1 block">
            Zero commission agent deductions
          </span>
        </div>

      </div>

      {/* 3. Filter, Scope, and Unit Switcher Bar */}
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search crop, mandi yard, or district (e.g. Tomato, Mandya, Byadgi, Coffee)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-2xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Scope Selector: Karnataka vs All India */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  scopeFilter === 'ALL'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                All-India Yards
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('KARNATAKA')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  scopeFilter === 'KARNATAKA'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Karnataka APMCs Only
              </button>
            </div>

            {/* Price Unit Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setPriceUnitMode('KG')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  priceUnitMode === 'KG'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                ₹ / KG
              </button>
              <button
                type="button"
                onClick={() => setPriceUnitMode('QUINTAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  priceUnitMode === 'QUINTAL'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                ₹ / Quintal (100kg)
              </button>
            </div>

            {/* State Dropdown */}
            {scopeFilter === 'ALL' && (
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All Indian States' : s}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-') as [any, any];
                setSortField(f);
                setSortOrder(o);
              }}
              className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="modalPrice-desc">Price: Highest First</option>
              <option value="modalPrice-asc">Price: Lowest First</option>
              <option value="arrivalQtyTonnes-desc">Arrivals: High Volume</option>
              <option value="trendPercent-desc">Top Gainers (%)</option>
            </select>

          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat === 'ALL' ? 'All Commodities' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* 4. Mandi Rates Interactive Data Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/90 border-b border-stone-200 text-[11px] font-black uppercase text-stone-500 tracking-wider">
                <th className="py-4 px-6">Commodity & Grade</th>
                <th className="py-4 px-4">Market Yard (APMC)</th>
                <th className="py-4 px-4 text-right">Min - Max Band</th>
                <th className="py-4 px-4 text-right">Mandi Modal Rate</th>
                <th className="py-4 px-4 text-right">FarmConnect Rate</th>
                <th className="py-4 px-6">Price Position</th>
                <th className="py-4 px-4 text-center">Trend</th>
                <th className="py-4 px-4 text-right">Arrivals</th>
                <th className="py-4 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-stone-400 font-semibold space-y-2">
                    <p className="text-base font-bold text-stone-700">No mandi records matched your filters</p>
                    <p className="text-xs text-stone-400">Try switching to 'All-India Yards' or resetting your search query.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const min = row.minPrice;
                  const max = row.maxPrice;
                  const modal = row.modalPrice;
                  const spreadPercent = max > min ? Math.round(((modal - min) / (max - min)) * 100) : 50;

                  return (
                    <tr 
                      key={row.id} 
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                      onClick={() => setInspectRecord(row)}
                    >
                      {/* Commodity Title */}
                      <td className="py-4 px-6">
                        <div className="font-black text-stone-900 text-sm group-hover:text-emerald-800 transition-colors">
                          {row.commodity}
                        </div>
                        <div className="text-[11px] text-stone-500 font-medium line-clamp-1">
                          {row.variety} • <span className="text-emerald-700 font-bold">{row.category}</span>
                        </div>
                      </td>

                      {/* APMC Market Location */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-stone-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{row.market}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-medium">
                          {row.district}, {row.state}
                        </div>
                      </td>

                      {/* Min - Max Range */}
                      <td className="py-4 px-4 text-right text-stone-600 font-medium whitespace-nowrap">
                        {formatPrice(row.minPrice)} - {formatPrice(row.maxPrice)}
                        <span className="block text-[10px] text-stone-400">{getUnitSuffix()}</span>
                      </td>

                      {/* Mandi Modal Auction Price */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="text-base font-black text-stone-900">
                          {formatPrice(row.modalPrice)}
                        </span>
                        <span className="block text-[10px] text-stone-400">{getUnitSuffix()}</span>
                      </td>

                      {/* Direct FarmConnect Price */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="text-base font-black text-emerald-800">
                          {formatPrice(row.farmConnectPrice)}
                        </span>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600">
                          Direct Gate
                        </span>
                      </td>

                      {/* Visual Spread Bar */}
                      <td className="py-4 px-6 min-w-[140px]">
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden relative">
                          <div 
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${spreadPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-stone-400 font-bold mt-1">
                          <span>Low</span>
                          <span>Modal: {spreadPercent}%</span>
                          <span>High</span>
                        </div>
                      </td>

                      {/* Daily Trend */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {row.trend === 'UP' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-black text-[11px]">
                            <TrendingUp className="w-3 h-3" /> +{row.trendPercent}%
                          </span>
                        ) : row.trend === 'DOWN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-[11px]">
                            <TrendingDown className="w-3 h-3" /> -{row.trendPercent}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-black text-[11px]">
                            <Minus className="w-3 h-3" /> Stable
                          </span>
                        )}
                      </td>

                      {/* Volume Arrivals */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-stone-800 text-sm">
                          {row.arrivalQtyTonnes} MT
                        </span>
                        <span className="block text-[10px] text-stone-400">{row.lastUpdated}</span>
                      </td>

                      {/* Inspect Trigger */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectRecord(row);
                          }}
                          className="p-2 rounded-xl text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title="View APMC Inspection Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Informational Mandi Arbitrage Callout */}
      <div className="bg-emerald-950 text-emerald-100 rounded-3xl p-6 sm:p-10 border border-emerald-900 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
        <div className="space-y-2 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-black uppercase text-emerald-400 tracking-wider">
            <Info className="w-4 h-4" /> The Mandi Commission Arbitrage
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            How FarmConnect Protects Cultivator Margin
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            In typical APMC auction yards, commission agents (Adathiyas), mandi taxes, weighment charges, and grading markdowns deduct up to <strong>15% to 28%</strong> from what farmers actually take home. FarmConnect lets verified growers list directly around modal benchmarks, earning the full value while providing institutional buyers wholesale discounts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            href="/consumer/explore"
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all text-center"
          >
            Direct Marketplace
          </Link>
          <Link
            href="/farmer/dashboard"
            className="px-6 py-3.5 bg-emerald-900 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-emerald-700 transition-all text-center"
          >
            List Farm Harvest
          </Link>
        </div>
      </div>

      {/* 6. Commodity Deep-Dive Inspection Modal */}
      {inspectRecord && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  {inspectRecord.category}
                </span>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight mt-1.5">
                  {inspectRecord.commodity}
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Variety: {inspectRecord.variety}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Yard Details */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">APMC Yard:</span>
                <strong className="text-stone-900">{inspectRecord.market}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">District & State:</span>
                <strong className="text-stone-900">{inspectRecord.district}, {inspectRecord.state}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Auction Timings:</span>
                <strong className="text-stone-900">{inspectRecord.tradingHours}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Daily Arrival Volume:</span>
                <strong className="text-emerald-800">{inspectRecord.arrivalQtyTonnes} Metric Tonnes</strong>
              </div>
            </div>

            {/* Price Economics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">APMC Modal Rate</span>
                <span className="text-2xl font-black text-stone-900 mt-0.5 block">
                  {formatPrice(inspectRecord.modalPrice)}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  Band: {formatPrice(inspectRecord.minPrice)} - {formatPrice(inspectRecord.maxPrice)}
                </span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">FarmConnect Direct</span>
                <span className="text-2xl font-black text-emerald-950 mt-0.5 block">
                  {formatPrice(inspectRecord.farmConnectPrice)}
                </span>
                <span className="text-[11px] text-emerald-700 block mt-0.5">
                  Zero commission markup
                </span>
              </div>
            </div>

            {/* Quality Standard Specification */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Physical Grading & Harvest Specification
              </h4>
              <p className="text-xs text-stone-700 font-medium bg-stone-50 p-3 rounded-xl border border-stone-200 leading-relaxed">
                {inspectRecord.gradeSpec}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close Terminal
              </button>
              <Link
                href={`/consumer/explore?search=${encodeURIComponent(inspectRecord.commodity.split(' ')[0])}`}
                className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                Find Harvest Lots <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}