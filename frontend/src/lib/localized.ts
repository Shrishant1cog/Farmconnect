// Helper for the catalogue metadata that the shared backend returns in more
// than one language.
//
// The backend keeps the English name as the stored value (it is what the
// farmer typed or what the seed script wrote) and adds the Kannada and Hindi
// display names next to it. The clients pick the name that matches the active
// locale and fall back to English when a translation is missing.

export interface LocalizedName {
  /** Stored (English) name. */
  name?: string | null;
  /** Kannada display name. */
  nameKn?: string | null;
  /** Hindi display name. */
  nameHi?: string | null;
}

/**
 * Returns the display name of a catalogue entry for the given locale.
 *
 * ```ts
 * localizedName(category, 'kn'); // "ತರೆಕೆಕ್ಕೆಕ್ಕೆ"
 * ```
 */
export function localizedName(
  item: LocalizedName | null | undefined,
  locale: string
): string {
  if (!item) return '';

  if (locale === 'kn' && item.nameKn) return item.nameKn;
  if (locale === 'hi' && item.nameHi) return item.nameHi;

  return item.name || item.nameKn || item.nameHi || '';
}

export default localizedName;
