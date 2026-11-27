import { Response } from 'express';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const getUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.user?.userId || (req as any).userId || null;
};

/**
 * Resolve (or lazily create) the consumer profile that owns favourites.
 * Favourites are always scoped to a ConsumerProfile row.
 */
const resolveConsumerProfileId = async (userId: string): Promise<string | null> => {
  const existing = await db.consumerProfile.findUnique({ where: { userId } });
  if (existing) {
    return existing.id;
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }

  const created = await db.consumerProfile.create({
    data: {
      userId,
      district: 'Bengaluru Urban',
      deliveryAddress: 'Karnataka',
    },
  });

  return created.id;
};

// 1. All favourites of the signed-in consumer
export const getFavorites = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const consumerProfileId = await resolveConsumerProfileId(userId);
    if (!consumerProfileId) {
      return res.status(404).json({ success: false, message: 'Consumer profile not found' });
    }

    const [products, farmers] = await Promise.all([
      db.favouriteProduct.findMany({
        where: { consumerId: consumerProfileId },
        include: {
          product: {
            include: {
              farmer: { include: { user: { select: { id: true, name: true, phone: true } } } },
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.favouriteFarmer.findMany({
        where: { consumerId: consumerProfileId },
        include: {
          farmer: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
              products: { where: { isAvailable: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        products: products.map((favourite: any) => ({ ...favourite, product: favourite.product })),
        farmers,
      },
      products,
      farmers,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Add / remove a favourite product
export const toggleFavoriteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const productId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const consumerProfileId = await resolveConsumerProfileId(userId);
    if (!consumerProfileId) {
      return res.status(404).json({ success: false, message: 'Consumer profile not found' });
    }

    const existing = await db.favouriteProduct.findUnique({
      where: { consumerId_productId: { consumerId: consumerProfileId, productId } },
    });

    if (existing) {
      await db.favouriteProduct.delete({ where: { id: existing.id } });
      return res.json({ success: true, isFavorite: false, message: 'Removed from favourites' });
    }

    await db.favouriteProduct.create({ data: { consumerId: consumerProfileId, productId } });
    return res.status(201).json({ success: true, isFavorite: true, message: 'Added to favourites' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Add / remove a favourite farmer
export const toggleFavoriteFarmer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const farmerId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const farmer = await db.farmerProfile.findUnique({ where: { id: farmerId } });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    const consumerProfileId = await resolveConsumerProfileId(userId);
    if (!consumerProfileId) {
      return res.status(404).json({ success: false, message: 'Consumer profile not found' });
    }

    const existing = await db.favouriteFarmer.findUnique({
      where: { consumerId_farmerId: { consumerId: consumerProfileId, farmerId } },
    });

    if (existing) {
      await db.favouriteFarmer.delete({ where: { id: existing.id } });
      return res.json({ success: true, isFavorite: false, message: 'Removed from favourites' });
    }

    await db.favouriteFarmer.create({ data: { consumerId: consumerProfileId, farmerId } });
    return res.status(201).json({ success: true, isFavorite: true, message: 'Added to favourites' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getFavorites,
  toggleFavoriteProduct,
  toggleFavoriteFarmer,
};
