'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Gated buyer routes
  const isProtectedConsumerRoute = 
    pathname.includes('/orders') || 
    pathname.includes('/enquiries') || 
    pathname.includes('/checkout');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isProtectedConsumerRoute && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, isAuthenticated, isProtectedConsumerRoute, pathname, router]);

  // Loading indicator for protected buyer pages
  if (!mounted && isProtectedConsumerRoute) {
    return (
      <div className="flex-1 w-full min-h-[65vh] flex flex-col items-center justify-center text-emerald-700 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-xl border border-stone-200 flex items-center justify-center relative">
          <Loader2 className="w-7 h-7 text-emerald-800 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-black tracking-widest uppercase text-stone-700">
            Syncing Buyer Workspace
          </p>
          <p className="text-[11px] text-stone-400 font-medium">
            Fetching your orders and trade discussions...
          </p>
        </div>
      </div>
    );
  }

  // Auth gate when not authenticated on a protected buyer route
  if (mounted && !isAuthenticated && isProtectedConsumerRoute) {
    return (
      <div className="flex-1 w-full min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/90 p-8 sm:p-10 max-w-md w-full text-center shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              Sign In to View Your Orders
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Active dispatches, harvest inquiries, and direct orders are tied to your personal buyer profile.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              Sign In to Continue <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/consumer/explore"
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
            >
              Back to Marketplace
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
              Loading Harvest Lots...
            </span>
          </div>
        }
      >
        <div className="w-full flex-1 flex flex-col">{children}</div>
      </Suspense>
    </div>
  );
}