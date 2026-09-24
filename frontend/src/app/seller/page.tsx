'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ArrowRight, Sprout, Package, 
  CheckCircle2, Lock, Sparkles, Building2, 
  Check, Loader2, AlertCircle 
} from 'lucide-react';
import { fetchApi } from '../../lib/api';

export default function SellerPortal() {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [maskedId, setMaskedId] = useState<string>('');
  const [farmName, setFarmName] = useState<string>('');
  const [rawInput, setRawInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialChecking, setInitialChecking] = useState<boolean>(true);

  // Check verification state on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetchApi('/dashboard/farmer');
        if (res.success && res.data) {
          // If farmer profile is found
          const isAadhaarDone = Boolean(res.data.stats !== undefined);
          if (isAadhaarDone) {
            setIsVerified(true);
            setFarmName(res.data.farmerName || 'Cultivator Farm Lot');
          }
        }
      } catch {
        // Fallback: stay on verification form
      } finally {
        setInitialChecking(false);
      }
    }
    checkStatus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits and clamp to 12 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
    setRawInput(digitsOnly);
  };

  const formattedDisplay = rawInput.replace(/(\d{4})(?=\d)/g, '$1 ');

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawInput.length !== 12) return;

    setLoading(true);
    try {
      const res = await fetchApi('/farmer/verify-aadhaar', {
        method: 'POST',
        body: JSON.stringify({ aadhaarNumber: rawInput }),
      });

      if (res.success) {
        setIsVerified(true);
        if (res.farmer?.aadhaarMasked) {
          setMaskedId(res.farmer.aadhaarMasked);
        }
        if (res.farmer?.farmName) {
          setFarmName(res.farmer.farmName);
        }
      } else {
        alert(res.message || 'Verification could not be processed.');
      }
    } catch (err: any) {
      alert(err.message || 'Verification network error.');
    } finally {
      setLoading(false);
    }
  };

  if (initialChecking) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
          Checking Cultivator Status...
        </span>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: UNVERIFIED ONBOARDING FORM
  // =========================================================================
  if (!isVerified) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/90 backdrop-blur-md border border-stone-200 rounded-3xl shadow-xl p-8 sm:p-10 space-y-6">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-800" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Cultivator Verification
            </h1>
            
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
              Verify your agricultural cultivator credentials to broadcast fresh harvests and unlock direct consumer wholesale payouts.
            </p>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/70 text-left">
              <Sparkles className="w-4 h-4 text-emerald-700 mb-1" />
              <p className="text-xs font-black text-stone-900">Zero Middleman Margin</p>
              <p className="text-[10px] text-stone-500">Sell at true farmer-listed rates</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/70 text-left">
              <Building2 className="w-4 h-4 text-emerald-700 mb-1" />
              <p className="text-xs font-black text-stone-900">APMC Mandi Clearance</p>
              <p className="text-[10px] text-stone-500">Direct mandi price parity</p>
            </div>
          </div>

          <form onSubmit={handleVerificationSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Government Identity Card Number
              </label>
              
              <div className="relative">
                <input 
                  type="text" 
                  inputMode="numeric"
                  required 
                  value={formattedDisplay} 
                  onChange={handleInputChange} 
                  placeholder="Enter 12-digit number"
                  className="w-full px-4 py-3.5 rounded-2xl border border-stone-300 text-base font-mono tracking-widest outline-none focus:ring-2 focus:ring-emerald-700 transition-all bg-stone-50/50 focus:bg-white text-stone-900" 
                />
                <Lock className="w-4 h-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                A 12-digit numeric identity number is required for digital e-KYC.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading || rawInput.length !== 12}
              className="w-full py-4 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 disabled:from-stone-300 disabled:to-stone-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/10 transition-all active:scale-95"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying e-KYC...</>
              ) : (
                <>Authorize & Open Seller Hub <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-stone-400 font-medium">
              Land ownership records have been bypassed for smallholder farmers.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: VERIFIED CULTIVATOR CREDENTIAL PASS & DASHBOARD LAUNCHER
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      
      {/* Verified Status Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-md">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-black text-emerald-950 tracking-tight">
                Verified Direct Cultivator
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                Active
              </span>
            </div>
            <p className="text-emerald-800 text-xs mt-0.5">
              Identity verified. Authorized to list fresh harvest lots and accept consumer orders.
            </p>
          </div>
        </div>

        <Link
          href="/farmer/dashboard"
          className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
        >
          Open Harvest Hub <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Official Digital Cultivator Credential Pass */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-16 -mt-16" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
              FarmConnect Agricultural Network
            </span>
            <h3 className="text-xl font-black tracking-tight text-stone-100 mt-0.5">
              Direct Cultivator Certification Pass
            </h3>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
            <Sprout className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Registered Farm</span>
            <span className="text-sm font-black text-white">{farmName || 'Verified Family Farm'}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Verified ID Ref</span>
            <span className="text-sm font-mono font-bold text-stone-300">
              {maskedId || 'XXXX-XXXX-VERIFIED'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Mandi Trading Clearance</span>
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Unrestricted
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-stone-400">
            Enables instant WhatsApp price negotiations, logistics bookings, and verified catalog listing.
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link
              href="/farmer/products"
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl text-center transition-colors"
            >
              Manage Produce
            </Link>
            <Link
              href="/farmer/orders"
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl text-center transition-colors"
            >
              View Orders
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}