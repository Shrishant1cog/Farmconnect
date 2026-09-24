import { Request, Response } from 'express';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { calculateDistanceKm } from '../../utils/geo';
import { getIO } from '../../socket';

export const listProducts = async (req: Request, res: Response) => {
  try {
    const { search, category, organic, sortBy, userLat, userLon } = req.query;
    const where: any = { isAvailable: true };

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { farmer: { farmName: { contains: String(search) } } },
      ];
    }
    if (category) where.category = { slug: String(category) };
    if (organic === 'true') where.isOrganic = true;

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'price_asc') orderBy = { farmerPrice: 'asc' };
    if (sortBy === 'price_desc') orderBy = { farmerPrice: 'desc' };

    const products = await db.product.findMany({
      where,
      orderBy,
      include: {
        category: true,
        farmer: { include: { user: { select: { name: true, phone: true } } } },
      },
    });

    const formatted = products.map((prod) => {
      let distanceKm: number | null = null;
      if (userLat && userLon) {
        distanceKm = calculateDistanceKm(
          parseFloat(String(userLat)),
          parseFloat(String(userLon)),
          prod.farmer.latitude,
          prod.farmer.longitude
        );
      }
      return { ...prod, farmerPriceNotice: 'Farmer Listed Price', distanceKm };
    });

    if (sortBy === 'nearest' && userLat && userLon) {
      formatted.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    }

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        farmer: { include: { user: { select: { name: true, phone: true } } } },
        priceHistories: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, data: product });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(400).json({ success: false, message: 'Farmer profile required' });

    const {
      title,
      description,
      categoryId,
      farmerPrice,
      priceUnit,
      quantityAvailable,
      quantityUnit,
      isOrganic,
      imageUrl,
    } = req.body;

    const product = await db.product.create({
      data: {
        farmerId: farmer.id,
        categoryId,
        title,
        description: description || 'Direct farm harvest',
        farmerPrice: parseFloat(farmerPrice),
        priceUnit: priceUnit || 'PER_KG',
        quantityAvailable: parseFloat(quantityAvailable),
        quantityUnit: quantityUnit || 'KG',
        isOrganic: Boolean(isOrganic),
        imageUrl,
      },
      include: { category: true, farmer: true },
    });

    const io = getIO();
    if (io) io.emit('new_product_listed', { id: product.id, title: product.title, farmerPrice: product.farmerPrice });

    return res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      farmerPrice,
      priceUnit,
      quantityAvailable,
      quantityUnit,
      isOrganic,
      imageUrl,
      isAvailable,
    } = req.body;

    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer profile not found' });

    const product = await db.product.findUnique({ where: { id } });
    if (!product || product.farmerId !== farmer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this crop listing' });
    }

    const newPrice = farmerPrice !== undefined ? parseFloat(farmerPrice) : product.farmerPrice;
    const priceChanged = newPrice !== product.farmerPrice;

    const updatedProduct = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          title,
          description,
          farmerPrice: newPrice,
          priceUnit,
          quantityAvailable: quantityAvailable !== undefined ? parseFloat(quantityAvailable) : product.quantityAvailable,
          quantityUnit,
          isOrganic: Boolean(isOrganic),
          imageUrl: imageUrl || null,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : product.isAvailable,
        },
      });

      if (priceChanged) {
        await tx.priceHistory.create({
          data: {
            productId: id,
            oldPrice: product.farmerPrice,
            newPrice: newPrice,
          },
        });
      }

      return updated;
    });

    const io = getIO();
    if (io) io.to(`product_${id}`).emit('product_updated', { ...updatedProduct, productId: updatedProduct.id });

    return res.json({ success: true, data: updatedProduct });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const patchProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { farmerPrice, quantityAvailable, isAvailable } = req.body;

    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer profile not found' });

    const product = await db.product.findUnique({ where: { id } });
    if (!product || product.farmerId !== farmer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const newPrice = farmerPrice !== undefined ? parseFloat(farmerPrice) : product.farmerPrice;
    const priceChanged = newPrice !== product.farmerPrice;

    const updated = await db.$transaction(async (tx) => {
      const resUpdated = await tx.product.update({
        where: { id },
        data: {
          ...(farmerPrice !== undefined ? { farmerPrice: newPrice } : {}),
          ...(quantityAvailable !== undefined ? { quantityAvailable: parseFloat(quantityAvailable) } : {}),
          ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {}),
        },
      });

      if (priceChanged) {
        await tx.priceHistory.create({
          data: { productId: id, oldPrice: product.farmerPrice, newPrice: newPrice },
        });
      }
      return resUpdated;
    });

    const io = getIO();
    if (io) io.to(`product_${id}`).emit('product_updated', { ...updated, productId: updated.id });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer profile not found' });

    const product = await db.product.findUnique({ where: { id } });
    if (!product || product.farmerId !== farmer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to remove this crop' });
    }

    await db.product.delete({ where: { id } });

    return res.json({ success: true, message: 'Crop successfully removed from inventory' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};