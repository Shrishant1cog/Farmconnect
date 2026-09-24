'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Sprout, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/farmer/dashboard');
      } else if (user?.role !== 'FARMER' && user?.role !== 'ADMIN') {
        router.replace('/consumer/explore');
      }
    }
  }, [mounted, isAuthenticated, user, router]);

  // Client hydration check
  if (!mounted) {
    return (
      <div className="flex-1 w-full min-h-[65vh] flex flex-col items-center justify-center text-emerald-700 gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-950/10 border border-emerald-800/20 animate-ping absolute" />
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl border border-stone-200 flex items-center justify-center relative z-10">
            <Sprout className="w-7 h-7 text-emerald-800 animate-bounce" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-black tracking-widest uppercase text-stone-700">
            Authenticating Cultivator Session
          </p>
          <p className="text-[11px] text-stone-400 font-medium">
            Verifying agricultural node credentials...
          </p>
        </div>
      </div>
    );
  }

  // Access denied guard for non-farmer accounts
  if (!isAuthenticated || (user?.role !== 'FARMER' && user?.role !== 'ADMIN')) {
    return (
      <div className="flex-1 w-full min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/90 p-8 sm:p-10 max-w-md w-full text-center shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              Producer Workspace Restricted
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              This module is reserved for registered cultivators. Please sign in with your farmer account to manage crop inventory, customer orders, and wholesale negotiations.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/login?redirect=/farmer/dashboard"
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              Sign In as Cultivator <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/consumer/explore"
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              Return to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col relative animate-in fade-in duration-300">
      <Suspense
        fallback={
          <div className="flex-1 min-h-[55vh] flex flex-col items-center justify-center text-emerald-800 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
            <span className="text-[11px] font-black uppercase tracking-widest text-stone-400">
              Loading Harvest Records...
            </span>
          </div>
        }
      >
        <div className="w-full flex-1 flex flex-col">{children}</div>
      </Suspense>
    </div>
  );
}