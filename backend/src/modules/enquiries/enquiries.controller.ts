import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getIO } from '../../socket';

const createEnquirySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Initial message is required'),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

// Helper to safely extract user ID
const getUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.user?.userId || (req as any).userId || null;
};

// 1. Consumer initiates an inquiry on a harvest listing
export const createEnquiry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const body = createEnquirySchema.parse(req.body);

    const product = await db.product.findUnique({
      where: { id: body.productId },
      include: { farmer: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Resolve farmer profile ID
    let resolvedFarmerId = product.farmerId;
    if (product.farmerId) {
      const profile = await db.farmerProfile.findFirst({
        where: { OR: [{ id: product.farmerId }, { userId: product.farmerId }] },
      });
      if (profile) {
        resolvedFarmerId = profile.id;
      }
    }

    if (!resolvedFarmerId) {
      return res.status(400).json({
        success: false,
        message: 'Could not resolve the cultivating farmer for this produce listing.',
      });
    }

    const enquiry = await db.enquiry.create({
      data: {
        productId: product.id,
        consumerId: userId,
        farmerId: resolvedFarmerId,
        subject: body.subject.trim(),
        messages: {
          create: [{ senderId: userId, content: body.message.trim() }],
        },
      },
      include: {
        messages: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
        product: { select: { id: true, title: true, imageUrl: true, farmerPrice: true } },
        farmer: { include: { user: { select: { id: true, name: true, phone: true } } } },
      },
    });

    // Notify farmer via real-time WebSocket
    try {
      const io = typeof getIO === 'function' ? getIO() : null;
      if (io) {
        const targetUserId = enquiry.farmer?.userId || product.farmerId;
        if (targetUserId) {
          io.to(`user_${targetUserId}`).emit('new_notification', {
            type: 'NEW_ENQUIRY',
            enquiryId: enquiry.id,
            message: `New inquiry received for ${product.title}: "${body.subject}"`,
          });
        }
      }
    } catch {
      // Safe fallback if socket is unmounted
    }

    return res.status(201).json({ success: true, data: enquiry, enquiry });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Could not create enquiry' });
  }
};

// 2. Consumer: Get all my negotiations / inquiries
export const getConsumerEnquiries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const enquiries = await db.enquiry.findMany({
      where: { consumerId: userId },
      include: {
        product: { select: { id: true, title: true, imageUrl: true, farmerPrice: true, priceUnit: true } },
        farmer: { include: { user: { select: { id: true, name: true, phone: true } } } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: enquiries, enquiries });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Farmer: Get all incoming buyer negotiations
export const getFarmerEnquiries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let farmer = await db.farmerProfile.findUnique({ where: { userId } });
    if (!farmer) {
      farmer = await db.farmerProfile.findUnique({ where: { id: userId } });
    }

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found' });
    }

    const enquiries = await db.enquiry.findMany({
      where: { farmerId: farmer.id },
      include: {
        consumer: { select: { id: true, name: true, phone: true, email: true } },
        product: { select: { id: true, title: true, farmerPrice: true, priceUnit: true, imageUrl: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: enquiries, enquiries });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Fetch thread message history with participant authorization
export const getEnquiryMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enquiryId = req.params.id;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const enquiry = await db.enquiry.findUnique({
      where: { id: enquiryId },
      include: {
        product: { select: { id: true, title: true, farmerPrice: true, priceUnit: true, imageUrl: true } },
        farmer: { select: { id: true, userId: true, farmName: true, user: { select: { name: true, phone: true } } } },
        consumer: { select: { id: true, name: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Chat thread not found' });
    }

    const isConsumer = enquiry.consumerId === userId;
    const isFarmer = enquiry.farmer?.userId === userId || enquiry.farmerId === userId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isConsumer && !isFarmer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to this negotiation thread' });
    }

    return res.json({
      success: true,
      data: {
        id: enquiry.id,
        subject: enquiry.subject,
        product: enquiry.product,
        farmer: enquiry.farmer,
        consumer: enquiry.consumer,
        messages: enquiry.messages,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Send message & broadcast live via Socket.io
export const sendEnquiryMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enquiryId = req.params.id;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const body = sendMessageSchema.parse(req.body);

    const enquiry = await db.enquiry.findUnique({
      where: { id: enquiryId },
      include: { farmer: { select: { id: true, userId: true } } },
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const isConsumer = userId === enquiry.consumerId;
    const isFarmer = userId === enquiry.farmer?.userId || userId === enquiry.farmerId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isConsumer && !isFarmer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation' });
    }

    const [message] = await db.$transaction([
      db.message.create({
        data: {
          enquiryId,
          senderId: userId,
          content: body.content.trim(),
        },
        include: { sender: { select: { id: true, name: true, role: true } } },
      }),
      db.enquiry.update({
        where: { id: enquiryId },
        data: { updatedAt: new Date() },
      }),
    ]);

    // Broadcast message via Socket room
    try {
      const io = typeof getIO === 'function' ? getIO() : null;
      if (io) {
        io.to(`enquiry_${enquiryId}`).emit('new_chat_message', message);
      }
    } catch {
      // Safe fallback
    }

    return res.status(201).json({ success: true, data: message, message });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Could not send message' });
  }
};

// Aliases for compatibility
export const getMyEnquiries = getConsumerEnquiries;
export const getEnquiryById = getEnquiryMessages;
export const sendMessage = sendEnquiryMessage;

export default {
  createEnquiry,
  getConsumerEnquiries,
  getMyEnquiries,
  getFarmerEnquiries,
  getEnquiryMessages,
  getEnquiryById,
  sendEnquiryMessage,
  sendMessage,
};