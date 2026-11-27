// Unit tests for the shared language helpers.
//
// These run without a database, so they can be executed on any machine:
//   cd backend && npx jest src/__tests__/language.test.ts
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  normalizeLanguage,
  resolveSupportedLanguage,
} from '../utils/language';

describe('language helpers', () => {
  it('supports exactly English, Kannada and Hindi', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['en', 'kn', 'hi']);
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('recognises supported language codes', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('kn')).toBe(true);
    expect(isSupportedLanguage('hi')).toBe(true);
    expect(isSupportedLanguage('ta')).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });

  it('normalises regional and alias forms', () => {
    expect(normalizeLanguage('kn-IN')).toBe('kn');
    expect(normalizeLanguage('hi_IN')).toBe('hi');
    expect(normalizeLanguage('Kannada')).toBe('kn');
    expect(normalizeLanguage('HINDI')).toBe('hi');
    expect(normalizeLanguage('English')).toBe('en');
  });

  it('falls back to English for unknown or missing values', () => {
    expect(normalizeLanguage(undefined)).toBe('en');
    expect(normalizeLanguage(null)).toBe('en');
    expect(normalizeLanguage('')).toBe('en');
    expect(normalizeLanguage('  ')).toBe('en');
    expect(normalizeLanguage('ta')).toBe('en');
    expect(normalizeLanguage(42)).toBe('en');
  });

  it('resolves regional and alias forms without falling back', () => {
    expect(resolveSupportedLanguage('kn-IN')).toBe('kn');
    expect(resolveSupportedLanguage('hi_IN')).toBe('hi');
    expect(resolveSupportedLanguage('en-US')).toBe('en');
    expect(resolveSupportedLanguage('Kannada')).toBe('kn');
    expect(resolveSupportedLanguage('HINDI')).toBe('hi');
    expect(resolveSupportedLanguage('english')).toBe('en');
    expect(resolveSupportedLanguage('  kn  ')).toBe('kn');
  });

  it('rejects a genuinely unsupported language instead of defaulting', () => {
    // The API relies on this to answer HTTP 400 for `de` while still
    // accepting the regional forms above.
    expect(resolveSupportedLanguage('de')).toBeNull();
    expect(resolveSupportedLanguage('ta')).toBeNull();
    expect(resolveSupportedLanguage('de-DE')).toBeNull();
    expect(resolveSupportedLanguage('')).toBeNull();
    expect(resolveSupportedLanguage('   ')).toBeNull();
    expect(resolveSupportedLanguage(undefined)).toBeNull();
    expect(resolveSupportedLanguage(null)).toBeNull();
    expect(resolveSupportedLanguage(42)).toBeNull();
  });
});
