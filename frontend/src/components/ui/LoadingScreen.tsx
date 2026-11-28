'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-700" />
        </div>
        <p className="text-xs font-black text-stone-700 uppercase tracking-widest animate-pulse">
          {message || t('misc.loading.default')}
        </p>
      </div>
    </div>
  );
}