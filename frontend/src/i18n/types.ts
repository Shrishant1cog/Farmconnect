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

/**
 * Reads the count of a string out of the parameters.
 *
 * The count may be a number (`5`) or a number that was already formatted
 * (`"5"`, `"5,000"`) — the interface formats the numbers of the active
 * language before it hands them to the translator.
 *
 * `null` means that there is no count, and the plain form of the key is
 * used then.
 */
export function readCount(params?: Record<string, string | number>): number | null {
  const raw = params?.count;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(/,/g, '');
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Picks the template of a key, honouring the singular and the plural form.
 *
 * A count of one must not read "1 entries" and "1 lots". When the
 * dictionaries carry `key.one` and `key.other`, the form that fits the
 * count is used; otherwise the plain `key` is used, so every existing
 * string keeps working exactly as before.
 *
 * The English dictionary is the fallback, exactly like the translation
 * helper itself: a language that has not been given the two forms yet
 * still shows a sentence instead of an empty label.
 */
export function resolveTemplate(
  table: TranslationMap,
  fallback: TranslationMap,
  key: string,
  params?: Record<string, string | number>
): string {
  const count = readCount(params);

  if (count !== null) {
    const one = table[`${key}.one`] ?? fallback[`${key}.one`];
    const other = table[`${key}.other`] ?? fallback[`${key}.other`];
    if (one !== undefined || other !== undefined) {
      return count === 1 ? (one ?? other!) : (other ?? one!);
    }
  }

  return table[key] ?? fallback[key] ?? key;
}
