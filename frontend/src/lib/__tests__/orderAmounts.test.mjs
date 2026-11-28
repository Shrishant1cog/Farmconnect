/**
 * Regression tests for the money of an order.
 *
 * The end-to-end audit found that the **farmer's** incoming-orders page
 * showed ₹0 for **every** order. The reason was a name mismatch:
 *
 *   * the database column of the total is `grandTotal` and the column of
 *     the price of a lot is `unitPrice`,
 *   * the page read `totalAmount` and `price` — fields that the API does
 *     not send.
 *
 * A settled, delivered order worth ₹2,295 was therefore shown to the
 * farmer as worth ₹0. The order itself was never wrong — only the reading
 * of it.
 *
 * These tests pin the names that the shared backend really uses, so that
 * the screen cannot silently go back to zero.
 *
 * Run with:
 *
 *     node --test frontend/src/lib/__tests__/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  orderDisplayTotal,
  orderGrandTotal,
  orderItemsTotal,
  orderLineTotal,
  orderUnitPrice,
} from '../orderAmounts.ts';

// ---------------------------------------------------------------------------
// The answer of the shared backend
// ---------------------------------------------------------------------------

/**
 * The real shape of an order as `GET /orders/farmer` sends it.
 *
 * It is taken from the Prisma model `Order` — `grandTotal`, `totalItemsCost`
 * — and from `OrderItem` — `unitPrice`.
 */
const realOrder = {
  id: 'cd36c79d-6c5d-42a7-bc54-0cdfc38b3383',
  status: 'DELIVERED',
  totalItemsCost: 2100,
  transportCost: 150,
  containerCost: 45,
  grandTotal: 2295,
  items: [
    {
      id: 'item-1',
      quantity: 50,
      unitPrice: 42,
      product: { id: 'p-1', title: 'Verification Mandya Ragi' },
    },
  ],
};

test('the unit price is read from the field the backend really sends', () => {
  assert.equal(orderUnitPrice({ unitPrice: 42 }), 42);
});

test('the unit price falls back to the older names', () => {
  assert.equal(orderUnitPrice({ price: 42 }), 42);
  assert.equal(orderUnitPrice({ farmerPrice: 42 }), 42);
});

test('the name the backend uses wins over the older ones', () => {
  assert.equal(orderUnitPrice({ unitPrice: 42, price: 999 }), 42);
});

test('a missing price is zero — and nothing else is invented', () => {
  assert.equal(orderUnitPrice({}), 0);
  assert.equal(orderUnitPrice(undefined), 0);
  assert.equal(orderUnitPrice({ unitPrice: null }), 0);
});

test('a price that is not a number is zero', () => {
  assert.equal(orderUnitPrice({ unitPrice: 'not-a-price' }), 0);
});

test('the line total is the quantity times the unit price', () => {
  assert.equal(orderLineTotal({ quantity: 50, unitPrice: 42 }), 2100);
});

test('the line total of a real order is not zero', () => {
  const line = realOrder.items[0];
  assert.equal(orderLineTotal(line), 2100);
  assert.notEqual(orderLineTotal(line), 0);
});

test('the total is read from grandTotal — the field the backend sends', () => {
  assert.equal(orderGrandTotal(realOrder), 2295);
});

test('the total falls back to the older name', () => {
  assert.equal(orderGrandTotal({ totalAmount: 2295 }), 2295);
});

test('a total that is only a totalAmount is still shown', () => {
  // This is the case that used to show ₹0: the page read `totalAmount`
  // first and the backend sent `grandTotal`.
  assert.notEqual(orderDisplayTotal({ totalAmount: 2295, items: [] }), 0);
});

test('the sum of the lines is the fallback when the backend sent no total', () => {
  assert.equal(orderItemsTotal(realOrder), 2100);
  assert.equal(orderDisplayTotal({ items: realOrder.items }), 2100);
});

test('a real order shows its real value', () => {
  assert.equal(orderDisplayTotal(realOrder), 2295);
  assert.notEqual(orderDisplayTotal(realOrder), 0);
});

test('an order without any money shows zero', () => {
  assert.equal(orderDisplayTotal({}), 0);
  assert.equal(orderDisplayTotal(null), 0);
  assert.equal(orderDisplayTotal({ grandTotal: 0, items: [] }), 0);
});
