'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { LOCALES, LOCALE_META, Locale } from '../../i18n/types';

/**
 * Language selector.
 *
 * The language names are always written in their own script
 * (English / ಕನ್ನಡ / हिन्दी) so the picker is readable for every user.
 */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const select = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.switch')}
        title={t('language.switch')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors border border-stone-200 bg-white/70"
      >
        <Languages className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">{LOCALE_META[locale].nativeName}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('language.heading')}
          className="absolute right-0 mt-2 z-50 w-44 rounded-2xl border border-stone-200 bg-white shadow-xl p-1.5"
        >
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-stone-400">
            {t('language.heading')}
          </p>
          {LOCALES.map((code) => {
            const meta = LOCALE_META[code];
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(code)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span lang={code}>{meta.nativeName}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {meta.englishName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
