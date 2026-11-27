// Persistent notifications for the shared inbox.
//
// The Socket.IO broadcast is the *instant* delivery of an event; the row
// written here is the durable inbox entry that both clients list in their
// notification screen. Before this helper existed the `Notification` table
// was only filled for administrators, so the notification inbox of a farmer
// or a consumer was always empty even though orders and enquiries really
// happened.
//
// Writing the row is best effort: a failure must never break the request
// that triggered the event.

import { db } from '../config/db';

export interface NotificationInput {
  /** The account that receives the notification (`User.id`). */
  userId: string;
  title: string;
  message: string;
  /** A stable machine readable type, e.g. `NEW_ORDER`. */
  type: string;
  /** An in-app route the client can open, e.g. `/farmer/orders`. */
  link?: string;
}

export async function createNotification(input: NotificationInput): Promise<string | null> {
  if (!input?.userId) return null;

  try {
    const notification = await db.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        link: input.link ?? null,
      },
    });
    return notification.id;
  } catch (error: any) {
    console.warn('[Notification] Could not store the notification:', error?.message || error);
    return null;
  }
}

/**
 * Resolves the `User.id` of the farmer who owns a `FarmerProfile`.
 *
 * `Order.farmerId` and `Enquiry.farmerId` reference `FarmerProfile.id`, but
 * notifications and Socket.IO rooms are keyed by the authenticated **user**
 * (`user_<User.id>`).
 */
export async function resolveFarmerUserId(farmerProfileId: string): Promise<string | null> {
  if (!farmerProfileId) return null;

  try {
    const profile = await db.farmerProfile.findUnique({
      where: { id: farmerProfileId },
      select: { userId: true },
    });
    return profile?.userId || null;
  } catch {
    return null;
  }
}
