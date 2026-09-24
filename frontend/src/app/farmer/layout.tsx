'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading) return;

    let role = (user?.role || '').toUpperCase();

    if (!role && typeof window !== 'undefined') {
      role = (localStorage.getItem('farmconnect_role') || '').toUpperCase();
      if (!role) {
        try {
          const parsed = JSON.parse(localStorage.getItem('fc_user') || '{}');
          role = (parsed?.role || '').toUpperCase();
        } catch {
          // Ignore parse errors
        }
      }
    }

    // If not a farmer or not logged in, redirect away without showing an error screen
    if (role !== 'FARMER') {
      router.replace('/login?redirect=/farmer/dashboard');
    }
  }, [hydrated, isLoading, user, router]);

  // Circular loading animation during authorization
  if (!hydrated || isLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest animate-pulse">
          Loading Cultivator Workspace...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}