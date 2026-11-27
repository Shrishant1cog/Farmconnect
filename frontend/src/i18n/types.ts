// Shared localization primitives for the FarmConnect website.
//
// The website ships three interface languages: English, Kannada and Hindi.
// Adding another Indian language later means:
//   1. adding the code to `Locale` and `LOCALES`,
//   2. adding the matching dictionary files,
//   3. registering the locale in `LocaleContext`.
//
// Nothing else in the app is allowed to hardcode interface text.

export type Locale = 'en' | 'kn' | 'hi';

export const LOCALES: Locale[] = ['en', 'kn', 'hi'];

export const DEFAULT_LOCALE: Locale = 'en';

export interface LocaleMeta {
  /** Name written in the language itself (always shown in the selector). */
  nativeName: string;
  /** English name, used as an accessible label. */
  englishName: string;
  /** BCP-47 tag used for `Intl` number / date / currency formatting. */
  intlTag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: 'English', englishName: 'English', intlTag: 'en-IN' },
  kn: { nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', intlTag: 'kn-IN' },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi', intlTag: 'hi-IN' },
};

export type TranslationMap = Record<string, string>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const base = value.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) {
      return base;
    }
  }
  return DEFAULT_LOCALE;
}

/** Replaces `{placeholder}` tokens with the supplied parameters. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}
