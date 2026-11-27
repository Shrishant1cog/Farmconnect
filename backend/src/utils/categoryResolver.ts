// Resolves crop categories against the live `Category` table.
//
// The seeded categories keep whatever slug they already had, so a slug such
// as `grains-millets` may be stored as `grains` in one installation and as
// `grains-millets` in another. Every lookup therefore tries the slug, the
// canonical display name and the slugified display name before giving up.
//
// The helper is used by the catalogue endpoints and by the product filters so
// the website and the Android app always resolve the same category record.

import { db } from '../config/db';
import {
  CROP_CATEGORY_NAMES,
  localizedCategoryLabels,
  slugifyCategoryName,
} from '../data/cropCatalog';

export interface ResolvedCategory {
  id: string;
  name: string;
  slug: string;
}

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

/** Every DB slug/name that may represent the given catalogue category key. */
export function categoryAliasCandidates(value: string): string[] {
  const raw = normalize(value);
  if (!raw) return [];

  const candidates = new Set<string>([raw]);

  // Direct catalogue key (e.g. `grains-millets`).
  if (CROP_CATEGORY_NAMES[raw]) {
    candidates.add(raw);
  }

  // Canonical display name of the catalogue key.
  for (const [key, name] of Object.entries(CROP_CATEGORY_NAMES)) {
    if (key === raw || normalize(name) === raw) {
      candidates.add(key);
      candidates.add(normalize(name));
      candidates.add(slugifyCategoryName(name));
    }
  }

  // A slugified version of whatever the caller sent (`Grains & Millets`
  // becomes `grains-millets`).
  candidates.add(slugifyCategoryName(raw.replace(/&/g, ' and ')));
  candidates.add(slugifyCategoryName(raw));

  return Array.from(candidates).filter(Boolean);
}

/**
 * Finds the database category that matches the given slug, catalogue key or
 * display name. Returns `null` when nothing matches.
 */
export async function resolveCategory(value: string): Promise<ResolvedCategory | null> {
  const candidates = categoryAliasCandidates(value);
  if (candidates.length === 0) return null;

  try {
    const category = await db.category.findFirst({
      where: {
        OR: [
          ...candidates.map((candidate) => ({
            slug: { equals: candidate, mode: 'insensitive' as const },
          })),
          ...candidates.map((candidate) => ({
            name: { equals: candidate, mode: 'insensitive' as const },
          })),
          ...candidates.map((candidate) => ({
            name: { contains: candidate, mode: 'insensitive' as const },
          })),
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    return category ?? null;
  } catch {
    return null;
  }
}

/**
 * Loads every category and indexes it by all of its known aliases so a
 * catalogue key can be mapped to the real record in one query.
 */
export async function loadCategoryIndex(): Promise<Map<string, ResolvedCategory>> {
  const index = new Map<string, ResolvedCategory>();

  let categories: ResolvedCategory[] = [];
  try {
    categories = await db.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  } catch {
    return index;
  }

  const add = (key: string, category: ResolvedCategory) => {
    const normalized = normalize(key);
    if (normalized && !index.has(normalized)) {
      index.set(normalized, category);
    }
  };

  for (const category of categories) {
    add(category.slug, category);
    add(category.name, category);
    add(slugifyCategoryName(category.name), category);
  }

  // Catalogue keys map to the canonical category names.
  for (const [key, name] of Object.entries(CROP_CATEGORY_NAMES)) {
    const normalizedName = normalize(name);
    const match =
      index.get(normalizedName) ??
      index.get(slugifyCategoryName(name)) ??
      index.get(normalize(key));
    if (match) {
      add(key, match);
    }
  }

  return index;
}

/**
 * Returns the crop-catalogue key that belongs to a live category record.
 * The database slug may differ from the catalogue key (for example `grains`
 * instead of `grains-millets`), so the canonical name is used as the anchor.
 */
export function catalogueKeyForCategory(category: { name: string; slug: string }): string | null {
  const normalizedSlug = normalize(category.slug);
  const normalizedName = normalize(category.name);

  for (const [key, name] of Object.entries(CROP_CATEGORY_NAMES)) {
    if (
      key === normalizedSlug ||
      normalize(name) === normalizedName ||
      slugifyCategoryName(name) === normalizedSlug
    ) {
      return key;
    }
  }

  return null;
}

/**
 * Localised display names of a live category record.
 *
 * The English name stays the stored value; the Kannada and Hindi names come
 * from the shared crop catalogue so both clients can render the category in
 * the language the user picked.
 */
export function localizedCategoryNames(category: {
  name: string;
  slug: string;
}): { nameKn: string; nameHi: string } {
  const key = catalogueKeyForCategory(category);
  const labels = localizedCategoryLabels(key);

  // A category that is not part of the catalogue keeps its stored name.
  if (!key) {
    return { nameKn: category.name, nameHi: category.name };
  }

  return labels;
}

/**
 * Resolves a catalogue category key (or any slug / display name) to the live
 * category record.
 */
export async function resolveCatalogueCategory(
  key: string,
  index?: Map<string, ResolvedCategory>
): Promise<ResolvedCategory | null> {
  const candidates = categoryAliasCandidates(key);
  if (candidates.length === 0) return null;

  if (index) {
    for (const candidate of candidates) {
      const match = index.get(normalize(candidate));
      if (match) return match;
    }
    return null;
  }

  return resolveCategory(key);
}
