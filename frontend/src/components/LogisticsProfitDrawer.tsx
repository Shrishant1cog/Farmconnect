'use client';

import React, { useEffect, useState } from 'react';
import { Calculator, X, MessageSquare, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { useI18n } from '../hooks/useI18n';

interface LogisticsProfitDrawerProps {
  cropData: any;
  onClose: () => void;
}

export default function LogisticsProfitDrawer({ cropData, onClose }: LogisticsProfitDrawerProps) {
  const { t, formatCurrency, formatNumber } = useI18n();

  const [quantityKg, setQuantityKg] = useState<number>(500);
  const [containerType, setContainerType] = useState<string>('COLD_CHAIN_REFRIGERATED');
  /**
   * The APMC benchmark in ₹ per quintal. It is filled with the **published**
   * benchmark of the crop; when the shared database holds none the field
   * stays empty and the profit assessment is reported as unknown.
   */
  const [apmcMandiPrice, setApmcMandiPrice] = useState<number | ''>('');
  const [apmcSource, setApmcSource] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  };

  /**
   * The destination of the load — the real delivery coordinates of the
   * signed-in consumer. Without them the freight distance cannot be computed
   * honestly, so the drawer asks for them instead of using a fixed city.
   */
  const [destination, setDestination] = useState<{ lat: number; lon: number } | null>(null);

  // The published benchmark of the crop — never a made-up rate.
  useEffect(() => {
    let cancelled = false;

    const loadBenchmark = async () => {
      const cropName = cropData?.cropName || cropData?.title;
      if (!cropName) return;

      try {
        const response = await fetchApi('/apmc/rates');
        const rows = response?.data || response?.rates || [];
        if (!Array.isArray(rows) || cancelled) return;

        const needle = String(cropName).trim().toLowerCase();
        const match = rows.find((row: any) =>
          String(row?.commodity || '').trim().toLowerCase() === needle,
        );

        if (cancelled) return;

        if (match && Number(match.modalPrice) > 0) {
          setApmcMandiPrice(Number(match.modalPrice));
          setApmcSource(match.marketCenter || match.state || null);
        } else {
          setApmcMandiPrice('');
          setApmcSource(null);
        }
      } catch {
        if (!cancelled) setApmcSource(null);
      }
    };

    const loadDestination = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const me = await fetchApi('/users/me');
        const profile = me?.data?.consumerProfile || me?.consumerProfile;
        const lat = Number(profile?.latitude);
        const lon = Number(profile?.longitude);
        if (!cancelled && Number.isFinite(lat) && Number.isFinite(lon)) {
          setDestination({ lat, lon });
        }
      } catch {
        /* the drawer reports the missing coordinates */
      }
    };

    loadBenchmark();
    loadDestination();
    return () => {
      cancelled = true;
    };
  }, [cropData?.cropName, cropData?.title]);

  const handleComputeProfit = async () => {
    if (quantityKg <= 0 || isNaN(quantityKg)) {
      setError(t('misc.logistics.validQuantityError'));
      return;
    }

    setLoading(true);
    setError(null);

    // Every value has to be real: the farmer's own price and the real
    // coordinates of the listing. Nothing is replaced by a default, because
    // a fabricated coordinate or price would produce a fabricated quote.
    const farmerPrice = Number(cropData?.farmerPrice ?? cropData?.price);
    const originLat = Number(cropData?.farmer?.latitude ?? cropData?.latitude);
    const originLon = Number(cropData?.farmer?.longitude ?? cropData?.longitude);
    const destLat = destination?.lat;
    const destLon = destination?.lon;

    if (!Number.isFinite(farmerPrice) || farmerPrice <= 0) {
      setError(t('misc.logistics.missingFarmerPrice'));
      setLoading(false);
      return;
    }

    if (
      !Number.isFinite(originLat) ||
      !Number.isFinite(originLon) ||
      !Number.isFinite(destLat) ||
      !Number.isFinite(destLon)
    ) {
      setError(t('misc.logistics.missingCoordinates'));
      setLoading(false);
      return;
    }

    const benchmark = Number(apmcMandiPrice);

    const payload = {
      cropQuantityKg: Number(quantityKg),
      farmerPricePerKg: farmerPrice,
      originLat,
      originLon,
      destLat,
      destLon,
      containerType,
      ...(Number.isFinite(benchmark) && benchmark > 0
        ? { apmcModalPricePerQuintal: benchmark }
        : {}),
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
        setError(json?.message || t('misc.logistics.quoteError'));
      }
    } catch (err: any) {
      console.error('Logistics computation error:', err);
      setError(t('misc.logistics.quoteComputeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    const token = getAuthToken();
    if (!token) {
      setError(t('misc.logistics.signInMessage'));
      return;
    }

    const resolvedProductId = cropData?.id || cropData?.productId;
    if (!resolvedProductId) {
      setError(t('misc.logistics.productDetailsError'));
      return;
    }

    setChatLoading(true);
    setError(null);

    const payload = {
      productId: resolvedProductId,
      subject: t('misc.logistics.chatSubject', {
        name: cropData?.title || cropData?.name || t('misc.logistics.defaultProduce'),
      }),
      message: t('misc.logistics.chatMessage'),
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
        setError(json?.message || t('misc.logistics.chatInitError'));
      }
    } catch (err: any) {
      console.error('Start chat error:', err);
      setError(t('misc.logistics.networkError'));
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
              <h3 className="text-xl font-black text-stone-900">{t('misc.logistics.title')}</h3>
              <p className="text-xs font-bold text-emerald-700">
                {cropData?.title || cropData?.name || t('misc.logistics.produceAnalysis')}
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
                {t('misc.logistics.quantity')}
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
                {t('misc.logistics.storageEnvironment')}
              </label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-semibold bg-white outline-none focus:border-emerald-600"
              >
                <option value="COLD_CHAIN_REFRIGERATED">{t('misc.logistics.coldChain')}</option>
                <option value="STANDARD_CRATE">{t('misc.logistics.standardCrates')}</option>
                <option value="MOISTURE_CONTROLLED">{t('misc.logistics.moistureControlled')}</option>
                <option value="VENTILATED_JUTE">{t('misc.logistics.juteSacks')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                {t('misc.logistics.localApmcRate')}
              </label>
              <input
                type="number"
                min="0"
                value={apmcMandiPrice}
                onChange={(e) =>
                  setApmcMandiPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                }
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold outline-none focus:border-emerald-600"
              />
              {apmcSource ? (
                <span className="text-[10px] font-semibold text-stone-500 mt-1 block">
                  {t('misc.logistics.benchmarkSource', { source: apmcSource })}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 mt-1 block">
                  {t('misc.logistics.noPublishedBenchmarkHint')}
                </span>
              )}
            </div>
          </div>

          {/* Compute Action */}
          <button
            onClick={handleComputeProfit}
            disabled={loading}
            className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
            {loading ? t('misc.logistics.evaluating') : t('misc.logistics.checkProfit')}
          </button>

          {/* Direct Message Action */}
          <button
            type="button"
            onClick={handleStartChat}
            disabled={chatLoading}
            className="w-full py-3.5 mt-3 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-800 border border-stone-300 font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
            {t('misc.logistics.directMessage')}
          </button>

          {/* Results Display */}
          {quote && (
            <div className="mt-6 p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in slide-in-from-bottom-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-500">{t('misc.logistics.costBreakdown')}</h4>
              <div className="divide-y divide-stone-200 text-sm">
                <div className="py-2 flex justify-between">
                  <span>{t('misc.logistics.radialDistance')}</span>
                  <span className="font-bold">{formatNumber(Number(quote?.distanceKm) || 0)} {t('misc.unit.km')}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>{t('misc.logistics.baseFreight')}</span>
                  <span className="font-bold">{formatCurrency(Number(quote?.breakdown?.baseFreightCost) || 0)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>{t('misc.logistics.specialContainerCost')}</span>
                  <span className="font-bold text-amber-700">{formatCurrency(Number(quote?.breakdown?.specialContainerCost) || 0)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>{t('misc.logistics.farmerProduceCost')}</span>
                  <span className="font-bold">{formatCurrency(Number(quote?.breakdown?.farmerProduceCost) || 0)}</span>
                </div>
                <div className="py-3 flex justify-between text-base font-black text-stone-900 border-t-2 border-stone-300">
                  <span>{t('misc.logistics.totalLandedCost')}</span>
                  <span>{formatCurrency(Number(quote?.breakdown?.totalLandedCost) || 0)}</span>
                </div>
              </div>

              {quote.profitAssessment && quote.profitAssessment.hasApmcBenchmark ? (
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
                      {t('misc.logistics.projectedProfit')}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        quote.profitAssessment.isProfitable
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {quote.profitAssessment.profitMarginPercent ?? '—'}
                    </span>
                  </div>
                  <div
                    className={`text-3xl font-black ${
                      quote.profitAssessment.isProfitable ? 'text-emerald-900' : 'text-rose-900'
                    }`}
                  >
                    {formatCurrency(Number(quote.profitAssessment.approxNetProfit) || 0)}
                  </div>
                  <p
                    className={`text-[11px] mt-2 font-medium ${
                      quote.profitAssessment.isProfitable ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {t('misc.logistics.calculatedAgainstApmc', {
                      value: formatCurrency(Number(quote.profitAssessment.expectedApmcValue) || 0),
                    })}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border mt-4 bg-amber-50 border-amber-300">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    {t('misc.logistics.projectedProfit')}
                  </span>
                  <p className="text-[11px] mt-2 font-medium text-amber-800">
                    {t('misc.logistics.noPublishedBenchmarkHint')}
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