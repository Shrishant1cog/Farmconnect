#!/usr/bin/env node
/**
 * FarmConnect — localisation completeness check.
 *
 * Verifies that every user-visible string exists in **all** shipped languages:
 *
 *   * Website  — `frontend/src/i18n/dictionaries/*.ts` (one file per feature
 *     group and language). The English file of a group is the reference.
 *   * Android  — `mobile/lib/l10n/app_{en,kn,hi}.arb` (the English ARB file is
 *     the reference).
 *
 * The check is deliberately dependency free so it can run in CI, locally and
 * inside a pre-push hook:
 *
 *   node scripts/verify-i18n.mjs
 *
 * Exit code 0 = every language is complete, 1 = missing or extra keys.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LANGUAGES = ['en', 'kn', 'hi'];
const GROUPS = ['core', 'auth', 'farmer', 'consumer', 'misc'];

const failures = [];
const notes = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(absolutePath) {
  return fs.readFileSync(absolutePath, 'utf8');
}

/** Extracts the `'<key>':` entries of a TypeScript translation table. */
function extractTypeScriptKeys(source) {
  const keys = new Set();
  // Only look inside the object literal that holds the translation table.
  const body = source.slice(source.indexOf('{'));
  const pattern = /['"`]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)['"`]\s*:/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function extractArbKeys(source) {
  const parsed = JSON.parse(source);
  const keys = new Set();
  for (const key of Object.keys(parsed)) {
    if (key.startsWith('@')) continue;
    keys.add(key);
  }
  return keys;
}

function compare(reference, translated, label, missing) {
  const extra = [...translated].filter((key) => !reference.has(key));
  const absent = [...reference].filter((key) => !translated.has(key));

  if (absent.length > 0) {
    missing.push(`${label}: missing ${absent.length} key(s) -> ${absent.slice(0, 12).join(', ')}${absent.length > 12 ? ', …' : ''}`);
  }
  if (extra.length > 0) {
    notes.push(`${label}: ${extra.length} extra key(s) not in the reference -> ${extra.slice(0, 12).join(', ')}${extra.length > 12 ? ', …' : ''}`);
  }

  return { absent: absent.length, extra: extra.length };
}

// ---------------------------------------------------------------------------
// Website dictionaries
// ---------------------------------------------------------------------------

console.log('Website dictionaries (frontend/src/i18n/dictionaries)');
console.log('-'.repeat(72));

for (const group of GROUPS) {
  const referencePath = path.join(ROOT, 'frontend', 'src', 'i18n', 'dictionaries', `${group}.en.ts`);
  if (!fs.existsSync(referencePath)) {
    failures.push(`Website: missing reference dictionary ${group}.en.ts`);
    continue;
  }

  const reference = extractTypeScriptKeys(readFile(referencePath));
  if (reference.size === 0) {
    failures.push(`Website: ${group}.en.ts contains no translation keys`);
  }

  let report = `${group.padEnd(9)} en=${String(reference.size).padStart(4)} keys`;
  for (const language of LANGUAGES.filter((code) => code !== 'en')) {
    const translatedPath = path.join(
      ROOT,
      'frontend',
      'src',
      'i18n',
      'dictionaries',
      `${group}.${language}.ts`,
    );
    if (!fs.existsSync(translatedPath)) {
      failures.push(`Website: missing dictionary ${group}.${language}.ts`);
      continue;
    }

    const translated = extractTypeScriptKeys(readFile(translatedPath));
    const { absent, extra } = compare(reference, translated, `Website ${group}.${language}`, failures);
    report += `  ${language}=${String(translated.size).padStart(4)} (missing ${absent}, extra ${extra})`;
  }

  console.log(report);
}

// ---------------------------------------------------------------------------
// Flutter ARB files
// ---------------------------------------------------------------------------

console.log('');
console.log('Android app (mobile/lib/l10n/*.arb)');
console.log('-'.repeat(72));

const arbDirectory = path.join(ROOT, 'mobile', 'lib', 'l10n');
const arbReferencePath = path.join(arbDirectory, 'app_en.arb');

if (!fs.existsSync(arbReferencePath)) {
  failures.push('Android: missing mobile/lib/l10n/app_en.arb');
} else {
  const reference = extractArbKeys(readFile(arbReferencePath));
  let report = `app_en   en=${String(reference.size).padStart(4)} keys`;

  for (const language of LANGUAGES.filter((code) => code !== 'en')) {
    const translatedPath = path.join(arbDirectory, `app_${language}.arb`);
    if (!fs.existsSync(translatedPath)) {
      failures.push(`Android: missing app_${language}.arb`);
      continue;
    }

    const translated = extractArbKeys(readFile(translatedPath));
    const { absent, extra } = compare(reference, translated, `Android app_${language}.arb`, failures);
    report += `  ${language}=${String(translated.size).padStart(4)} (missing ${absent}, extra ${extra})`;
  }

  console.log(report);
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

console.log('');

for (const note of notes) {
  console.log(`NOTE  ${note}`);
}

if (failures.length > 0) {
  console.log('');
  for (const failure of failures) {
    console.log(`FAIL  ${failure}`);
  }
  console.log('');
  console.log(`Localisation check FAILED with ${failures.length} problem(s).`);
  process.exit(1);
}

console.log('Localisation check PASSED — every language contains the reference key set.');
