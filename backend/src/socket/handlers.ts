import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index';
import { db } from '../config/db';

export function registerSocketHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data?.user;

  // 1. Auto-join authenticated user's private notification channel
  if (user?.id) {
    socket.join(`user_${user.id}`);
  }

  // 2. Product live updates & inventory changes (public/guest access)
  const handleJoinProduct = (data: any) => {
    const productId = typeof data === 'string' ? data : data?.productId;
    if (productId) {
      socket.join(`product_${productId}`);
    }
  };

  const handleLeaveProduct = (data: any) => {
    const productId = typeof data === 'string' ? data : data?.productId;
    if (productId) {
      socket.leave(`product_${productId}`);
    }
  };

  socket.on('join_product', handleJoinProduct);
  socket.on('join_product_room', handleJoinProduct);
  socket.on('leave_product', handleLeaveProduct);
  socket.on('leave_product_room', handleLeaveProduct);

  // 3. Order status updates & live dispatch tracker
  const handleJoinOrder = async (data: any) => {
    const orderId = typeof data === 'string' ? data : data?.orderId;
    if (!orderId) return;

    if (!user) {
      socket.emit('socket_error', { message: 'Authentication required to track orders' });
      return;
    }

    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { consumerId: true, farmerId: true },
      });

      if (!order) {
        socket.emit('socket_error', { message: 'Order record not found' });
        return;
      }

      // Verify participant access
      let isFarmer = order.farmerId === user.id;
      if (!isFarmer) {
        const farmerProfile = await db.farmerProfile.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        if (farmerProfile && order.farmerId === farmerProfile.id) {
          isFarmer = true;
        }
      }

      const isConsumer = order.consumerId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isConsumer && !isFarmer && !isAdmin) {
        socket.emit('socket_error', { message: 'Access denied: Not authorized to track this order' });
        return;
      }

      socket.join(`order_${orderId}`);
      socket.emit('order_room_joined', { orderId });
    } catch {
      socket.emit('socket_error', { message: 'Failed to subscribe to order updates' });
    }
  };

  const handleLeaveOrder = (data: any) => {
    const orderId = typeof data === 'string' ? data : data?.orderId;
    if (orderId) {
      socket.leave(`order_${orderId}`);
    }
  };

  socket.on('join_order', handleJoinOrder);
  socket.on('join_order_room', handleJoinOrder);
  socket.on('leave_order', handleLeaveOrder);
  socket.on('leave_order_room', handleLeaveOrder);

  // 4. Enquiry / Negotiation Room (strictly authorized)
  const handleJoinEnquiry = async (data: any) => {
    const enquiryId = typeof data === 'string' ? data : data?.enquiryId;
    if (!enquiryId) return;

    if (!user) {
      socket.emit('socket_error', { message: 'Authentication required to enter trade negotiation rooms' });
      return;
    }

    try {
      const enquiry = await db.enquiry.findUnique({
        where: { id: enquiryId },
        include: { farmer: { select: { id: true, userId: true } } },
      });

      if (!enquiry) {
        socket.emit('socket_error', { message: 'Inquiry thread not found' });
        return;
      }

      const isBuyer = enquiry.consumerId === user.id;
      const isSeller =
        enquiry.farmer?.userId === user.id ||
        enquiry.farmer?.id === user.id ||
        enquiry.farmerId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isBuyer && !isSeller && !isAdmin) {
        socket.emit('socket_error', { message: 'Access denied: You are not a participant in this conversation' });
        return;
      }

      socket.join(`enquiry_${enquiryId}`);
      socket.emit('enquiry_room_joined', { enquiryId });
    } catch {
      socket.emit('socket_error', { message: 'Failed to authorize negotiation room subscription' });
    }
  };

  const handleLeaveEnquiry = (data: any) => {
    const enquiryId = typeof data === 'string' ? data : data?.enquiryId;
    if (enquiryId) {
      socket.leave(`enquiry_${enquiryId}`);
    }
  };

  socket.on('join_enquiry', handleJoinEnquiry);
  socket.on('join_enquiry_room', handleJoinEnquiry);
  socket.on('leave_enquiry', handleLeaveEnquiry);
  socket.on('leave_enquiry_room', handleLeaveEnquiry);

  // 5. Live typing indicators for negotiation rooms
  socket.on('typing_start', (data: { enquiryId: string }) => {
    if (user && data?.enquiryId) {
      socket.to(`enquiry_${data.enquiryId}`).emit('user_typing', {
        userId: user.id,
        role: user.role,
      });
    }
  });

  socket.on('typing_stop', (data: { enquiryId: string }) => {
    if (user && data?.enquiryId) {
      socket.to(`enquiry_${data.enquiryId}`).emit('user_stopped_typing', {
        userId: user.id,
      });
    }
  });

  // 6. Socket disconnect
  socket.on('disconnect', () => {
    // Rooms are automatically cleaned up by Socket.io
  });
}

export default registerSocketHandlers;