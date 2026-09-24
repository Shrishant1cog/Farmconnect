'use client';

import React, { useState } from 'react';
import { Calculator, X, MessageSquare } from 'lucide-react';

export default function LogisticsProfitDrawer({ cropData, onClose }: { cropData: any; onClose: () => void }) {
  const [quantityKg, setQuantityKg] = useState<number>(500);
  const [containerType, setContainerType] = useState<string>('COLD_CHAIN_REFRIGERATED');
  const [apmcMandiPrice, setApmcMandiPrice] = useState<number>(3400); // ₹ per Quintal
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleComputeProfit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logistics/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropQuantityKg: quantityKg,
          farmerPricePerKg: cropData?.price || 20,
          originLat: cropData?.lat || 12.5218,
          originLon: cropData?.lon || 76.8951,
          destLat: 12.9716, // Consumer destination (Bengaluru)
          destLon: 77.5946,
          containerType,
          apmcModalPricePerQuintal: apmcMandiPrice
        })
      });
      const json = await res.json();
      setQuote(json.data);
    } catch (e) {
      alert('Unable to calculate logistics quote');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const token = localStorage.getItem('fc_token');
      if (!token) {
        alert("Please log in to message the farmer.");
        return;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enquiries`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          productId: cropData?.id || 'sample-id', // Use actual product ID if available from cropData
          subject: `Inquiry regarding ${cropData?.name || 'harvest'}`, 
          message: "Hi, I am interested in negotiating transport and pricing for this harvest." 
        })
      });
      
      const json = await res.json();
      if (json.success) {
        window.location.href = `/chat/${json.data.id}`;
      } else {
        alert(json.message || "Could not start chat thread.");
      }
    } catch (e) {
      alert("Network error connecting to chat.");
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right-8 duration-300">
        <div>
          <div className="flex justify-between items-center pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-xl font-black text-stone-900">Transport & Profit Engine</h3>
              <p className="text-xs font-bold text-emerald-700">{cropData?.name || 'Selected Point'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {/* Configuration Inputs */}
          <div className="space-y-4 my-6">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Quantity to Transport (KG)</label>
              <input type="number" value={quantityKg} onChange={e => setQuantityKg(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Storage & Container Environment</label>
              <select value={containerType} onChange={e => setContainerType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-semibold bg-white outline-none focus:border-emerald-500">
                <option value="COLD_CHAIN_REFRIGERATED">Refrigerated Cold Chain (Perishables / Berries / Milk)</option>
                <option value="STANDARD_CRATE">Standard Ventilated Plastic Crates</option>
                <option value="MOISTURE_CONTROLLED">Moisture Controlled Sealed Chamber (Grains)</option>
                <option value="VENTILATED_JUTE">Open-Burlap Jute Sacks (Onion / Potato)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Local APMC Benchmark Rate (₹ / Quintal)</label>
              <input type="number" value={apmcMandiPrice} onChange={e => setApmcMandiPrice(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold outline-none focus:border-emerald-500" />
            </div>
          </div>

          <button onClick={handleComputeProfit} disabled={loading} className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
            <Calculator className="w-5 h-5" />
            {loading ? 'Evaluating Costs...' : 'Check Approx Profit'}
          </button>
          
          <button 
            type="button"
            onClick={handleStartChat}
            className="w-full py-3.5 mt-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <MessageSquare className="w-5 h-5" />
            Direct Message Farmer
          </button>

          {/* Results Display */}
          {quote && (
            <div className="mt-6 p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in slide-in-from-bottom-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-500">Overall Cost Breakdown</h4>
              <div className="divide-y divide-stone-200 text-sm">
                <div className="py-2 flex justify-between"><span>Radial Distance:</span><span className="font-bold">{quote.distanceKm} km</span></div>
                <div className="py-2 flex justify-between"><span>Base Freight:</span><span className="font-bold">₹{quote.breakdown.baseFreightCost}</span></div>
                <div className="py-2 flex justify-between"><span>Special Container Cost:</span><span className="font-bold text-amber-700">₹{quote.breakdown.specialContainerCost}</span></div>
                <div className="py-2 flex justify-between"><span>Farmer Produce Cost:</span><span className="font-bold">₹{quote.breakdown.farmerProduceCost}</span></div>
                <div className="py-3 flex justify-between text-base font-black text-stone-900 border-t-2 border-stone-300">
                  <span>Total Landed Cost:</span><span>₹{quote.breakdown.totalLandedCost}</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border mt-4 ${quote.profitAssessment.isProfitable ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900">Projected Market Profit</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">{quote.profitAssessment.profitMarginPercent}</span>
                </div>
                <div className="text-3xl font-black text-emerald-900">₹{quote.profitAssessment.approxNetProfit}</div>
                <p className="text-[11px] text-emerald-700 mt-2 font-medium">Calculated against current APMC Mandi value (₹{quote.profitAssessment.expectedApmcValue}) minus transport, packaging, and acquisition costs.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}