import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db';
import { buildProductWhereClause, normalizeCropFields } from '../../utils/productQuery';
import { resolveCategory } from '../../utils/categoryResolver';
import { parseCoordinateOrNull } from '../../utils/coordinate';
import { JWT_SECRETS } from '../../config/jwt';
import {
  describeApmcBenchmark,
  loadApmcBenchmarkIndex,
} from '../../utils/apmcBenchmark';



/**
 * Helper: Safely extracts userId from request object or Authorization header
 */
const resolveUserId = (req: Request): string | null => {
  let userId = (req as any).user?.id || (req as any).user?.userId || (req as any).userId;

  if (!userId && req.headers.authorization?.startsWith('Bearer ')) {
    const rawToken = req.headers.authorization.split(' ')[1];
    for (const secret of JWT_SECRETS) {
      try {
        const decoded: any = jwt.verify(rawToken, secret);
        userId = decoded?.id || decoded?.userId;
        if (userId) {
          (req as any).user = decoded;
          break;
        }
      } catch {
        // Try next secret key fallback
      }
    }
  }

  return userId ? String(userId) : null;
};

/**
 * Helper: Resolves the `FarmerProfile` that belongs to the authenticated
 * account, so a listing can only be changed by its own owner (or by an
 * administrator).
 */
const resolveOwningFarmerProfileId = async (req: Request): Promise<string | null> => {
  const userId = resolveUserId(req);
  if (!userId) return null;
  const profile = await db.farmerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id || null;
};

/**
 * Helper: Checks that the authenticated account may modify the given listing.
 *
 * Returns `null` when the request may proceed, or the error response that has
 * to be sent instead.
 */
const authorizeListingOwner = async (
  req: Request,
  res: Response,
  listing: { id: string; farmerId: string }
): Promise<Response | null> => {
  const role = String((req as any).user?.role || '').toUpperCase();
  if (role === 'ADMIN') {
    return null;
  }

  const ownerProfileId = await resolveOwningFarmerProfileId(req);
  if (!ownerProfileId) {
    return res.status(403).json({
      success: false,
      message: 'Only the cultivator who published this listing can change it.',
    });
  }

  if (listing.farmerId !== ownerProfileId) {
    return res.status(403).json({
      success: false,
      message: 'Only the cultivator who published this listing can change it.',
    });
  }

  return null;
};

/**
 * 1. Create a Fresh Produce / Harvest Listing
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Session missing' });
    }

    const {
      title,
      description = '',
      farmerPrice,
      priceUnit = 'PER_KG',
      quantityAvailable,
      quantityUnit = 'KG',
      minOrderKg = 10,
      grade = 'Grade-A Export',
      isOrganic = false,
      location = 'Karnataka',
      imageUrl = '',
      categoryId,
      cropName,
      variety,
      farmName,
      district,
      state,
      latitude,
      longitude,
    } = req.body;

    if (!title || farmerPrice === undefined || quantityAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, farmer price, and quantity available are required.',
      });
    }

    const parsedPrice = Number(farmerPrice);
    const parsedQty = Number(quantityAvailable);
    const parsedMinOrder = Number(minOrderKg);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ success: false, message: 'Farmer price must be a valid non-negative number.' });
    }
    if (!Number.isFinite(parsedQty) || parsedQty < 0) {
      return res.status(400).json({ success: false, message: 'Quantity available must be a valid non-negative number.' });
    }
    if (!Number.isFinite(parsedMinOrder) || parsedMinOrder <= 0) {
      return res.status(400).json({ success: false, message: 'Minimum order quantity must be greater than zero.' });
    }

    // Resolve the farmer profile belonging to this authenticated user.
    let farmerProfile = await db.farmerProfile.findUnique({ where: { userId } });

    if (!farmerProfile) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authenticated user no longer exists.' });
      }

      farmerProfile = await db.farmerProfile.create({
        data: {
          userId,
          farmName: String(farmName || `${user.name || 'Cultivator'}'s Farm`),
          district: String(district || 'Mandya'),
          state: String(state || 'Karnataka'),
          // The position is stored only when it was really shared — a
          // placeholder would put the farm somewhere it does not exist.
          // `Number(null)` is 0, so the value has to be checked **before**
          // it is converted: a missing or cleared position must never
          // become the point 0 / 0.
          latitude: parseCoordinateOrNull(latitude, 90),
          longitude: parseCoordinateOrNull(longitude, 180),
          isVerified: true,
        },
      });
    }

    // The crop picker sends a `categoryId`. When it is missing (legacy
    // clients) the listing falls back to the standard Vegetables category so
    // the endpoint stays usable and backward compatible.
    let resolvedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : '';
    if (resolvedCategoryId) {
      const category = await db.category.findUnique({ where: { id: resolvedCategoryId } });
      if (!category) {
        return res.status(400).json({ success: false, message: 'Selected product category was not found.' });
      }
    } else {
      let defaultCategory = await resolveCategory('vegetables');
      if (!defaultCategory) {
        defaultCategory = await db.category.create({
          data: {
            name: 'Vegetables',
            slug: 'vegetables',
            description: 'Fresh vegetables harvested from local fields',
          },
        });
      }
      resolvedCategoryId = defaultCategory.id;
    }

    const product = await db.product.create({
      data: {
        title: String(title).trim(),
        description: String(description).trim(),
        cropName: normalizeCropFields(cropName, null).cropName,
        variety: normalizeCropFields(null, variety).variety,
        farmerPrice: parsedPrice,
        priceUnit: String(priceUnit).toUpperCase(),
        quantityAvailable: parsedQty,
        quantityUnit: String(quantityUnit).toUpperCase(),
        minOrderKg: parsedMinOrder,
        grade: String(grade).trim() || 'Grade-A Export',
        isOrganic: Boolean(isOrganic),
        isAvailable: parsedQty > 0,
        location: String(location).trim() || 'Karnataka',
        imageUrl: String(imageUrl || '').trim() || null,
        farmer: { connect: { id: farmerProfile.id } },
        category: { connect: { id: resolvedCategoryId } },
      },
      include: {
        farmer: { include: { user: { select: { id: true, name: true, phone: true } } } },
        category: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Product listed successfully',
      data: product,
      product,
      id: product.id,
    });
  } catch (error: any) {
    console.error('[createProduct] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create produce listing',
      error: error.message,
    });
  }
};

/**
 * 2. Get All Products for the Logged-in Farmer
 */
