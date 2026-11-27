// Pure query builders for the shared product catalogue.
//
// Keeping them free of Prisma/Express imports makes the catalogue filters
// unit-testable without a database, and keeps both clients aligned: the
// website and the Android app filter through exactly the same rules.

export interface ProductFilterInput {
  search?: unknown;
  district?: unknown;
  isOrganic?: unknown;
  crop?: unknown;
  category?: unknown;
  categoryId?: unknown;
}

export interface ProductFilterClause {
  isAvailable?: boolean;
  isOrganic?: boolean;
  location?: { contains: string; mode: 'insensitive' };
  categoryId?: string;
  cropName?: { contains: string; mode: 'insensitive' };
  variety?: { contains: string; mode: 'insensitive' };
  category?: { is?: { slug?: string } | { name?: { contains: string; mode: 'insensitive' } } };
  OR?: Array<Record<string, unknown>>;
}

const asTrimmedString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
};

/**
 * Builds the Prisma `where` clause for the public catalogue feed.
 *
 * - `search`  matches title, description, location, crop name and variety.
 * - `crop`    matches only the crop name / variety (crop type filter).
 * - `category` accepts a category slug (e.g. `fruits`) or a category name.
 */
export function buildProductWhereClause(input: ProductFilterInput = {}): ProductFilterClause {
  const where: ProductFilterClause = { isAvailable: true };
  const or: Array<Record<string, unknown>> = [];

  const search = asTrimmedString(input.search);
  if (search) {
    or.push(
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { cropName: { contains: search, mode: 'insensitive' } },
      { variety: { contains: search, mode: 'insensitive' } },
    );
  }

  const crop = asTrimmedString(input.crop);
  if (crop) {
    or.push(
      { cropName: { contains: crop, mode: 'insensitive' } },
      { variety: { contains: crop, mode: 'insensitive' } },
      { title: { contains: crop, mode: 'insensitive' } },
    );
  }

  if (or.length > 0) {
    where.OR = or;
  }

  const organic = asTrimmedString(input.isOrganic);
  if (organic === 'true' || organic === '1') {
    where.isOrganic = true;
  }

  const district = asTrimmedString(input.district);
  if (district) {
    where.location = { contains: district, mode: 'insensitive' };
  }

  const categoryId = asTrimmedString(input.categoryId);
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const category = asTrimmedString(input.category);
  if (category) {
    where.category = {
      is: {
        OR: [
          { slug: { equals: category, mode: 'insensitive' } },
          { name: { contains: category, mode: 'insensitive' } },
        ],
      },
    } as ProductFilterClause['category'];
  }

  return where;
}

/**
 * Normalises the crop / variety pair that a farmer submits.
 * Blank values are stored as `null` so the catalogue stays clean.
 */
export function normalizeCropFields(cropName: unknown, variety: unknown): { cropName: string | null; variety: string | null } {
  const crop = asTrimmedString(cropName);
  const varName = asTrimmedString(variety);

  return {
    cropName: crop ? crop : null,
    variety: varName ? varName : null,
  };
}
