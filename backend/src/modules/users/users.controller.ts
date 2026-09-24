import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  // Consumer fields
  district: z.string().optional(),
  deliveryAddress: z.string().optional(),
  // Farmer fields
  farmName: z.string().optional(),
  addressLine: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// 1. Get current logged-in user profile
export const getCurrentProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        farmerProfile: true,
        consumerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Update user profile & linked farmer/consumer profile
export const updateCurrentProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const userId = req.user!.id;
    const role = req.user!.role;

    const updatedUser = await db.$transaction(async (tx) => {
      // Update primary user fields
      if (body.name || body.phone) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(body.name ? { name: body.name } : {}),
            ...(body.phone ? { phone: body.phone } : {}),
          },
        });
      }

      // Update farmer-specific profile
      if (role === 'FARMER') {
        await tx.farmerProfile.upsert({
          where: { userId },
          create: {
            userId,
            farmName: body.farmName || 'My Farm',
            district: body.district || 'Karnataka',
            addressLine: body.addressLine || '',
            latitude: body.latitude || 12.9716,
            longitude: body.longitude || 77.5946,
          },
          update: {
            ...(body.farmName ? { farmName: body.farmName } : {}),
            ...(body.district ? { district: body.district } : {}),
            ...(body.addressLine ? { addressLine: body.addressLine } : {}),
            ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
            ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
          },
        });
      }

      // Update consumer-specific profile
      if (role === 'CONSUMER') {
        await tx.consumerProfile.upsert({
          where: { userId },
          create: {
            userId,
            district: body.district || 'Bengaluru',
            deliveryAddress: body.deliveryAddress || '',
            latitude: body.latitude || 12.9716,
            longitude: body.longitude || 77.5946,
          },
          update: {
            ...(body.district ? { district: body.district } : {}),
            ...(body.deliveryAddress ? { deliveryAddress: body.deliveryAddress } : {}),
            ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
            ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
          },
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: { farmerProfile: true, consumerProfile: true },
      });
    });

    return res.json({ success: true, data: updatedUser });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
};