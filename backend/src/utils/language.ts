// Supported interface languages.
//
// The list is intentionally short and code-based: adding another Indian
// language later means adding one entry here plus the matching translation
// files on both clients (website `frontend/src/i18n`, Android
// `mobile/lib/l10n`). The backend never stores translated copy — it only
// stores the language *code* chosen by the account owner.

export const SUPPORTED_LANGUAGES = ['en', 'kn', 'hi'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  english: 'en',
  kn: 'kn',
  'kn-in': 'kn',
  kannada: 'kn',
  hi: 'hi',
  'hi-in': 'hi',
  hindi: 'hi',
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Strictly resolves a user supplied language tag to a supported language
 * code.
 *
 * Unlike {@link normalizeLanguage} this function does **not** fall back to
 * English: it returns `null` for a value that is not one of the supported
 * languages. The API uses it to reject a genuinely unsupported code such as
 * `de` with HTTP 400 while still accepting the regional and alias forms
 * (`kn-IN`, `hi_IN`, `kannada`, `hindi`).
 */
export function resolveSupportedLanguage(value: unknown): SupportedLanguage | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (isSupportedLanguage(trimmed)) {
    return trimmed;
  }

  const alias = LANGUAGE_ALIASES[trimmed];
  if (alias) {
    return alias;
  }

  // Accept regional variants such as `kn-IN` / `hi_IN`.
  const base = trimmed.split(/[-_]/)[0];
  if (isSupportedLanguage(base)) {
    return base;
  }

  return null;
}

/**
 * Normalises any user supplied language tag to a supported language code.
 * Unknown or missing values fall back to English instead of failing.
 */
export function normalizeLanguage(value: unknown): SupportedLanguage {
  return resolveSupportedLanguage(value) ?? DEFAULT_LANGUAGE;
}
