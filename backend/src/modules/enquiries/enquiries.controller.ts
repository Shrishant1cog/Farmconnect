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

// 1. Consumer initiates an inquiry on a harvest listing
export const createEnquiry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = createEnquirySchema.parse(req.body);

    const product = await db.product.findUnique({ where: { id: body.productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const enquiry = await db.enquiry.create({
      data: {
        productId: product.id,
        consumerId: req.user!.id,
        farmerId: product.farmerId,
        subject: body.subject,
        messages: {
          create: [{ senderId: req.user!.id, content: body.message }],
        },
      },
      include: { messages: true },
    });

    const io = getIO();
    if (io) {
      io.emit('new_notification', { message: `New inquiry received for ${product.title}` });
    }

    return res.status(201).json({ success: true, data: enquiry });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Could not create enquiry' });
  }
};

// 2. Consumer: Get all my negotiations
export const getConsumerEnquiries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enquiries = await db.enquiry.findMany({
      where: { consumerId: req.user!.id },
      include: {
        product: { select: { title: true, imageUrl: true } },
        farmer: { include: { user: { select: { name: true, phone: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: enquiries });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Farmer: Get all incoming buyer negotiations
export const getFarmerEnquiries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer profile not found' });

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

    return res.json({ success: true, data: enquiries });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Fetch thread message history with strict participant authorization
export const getEnquiryMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enquiryId = req.params.id;
    const enquiry = await db.enquiry.findUnique({
      where: { id: enquiryId },
      include: {
        product: { select: { title: true } },
        farmer: { select: { userId: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { name: true, role: true } } },
        },
      },
    });

    if (!enquiry) return res.status(404).json({ success: false, message: 'Chat thread not found' });

    const isConsumer = enquiry.consumerId === req.user!.id;
    const isFarmer = enquiry.farmer.userId === req.user!.id;
    if (!isConsumer && !isFarmer && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied to this negotiation thread' });
    }

    return res.json({
      success: true,
      data: {
        subject: enquiry.subject,
        product: enquiry.product,
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
    const body = sendMessageSchema.parse(req.body);

    const enquiry = await db.enquiry.findUnique({
      where: { id: enquiryId },
      include: { farmer: { select: { userId: true } } },
    });
    if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });

    const isConsumer = req.user!.id === enquiry.consumerId;
    const isFarmer = req.user!.id === enquiry.farmer.userId;
    if (!isConsumer && !isFarmer && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation' });
    }

    const message = await db.message.create({
      data: {
        enquiryId,
        senderId: req.user!.id,
        content: body.content,
      },
      include: { sender: { select: { name: true, role: true } } },
    });

    const io = getIO();
    if (io) io.to(`enquiry_${enquiryId}`).emit('new_chat_message', message);

    return res.status(201).json({ success: true, data: message });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Could not send message' });
  }
};