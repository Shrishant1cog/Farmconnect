'use client';

import React, { useState } from 'react';
import { Calculator, X, MessageSquare, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface LogisticsProfitDrawerProps {
  cropData: any;
  onClose: () => void;
}

export default function LogisticsProfitDrawer({ cropData, onClose }: LogisticsProfitDrawerProps) {
  const [quantityKg, setQuantityKg] = useState<number>(500);
  const [containerType, setContainerType] = useState<string>('COLD_CHAIN_REFRIGERATED');
  const [apmcMandiPrice, setApmcMandiPrice] = useState<number>(3400); // ₹ per Quintal
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  };

  const handleComputeProfit = async () => {
    if (quantityKg <= 0 || isNaN(quantityKg)) {
      setError('Please provide a valid quantity to transport in kilograms.');
      return;
    }

    setLoading(true);
    setError(null);

    const safeCropPrice = Number(cropData?.farmerPrice || cropData?.price || 20);
    const originLat = Number(cropData?.farmerLat || cropData?.lat || 12.5218);
    const originLon = Number(cropData?.farmerLon || cropData?.lon || 76.8951);

    const payload = {
      cropQuantityKg: Number(quantityKg),
      farmerPricePerKg: safeCropPrice,
      originLat,
      originLon,
      destLat: 12.9716, // Regional wholesale benchmark destination (Bengaluru)
      destLon: 77.5946,
      containerType,
      apmcModalPricePerQuintal: Number(apmcMandiPrice) || 3400,
    };

    try {
      let json: any;
      try {
        json = await fetchApi('/logistics/quote', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/logistics/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        json = await res.json();
      }

      const quoteData = json?.data || json?.quote || json;
      if (quoteData && (quoteData.breakdown || quoteData.distanceKm !== undefined)) {
        setQuote(quoteData);
      } else {
        setError(json?.message || 'Unable to compute logistics quote.');
      }
    } catch (err: any) {
      console.error('Logistics computation error:', err);
      setError('Unable to calculate logistics quote at this time.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Please sign in to message this cultivator directly.');
      return;
    }

    const resolvedProductId = cropData?.id || cropData?.productId;
    if (!resolvedProductId) {
      setError('Unable to identify product listing details for messaging.');
      return;
    }

    setChatLoading(true);
    setError(null);

    const payload = {
      productId: resolvedProductId,
      subject: `Inquiry regarding ${cropData?.title || cropData?.name || 'harvest produce'}`,
      message: 'Hi, I am interested in negotiating transport and pricing for this harvest.',
    };

    try {
      let json: any;
      try {
        json = await fetchApi('/enquiries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/enquiries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
      }

      const enquiryId = json?.data?.id || json?.id || json?.enquiry?.id;
      if (enquiryId) {
        window.location.href = `/chat/${enquiryId}`;
      } else {
        setError(json?.message || 'Could not initiate chat conversation thread.');
      }
    } catch (err: any) {
      console.error('Start chat error:', err);
      setError('Network error connecting to messaging server.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right-8 duration-300">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-xl font-black text-stone-900">Transport & Profit Engine</h3>
              <p className="text-xs font-bold text-emerald-700">
                {cropData?.title || cropData?.name || 'Produce Analysis'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="space-y-4 my-6">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Quantity to Transport (KG)
              </label>
              <input
                type="number"
                min="1"
                value={quantityKg}
                onChange={(e) => setQuantityKg(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Storage & Container Environment
              </label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-semibold bg-white outline-none focus:border-emerald-600"
              >
                <option value="COLD_CHAIN_REFRIGERATED">Refrigerated Cold Chain (Perishables / Milk)</option>
                <option value="STANDARD_CRATE">Standard Ventilated Plastic Crates</option>
                <option value="MOISTURE_CONTROLLED">Moisture Controlled Sealed Chamber (Grains / Pulses)</option>
                <option value="VENTILATED_JUTE">Open-Burlap Jute Sacks (Onion / Potato)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Local APMC Benchmark Rate (₹ / Quintal)
              </label>
              <input
                type="number"
                min="0"
                value={apmcMandiPrice}
                onChange={(e) => setApmcMandiPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Compute Action */}
          <button
            onClick={handleComputeProfit}
            disabled={loading}
            className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
            {loading ? 'Evaluating Costs...' : 'Check Approx Profit'}
          </button>

          {/* Direct Message Action */}
          <button
            type="button"
            onClick={handleStartChat}
            disabled={chatLoading}
            className="w-full py-3.5 mt-3 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-800 border border-stone-300 font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
            Direct Message Farmer
          </button>

          {/* Results Display */}
          {quote && (
            <div className="mt-6 p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in slide-in-from-bottom-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-500">Overall Cost Breakdown</h4>
              <div className="divide-y divide-stone-200 text-sm">
                <div className="py-2 flex justify-between">
                  <span>Radial Distance:</span>
                  <span className="font-bold">{quote?.distanceKm ?? 0} km</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Base Freight:</span>
                  <span className="font-bold">₹{quote?.breakdown?.baseFreightCost ?? 0}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Special Container Cost:</span>
                  <span className="font-bold text-amber-700">₹{quote?.breakdown?.specialContainerCost ?? 0}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Farmer Produce Cost:</span>
                  <span className="font-bold">₹{quote?.breakdown?.farmerProduceCost ?? 0}</span>
                </div>
                <div className="py-3 flex justify-between text-base font-black text-stone-900 border-t-2 border-stone-300">
                  <span>Total Landed Cost:</span>
                  <span>₹{quote?.breakdown?.totalLandedCost ?? 0}</span>
                </div>
              </div>

              {quote.profitAssessment && (
                <div
                  className={`p-4 rounded-xl border mt-4 ${
                    quote.profitAssessment.isProfitable ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${
                        quote.profitAssessment.isProfitable ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {quote.profitAssessment.isProfitable ? (
                        <TrendingUp className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-700" />
                      )}
                      Projected Market Profit
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        quote.profitAssessment.isProfitable
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {quote.profitAssessment.profitMarginPercent || '0%'}
                    </span>
                  </div>
                  <div
                    className={`text-3xl font-black ${
                      quote.profitAssessment.isProfitable ? 'text-emerald-900' : 'text-rose-900'
                    }`}
                  >
                    ₹{quote.profitAssessment.approxNetProfit ?? 0}
                  </div>
                  <p
                    className={`text-[11px] mt-2 font-medium ${
                      quote.profitAssessment.isProfitable ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    Calculated against current APMC Mandi value (₹
                    {quote.profitAssessment.expectedApmcValue ?? 0}) minus transport, packaging, and acquisition costs.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}