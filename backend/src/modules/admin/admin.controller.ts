import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const resolveComplaintSchema = z.object({
  adminNotes: z.string().min(3, 'Resolution notes are required'),
  status: z.enum(['RESOLVED', 'DISMISSED']).default('RESOLVED'),
});

// Helper to safely extract requesting admin ID
const getAdminId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.user?.userId || (req as any).userId || null;
};

// 1. Get Platform Analytics Overview
export const getPlatformMetrics = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalConsumers,
      totalProducts,
      activeOrders,
      pendingComplaints,
    ] = await Promise.all([
      db.user.count().catch(() => 0),
      db.user.count({ where: { role: 'FARMER' as any } }).catch(() => 0),
      db.user.count({ where: { role: 'CONSUMER' as any } }).catch(() => 0),
      db.product.count({ where: { isAvailable: true } }).catch(() => 0),
      db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'DISPATCHED'] as any } } }).catch(() => 0),
      (db as any).complaint ? (db as any).complaint.count({ where: { status: 'PENDING' } }).catch(() => 0) : 0,
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalFarmers,
        totalConsumers,
        activeProducts: totalProducts,
        activeOrders,
        pendingComplaints,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform metrics',
      error: err.message,
    });
  }
};

// 2. User Moderation: List All Users
export const listAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search } = req.query;

    const whereClause: any = {};
    if (role && typeof role === 'string') {
      whereClause.role = role.toUpperCase();
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        farmerProfile: {
          select: {
            farmName: true,
            isVerified: true,
            district: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: users, users });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: err.message,
    });
  }
};

// 3. User Moderation: Toggle Active / Suspended State
export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = getAdminId(req);

    // Prevent admin self-suspension
    if (adminId && adminId === id) {
      return res.status(400).json({
        success: false,
        message: 'Admins cannot suspend their own account.',
      });
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updated = await db.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: `Account has been ${updated.isActive ? 'reactivated' : 'suspended'}.`,
      data: updated,
      user: updated,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: err.message,
    });
  }
};

// 4. Complaints & Dispute Resolution: List
export const listComplaints = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(db as any).complaint) {
      return res.json({ success: true, data: [], complaints: [] });
    }

    const complaints = await (db as any).complaint.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: complaints, complaints });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints',
      error: err.message,
    });
  }
};

// 5. Complaints & Dispute Resolution: Resolve
export const resolveComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes, status } = resolveComplaintSchema.parse(req.body);

    if (!(db as any).complaint) {
      return res.status(404).json({ success: false, message: 'Complaint service unavailable' });
    }

    const complaint = await (db as any).complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found' });
    }

    const updated = await (db as any).complaint.update({
      where: { id },
      data: { status, adminNotes },
    });

    return res.json({ success: true, data: updated, complaint: updated });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update complaint resolution',
    });
  }
};

// Compatibility aliases
export const getMetrics = getPlatformMetrics;
export const getUsers = listAllUsers;
export const updateUserStatus = toggleUserStatus;

export default {
  getPlatformMetrics,
  getMetrics,
  listAllUsers,
  getUsers,
  toggleUserStatus,
  updateUserStatus,
  listComplaints,
  resolveComplaint,
};