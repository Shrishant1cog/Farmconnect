// Unit tests for the shared catalogue filters and crop catalogue.
//
// They run without a database:
//   cd backend && npx jest src/__tests__/productQuery.test.ts
import { buildProductWhereClause, normalizeCropFields } from '../utils/productQuery';
import {
  CROP_CATALOG,
  CROP_CATEGORY_LABELS,
  findCatalogueEntry,
  localizedCategoryLabels,
  localizedCropNames,
  searchCrops,
} from '../data/cropCatalog';

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

  it('also searches the farm name and the crop category', () => {
    // The website used to filter these two fields in the browser. The search
    // now lives in the shared backend, so it has to cover them as well.
    const where = buildProductWhereClause({ search: 'tomato' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { farmer: { is: { farmName: { contains: 'tomato', mode: 'insensitive' } } } },
        { category: { is: { name: { contains: 'tomato', mode: 'insensitive' } } } },
      ]),
    );
  });

  it('filters by crop type without restricting the search fields', () => {
    const where = buildProductWhereClause({ crop: 'Tomato' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { cropName: { contains: 'Tomato', mode: 'insensitive' } },
        { variety: { contains: 'Tomato', mode: 'insensitive' } },
      ]),
    );
  });

  it('finds a crop that is searched in another language', () => {
    // The listing stores the canonical name, the farmer may search for it in
    // their own script — the query has to match both.
    const where = buildProductWhereClause({ crop: 'ಟೊಮೇಟೊ' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { cropName: { contains: 'ಟೊಮೇಟೊ', mode: 'insensitive' } },
        { cropName: { contains: 'Tomato', mode: 'insensitive' } },
        { cropName: { contains: 'टमाटर', mode: 'insensitive' } },
      ]),
    );
  });

  it('expands a search term into every name of the matched crop', () => {
    const where = buildProductWhereClause({ search: 'tomato' });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { cropName: { contains: 'Tomato', mode: 'insensitive' } },
        { cropName: { contains: 'ಟೊಮೇಟೊ', mode: 'insensitive' } },
        { cropName: { contains: 'टमाटर', mode: 'insensitive' } },
      ]),
    );
  });

  it('does not expand very short terms', () => {
    const where = buildProductWhereClause({ search: 'ma' });
    expect(where.OR).toHaveLength(7);
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

  it('exposes the Kannada and Hindi name of every crop', () => {
    for (const entry of CROP_CATALOG) {
      const localized = localizedCropNames(entry);
      expect(localized.nameKn.length).toBeGreaterThan(0);
      expect(localized.nameHi.length).toBeGreaterThan(0);
      // The native names really are written in their own script.
      expect(localized.nameKn).toMatch(/[\u0C80-\u0CFF]/);
      expect(localized.nameHi).toMatch(/[\u0900-\u097F]/);
    }
  });

  it('exposes the Kannada and Hindi name of every category', () => {
    for (const [key, labels] of Object.entries(CROP_CATEGORY_LABELS)) {
      expect(labels.kn).toMatch(/[\u0C80-\u0CFF]/);
      expect(labels.hi).toMatch(/[\u0900-\u097F]/);
      expect(localizedCategoryLabels(key)).toEqual({
        nameKn: labels.kn,
        nameHi: labels.hi,
      });
    }
  });

  it('resolves a published APMC commodity onto its catalogue entry', () => {
    // The market publishes the commodity with its own wording — the lookup
    // has to be tolerant, but it must never invent an entry.
    expect(findCatalogueEntry('Tomato')?.name).toBe('Tomato');
    expect(findCatalogueEntry('tomato')?.name).toBe('Tomato');
    expect(findCatalogueEntry('Green Chilli')?.name).toBe('Chilli');
    expect(findCatalogueEntry('Tomato (Hybrid)')?.name).toBe('Tomato');
    expect(findCatalogueEntry('Ragi')?.name).toBe('Ragi');
    expect(findCatalogueEntry('Not A Real Crop')).toBeNull();
    expect(findCatalogueEntry('')).toBeNull();
    expect(findCatalogueEntry(null)).toBeNull();
  });
});
