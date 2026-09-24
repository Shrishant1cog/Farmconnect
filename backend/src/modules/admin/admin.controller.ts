import { Response } from 'express';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

const resolveComplaintSchema = z.object({
  adminNotes: z.string().min(3, 'Resolution notes are required'),
  status: z.enum(['RESOLVED', 'DISMISSED']).default('RESOLVED'),
});

// 1. Get Platform Analytics Overview
export const getPlatformMetrics = async (_req: AuthenticatedRequest, res: Response) => {
  const [
    totalUsers,
    totalFarmers,
    totalConsumers,
    totalProducts,
    activeOrders,
    pendingComplaints,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: 'FARMER' } }),
    db.user.count({ where: { role: 'CONSUMER' } }),
    db.product.count({ where: { isAvailable: true } }),
    db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'DISPATCHED'] } } }),
    db.complaint.count({ where: { status: 'PENDING' } }),
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
};

// 2. User Moderation: List All Users
export const listAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { role, search } = req.query;

  const whereClause: any = {};
  if (role) whereClause.role = String(role);
  if (search) {
    whereClause.OR = [
      { name: { contains: String(search) } },
      { email: { contains: String(search) } },
      { phone: { contains: String(search) } },
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
      farmerProfile: { select: { farmName: true, isVerified: true, district: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ success: true, data: users });
};

// 3. User Moderation: Toggle Active / Suspended State
export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Prevent admin self-suspension
  if (req.user?.id === id) {
    return res.status(400).json({ success: false, message: 'Admins cannot suspend their own account.' });
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const updated = await db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });

  return res.json({
    success: true,
    message: `Account has been ${updated.isActive ? 'reactivated' : 'suspended'}.`,
    data: updated,
  });
};

// 4. Complaints & Dispute Resolution: List
export const listComplaints = async (_req: AuthenticatedRequest, res: Response) => {
  const complaints = await db.complaint.findMany({
    include: {
      reporter: { select: { id: true, name: true, role: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ success: true, data: complaints });
};

// 5. Complaints & Dispute Resolution: Resolve
export const resolveComplaint = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { adminNotes, status } = resolveComplaintSchema.parse(req.body);

  const complaint = await db.complaint.findUnique({ where: { id } });
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint record not found' });
  }

  const updated = await db.complaint.update({
    where: { id },
    data: { status, adminNotes },
  });

  return res.json({ success: true, data: updated });
};