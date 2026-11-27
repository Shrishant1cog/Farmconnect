'use client';

import { useLocaleContext } from '../context/LocaleContext';

export type { LocaleContextValue } from '../context/LocaleContext';

/**
 * Translation helper for the website.
 *
 * ```tsx
 * const { t, locale, setLocale } = useI18n();
 * <button>{t('nav.home')}</button>
 * ```
 */
export function useI18n() {
  return useLocaleContext();
}

export default useI18n;
