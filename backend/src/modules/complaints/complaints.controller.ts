import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const createComplaintSchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().min(1, 'Entity reference is required'),
  reason: z.string().min(3, 'A short reason is required'),
  details: z.string().min(5, 'Please describe the issue in a little more detail'),
});

const getUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.user?.userId || (req as any).userId || null;
};

// 1. Raise a complaint against an order, product, farmer or enquiry
export const createComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const body = createComplaintSchema.parse(req.body);

    const complaint = await db.complaint.create({
      data: {
        reporterId: userId,
        entityType: body.entityType.trim(),
        entityId: body.entityId.trim(),
        reason: body.reason.trim(),
        details: body.details.trim(),
        status: 'PENDING',
      },
    });

    // Notify administrators that a new dispute was raised
    try {
      const admins = await db.user.findMany({ where: { role: 'ADMIN', isActive: true } });
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map((admin: any) => ({
            userId: admin.id,
            title: 'New Complaint Raised',
            message: `${body.reason.trim()} (${body.entityType.trim()})`,
            type: 'COMPLAINT_RAISED',
            link: `/admin/dashboard?tab=complaints`,
          })),
        });
      }
    } catch {
      // Notification fan-out is best effort
    }

    return res.status(201).json({ success: true, data: complaint, complaint });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Could not register the complaint',
    });
  }
};

// 2. Complaints raised by the signed-in user
export const getMyComplaints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const complaints = await db.complaint.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: complaints, complaints });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  createComplaint,
  getMyComplaints,
};
