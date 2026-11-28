/**
 * Regression tests for the favourites and the notifications of the website.
 *
 * The shared backend exposes real endpoints for both, and the Android
 * client uses them. The website used none of them — a buyer could not
 * keep a lot, could not follow a cultivator and could not read the
 * notices of the platform.
 *
 * The functions under test only read the answer of the backend. They
 * must never invent an entry and must never turn an answer they do not
 * understand into a wrong number.
 *
 * Run with:
 *
 *     node --test frontend/src/lib/__tests__/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractFavorites,
  extractNotificationList,
  extractUnreadCount,
  favoriteFarmerId,
  favoriteFarmerProfileId,
  favoriteProductId,
} from '../account.ts';

test('FAVOURITES: the products and the farmers are read from the answer', () => {
  const answer = {
    success: true,
    data: {
      products: [{ id: 'f1', consumerId: 'c1', productId: 'p1', product: { id: 'p1' } }],
      farmers: [{ id: 'f2', consumerId: 'c1', farmerId: 'fa1', farmer: { id: 'fa1' } }],
    },
    products: [{ id: 'f1', consumerId: 'c1', productId: 'p1', product: { id: 'p1' } }],
    farmers: [{ id: 'f2', consumerId: 'c1', farmerId: 'fa1', farmer: { id: 'fa1' } }],
  };

  const favourites = extractFavorites(answer);
  assert.equal(favourites.products.length, 1);
  assert.equal(favourites.farmers.length, 1);
  assert.equal(favoriteProductId(favourites.products[0]), 'p1');
  assert.equal(favoriteFarmerId(favourites.farmers[0]), 'fa1');
  assert.equal(favoriteFarmerProfileId(favourites.farmers[0]), 'fa1');
});

test('FAVOURITES: an answer without a list is an empty list', () => {
  assert.deepEqual(extractFavorites({ success: true, data: {} }), {
    products: [],
    farmers: [],
  });
  assert.deepEqual(extractFavorites(null), { products: [], farmers: [] });
  assert.deepEqual(extractFavorites('nonsense'), { products: [], farmers: [] });
});

test('FAVOURITES: a broken entry never invents an identifier', () => {
  assert.equal(favoriteProductId(null), null);
  assert.equal(favoriteProductId({}), null);
  assert.equal(favoriteProductId({ productId: '' }), null);
  assert.equal(favoriteProductId({ productId: 42 }), null);
  assert.equal(favoriteFarmerId({}), null);
  assert.equal(favoriteFarmerProfileId(undefined), null);
});

test('FAVOURITES: the entry may carry the lot inside the row', () => {
  const favourites = extractFavorites({
    data: { products: [{ id: 'f1', product: { id: 'p9', title: 'Lot' } }] },
  });
  assert.equal(favoriteProductId(favourites.products[0]), 'p9');
});

test('NOTIFICATIONS: the inbox is read from the answer', () => {
  const answer = {
    success: true,
    data: [{ id: 'n1', title: 'New order', isRead: false }],
    notifications: [{ id: 'n1', title: 'New order', isRead: false }],
    unreadCount: 3,
  };
  const list = extractNotificationList(answer);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'n1');
  assert.equal(extractUnreadCount(answer), 3);
});

test('NOTIFICATIONS: an answer without a list is an empty inbox', () => {
  assert.deepEqual(extractNotificationList({ success: true, data: [] }), []);
  assert.deepEqual(extractNotificationList(null), []);
  assert.deepEqual(extractNotificationList({ success: false }), []);
});

test('NOTIFICATIONS: a missing count is not zero', () => {
  // The platform did not say how many there are — the interface then shows
  // no badge instead of a wrong one.
  assert.equal(extractUnreadCount({ success: true, data: [] }), null);
  assert.equal(extractUnreadCount(null), null);
  assert.equal(extractUnreadCount({ unreadCount: 'many' }), null);
  assert.equal(extractUnreadCount({ unreadCount: -2 }), null);
});

test('NOTIFICATIONS: a count of zero is a count of zero', () => {
  assert.equal(extractUnreadCount({ unreadCount: 0 }), 0);
  assert.equal(extractUnreadCount({ data: { unreadCount: 0 } }), 0);
});
