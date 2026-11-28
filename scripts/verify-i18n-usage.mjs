#!/usr/bin/env node
/**
 * FarmConnect — localisation **usage** check.
 *
 * `scripts/verify-i18n.mjs` proves that the three languages contain the
 * same keys. It cannot prove that the keys the website actually asks for
 * exist: a key that is used in the code but missing from **every**
 * dictionary passes that check and shows up on the screen as its own
 * name.
 *
 * The audit found exactly that on the dispatch dashboard of the
 * cultivator: the reference of the order was rendered as the literal
 * text `farmer.orders.orderNumber`.
 *
 * This script reads every `t('…')` call of the website and compares it
 * with the English dictionaries:
 *
 *   node scripts/verify-i18n-usage.mjs
 *
 * Exit code 0 = every used key exists, 1 = at least one key is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = path.join(ROOT, 'frontend', 'src');
const DICTIONARY_ROOT = path.join(ROOT, 'frontend', 'src', 'i18n', 'dictionaries');

/** The groups of the website dictionaries. */
const GROUPS = ['core', 'auth', 'farmer', 'consumer', 'misc'];

/** The files of the website that may call `t(…)`. */
const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Directories that never contain a user-visible string. */
const SKIPPED_DIRECTORIES = new Set(['i18n', 'node_modules', '.next']);

function readFile(absolutePath) {
  return fs.readFileSync(absolutePath, 'utf8');
}

/** Extracts the `'<key>':` entries of a TypeScript translation table. */
function extractTypeScriptKeys(source) {
  const keys = new Set();
  const body = source.slice(source.indexOf('{'));
  const pattern = /['"`]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)['"`]\s*:/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

/** Every file of the website source. */
function collectSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      files.push(...collectSourceFiles(path.join(directory, entry.name)));
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

/**
 * Every key that the website asks for.
 *
 * The pattern covers the two spellings of the helper — `t('key')` and
 * `t("key")` — with an optional second argument. A key that is built at
 * runtime cannot be found by a static scan; the scan reports the number
 * of such places so that the result stays honest.
 */
function extractUsedKeys(source) {
  const used = new Map();
  const pattern = /\bt\(\s*['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)['"]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    if (!used.has(match[1])) {
      used.set(match[1], 0);
    }
    used.set(match[1], used.get(match[1]) + 1);
  }
  return used;
}

/**
 * Every string literal that looks like a translation key.
 *
 * A few places pass the key through a constant — for example
 * `t(STATUS_TRANSLATION_KEYS[st])` — and a static scan of the `t(…)`
 * call alone would miss them. The literal itself is therefore checked
 * as well.
 */
function extractKeyLikeLiterals(source) {
  const literals = new Map();
  const pattern = /['"]([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)['"]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    if (!literals.has(match[1])) {
      literals.set(match[1], 0);
    }
    literals.set(match[1], literals.get(match[1]) + 1);
  }
  return literals;
}

// ---------------------------------------------------------------------------
// The reference key set
// ---------------------------------------------------------------------------

const known = new Set();
for (const group of GROUPS) {
  const dictionaryPath = path.join(DICTIONARY_ROOT, `${group}.en.ts`);
  if (!fs.existsSync(dictionaryPath)) {
    console.error(`FAIL  The dictionary ${group}.en.ts is missing.`);
    process.exit(1);
  }
  for (const key of extractTypeScriptKeys(readFile(dictionaryPath))) {
    known.add(key);
  }
}

// ---------------------------------------------------------------------------
// The used key set
// ---------------------------------------------------------------------------

const files = collectSourceFiles(SOURCE_ROOT);
const used = new Map();
const keyLike = new Map();
const dynamicCalls = [];

for (const file of files) {
  const source = readFile(file);
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');

  for (const [key, count] of extractUsedKeys(source)) {
    used.set(key, (used.get(key) ?? 0) + count);
  }

  for (const [key, count] of extractKeyLikeLiterals(source)) {
    keyLike.set(key, (keyLike.get(key) ?? 0) + count);
  }

  // A key that is composed at runtime cannot be checked statically. The
  // count is reported so that the result is not mistaken for a complete
  // proof.
  const dynamicPattern = /\bt\(\s*(?!['"])[^)'"`]/g;
  const dynamicMatches = source.match(dynamicPattern);
  if (dynamicMatches) {
    dynamicCalls.push({ file: relative, count: dynamicMatches.length });
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

const missing = [...used.keys()].filter((key) => !known.has(key)).sort();
const unused = [...known.keys()].filter((key) => !used.has(key)).sort();

/**
 * The literals that look like a key but are not one.
 *
 * A few are harmless — `next.config.js` for example. The list is
 * printed, not failed, because a literal may be a path or a class name.
 */
const unknownLiterals = [...keyLike.keys()]
  .filter((key) => !known.has(key))
  .sort();

console.log('Localisation usage (frontend/src)');
console.log('-'.repeat(72));
console.log(`files scanned : ${files.length}`);
console.log(`known keys    : ${known.size}`);
console.log(`used keys     : ${used.size}`);
console.log(`missing keys  : ${missing.length}`);
console.log(`unused keys   : ${unused.length} (defined but never asked for)`);
console.log(`key-like      : ${keyLike.size} literals that look like a key`);
console.log(`unknown       : ${unknownLiterals.length} of them are not a key`);

if (dynamicCalls.length > 0) {
  const total = dynamicCalls.reduce((sum, entry) => sum + entry.count, 0);
  console.log(`dynamic calls : ${total} in ${dynamicCalls.length} file(s) — not checked statically`);
  for (const entry of dynamicCalls.slice(0, 10)) {
    console.log(`                ${entry.file} (${entry.count})`);
  }
}

if (unknownLiterals.length > 0) {
  console.log('');
  console.log('Literals that look like a translation key but are not one:');
  for (const key of unknownLiterals) {
    console.log(`      ${key}`);
  }
}

if (missing.length > 0) {
  console.log('');
  for (const key of missing) {
    console.log(`FAIL  the key "${key}" is used ${used.get(key)} time(s) but no dictionary defines it`);
  }
  console.log('');
  console.log(`Localisation usage check FAILED with ${missing.length} missing key(s).`);
  process.exit(1);
}

console.log('');
console.log('Localisation usage check PASSED — every key the website asks for exists.');
