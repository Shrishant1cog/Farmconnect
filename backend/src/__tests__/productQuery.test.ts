// Unit tests for the shared catalogue filters and crop catalogue.
//
// They run without a database:
//   cd backend && npx jest src/__tests__/productQuery.test.ts
import { buildProductWhereClause, normalizeCropFields } from '../utils/productQuery';
import { CROP_CATALOG, searchCrops } from '../data/cropCatalog';

describe('buildProductWhereClause', () => {
  it('only returns available listings by default', () => {
    expect(buildProductWhereClause()).toEqual({ isAvailable: true });
  });

  it('searches crop name, variety and title', () => {
    const where = buildProductWhereClause({ search: 'tomato' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { cropName: { contains: 'tomato', mode: 'insensitive' } },
        { variety: { contains: 'tomato', mode: 'insensitive' } },
        { title: { contains: 'tomato', mode: 'insensitive' } },
      ]),
    );
  });

  it('filters by crop type without restricting the search fields', () => {
    const where = buildProductWhereClause({ crop: 'Tomato' });
    expect(where.OR).toHaveLength(3);
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { cropName: { contains: 'Tomato', mode: 'insensitive' } },
        { variety: { contains: 'Tomato', mode: 'insensitive' } },
      ]),
    );
  });

  it('filters by category slug or name', () => {
    const where = buildProductWhereClause({ category: 'fruits' });
    expect(where.category).toBeDefined();
    const relation = (where.category as any).is.OR;
    expect(relation).toEqual(
      expect.arrayContaining([
        { slug: { equals: 'fruits', mode: 'insensitive' } },
        { name: { contains: 'fruits', mode: 'insensitive' } },
      ]),
    );
  });

  it('supports organic, district and category id filters', () => {
    const where = buildProductWhereClause({
      isOrganic: 'true',
      district: 'Mandya',
      categoryId: 'abc',
    });
    expect(where.isOrganic).toBe(true);
    expect(where.location).toEqual({ contains: 'Mandya', mode: 'insensitive' });
    expect(where.categoryId).toBe('abc');
  });
});

describe('normalizeCropFields', () => {
  it('keeps crop and variety apart', () => {
    expect(normalizeCropFields('Tomato', 'Hybrid')).toEqual({
      cropName: 'Tomato',
      variety: 'Hybrid',
    });
  });

  it('stores blank values as null', () => {
    expect(normalizeCropFields('  ', '')).toEqual({ cropName: null, variety: null });
    expect(normalizeCropFields(undefined, undefined)).toEqual({ cropName: null, variety: null });
  });
});

describe('crop catalogue', () => {
  it('contains crops from every seeded category', () => {
    expect(CROP_CATALOG.length).toBeGreaterThan(40);
    const categories = new Set(CROP_CATALOG.map((entry) => entry.category));
    expect(categories.has('vegetables')).toBe(true);
    expect(categories.has('fruits')).toBe(true);
    expect(categories.has('grains-millets')).toBe(true);
  });

  it('finds crops by English name', () => {
    const results = searchCrops('tomato');
    expect(results.some((entry) => entry.name === 'Tomato')).toBe(true);
  });

  it('finds crops by Kannada and Hindi aliases', () => {
    expect(searchCrops('ಟೊಮೇಟೊ').some((entry) => entry.name === 'Tomato')).toBe(true);
    expect(searchCrops('टमाटर').some((entry) => entry.name === 'Tomato')).toBe(true);
    expect(searchCrops('रागी').some((entry) => entry.name === 'Ragi')).toBe(true);
  });

  it('filters crops by category', () => {
    const results = searchCrops('', 'fruits');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.category === 'fruits')).toBe(true);
  });
});
