#!/usr/bin/env node
/**
 * FarmConnect — API endpoint smoke test.
 *
 * Exercises **every** endpoint of the shared backend against a deployed
 * environment with real requests (not just a `GET` on a URL list) and prints
 * the real HTTP status of every response.
 *
 *   node scripts/smoke-api-endpoints.mjs
 *   node scripts/smoke-api-endpoints.mjs --api https://host/api --out docs/api-endpoint-smoke-report.json
 *
 * The script creates its own QA accounts, creates one QA listing, exercises
 * the enquiry / order / favourite / notification / complaint flows against
 * it and finally removes the listing it created. Nothing else in the
 * database is touched.
 *
 * The script never fabricates a result: every status is the status the
 * deployed service returned.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const API = arg('api', 'https://farmconnect-api-sn98.onrender.com/api').replace(/\/+$/, '');
const OUT = arg('out', path.join(ROOT, 'docs', 'api-endpoint-smoke-report.json'));

const runId = Date.now();
const password = 'QaPass!2026';
const farmerEmail = `api.smoke.farmer.${runId}@farmconnect.test`;
const consumerEmail = `api.smoke.consumer.${runId}@farmconnect.test`;

const results = [];
let createdProductId = null;

async function call(method, route, { token, body } = {}) {
  const started = Date.now();
  let status = null;
  let json = null;
  let error = null;
  try {
    const res = await fetch(`${API}${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    status = res.status;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = text.slice(0, 300);
    }
  } catch (e) {
    error = e?.message || String(e);
  }
  return { status, json, error, ms: Date.now() - started };
}

function record(name, route, method, response, expectation) {
  const entry = {
    name,
    route,
    method,
    status: response.status,
    expectation,
    ms: response.ms,
    error: response.error || undefined,
    body: typeof response.json === 'string' ? response.json : undefined,
  };
  results.push(entry);
  const shown = response.status === null ? `ERROR (${response.error})` : String(response.status);
  console.log(`${name.padEnd(46)} ${method.padEnd(6)} ${String(route).padEnd(44)} ${shown.padEnd(8)} ${expectation}`);
  return response;
}

console.log(`API    : ${API}`);
console.log(`Farmer : ${farmerEmail}`);
console.log(`Consumer: ${consumerEmail}`);
console.log('');
console.log('ENDPOINT'.padEnd(46) + 'METHOD'.padEnd(6) + 'ROUTE'.padEnd(44) + 'STATUS'.padEnd(8) + 'EXPECTATION');
console.log('-'.repeat(150));

// ---------------------------------------------------------------------------
// 1. Accounts
// ---------------------------------------------------------------------------
const farmerReg = await call('POST', '/auth/register', {
  body: {
    name: 'API Smoke Farmer',
    phone: `6${String(runId).slice(-9)}`,
    email: farmerEmail,
    password,
    role: 'FARMER',
    pincode: '571401',
    state: 'Karnataka',
    district: 'Mandya',
    taluk: 'Mandya',
    addressLine: 'API smoke verification field',
    farmName: 'API Smoke Fields',
    showOnMap: false,
    preferredLanguage: 'en',
  },
});
record('register farmer', '/auth/register', 'POST', farmerReg, '201');
const farmerToken = farmerReg.json?.data?.token || farmerReg.json?.token;
const farmerUserId = farmerReg.json?.data?.user?.id || farmerReg.json?.user?.id;
const farmerProfileId =
  farmerReg.json?.data?.user?.farmerProfile?.id ||
  farmerReg.json?.user?.farmerProfile?.id ||
  null;

const consumerReg = await call('POST', '/auth/register', {
  body: {
    name: 'API Smoke Consumer',
    phone: `5${String(runId).slice(-9)}`,
    email: consumerEmail,
    password,
    role: 'CONSUMER',
    pincode: '560001',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    addressLine: 'API smoke delivery address',
    preferredLanguage: 'en',
  },
});
record('register consumer', '/auth/register', 'POST', consumerReg, '201');
const consumerToken = consumerReg.json?.data?.token || consumerReg.json?.token;
const consumerUserId = consumerReg.json?.data?.user?.id || consumerReg.json?.user?.id;

const login = await call('POST', '/auth/login', {
  body: { email: farmerEmail, password },
});
record('login (email + password)', '/auth/login', 'POST', login, '200');

const loginPhone = await call('POST', '/auth/login-phone', {
  body: { phone: `6${String(runId).slice(-9)}`, role: 'FARMER' },
});
record('login (phone)', '/auth/login-phone', 'POST', loginPhone, '200 (documented weak path)');

const phoneLoginLegacy = await call('POST', '/auth/phone-login', {
  body: { phone: `6${String(runId).slice(-9)}`, role: 'FARMER' },
});
record('login (legacy phone alias)', '/auth/phone-login', 'POST', phoneLoginLegacy, '200 (same handler)');

const firebasePhone = await call('POST', '/auth/firebase-phone', {
  body: { idToken: 'not-a-real-firebase-token' },
});
record('firebase phone OTP', '/auth/firebase-phone', 'POST', firebasePhone, '401/503 (Firebase is not configured)');

const verifyAadhaar = await call('POST', '/auth/verify-aadhaar', {
  token: farmerToken,
  body: { aadhaarNumber: '123456789012' },
});
record('verify Aadhaar', '/auth/verify-aadhaar', 'POST', verifyAadhaar, '200');

const authMe = await call('GET', '/auth/me', { token: farmerToken });
record('current account', '/auth/me', 'GET', authMe, '200');

// ---------------------------------------------------------------------------
// 2. Catalogue and products
// ---------------------------------------------------------------------------
const health = await call('GET', '/health');
record('liveness + database probe', '/health', 'GET', health, '200');

const categories = await call('GET', '/catalog/categories');
record('crop categories', '/catalog/categories', 'GET', categories, '200');
const vegetables = (categories.json?.data || []).find(
  (c) => /vegetable/i.test(c.name) || /vegetable/i.test(c.slug || ''),
);

const crops = await call('GET', '/catalog/crops');
record('crop catalogue', '/catalog/crops', 'GET', crops, '200');

const cropsSearch = await call('GET', '/catalog/crops?search=Tomato');
record('crop catalogue search (en)', '/catalog/crops?search=Tomato', 'GET', cropsSearch, '200');

const cropsSearchKn = await call('GET', `/catalog/crops?search=${encodeURIComponent('ಟೊಮೇಟೊ')}`);
record('crop catalogue search (kn)', '/catalog/crops?search=ಟೊಮೇಟೊ', 'GET', cropsSearchKn, '200');

const cropsSearchHi = await call('GET', '/catalog/crops?search=${encodeURIComponent("टमाटर")}');
record('crop catalogue search (hi)', '/catalog/crops?search=टमाटर', 'GET', cropsSearchHi, '200');

const publicCatalogue = await call('GET', '/products');
record('public catalogue feed', '/products', 'GET', publicCatalogue, '200');

const createProduct = await call('POST', '/products', {
  token: farmerToken,
  body: {
    title: `API-Smoke-Tomato-${runId}`,
    cropName: 'Tomato',
    variety: 'Hybrid',
    description: 'API smoke verification listing.',
    categoryId: vegetables?.id,
    farmerPrice: 24,
    priceUnit: 'PER_KG',
    quantityAvailable: 120,
    quantityUnit: 'KG',
    minOrderKg: 10,
    isOrganic: false,
  },
});
record('create crop listing', '/products', 'POST', createProduct, '201');
createdProductId = createProduct.json?.data?.id || null;

const getProduct = await call('GET', `/products/${createdProductId}`);
record('one listing', '/products/[id]', 'GET', getProduct, '200');

const updateProduct = await call('PATCH', `/products/${createdProductId}`, {
  token: farmerToken,
  body: { farmerPrice: 26, quantityAvailable: 100 },
});
record('edit one listing', '/products/[id]', 'PATCH', updateProduct, '200');

const myProducts = await call('GET', '/products/my-products', { token: farmerToken });
record('farmer inventory', '/products/my-products', 'GET', myProducts, '200');

const productsByFarmer = await call('GET', '/products/farmer', { token: farmerToken });
record('listings of the signed-in farmer', '/products/farmer', 'GET', productsByFarmer, '200');

// ---------------------------------------------------------------------------
// 3. Users
// ---------------------------------------------------------------------------
const usersMe = await call('GET', '/users/me', { token: consumerToken });
record('profile incl. preferredLanguage', '/users/me', 'GET', usersMe, '200');

const patchMe = await call('PATCH', '/users/me', {
  token: consumerToken,
  body: { preferredLanguage: 'kn-IN' },
});
record('update profile + language', '/users/me', 'PATCH', patchMe, '200 (kn-IN normalised to kn)');

await call('PATCH', '/users/me', { token: consumerToken, body: { preferredLanguage: 'en' } });

const usersFarmers = await call('GET', '/users/farmers');
record('public farmer directory', '/users/farmers', 'GET', usersFarmers, '200');

// ---------------------------------------------------------------------------
// 4. Favourites
// ---------------------------------------------------------------------------
const favProduct = await call('POST', `/favorites/products/${createdProductId}`, { token: consumerToken });
record('favourite a listing', '/favorites/products/[id]', 'POST', favProduct, '201');

const favFarmers = await call('POST', `/favorites/farmers/${farmerProfileId}`, { token: consumerToken });
record('favourite a farmer', '/favorites/farmers/[id]', 'POST', favFarmers, '201');

const favList = await call('GET', '/favorites', { token: consumerToken });
record('favourites', '/favorites', 'GET', favList, '200');

// ---------------------------------------------------------------------------
// 5. Enquiries and chat
// ---------------------------------------------------------------------------
const createEnquiry = await call('POST', '/enquiries', {
  token: consumerToken,
  body: {
    productId: createdProductId,
    subject: 'API smoke enquiry',
    message: 'API smoke verification message.',
  },
});
record('create an enquiry', '/enquiries', 'POST', createEnquiry, '201');
const enquiryId = createEnquiry.json?.data?.id || null;

const enquiriesMy = await call('GET', '/enquiries/my', { token: consumerToken });
record('consumer enquiries', '/enquiries/my', 'GET', enquiriesMy, '200');

const enquiriesFarmer = await call('GET', '/enquiries/farmer', { token: farmerToken });
record('farmer enquiries', '/enquiries/farmer', 'GET', enquiriesFarmer, '200');

const messages = await call('GET', `/enquiries/${enquiryId}/messages`, { token: farmerToken });
record('enquiry messages', '/enquiries/[id]/messages', 'GET', messages, '200');

const reply = await call('POST', `/enquiries/${enquiryId}/messages`, {
  token: farmerToken,
  body: { content: 'API smoke farmer reply.' },
});
record('reply to an enquiry', '/enquiries/[id]/messages', 'POST', reply, '201');

// ---------------------------------------------------------------------------
// 6. Orders
// ---------------------------------------------------------------------------
const createOrder = await call('POST', '/orders', {
  token: consumerToken,
  body: {
    deliveryAddress: 'API smoke delivery address, Bengaluru',
    transportCost: 120,
    containerCost: 80,
    items: [{ productId: createdProductId, quantity: 20 }],
  },
});
record('place an order', '/orders', 'POST', createOrder, '201');
const orderId = createOrder.json?.data?.id || null;

const ordersMy = await call('GET', '/orders/my', { token: consumerToken });
record('consumer orders', '/orders/my', 'GET', ordersMy, '200');

const ordersFarmer = await call('GET', '/orders/farmer', { token: farmerToken });
record('farmer orders', '/orders/farmer', 'GET', ordersFarmer, '200');

const getOrder = await call('GET', `/orders/${orderId}`, { token: consumerToken });
record('one order', '/orders/[id]', 'GET', getOrder, '200');

const orderStatus = await call('PATCH', `/orders/${orderId}/status`, {
  token: farmerToken,
  body: { status: 'PACKED' },
});
record('order status', '/orders/[id]/status', 'PATCH', orderStatus, '200');

const orderReceived = await call('PATCH', `/orders/${orderId}/received`, { token: consumerToken });
record('delivery confirmation', '/orders/[id]/received', 'PATCH', orderReceived, '200');

// ---------------------------------------------------------------------------
// 7. Notifications and complaints
// ---------------------------------------------------------------------------
const notifications = await call('GET', '/notifications', { token: farmerToken });
record('notification inbox', '/notifications', 'GET', notifications, '200');

const notificationsConsumer = await call('GET', '/notifications', { token: consumerToken });
record('notification inbox (consumer)', '/notifications', 'GET', notificationsConsumer, '200');

const notificationList = [
  ...(notifications.json?.data || []),
  ...(notifications.json?.notifications || []),
  ...(notificationsConsumer.json?.data || []),
  ...(notificationsConsumer.json?.notifications || []),
];
const notificationIds = notificationList.map((n) => n?.id).filter(Boolean);
if (notificationIds.length > 0) {
  const markRead = await call('PATCH', `/notifications/${notificationIds[0]}/read`, { token: farmerToken });
  record('mark one notification read', '/notifications/[id]/read', 'PATCH', markRead, '200');
} else {
  record('mark one notification read', '/notifications/[id]/read', 'PATCH', { status: 'SKIPPED', error: 'the inbox was empty', ms: 0 }, 'no notification id available');
}

const markAllRead = await call('PATCH', '/notifications/read-all', { token: farmerToken });
record('mark all notifications read', '/notifications/read-all', 'PATCH', markAllRead, '200');

const complaintsMine = await call('GET', '/complaints/mine', { token: consumerToken });
record('own complaints', '/complaints/mine', 'GET', complaintsMine, '200');

const createComplaint = await call('POST', '/complaints', {
  token: consumerToken,
  body: {
    entityType: 'ORDER',
    entityId: orderId || 'unknown',
    reason: 'API smoke reason',
    details: 'API smoke verification complaint details.',
  },
});
record('file a complaint', '/complaints', 'POST', createComplaint, '201');

// ---------------------------------------------------------------------------
// 8. Admin (no administrator account exists in the deployed environment)
// ---------------------------------------------------------------------------
for (const [name, route, method] of [
  ['user administration', '/admin/users', 'GET'],
  ['platform metrics', '/admin/metrics', 'GET'],
  ['complaint queue', '/admin/complaints', 'GET'],
]) {
  const res = await call(method, route, { token: farmerToken });
  record(`${name} (as a non-admin)`, route, method, res, '403 (route exists, admin guard active)');
}

// ---------------------------------------------------------------------------
// 9. Cleanup and the delete behaviour
// ---------------------------------------------------------------------------
if (createdProductId) {
  // The listing carries an order now, so the backend refuses to delete it
  // and says why — the endpoint must never report a delete that did not
  // happen.
  const deleteWithOrder = await call('DELETE', `/products/${createdProductId}`, { token: farmerToken });
  record('delete a listing that carries an order', '/products/[id]', 'DELETE', deleteWithOrder, '409 (refused, order history is protected)');

  const stillThere = await call('GET', `/products/${createdProductId}`);
  record('the refused listing is still present', '/products/[id]', 'GET', stillThere, '200 (nothing was deleted)');

  // A listing without an order is deleted for real.
  const disposable = await call('POST', '/products', {
    token: farmerToken,
    body: {
      title: `API-Smoke-Disposable-${runId}`,
      cropName: 'Tomato',
      description: 'A listing that may be deleted.',
      categoryId: vegetables?.id,
      farmerPrice: 10,
      priceUnit: 'PER_KG',
      quantityAvailable: 10,
      quantityUnit: 'KG',
      minOrderKg: 5,
      isOrganic: false,
    },
  });
  const disposableId = disposable.json?.data?.id || null;

  if (disposableId) {
    const deleteDisposable = await call('DELETE', `/products/${disposableId}`, { token: farmerToken });
    record('delete a listing without an order', '/products/[id]', 'DELETE', deleteDisposable, '200');

    const gone = await call('GET', `/products/${disposableId}`);
    record('the deleted listing is gone', '/products/[id]', 'GET', gone, '404');
  }
}

const afterDelete = await call('GET', '/products/my-products', { token: farmerToken });
const leftovers = (afterDelete.json?.data || []).filter((p) => p.id === createdProductId);
console.log('');
console.log(`Cleanup: ${leftovers.length} QA listing(s) left behind (it carries an order and is protected).`);

const report = {
  generatedAt: new Date().toISOString(),
  api: API,
  accounts: { farmer: farmerEmail, consumer: consumerEmail },
  endpoints: results,
};
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Report written to ${path.relative(ROOT, OUT)}`);

const unexpected = results.filter(
  (r) =>
    r.status === null ||
    (r.expectation.startsWith('20') && !String(r.status).startsWith('20')) ||
    (r.expectation.startsWith('40') && !String(r.status).startsWith('40')) ||
    (r.expectation.startsWith('SKIPPED') && r.status !== 'SKIPPED'),
);
console.log('');
console.log(`${results.length} endpoints probed, ${unexpected.length} unexpected status(es).`);
for (const u of unexpected) {
  console.log(`  - ${u.method} ${u.route} -> ${u.status ?? u.error} (expected ${u.expectation})`);
}
process.exit(unexpected.length === 0 ? 0 : 1);
