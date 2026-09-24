import { Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getIO } from '../../socket';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().nonnegative().optional(),
  price: z.coerce.number().nonnegative().optional(),
});

const createOrderSchema = z.object({
  farmerId: z.string().optional(),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  transportCost: z.coerce.number().nonnegative().optional().default(0),
  containerCost: z.coerce.number().nonnegative().optional().default(0),
  totalAmount: z.coerce.number().nonnegative().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one harvest item is required'),
});

// 1. Consumer: Place Order (Atomic inventory deduction with farmer fallback resolution)
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to place orders' });
    }

    const order = await db.$transaction(async (tx) => {
      // Step A: Validate harvest items & stock availability
      const validatedItems: { productId: string; quantity: number; unitPrice: number; farmerId?: string }[] = [];

      for (const item of body.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod || !prod.isAvailable) {
          throw new Error(`Produce lot "${item.productId}" is not currently available.`);
        }
        if (prod.quantityAvailable < item.quantity) {
          throw new Error(`Insufficient stock for "${prod.title}". In-stock: ${prod.quantityAvailable} kg, Requested: ${item.quantity} kg.`);
        }

        const resolvedPrice = Number(item.unitPrice ?? item.price ?? prod.farmerPrice ?? 0);

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: resolvedPrice,
          farmerId: prod.farmerId || undefined,
        });

        // Deduct inventory atomically
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantityAvailable: prod.quantityAvailable - item.quantity,
            isAvailable: prod.quantityAvailable - item.quantity > 0,
          },
        });
      }

      // Step B: Resolve target farmerProfile ID (handles farmerProfile ID, userId, or product-derived ID)
      let resolvedFarmerId = body.farmerId;

      if (resolvedFarmerId) {
        const profileById = await tx.farmerProfile.findUnique({ where: { id: resolvedFarmerId } });
        if (!profileById) {
          const profileByUserId = await tx.farmerProfile.findUnique({ where: { userId: resolvedFarmerId } });
          if (profileByUserId) {
            resolvedFarmerId = profileByUserId.id;
          }
        }
      }

      if (!resolvedFarmerId && validatedItems[0]?.farmerId) {
        resolvedFarmerId = validatedItems[0].farmerId;
      }

      if (!resolvedFarmerId) {
        const fallbackProfile = await tx.farmerProfile.findFirst();
        if (fallbackProfile) {
          resolvedFarmerId = fallbackProfile.id;
        } else {
          throw new Error('No registered cultivator could be linked to this order.');
        }
      }

      // Step C: Calculate totals
      const totalItemsCost = validatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const transportCost = Number(body.transportCost) || 0;
      const containerCost = Number(body.containerCost) || 0;
      const grandTotal = body.totalAmount ? Number(body.totalAmount) : totalItemsCost + transportCost + containerCost;

      return await tx.order.create({
        data: {
          consumerId: userId,
          farmerId: resolvedFarmerId,
          deliveryAddress: body.deliveryAddress,
          transportCost,
          containerCost,
          totalItemsCost,
          grandTotal,
          status: 'PENDING',
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          farmer: { include: { user: { select: { name: true, phone: true } } } },
        },
      });
    });

    // Notify farmer via real-time WebSocket room
    try {
      const io = typeof getIO === 'function' ? getIO() : null;
      if (io && order.farmerId) {
        io.to(`user_${order.farmerId}`).emit('new_order_received', {
          orderId: order.id,
          totalAmount: order.grandTotal,
        });
      }
    } catch {
      // Safe fallback if socket is unmounted
    }

    return res.status(201).json({
      success: true,
      data: order,
      order,
      id: order.id,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Order could not be placed',
    });
  }
};

// 2. Consumer: Get My Orders
export const getMyOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const orders = await db.order.findMany({
      where: { consumerId: userId },
      include: {
        farmer: {
          include: { user: { select: { name: true, phone: true } } },
        },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders, orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Farmer: Get Incoming Farm Orders
export const getFarmerOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let farmer = await db.farmerProfile.findUnique({ where: { userId } });
    if (!farmer) {
      farmer = await db.farmerProfile.findUnique({ where: { id: userId } });
    }

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer profile not found for this account' });
    }

    const orders = await db.order.findMany({
      where: { farmerId: farmer.id },
      include: {
        consumer: { select: { id: true, name: true, phone: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders, orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Farmer / Admin: Get Specific Order Details
export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        farmer: { include: { user: { select: { name: true, phone: true } } } },
        consumer: { select: { id: true, name: true, phone: true, email: true } },
        items: { include: { product: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    let farmer = await db.farmerProfile.findUnique({ where: { userId } });
    const isOwner = order.consumerId === userId || (farmer && order.farmerId === farmer.id) || req.user?.role === 'ADMIN';

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied to this order record' });
    }

    return res.json({ success: true, data: order, order });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Farmer: Update Logistics / Packing Status
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id || req.user?.userId;

    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let farmer = await db.farmerProfile.findUnique({ where: { userId } });
    if (!farmer) {
      farmer = await db.farmerProfile.findUnique({ where: { id: userId } });
    }

    if (farmer && order.farmerId !== farmer.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the cultivator for this lot' });
    }

    let prismaStatus = String(status || '').toUpperCase();
    if (prismaStatus === 'PACKED') prismaStatus = 'CONFIRMED';
    if (prismaStatus === 'IN_TRANSIT') prismaStatus = 'DISPATCHED';

    const updatedOrder = await db.order.update({
      where: { id },
      data: { status: prismaStatus as any },
      include: {
        items: { include: { product: true } },
        consumer: { select: { id: true, name: true } },
      },
    });

    // Notify consumer about dispatch status changes
    try {
      const io = typeof getIO === 'function' ? getIO() : null;
      if (io && order.consumerId) {
        io.to(`user_${order.consumerId}`).emit('order_status_updated', {
          orderId: order.id,
          status: prismaStatus,
        });
      }
    } catch {
      // Safe fallback
    }

    return res.json({ success: true, data: updatedOrder, order: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Consumer: Confirm Receipt & Release Delivery
export const confirmOrderDelivery = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const order = await db.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.consumerId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized to verify delivery for this order' });
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: { status: 'DELIVERED' },
      include: {
        items: { include: { product: true } },
      },
    });

    // Notify cultivator that payment can be settled
    try {
      const io = typeof getIO === 'function' ? getIO() : null;
      if (io && order.farmerId) {
        io.to(`user_${order.farmerId}`).emit('order_delivered', { orderId: order.id });
      }
    } catch {
      // Safe fallback
    }

    return res.json({ success: true, data: updatedOrder, order: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Compatibility Aliases
export const confirmOrderReceived = confirmOrderDelivery;
export const placeOrder = createOrder;

export default {
  createOrder,
  getMyOrders,
  getFarmerOrders,
  getOrderById,
  updateOrderStatus,
  confirmOrderDelivery,
  confirmOrderReceived,
  placeOrder,
};