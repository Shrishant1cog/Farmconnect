'use client';

import React from 'react';
import { useI18n } from '../../hooks/useI18n';

/** Accessible "skip to content" link (translated). */
export default function SkipLink() {
  const { t } = useI18n();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
    >
      {t('app.skipToContent')}
    </a>
  );
}
