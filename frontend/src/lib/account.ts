/**
 * Favourites and notifications — the pure part.
 *
 * The shared backend exposes three real endpoints for the signed-in
 * account:
 *
 *   * `GET  /api/favorites`            — the favourite lots and cultivators,
 *   * `POST /api/favorites/products/:id` / `POST /api/favorites/farmers/:id`
 *                                    — add or remove one favourite,
 *   * `GET  /api/notifications`        — the inbox of the account,
 *   * `PATCH /api/notifications/:id/read` and `PATCH /api/notifications/read-all`.
 *
 * The Android client uses all of them. The website used **none** of them:
 * a buyer could not keep a lot, could not follow a cultivator and could
 * not read the notices of the platform.
 *
 * The functions in this file only read the answer of the backend. They
 * never invent an entry: an answer that carries no list is an empty list,
 * and an answer that carries a list is returned as it is.
 */

/** The favourites of an account: the lots and the cultivators. */
export interface FavoritesPayload {
  products: any[];
  farmers: any[];
}

/**
 * Reads the favourites out of the answer of the backend.
 *
 * The backend answers with `{ success, data: { products, farmers }, products,
 * farmers }` — the list is present on two levels, so both are accepted.
 */
export function extractFavorites(payload: any): FavoritesPayload {
  const empty: FavoritesPayload = { products: [], farmers: [] };
  if (!payload || typeof payload !== 'object') {
    return empty;
  }

  const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;

  const products = Array.isArray(data.products)
    ? data.products
    : Array.isArray(payload.products)
      ? payload.products
      : [];

  const farmers = Array.isArray(data.farmers)
    ? data.farmers
    : Array.isArray(payload.farmers)
      ? payload.farmers
      : [];

  return { products, farmers };
}

/**
 * The id of the lot that a favourite entry carries.
 *
 * An entry looks like `{ id, consumerId, productId, product: { … } }`. The
 * `productId` is the identifier of the lot itself — the one the button on
 * the marketplace uses.
 */
export function favoriteProductId(entry: any): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const id = entry.productId || entry.product?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** The id of the cultivator that a favourite entry carries. */
export function favoriteFarmerId(entry: any): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const id = entry.farmerId || entry.farmer?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * The id of the cultivator **profile** of a favourite entry.
 *
 * The favourite of a cultivator is stored against the row of the profile
 * (`FarmerProfile`), while the marketplace knows the account of the
 * cultivator. The two ids are therefore not the same, and the button must
 * send the one the backend expects.
 */
export function favoriteFarmerProfileId(entry: any): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const id = entry.farmerId || entry.farmer?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** The notifications of the account. */
export function extractNotificationList(payload: any): any[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.notifications)) {
    return payload.notifications;
  }
  if (payload.data && Array.isArray(payload.data.notifications)) {
    return payload.data.notifications;
  }
  return [];
}

/**
 * The number of the notifications that were not read yet.
 *
 * The backend counts them itself. A missing count is **not** zero — it
 * means the platform did not say how many there are, and the interface
 * then shows no badge rather than a wrong one.
 */
export function extractUnreadCount(payload: any): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const raw = payload.unreadCount ?? payload.data?.unreadCount;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return null;
}
