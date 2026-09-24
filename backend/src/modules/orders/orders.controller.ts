import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getIO } from '../../socket';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
});

const createOrderSchema = z.object({
  farmerId: z.string().min(1, 'Target farm is required'),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  transportCost: z.number().nonnegative(),
  containerCost: z.number().nonnegative(),
  items: z.array(orderItemSchema).min(1, 'At least one harvest item is required'),
});

// 1. Consumer: Place Order (Atomic inventory deduction)
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = createOrderSchema.parse(req.body);

    const totalItemsCost = body.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const grandTotal = totalItemsCost + body.transportCost + body.containerCost;

    const order = await db.$transaction(async (tx) => {
      for (const item of body.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod || !prod.isAvailable) {
          throw new Error(`Produce ${item.productId} is not currently available.`);
        }
        if (prod.quantityAvailable < item.quantity) {
          throw new Error(`Insufficient harvest stock for ${prod.title}. Available: ${prod.quantityAvailable}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { quantityAvailable: prod.quantityAvailable - item.quantity },
        });
      }

      return await tx.order.create({
        data: {
          consumerId: req.user!.id,
          farmerId: body.farmerId,
          deliveryAddress: body.deliveryAddress,
          transportCost: body.transportCost,
          containerCost: body.containerCost,
          totalItemsCost,
          grandTotal,
          status: 'PENDING',
          items: {
            create: body.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });
    });

    const io = getIO();
    if (io) io.to(`user_${body.farmerId}`).emit('new_order_received', { orderId: order.id });

    return res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Order could not be placed' });
  }
};

// 2. Consumer: Get My Orders
export const getMyOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.order.findMany({
      where: { consumerId: req.user!.id },
      include: {
        farmer: {
          include: { user: { select: { name: true, phone: true } } },
        },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Farmer: Get Incoming Farm Orders
export const getFarmerOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer profile not found' });

    const orders = await db.order.findMany({
      where: { farmerId: farmer.id },
      include: {
        consumer: { select: { id: true, name: true, phone: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Farmer: Update Logistics / Packing Status
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const farmer = await db.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer profile not found' });

    const order = await db.order.findUnique({ where: { id } });
    if (!order || order.farmerId !== farmer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this order' });
    }

    let prismaStatus = status;
    if (status === 'PACKED') prismaStatus = 'CONFIRMED';
    if (status === 'IN_TRANSIT') prismaStatus = 'DISPATCHED';

    const updatedOrder = await db.order.update({
      where: { id },
      data: { status: prismaStatus },
    });

    return res.json({ success: true, data: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Consumer: Confirm Receipt & Release Delivery
export const confirmOrderDelivery = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.consumerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to verify this order' });
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: { status: 'DELIVERED' },
    });

    return res.json({ success: true, data: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};