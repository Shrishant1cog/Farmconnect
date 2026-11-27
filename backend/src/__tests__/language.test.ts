// Unit tests for the shared language helpers.
//
// These run without a database, so they can be executed on any machine:
//   cd backend && npx jest src/__tests__/language.test.ts
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  normalizeLanguage,
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
});