export const getMyProducts = async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let farmer: any = null;
    try {
      farmer = await db.farmerProfile.findFirst({
        where: { OR: [{ userId }, { id: userId }] },
      });
    } catch (err) {
      console.warn('[getMyProducts] Farmer lookup notice:', err);
    }

    let products: any[] = [];
    try {
      products = await db.product.findMany({
        where: {
          OR: [
            ...(farmer ? [{ farmerId: farmer.id }] : []),
            { farmerId: userId },
          ],
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      products = await db.product.findMany({
        where: { farmerId: userId },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);
    }

    const benchmarkIndex = await loadApmcBenchmarkIndex();
    const catalogProducts = products.map((product: any) => ({
      ...product,
      farmerPriceNotice: 'Farmer Listed Price',
      // The **published** APMC benchmark of the crop — `null` when the shared
      // database holds no benchmark for it. The clients must never invent a
      // benchmark from the farmer's own price.
      ...describeApmcBenchmark(
        benchmarkIndex,
        product.cropName,
        product.location,
      ),
    }));

    return res.status(200).json({
      success: true,
      data: catalogProducts,
      products: catalogProducts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer products',
      error: error.message,
    });
  }
};

/**
 * 3. Public Catalog Feed with Search & Filter Support
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, district, isOrganic, crop, category, categoryId } = req.query;

    const whereClause: any = buildProductWhereClause({
      search,
      district,
      isOrganic,
      crop,
      category,
      categoryId,
    });

    // The category filter is resolved against the live `Category` table so
    // that a slug such as `grains` and the display name `Grains & Millets`
    // select exactly the same listings on both clients.
    if (category && typeof category === 'string' && category.trim()) {
      const resolvedCategory = await resolveCategory(category);
      if (resolvedCategory) {
        whereClause.categoryId = resolvedCategory.id;
        delete whereClause.category;
      }
    }

    // The caller asked for a filtered view (crop, category, search …). If the
    // filtered query fails we must NOT silently answer with the unfiltered
    // catalogue — that would be a fake success state and the client would
    // show listings that do not match the requested crop. The error is
    // reported instead so both clients show their real error state.
    const hasActiveFilter = Boolean(
      (typeof search === 'string' && search.trim()) ||
        (typeof crop === 'string' && crop.trim()) ||
        (typeof category === 'string' && category.trim()) ||
        (typeof categoryId === 'string' && categoryId.trim()) ||
        (typeof district === 'string' && district.trim()) ||
        (typeof isOrganic === 'string' && isOrganic.trim()),
    );

    let products: any[] = [];
    try {
      products = await db.product.findMany({
        where: whereClause,
        include: {
          category: true,
          farmer: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (queryError: any) {
      if (hasActiveFilter) {
        console.error('[getProducts] Filtered catalogue query failed:', queryError?.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch the filtered catalogue',
          error: queryError?.message,
        });
      }

      // No filter was requested: a degraded read of the plain catalogue is
      // still an honest answer.
      products = await db.product.findMany({
        where: { isAvailable: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);
    }

    const benchmarkIndex = await loadApmcBenchmarkIndex();
    const catalogProducts = products.map((product: any) => ({
      ...product,
      farmerPriceNotice: 'Farmer Listed Price',
      // The **published** APMC benchmark of the crop — `null` when the shared
      // database holds no benchmark for it. The clients must never invent a
      // benchmark from the farmer's own price.
      ...describeApmcBenchmark(
        benchmarkIndex,
        product.cropName,
        product.location,
      ),
    }));

    return res.status(200).json({
      success: true,
      data: catalogProducts,
      products: catalogProducts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch catalog products',
      error: error.message,
    });
  }
};

/**
 * 4. Single Product by ID
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let product: any = null;
    try {
      product = await db.product.findUnique({
        where: { id },
        include: {
          category: true,
          farmer: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
        },
      });
    } catch {
      product = await db.product.findUnique({ where: { id } }).catch(() => null);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // The **published** APMC benchmark of the crop — `null` when the shared
    // database holds no benchmark for it.
    const benchmarkIndex = await loadApmcBenchmarkIndex();
    const withBenchmark = {
      ...product,
      ...describeApmcBenchmark(benchmarkIndex, product.cropName, product.location),
    };

    return res.status(200).json({
      success: true,
      data: withBenchmark,
      product: withBenchmark,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product details',
      error: error.message,
    });
  }
};

/**
 * 5. Update Product Details / Stock
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // A listing may only be edited by the cultivator who published it.
    const forbidden = await authorizeListingOwner(req, res, existing);
    if (forbidden) return forbidden;

    const updateBody: Record<string, unknown> = req.body || {};
    const dataToUpdate: Record<string, unknown> = {};

    const stringFields = ['title', 'description', 'priceUnit', 'quantityUnit', 'grade', 'location', 'imageUrl'];
    for (const field of stringFields) {
      if (updateBody[field] !== undefined) {
        dataToUpdate[field] = field === 'priceUnit' || field === 'quantityUnit'
          ? String(updateBody[field]).toUpperCase()
          : String(updateBody[field] ?? '').trim();
      }
    }

    // Crop fields identify the crop this lot represents. They are stored
    // independently so one listing never overwrites another crop.
    if (updateBody.cropName !== undefined) {
      dataToUpdate.cropName = normalizeCropFields(updateBody.cropName, null).cropName;
    }
    if (updateBody.variety !== undefined) {
      dataToUpdate.variety = normalizeCropFields(null, updateBody.variety).variety;
    }

    if (updateBody.categoryId !== undefined) {
      const nextCategoryId = String(updateBody.categoryId ?? '').trim();
      if (nextCategoryId) {
        const category = await db.category.findUnique({ where: { id: nextCategoryId } });
        if (!category) {
          return res.status(400).json({ success: false, message: 'Selected product category was not found.' });
        }
        dataToUpdate.categoryId = nextCategoryId;
      }
    }

    const numericFields = ['farmerPrice', 'quantityAvailable', 'minOrderKg', 'containerCostPerKg'];
    for (const field of numericFields) {
      if (updateBody[field] !== undefined) {
        const value = Number(updateBody[field]);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ success: false, message: `${field} must be a valid non-negative number.` });
        }
        dataToUpdate[field] = value;
      }
    }

    if (updateBody.isOrganic !== undefined) dataToUpdate.isOrganic = Boolean(updateBody.isOrganic);
    if (updateBody.isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(updateBody.isAvailable);
    if (updateBody.isAvailable === undefined && updateBody.quantityAvailable !== undefined) {
      dataToUpdate.isAvailable = Number(dataToUpdate.quantityAvailable) > 0;
    }

    if (dataToUpdate.farmerPrice !== undefined && Number(dataToUpdate.farmerPrice) !== Number(existing.farmerPrice)) {
      await db.priceHistory.create({
        data: {
          productId: id,
          oldPrice: Number(existing.farmerPrice),
          newPrice: Number(dataToUpdate.farmerPrice),
        },
      });
    }

    const updated = await db.product.update({
      where: { id },
      data: dataToUpdate as any,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      product: updated,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};

/**
 * 6. Delete Harvest Listing
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // A listing may only be deleted by the cultivator who published it.
    const forbidden = await authorizeListingOwner(req, res, existing);
    if (forbidden) return forbidden;

    // A listing that already carries an order is part of the order history
    // and must not be removed. The cultivator is told to take it off the
    // market instead — the endpoint never reports a delete that did not
    // happen.
    const orderItems = await db.orderItem.findMany({
      where: { productId: id },
      select: { id: true },
    });

    if (orderItems.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          'This listing already has orders and can no longer be deleted. Mark it as unavailable instead.',
      });
    }

    await db.product.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};

export default {
  createProduct,
  getMyProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};