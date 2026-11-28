import { Request, Response } from 'express';
import { db } from '../../config/db';
import {
  CROP_CATALOG,
  localizedCategoryLabels,
  localizedCropNames,
  searchCrops,
} from '../../data/cropCatalog';
import {
  loadCategoryIndex,
  catalogueKeyForCategory,
  localizedCategoryNames,
  resolveCatalogueCategory,
} from '../../utils/categoryResolver';

/**
 * Shared catalogue metadata used by both clients.
 *
 * - `GET /api/catalog/categories` – crop categories with live listing counts.
 * - `GET /api/catalog/crops`       – searchable crop catalogue (search
 *   assistance for the farmer; a farmer may still type a custom crop).
 *
 * Every crop is returned together with the **real** category id and slug of
 * the database record, so a farmer can pick a crop and store the correct
 * `categoryId` without the clients having to know the seeded slugs.
 */
export const listCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const data = categories.map((category: any) => {
      const localized = localizedCategoryNames(category);
      return {
        id: category.id,
        name: category.name,
        nameKn: localized.nameKn,
        nameHi: localized.nameHi,
        slug: category.slug,
        description: category.description,
        productCount: category._count?.products ?? 0,
      };
    });

    return res.json({ success: true, data, categories: data });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch catalogue categories',
      error: error?.message,
    });
  }
};

export const listCrops = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query as Record<string, string | undefined>;
    const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);

    // The catalogue category keys are resolved against the live categories so
    // a farmer always receives the real category id of the installation.
    const categoryIndex = await loadCategoryIndex();
    let selectedCategoryKey: string | undefined;
    let selectedCategoryRecord = null;

    if (category && String(category).trim()) {
      selectedCategoryRecord = await resolveCatalogueCategory(String(category), categoryIndex);
      selectedCategoryKey = selectedCategoryRecord
        ? catalogueKeyForCategory(selectedCategoryRecord) ?? undefined
        : String(category).trim().toLowerCase();
    }

    const crops = searchCrops(search, selectedCategoryKey, limit).map((entry) => {
      const resolved = categoryIndex.get(entry.category) ?? null;
      const localizedCrop = localizedCropNames(entry);
      const localizedCategory = localizedCategoryLabels(entry.category);

      return {
        name: entry.name,
        nameKn: localizedCrop.nameKn,
        nameHi: localizedCrop.nameHi,
        category: resolved?.slug ?? entry.category,
        categoryKey: entry.category,
        categoryId: resolved?.id ?? null,
        categoryName: resolved?.name ?? null,
        categoryNameKn: localizedCategory.nameKn,
        categoryNameHi: localizedCategory.nameHi,
        aliases: entry.aliases,
      };
    });

    return res.json({
      success: true,
      data: crops,
      crops,
      total: crops.length,
      catalogueSize: CROP_CATALOG.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch crop catalogue',
      error: error?.message,
    });
  }
};

export default {
  listCategories,
  listCrops,
};
