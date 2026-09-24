import { Server } from 'socket.io';
import { AuthenticatedSocket } from './index';
import { db } from '../config/db';

export function registerSocketHandlers(io: Server, socket: AuthenticatedSocket) {
  const user = socket.data.user;

  // 1. Auto-join authenticated user's private notification channel
  if (user?.id) {
    socket.join(`user_${user.id}`);
  }

  // 2. Product live updates (public access)
  const handleJoinProduct = (productId: string) => {
    if (productId) socket.join(`product_${productId}`);
  };

  const handleLeaveProduct = (productId: string) => {
    if (productId) socket.leave(`product_${productId}`);
  };

  socket.on('join_product', handleJoinProduct);
  socket.on('join_product_room', handleJoinProduct);
  socket.on('leave_product', handleLeaveProduct);
  socket.on('leave_product_room', handleLeaveProduct);

  // 3. Enquiry / Negotiation Room (strictly authorized)
  const handleJoinEnquiry = async (enquiryId: string) => {
    if (!enquiryId) return;

    if (!user) {
      socket.emit('socket_error', { message: 'Authentication required to enter trade negotiation rooms' });
      return;
    }

    try {
      const enquiry = await db.enquiry.findUnique({
        where: { id: enquiryId },
        include: { farmer: { select: { userId: true } } },
      });

      if (!enquiry) {
        socket.emit('socket_error', { message: 'Inquiry thread not found' });
        return;
      }

      const isBuyer = enquiry.consumerId === user.id;
      const isSeller = enquiry.farmer.userId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isBuyer && !isSeller && !isAdmin) {
        socket.emit('socket_error', { message: 'Access denied: You are not a participant in this conversation' });
        return;
      }

      socket.join(`enquiry_${enquiryId}`);
      socket.emit('enquiry_room_joined', { enquiryId });
    } catch (err) {
      socket.emit('socket_error', { message: 'Failed to authorize negotiation room subscription' });
    }
  };

  const handleLeaveEnquiry = (enquiryId: string) => {
    if (enquiryId) socket.leave(`enquiry_${enquiryId}`);
  };

  socket.on('join_enquiry', handleJoinEnquiry);
  socket.on('join_enquiry_room', handleJoinEnquiry);
  socket.on('leave_enquiry', handleLeaveEnquiry);
  socket.on('leave_enquiry_room', handleLeaveEnquiry);

  // 4. Live typing indicators for negotiation rooms
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

  // 5. Cleanup on disconnect
  socket.on('disconnect', () => {
    // Rooms are automatically cleaned up by Socket.io
  });
}