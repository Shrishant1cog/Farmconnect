import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getIO } from '../../socket';
import {
  normalizeLanguage,
  resolveSupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../../utils/language';
import { latitudeSchema, longitudeSchema } from '../../utils/coordinate';

/**
 * The interface language shared between the website and the Android app.
 *
 * Regional (`kn-IN`) and alias (`kannada`) forms are accepted and stored as
 * the canonical code, while a genuinely unsupported language (`de`) is
 * rejected with HTTP 400 instead of silently becoming English.
 */
const preferredLanguageSchema = z
  .string()
  .trim()
  .min(1, 'Language code must not be empty')
  .refine(
    (value) => resolveSupportedLanguage(value) !== null,
    `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
  )
  .transform((value) => normalizeLanguage(value));

/**
 * A geographic coordinate that the account really shares.
 *
 * Three states have to stay distinguishable:
 *
 *   * **absent** (`undefined`) — the client did not mention the position, so
 *     the stored value is left untouched.
 *   * **`null`** — the client explicitly clears the position. The farm or
 *     the delivery address then simply has no coordinates.
 *   * **a number** — the real position.
 *
 * `z.coerce.number()` cannot express this: `Number(null)` is `0`, so a
 * cleared position would be stored as the point `0 / 0` in the Gulf of
 * Guinea.
 */
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  email: z.string().email('Invalid email address').optional(),
  // Interface language shared between the website and the Android app.
  preferredLanguage: preferredLanguageSchema.optional(),
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
  // The farm / delivery position — only stored when it is really shared.
  latitude: latitudeSchema,
  longitude: longitudeSchema,
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
        preferredLanguage: true,
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
    const nextLanguage = body.preferredLanguage
      ? normalizeLanguage(body.preferredLanguage)
      : undefined;

    // A position always consists of **both** coordinates. When one of them
    // is cleared, the other one is cleared as well — otherwise the account
    // would keep half of a position that does not exist any more.
    const positionCleared = body.latitude === null || body.longitude === null;
    const nextLatitude = positionCleared ? null : body.latitude;
    const nextLongitude = positionCleared ? null : body.longitude;

    const updatedUser = await db.$transaction(async (tx) => {
      // Step A: Update primary user fields
      const userUpdateData: any = {};
      if (body.name) userUpdateData.name = body.name.trim();
      if (body.phone) userUpdateData.phone = body.phone.replace(/\D/g, '').slice(-10);
      if (body.email) userUpdateData.email = body.email.trim().toLowerCase();
      if (nextLanguage) userUpdateData.preferredLanguage = nextLanguage;

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
        if (nextLatitude !== undefined) farmerData.latitude = nextLatitude;
        if (nextLongitude !== undefined) farmerData.longitude = nextLongitude;

        await tx.farmerProfile.upsert({
          where: { userId },
          create: {
            userId,
            farmName: body.farmName?.trim() || 'Cultivator Farm',
            district: body.district?.trim() || 'Mandya',
            state: body.state?.trim() || 'Karnataka',
            addressLine: (body.addressLine || body.address || '').trim(),
            // The position is stored only when it was really shared.
            latitude: nextLatitude !== undefined ? nextLatitude : null,
            longitude: nextLongitude !== undefined ? nextLongitude : null,
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
        // NOTE: the Prisma model exposes `deliveryAddress` (not `address`).
        if (resolvedAddress) consumerData.deliveryAddress = resolvedAddress;
        // The delivery position is stored only when it is really shared — a
        // placeholder would put the delivery somewhere the buyer never chose.
        if (nextLatitude !== undefined) consumerData.latitude = nextLatitude;
        if (nextLongitude !== undefined) consumerData.longitude = nextLongitude;

        await (tx as any).consumerProfile.upsert({
          where: { userId },
          create: {
            userId,
            district: body.district?.trim() || 'Bengaluru Urban',
            deliveryAddress: resolvedAddress || 'Karnataka',
            latitude: nextLatitude !== undefined ? nextLatitude : null,
            longitude: nextLongitude !== undefined ? nextLongitude : null,
          },
          update: consumerData,
        });
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
          preferredLanguage: true,
          createdAt: true,
          farmerProfile: true,
          consumerProfile: true,
        },
      });
    });

    // 4. Tell the other client (website <-> Android) about the new language
    //    straight away so both interfaces follow the account preference.
    if (nextLanguage) {
      try {
        const io = getIO();
        io?.to(`user_${userId}`).emit('language_preference_updated', {
          userId,
          preferredLanguage: nextLanguage,
        });
      } catch (socketError) {
        console.warn('[Language Preference] Socket broadcast failed:', socketError);
      }
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
      user: updatedUser,
      preferredLanguage: updatedUser?.preferredLanguage ?? nextLanguage ?? 'en',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update user profile',
    });
  }
};

// 3. Public farmer directory (used by the consumer map and farmer discovery)
export const listPublicFarmers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { district, search } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (district && district.trim()) {
      where.district = { contains: district.trim(), mode: 'insensitive' };
    }
    if (search && search.trim()) {
      where.OR = [
        { farmName: { contains: search.trim(), mode: 'insensitive' } },
        { district: { contains: search.trim(), mode: 'insensitive' } },
        { user: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const farmers = await db.farmerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        products: {
          where: { isAvailable: true },
          select: { id: true, title: true, farmerPrice: true, priceUnit: true, imageUrl: true, isOrganic: true },
        },
      },
      orderBy: { isVerified: 'desc' },
      take: 200,
    });

    const data = farmers.map((farmer: any) => ({
      id: farmer.id,
      farmName: farmer.farmName,
      farmerName: farmer.user?.name,
      phone: farmer.user?.phone,
      district: farmer.district,
      state: farmer.state,
      address: farmer.addressLine,
      latitude: farmer.latitude,
      longitude: farmer.longitude,
      isVerified: farmer.isVerified,
      profileViews: farmer.profileViews,
      availableProducts: farmer.products,
    }));

    return res.json({ success: true, data, farmers: data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
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
  listPublicFarmers,
};