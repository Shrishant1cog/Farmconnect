'use client';

import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import LanguageSwitcher from './LanguageSwitcher';

/** Platform footer (translated). */
export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-stone-950/95 backdrop-blur-md text-stone-400 text-xs py-8 border-t border-stone-800/80 text-center relative z-20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="tracking-tight">
          © 2026 <strong>FarmConnect Karnataka</strong>. {t('footer.tagline')}
        </p>
        <p className="text-stone-500 font-medium max-w-xl">
          {t('footer.prices')}
        </p>
        {/* The language selector is repeated in the footer so it stays
            reachable on small screens where the navigation collapses. */}
        <div className="flex items-center gap-2">
          <span className="text-stone-500 font-medium">{t('nav.language')}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
