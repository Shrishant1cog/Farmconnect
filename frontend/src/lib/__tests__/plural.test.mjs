/**
 * Regression tests for the plural forms of the website.
 *
 * The audit of the live navbar found a sentence that was wrong in
 * English: "My favourites, **1 entries**". A count of one must be
 * written in the singular — and the count may reach the translator
 * either as a number (`5`) or as a number that was already formatted for
 * the active language (`"5"`, `"5,000"`).
 *
 * The functions under test only pick the right template and fill in the
 * placeholders. They never invent a count.
 *
 * Run with:
 *
 *     node --test frontend/src/lib/__tests__/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { interpolate, readCount, resolveTemplate } from '../../i18n/types.ts';

const english = {
  'nav.cartWithCount': 'Cart, {count} lots',
  'nav.cartWithCount.one': 'Cart, 1 lot',
  'nav.cartWithCount.other': 'Cart, {count} lots',
  'nav.favoritesWithCount': 'My favourites, {count} entries',
  'nav.favoritesWithCount.one': 'My favourites, 1 entry',
  'nav.favoritesWithCount.other': 'My favourites, {count} entries',
  'nav.plain': 'A plain sentence',
};

const kannada = {
  'nav.cartWithCount': 'ಬುಟ್ಟಿ, {count} ಮೊದಿಗಳು',
  'nav.cartWithCount.one': 'ಬುಟ್ಟಿ, 1 ಮೊದಿ',
  'nav.cartWithCount.other': 'ಬುಟ್ಟಿ, {count} ಮೊದಿಗಳು',
  'nav.plain': 'ಒಂದು ಸಾಮಾನ್ಯ ವಾಕ್ಯ',
};

test('PLURAL: the count of one uses the singular form', () => {
  const template = resolveTemplate(english, english, 'nav.favoritesWithCount', { count: 1 });
  assert.equal(template, 'My favourites, 1 entry');
});

test('PLURAL: any other count uses the plural form', () => {
  for (const count of [0, 2, 17, 100]) {
    const template = resolveTemplate(english, english, 'nav.favoritesWithCount', { count });
    assert.equal(template, 'My favourites, {count} entries');
  }
});

test('PLURAL: the count may be a number that was already formatted', () => {
  // The interface formats the numbers of the active language before it
  // hands them to the translator — "1,000" must still read as "one".
  assert.equal(
    resolveTemplate(english, english, 'nav.cartWithCount', { count: '1' }),
    'Cart, 1 lot',
  );
  assert.equal(
    resolveTemplate(english, english, 'nav.cartWithCount', { count: '1,000' }),
    'Cart, {count} lots',
  );
});

test('PLURAL: a key without the two forms keeps its plain template', () => {
  assert.equal(resolveTemplate(english, english, 'nav.plain', { count: 1 }), 'A plain sentence');
  assert.equal(resolveTemplate(english, english, 'nav.plain', { count: 5 }), 'A plain sentence');
});

test('PLURAL: a language without the two forms falls back to the reference', () => {
  // Kannada has no `.one` for the favourites — the English form is used
  // instead of an empty label.
  assert.equal(
    resolveTemplate(kannada, english, 'nav.favoritesWithCount', { count: 1 }),
    'My favourites, 1 entry',
  );
  // …and the Kannada form is used where it exists.
  assert.equal(
    resolveTemplate(kannada, english, 'nav.cartWithCount', { count: 1 }),
    'ಬುಟ್ಟಿ, 1 ಮೊದಿ',
  );
});

test('PLURAL: an unknown key stays the key — nothing is invented', () => {
  assert.equal(resolveTemplate(english, english, 'nav.doesNotExist', { count: 1 }), 'nav.doesNotExist');
});

test('PLURAL: the count is read from the parameters', () => {
  assert.equal(readCount({ count: 5 }), 5);
  assert.equal(readCount({ count: '1,250' }), 1250);
  assert.equal(readCount({ count: 'one' }), null);
  assert.equal(readCount({ count: '' }), null);
  assert.equal(readCount({}), null);
  assert.equal(readCount(undefined), null);
});

test('PLURAL: the placeholders are filled in', () => {
  const template = resolveTemplate(english, english, 'nav.favoritesWithCount', { count: 3 });
  assert.equal(interpolate(template, { count: 3 }), 'My favourites, 3 entries');
});

test('PLURAL: a placeholder without a value is left alone', () => {
  assert.equal(interpolate('Cart, {count} lots', {}), 'Cart, {count} lots');
});
