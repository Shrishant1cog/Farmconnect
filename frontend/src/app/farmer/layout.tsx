'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Wait for client-side storage hydration to complete
  if (!mounted || isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-800" />
        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
          Verifying Cultivator Credentials...
        </p>
      </div>
    );
  }

  // 2. Resolve farmer role across all stored auth variations
  const roleFromAuthHook = (user?.role || '').toUpperCase();

  let roleFromLocalStorage = '';
  let roleFromFcUser = '';
  let roleFromDecodedToken = '';

  if (typeof window !== 'undefined') {
    roleFromLocalStorage = (localStorage.getItem('farmconnect_role') || '').toUpperCase();

    try {
      const parsedFc = JSON.parse(localStorage.getItem('fc_user') || '{}');
      roleFromFcUser = (parsedFc?.role || '').toUpperCase();
    } catch {
      // Ignore JSON parse errors
    }

    const token = localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
    if (token && token.includes('.')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        roleFromDecodedToken = (payload?.role || '').toUpperCase();
      } catch {
        // Ignore token decode errors
      }
    }
  }

  const isFarmer =
    roleFromAuthHook === 'FARMER' ||
    roleFromLocalStorage === 'FARMER' ||
    roleFromFcUser === 'FARMER' ||
    roleFromDecodedToken === 'FARMER';

  // 3. Block access only if verified as a non-farmer
  if (!isFarmer) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              Producer Workspace Restricted
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              This module is reserved for registered cultivators. Please sign in with your farmer account to manage crop inventory, customer orders, and wholesale negotiations.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Link
              href="/login?redirect=/farmer/dashboard"
              className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              Sign in as Cultivator <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/consumer/explore"
              className="w-full py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 block transition-colors"
            >
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}