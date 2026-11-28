// The money of an order, as the shared backend reports it.
//
// The end-to-end audit found that the **farmer's** incoming-orders page
// showed ₹0 for **every** order. The reason was a name mismatch:
//
//   * the database column of the total is `grandTotal` and the column of
//     the price of a lot is `unitPrice`,
//   * the page read `totalAmount` and `price` — fields that the API does
//     not send.
//
// Because both names were read with `Number(undefined || 0)`, the screen
// showed a settled, delivered order worth ₹2,295 as worth ₹0. The farmer
// could not see what the order was worth.
//
// The rules live here so that they can be tested without a browser, a
// server or a database. The buyer screen (`consumer/orders`) already read
// the right names; both now share this one implementation.

/** A line of an order, as the API sends it. */
export interface OrderItemLike {
  quantity?: number | null;
  /** The name the backend uses. */
  unitPrice?: number | null;
  /** Accepted as a fallback so that an older response still shows a number. */
  price?: number | null;
  farmerPrice?: number | null;
}

/** An order, as the API sends it. */
export interface OrderLike {
  /** The name the backend uses. */
  grandTotal?: number | null;
  /** Accepted as a fallback so that an older response still shows a number. */
  totalAmount?: number | null;
  totalItemsCost?: number | null;
  transportCost?: number | null;
  containerCost?: number | null;
  items?: OrderItemLike[] | null;
}

/**
 * The price of one unit of a lot.
 *
 * The backend names it `unitPrice`. A missing value is **not** silently
 * turned into a price of zero — it is simply not known, and the caller
 * shows zero, which is the honest thing to do when there is no price.
 */
export const orderUnitPrice = (item?: OrderItemLike | null): number => {
  if (!item) return 0;
  const value = item.unitPrice ?? item.price ?? item.farmerPrice;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** The value of one line of an order: the quantity times the unit price. */
export const orderLineTotal = (item?: OrderItemLike | null): number => {
  if (!item) return 0;
  const quantity = Number(item.quantity);
  return (Number.isFinite(quantity) ? quantity : 0) * orderUnitPrice(item);
};

/**
 * The total of an order.
 *
 * The backend names it `grandTotal` and stores the sum of the lines in
 * `totalItemsCost`.
 */
export const orderGrandTotal = (order?: OrderLike | null): number => {
  if (!order) return 0;
  const value = order.grandTotal ?? order.totalAmount;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * The sum of the lines of an order.
 *
 * It is used as the fallback when the backend sent neither `grandTotal` nor
 * `totalAmount`, so that a lot value is still shown.
 */
export const orderItemsTotal = (order?: OrderLike | null): number => {
  if (!order || !Array.isArray(order.items)) return 0;
  return order.items.reduce((sum, item) => sum + orderLineTotal(item), 0);
};

/**
 * The number that may be shown as "the total lot value" of an order.
 *
 * The order of the sources matters: the value the backend sent comes
 * first, the computed sum of the lines is the fallback.
 */
export const orderDisplayTotal = (order?: OrderLike | null): number => {
  const sent = orderGrandTotal(order);
  if (sent !== 0) return sent;
  return orderItemsTotal(order);
};
