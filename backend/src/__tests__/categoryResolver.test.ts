// Unit tests for the category alias resolver.
//
// The resolver exists because the seeded category *slugs* are not identical
// on every installation: the seed script keeps an already existing slug, so
// `Grains & Millets` may be stored as `grains` in one database and as
// `grains-millets` in another. These tests cover the pure alias logic; the
// database lookups themselves are exercised by the live integration test.

import {
  categoryAliasCandidates,
  catalogueKeyForCategory,
} from '../utils/categoryResolver';
import { CROP_CATEGORY_NAMES, slugifyCategoryName } from '../data/cropCatalog';

describe('categoryAliasCandidates', () => {
  it('returns nothing for an empty value', () => {
    expect(categoryAliasCandidates('')).toEqual([]);
    expect(categoryAliasCandidates('   ')).toEqual([]);
  });

  it('keeps a plain slug', () => {
    expect(categoryAliasCandidates('vegetables')).toContain('vegetables');
    expect(categoryAliasCandidates('fruits')).toContain('fruits');
  });

  it('maps the catalogue key onto the canonical display name', () => {
    const candidates = categoryAliasCandidates('grains-millets');
    expect(candidates).toContain('grains-millets');
    expect(candidates).toContain('grains & millets');
    expect(candidates).toContain(slugifyCategoryName('Grains & Millets'));
  });

  it('maps a display name onto the catalogue key', () => {
    const candidates = categoryAliasCandidates('Grains & Millets');
    expect(candidates).toContain('grains-millets');
    expect(candidates).toContain('grains & millets');
  });

  it('is case insensitive', () => {
    expect(categoryAliasCandidates('GRAINS-MILLETS')).toEqual(
      categoryAliasCandidates('grains-millets'),
    );
  });

  it('covers every seeded category', () => {
    for (const [key, name] of Object.entries(CROP_CATEGORY_NAMES)) {
      expect(categoryAliasCandidates(key)).toContain(name.toLowerCase());
    }
  });
});

describe('catalogueKeyForCategory', () => {
  it('resolves a category stored under the canonical slug', () => {
    expect(
      catalogueKeyForCategory({ name: 'Grains & Millets', slug: 'grains-millets' }),
    ).toBe('grains-millets');
  });

  it('resolves a category stored under a shortened legacy slug', () => {
    expect(catalogueKeyForCategory({ name: 'Grains & Millets', slug: 'grains' })).toBe(
      'grains-millets',
    );
  });

  it('resolves a category stored only by its display name', () => {
    expect(catalogueKeyForCategory({ name: 'Pulses & Legumes', slug: 'pulses' })).toBe(
      'pulses-legumes',
    );
  });

  it('returns null for an unknown category', () => {
    expect(catalogueKeyForCategory({ name: 'Widgets', slug: 'widgets' })).toBeNull();
  });
});

describe('slugifyCategoryName', () => {
  it('matches the slug rule used by the category seed script', () => {
    expect(slugifyCategoryName('Grains & Millets')).toBe('grains-millets');
    expect(slugifyCategoryName('Nuts & Dry Produce')).toBe('nuts-dry-produce');
    expect(slugifyCategoryName('Vegetables')).toBe('vegetables');
  });
});
