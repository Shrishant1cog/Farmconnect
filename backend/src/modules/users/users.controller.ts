import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  email: z.string().email('Invalid email address').optional(),
  // Location & Regional fields
  state: z.string().optional(),
  district: z.string().optional(),
  taluk: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
  deliveryAddress: z.string().optional(),
  addressLine: z.string().optional(),
  // Farmer specific fields
  farmName: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// Helper to safely extract user ID
const getUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.user?.userId || (req as any).userId || null;
};

// 1. Get current logged-in user profile
export const getCurrentProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
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

    const enrichedProfile = {
      ...user,
      district: user.farmerProfile?.district || user.consumerProfile?.district || 'Mandya',
      state: user.farmerProfile?.state || 'Karnataka',
    };

    return res.json({
      success: true,
      data: enrichedProfile,
      user: enrichedProfile,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to retrieve profile' });
  }
};

// 2. Update user profile & linked farmer/consumer profile
export const updateCurrentProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const body = updateProfileSchema.parse(req.body);
    const userRole = String(req.user?.role || '').toUpperCase();

    const updatedUser = await db.$transaction(async (tx) => {
      // Step A: Update primary user fields
      const userUpdateData: any = {};
      if (body.name) userUpdateData.name = body.name.trim();
      if (body.phone) userUpdateData.phone = body.phone.replace(/\D/g, '').slice(-10);
      if (body.email) userUpdateData.email = body.email.trim().toLowerCase();

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }

      // Step B: Update or provision farmer-specific profile
      if (userRole === 'FARMER') {
        const farmerData: any = {};
        if (body.farmName) farmerData.farmName = body.farmName.trim();
        if (body.district) farmerData.district = body.district.trim();
        if (body.state) farmerData.state = body.state.trim();
        if (body.addressLine || body.address) farmerData.addressLine = (body.addressLine || body.address)!.trim();
        if (body.latitude !== undefined) farmerData.latitude = body.latitude;
        if (body.longitude !== undefined) farmerData.longitude = body.longitude;

        await tx.farmerProfile.upsert({
          where: { userId },
          create: {
            userId,
            farmName: body.farmName?.trim() || 'Cultivator Farm',
            district: body.district?.trim() || 'Mandya',
            state: body.state?.trim() || 'Karnataka',
            addressLine: (body.addressLine || body.address || '').trim(),
            latitude: body.latitude !== undefined ? body.latitude : 12.5218,
            longitude: body.longitude !== undefined ? body.longitude : 76.8951,
            isVerified: true,
          },
          update: farmerData,
        });
      }

      // Step C: Update or provision consumer-specific profile if model exists
      if (userRole === 'CONSUMER' && (tx as any).consumerProfile) {
        const resolvedAddress = (body.deliveryAddress || body.address || body.addressLine || '').trim();
        const consumerData: any = {};
        if (body.district) consumerData.district = body.district.trim();
        if (resolvedAddress) consumerData.address = resolvedAddress;

        try {
          await (tx as any).consumerProfile.upsert({
            where: { userId },
            create: {
              userId,
              district: body.district?.trim() || 'Bengaluru Urban',
              address: resolvedAddress || 'Karnataka',
            },
            update: consumerData,
          });
        } catch {
          // Fallback if schema variants differ
        }
      }

      return tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          farmerProfile: true,
          consumerProfile: true,
        },
      });
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
      user: updatedUser,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update user profile',
    });
  }
};

// Aliases for compatibility
export const getProfile = getCurrentProfile;
export const getMe = getCurrentProfile;
export const getCurrentUser = getCurrentProfile;
export const updateProfile = updateCurrentProfile;
export const updateMe = updateCurrentProfile;
export const editProfile = updateCurrentProfile;

export default {
  getCurrentProfile,
  getProfile,
  getMe,
  getCurrentUser,
  updateCurrentProfile,
  updateProfile,
  updateMe,
  editProfile,
};