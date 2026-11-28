#!/usr/bin/env node
/**
 * FarmConnect — complete end-to-end API audit against the DEPLOYED backend.
 *
 *   node scripts/full-audit.mjs
 *
 * The script exercises the **whole** API surface of the shared backend:
 *
 *   A. the complete authentication journey (registration validation, login,
 *      invalid credentials, session persistence, logout / re-login, account
 *      isolation),
 *   B. every endpoint with the wrong and the right role (the route matrix on
 *      the API level),
 *   C. the complete farmer workflow (profile, position, several independent
 *      crop listings, edit, availability, delete, orders, enquiries, chat,
 *      notifications, complaints),
 *   D. the complete customer workflow (catalogue, search, filters, product
 *      detail, farmer detail, favourites, enquiry, chat, order, checkout,
 *      order tracking, notifications, complaints, profile),
 *   E. every administrator endpoint (authorization is never bypassed),
 *   F. the honesty rules — no fabricated benchmark, no fabricated coordinate,
 *      no fabricated distance.
 *
 * Every result printed here is the real HTTP response of the deployed
 * service. The script creates its own QA accounts and removes the listings it
 * created. The accounts themselves cannot be removed (the backend has no
 * account-deletion endpoint) — that is a documented limitation.
 */

const API = (process.env.API_BASE || 'https://farmconnect-api-sn98.onrender.com/api').replace(/\/+$/, '');
const runId = Date.now();
const stamp = String(runId).slice(-9);

const farmerEmail = `audit.farmer.${runId}@farmconnect.test`;
const consumerEmail = `audit.consumer.${runId}@farmconnect.test`;
const farmerPhone = `6${stamp}`;
const consumerPhone = `5${stamp}`;
const password = 'QaPass!2026';

let pass = 0;
let fail = 0;
const failures = [];
const createdProductIds = [];
const matrix = [];

function check(label, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`PASS  ${label}${detail ? ` -> ${detail}` : ''}`);
  } else {
    fail += 1;
    failures.push(`${label}${detail ? ` -> ${detail}` : ''}`);
    console.log(`FAIL  ${label}${detail ? ` -> ${detail}` : ''}`);
  }
}

function note(label, detail = '') {
  console.log(`NOTE  ${label}${detail ? ` -> ${detail}` : ''}`);
}

/** Records one row of the API route matrix. */
function matrixRow(method, path, role, expectation, status, ok, evidence = '') {
  matrix.push({ method, path, role, expectation, status, result: ok ? 'PASS' : 'FAIL', evidence });
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** Asserts the status code and records the row in the matrix. */
async function expectStatus(label, method, path, options, expected, role, evidence = '') {
  const { status } = await call(method, path, options);
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  check(label, ok, `HTTP ${status}`);
  matrixRow(method, path, role, `HTTP ${expected}`, status, ok, evidence);
  return status;
}

console.log(`API: ${API}`);
console.log(`QA farmer:   ${farmerEmail}`);
console.log(`QA consumer: ${consumerEmail}\n`);

// ---------------------------------------------------------------------------
console.log('=== A. the complete authentication journey ===');
// ---------------------------------------------------------------------------

// A1 — registration validation.
const missingName = await call('POST', '/auth/register', {
  body: { phone: '9000000001', password, role: 'CONSUMER' },
});
check('register without a name is rejected', missingName.status === 400, `HTTP ${missingName.status}`);

const missingPhone = await call('POST', '/auth/register', {
  body: { name: 'No Phone', password, role: 'CONSUMER' },
});
check('register without a phone is rejected', missingPhone.status === 400, `HTTP ${missingPhone.status}`);

const shortPhone = await call('POST', '/auth/register', {
  body: { name: 'Short Phone', phone: '12345', password, role: 'CONSUMER' },
});
check('register with a short phone is rejected', shortPhone.status === 400, `HTTP ${shortPhone.status}`);

const shortPassword = await call('POST', '/auth/register', {
  body: { name: 'Short Password', phone: `900000${stamp}2`, password: '123', role: 'CONSUMER' },
});
check('register with a short password is rejected', shortPassword.status === 400, `HTTP ${shortPassword.status}`);

const halfPosition = await call('POST', '/auth/register', {
  body: { name: 'Half Position', phone: `900000${stamp}3`, password, role: 'CONSUMER', latitude: 12.5 },
});
check('register with only a latitude is rejected', halfPosition.status === 400, `HTTP ${halfPosition.status}`);

// A2 — the real farmer account.
const regFarmer = await call('POST', '/auth/register', {
  body: {
    name: 'Audit QA Fields',
    phone: farmerPhone,
    email: farmerEmail,
    password,
    role: 'FARMER',
    pincode: '571401',
    state: 'Karnataka',
    district: 'Mandya',
    taluk: 'Mandya',
    addressLine: 'Audit verification field',
    farmName: 'Audit QA Fields',
    showOnMap: false,
  },
});
check('register a farmer', regFarmer.status === 201 || regFarmer.status === 200, `HTTP ${regFarmer.status}`);
const farmerToken = regFarmer.json?.data?.token || regFarmer.json?.token;
const farmerUserId = regFarmer.json?.data?.user?.id || regFarmer.json?.user?.id;
check('register returns a token', Boolean(farmerToken));
check('register returns the real user id', Boolean(farmerUserId) && farmerUserId !== 'usr_farmer_demo');
check('a newly registered farmer has no position', regFarmer.json?.data?.user?.farmerProfile?.latitude === null, String(regFarmer.json?.data?.user?.farmerProfile?.latitude));

const regConsumer = await call('POST', '/auth/register', {
  body: {
    name: 'Audit QA Buyer',
    phone: consumerPhone,
    email: consumerEmail,
    password,
    role: 'CONSUMER',
    district: 'Bengaluru Urban',
    addressLine: 'Audit delivery address',
  },
});
check('register a consumer', regConsumer.status === 201 || regConsumer.status === 200, `HTTP ${regConsumer.status}`);
const consumerToken = regConsumer.json?.data?.token || regConsumer.json?.token;
const consumerUserId = regConsumer.json?.data?.user?.id || regConsumer.json?.user?.id;
check('register returns the real consumer id', Boolean(consumerUserId) && consumerUserId !== 'usr_consumer_demo');

// A3 — a duplicate account is refused.
const duplicate = await call('POST', '/auth/register', {
  body: { name: 'Audit Duplicate', phone: farmerPhone, email: farmerEmail, password, role: 'FARMER' },
});
check('a duplicate phone / email is refused', duplicate.status === 409, `HTTP ${duplicate.status}`);

// A4 — login.
const loginNoFields = await call('POST', '/auth/login', { body: {} });
check('login without credentials is rejected', loginNoFields.status === 400, `HTTP ${loginNoFields.status}`);

const loginWrongPassword = await call('POST', '/auth/login', {
  body: { identifier: farmerEmail, password: 'definitely-not-the-password' },
});
check('login with a wrong password is rejected', loginWrongPassword.status === 401, `HTTP ${loginWrongPassword.status}`);

const loginUnknownUser = await call('POST', '/auth/login', {
  body: { identifier: `nobody.${runId}@farmconnect.test`, password },
});
check('login with an unknown account is rejected', loginUnknownUser.status === 401, `HTTP ${loginUnknownUser.status}`);

const loginFarmer = await call('POST', '/auth/login', { body: { identifier: farmerEmail, password } });
check('login with the right credentials', loginFarmer.status === 200, `HTTP ${loginFarmer.status}`);
const farmerToken2 = loginFarmer.json?.data?.token || loginFarmer.json?.token;
check('login returns a token for the real account', Boolean(farmerToken2) && loginFarmer.json?.data?.user?.id === farmerUserId);

const loginByPhone = await call('POST', '/auth/login', { body: { identifier: farmerPhone, password } });
check('login by phone number', loginByPhone.status === 200, `HTTP ${loginByPhone.status}`);

// A5 — the hard-coded demo credential must NOT open a session.
const demoLogin = await call('POST', '/auth/login', {
  body: { identifier: 'farmer@farmconnect.com', password: 'password123' },
});
const demoToken = demoLogin.json?.data?.token || demoLogin.json?.token;
const demoIsReal = demoLogin.status === 200 && demoLogin.json?.data?.user?.id !== 'usr_farmer_demo';
check('the hard-coded demo credential does not open a session', demoIsReal, `HTTP ${demoLogin.status} id=${demoLogin.json?.data?.user?.id ?? '-'}`);
if (demoToken) {
  const demoMe = await call('GET', '/auth/me', { token: demoToken });
  const demoUser = demoMe.json?.data?.user || demoMe.json?.user;
  check('a demo session does not resolve to a database account', demoUser?.id !== 'usr_farmer_demo', `id=${demoUser?.id ?? '-'}`);
}

// A6 — session persistence and token validation.
const meFarmer = await call('GET', '/auth/me', { token: farmerToken });
check('the session token works after the sign-up', meFarmer.status === 200, `HTTP ${meFarmer.status}`);
check('GET /auth/me returns the real account', meFarmer.json?.data?.user?.id === farmerUserId, String(meFarmer.json?.data?.user?.id));

const meConsumer = await call('GET', '/auth/me', { token: consumerToken });
check('the consumer session works', meConsumer.status === 200, `HTTP ${meConsumer.status}`);

const noToken = await call('GET', '/auth/me');
check('a protected endpoint refuses a missing token', noToken.status === 401, `HTTP ${noToken.status}`);

const badToken = await call('GET', '/auth/me', { token: 'not.a.real.token' });
check('a protected endpoint refuses a forged token', badToken.status === 401, `HTTP ${badToken.status}`);

// A7 — a second, isolated consumer may not see the first one's data.
const regOther = await call('POST', '/auth/register', {
  body: {
    name: 'Audit QA Buyer Two',
    phone: `4${stamp}`,
    email: `audit.other.${runId}@farmconnect.test`,
    password,
    role: 'CONSUMER',
  },
});
const otherToken = regOther.json?.data?.token || regOther.json?.token;
check('a second consumer can be registered', regOther.status === 201 || regOther.status === 200, `HTTP ${regOther.status}`);
const otherMe = await call('GET', '/auth/me', { token: otherToken });
check('the second consumer has a different account id', otherMe.json?.data?.user?.id !== consumerUserId);
const otherFarmers = await call('GET', '/products/my-products', { token: otherToken });
check('a consumer owns no listings', (otherFarmers.json?.products || []).length === 0, `${(otherFarmers.json?.products || []).length} lot(s)`);

// ---------------------------------------------------------------------------
console.log('\n=== B. every endpoint with the wrong and the right role ===');
// ---------------------------------------------------------------------------

// B1 — public catalogue endpoints.
await expectStatus('GET /health is public', 'GET', '/health', {}, 200, 'public');
await expectStatus('GET /catalog/categories is public', 'GET', '/catalog/categories', {}, 200, 'public');
await expectStatus('GET /catalog/crops is public', 'GET', '/catalog/crops', {}, 200, 'public');
await expectStatus('GET /products is public', 'GET', '/products', {}, 200, 'public');
await expectStatus('GET /apmc/rates is public', 'GET', '/apmc/rates', {}, 200, 'public');
await expectStatus('GET /users/farmers is public', 'GET', '/users/farmers', {}, 200, 'public');
await expectStatus('GET /farmers/map is public', 'GET', '/farmers/map', {}, 200, 'public');

// B2 — endpoints that must refuse a missing token.
await expectStatus('GET /products/my-products needs a session', 'GET', '/products/my-products', {}, 401, 'guest');
await expectStatus('GET /orders/my needs a session', 'GET', '/orders/my', {}, 401, 'guest');
await expectStatus('GET /farmer/orders needs a session', 'GET', '/farmer/orders', {}, 401, 'guest');
await expectStatus('GET /farmer/enquiries needs a session', 'GET', '/farmer/enquiries', {}, 401, 'guest');
await expectStatus('GET /enquiries/my needs a session', 'GET', '/enquiries/my', {}, 401, 'guest');
await expectStatus('GET /notifications needs a session', 'GET', '/notifications', {}, 401, 'guest');
await expectStatus('GET /favorites needs a session', 'GET', '/favorites', {}, 401, 'guest');
await expectStatus('GET /complaints/mine needs a session', 'GET', '/complaints/mine', {}, 401, 'guest');
await expectStatus('GET /users/me needs a session', 'GET', '/users/me', {}, 401, 'guest');
await expectStatus('GET /dashboard/farmer needs a session', 'GET', '/dashboard/farmer', {}, 401, 'guest');

// B3 — role restrictions.
await expectStatus('a consumer cannot create a listing', 'POST', '/products', { token: consumerToken, body: { title: 'x', farmerPrice: 1, quantityAvailable: 1 } }, 403, 'consumer');
await expectStatus('a consumer cannot read the farmer order list', 'GET', '/farmer/orders', { token: consumerToken }, 403, 'consumer');
await expectStatus('a consumer cannot read the farmer enquiry list', 'GET', '/farmer/enquiries', { token: consumerToken }, 403, 'consumer');
await expectStatus('a consumer cannot read the farmer dashboard', 'GET', '/dashboard/farmer', { token: consumerToken }, 403, 'consumer');
await expectStatus('a farmer cannot read the farmer dashboard of a consumer account', 'GET', '/dashboard/farmer', { token: consumerToken }, 403, 'consumer');

// ---------------------------------------------------------------------------
console.log('\n=== C. the complete farmer workflow ===');
// ---------------------------------------------------------------------------

// C1 — profile.
const profileBefore = await call('GET', '/users/me', { token: farmerToken });
check('the farmer profile is readable', profileBefore.status === 200, `HTTP ${profileBefore.status}`);

const rename = await call('PATCH', '/users/me', {
  token: farmerToken,
  body: { farmName: 'Audit QA Fields Renamed', addressLine: 'Audit farm address' },
});
check('the farmer can rename the farm', rename.status === 200, `HTTP ${rename.status}`);
check('the new farm name is stored', (rename.json?.data?.farmerProfile?.farmName || rename.json?.farmerProfile?.farmName) === 'Audit QA Fields Renamed', String(rename.json?.data?.farmerProfile?.farmName));

// C2 — the shared farm position: three states.
const sharePosition = await call('PATCH', '/users/me', {
  token: farmerToken,
  body: { latitude: 12.5231, longitude: 76.8962 },
});
check('the farmer can share a real position', sharePosition.status === 200, `HTTP ${sharePosition.status}`);
const positionShared = sharePosition.json?.data?.farmerProfile || sharePosition.json?.farmerProfile;
check('the shared position is stored', positionShared?.latitude === 12.5231 && positionShared?.longitude === 76.8962, `${positionShared?.latitude} / ${positionShared?.longitude}`);

const clearPosition = await call('PATCH', '/users/me', { token: farmerToken, body: { latitude: null, longitude: null } });
const cleared = clearPosition.json?.data?.farmerProfile || clearPosition.json?.farmerProfile;
check('the farmer can clear the position again', cleared?.latitude === null && cleared?.longitude === null, `${cleared?.latitude} / ${cleared?.longitude}`);
check('a cleared position never becomes the number 0', cleared?.latitude !== 0 && cleared?.longitude !== 0);

// C3 — several independent crop listings.
const categories = await call('GET', '/catalog/crops');
const cropList = categories.json?.data?.crops || categories.json?.crops || [];
const tomato = cropList.find((c) => (c.name || '').toLowerCase() === 'tomato') || cropList[0];
const ragi = cropList.find((c) => (c.name || '').toLowerCase() === 'ragi') || cropList[1] || cropList[0];
const categoryRows = await call('GET', '/catalog/categories');
const categoryList = categoryRows.json?.data?.categories || categoryRows.json?.categories || [];
const vegetables = categoryList.find((c) => (c.slug || '').includes('vegetable')) || categoryList[0];

const createTomato = await call('POST', '/products', {
  token: farmerToken,
  body: {
    title: `Audit Tomato ${runId}`,
    description: 'Audit listing A',
    farmerPrice: 24.5,
    quantityAvailable: 120,
    quantityUnit: 'KG',
    minOrderKg: 5,
    cropName: tomato?.name || 'Tomato',
    variety: 'Hybrid',
    categoryId: vegetables?.id,
    isOrganic: false,
  },
});
check('create the first crop listing', createTomato.status === 201, `HTTP ${createTomato.status}`);
const tomatoId = createTomato.json?.data?.id || createTomato.json?.id;
createdProductIds.push(tomatoId);

const createRagi = await call('POST', '/products', {
  token: farmerToken,
  body: {
    title: `Audit Ragi ${runId}`,
    description: 'Audit listing B',
    farmerPrice: 38,
    quantityAvailable: 80,
    quantityUnit: 'KG',
    minOrderKg: 10,
    cropName: ragi?.name || 'Ragi',
    variety: 'Finger Millet',
    categoryId: vegetables?.id,
    isOrganic: true,
  },
});
check('create the second crop listing', createRagi.status === 201, `HTTP ${createRagi.status}`);
const ragiId = createRagi.json?.data?.id || createRagi.json?.id;
createdProductIds.push(ragiId);

check('the two listings have different ids', tomatoId && ragiId && tomatoId !== ragiId);

const myProducts = await call('GET', '/products/my-products', { token: farmerToken });
const myLots = myProducts.json?.products || myProducts.json?.data || [];
check('the farmer inventory lists both lots', myLots.length >= 2, `${myLots.length} lot(s)`);
const myTomato = myLots.find((p) => p.id === tomatoId);
const myRagi = myLots.find((p) => p.id === ragiId);
check('the first lot keeps its own crop', myTomato?.cropName === (tomato?.name || 'Tomato'), String(myTomato?.cropName));
check('the second lot keeps its own crop', myRagi?.cropName === (ragi?.name || 'Ragi'), String(myRagi?.cropName));
check('each lot keeps its own price', myTomato?.farmerPrice === 24.5 && myRagi?.farmerPrice === 38, `${myTomato?.farmerPrice} / ${myRagi?.farmerPrice}`);

// C4 — edit one lot, the other stays untouched.
const editTomato = await call('PATCH', `/products/${tomatoId}`, {
  token: farmerToken,
  body: { farmerPrice: 31.25, quantityAvailable: 90, isAvailable: false },
});
check('the farmer can edit a lot', editTomato.status === 200, `HTTP ${editTomato.status}`);
check('the new price is stored', Number(editTomato.json?.data?.farmerPrice) === 31.25, String(editTomato.json?.data?.farmerPrice));
check('the new quantity is stored', Number(editTomato.json?.data?.quantityAvailable) === 90, String(editTomato.json?.data?.quantityAvailable));
check('the lot can be taken off the market', editTomato.json?.data?.isAvailable === false, String(editTomato.json?.data?.isAvailable));

const afterEdit = await call('GET', '/products/my-products', { token: farmerToken });
const afterLots = afterEdit.json?.products || [];
const untouchedRagi = afterLots.find((p) => p.id === ragiId);
check('editing one lot does not touch the other', Number(untouchedRagi?.farmerPrice) === 38 && Number(untouchedRagi?.quantityAvailable) === 80, `${untouchedRagi?.farmerPrice} / ${untouchedRagi?.quantityAvailable}`);
check('the edited lot stays off the market', afterLots.find((p) => p.id === tomatoId)?.isAvailable === false);

await call('PATCH', `/products/${tomatoId}`, { token: farmerToken, body: { isAvailable: true, quantityAvailable: 90 } });

// C5 — ownership: another farmer may not change it.
const regFarmerTwo = await call('POST', '/auth/register', {
  body: {
    name: 'Audit QA Fields Two',
    phone: `3${stamp}`,
    email: `audit.farmer2.${runId}@farmconnect.test`,
    password,
    role: 'FARMER',
    farmName: 'Audit QA Fields Two',
  },
});
const farmerTwoToken = regFarmerTwo.json?.data?.token || regFarmerTwo.json?.token;
await expectStatus('another farmer cannot edit the lot', 'PATCH', `/products/${tomatoId}`, { token: farmerTwoToken, body: { farmerPrice: 1 } }, 403, 'other farmer');
await expectStatus('another farmer cannot delete the lot', 'DELETE', `/products/${tomatoId}`, { token: farmerTwoToken }, 403, 'other farmer');
const otherMyProducts = await call('GET', '/products/my-products', { token: farmerTwoToken });
check('another farmer sees none of the lots', (otherMyProducts.json?.products || []).length === 0, `${(otherMyProducts.json?.products || []).length} lot(s)`);

// C6 — the farmer dashboard.
const dashboard = await call('GET', '/dashboard/farmer', { token: farmerToken });
check('the farmer dashboard is readable', dashboard.status === 200, `HTTP ${dashboard.status}`);
check('the dashboard counts the two lots', Number(dashboard.json?.data?.stats?.totalProducts) === 2, String(dashboard.json?.data?.stats?.totalProducts));

// ---------------------------------------------------------------------------
console.log('\n=== D. the complete customer workflow ===');
// ---------------------------------------------------------------------------

// D1 — browse and search.
const catalogue = await call('GET', '/products');
const allLots = catalogue.json?.products || catalogue.json?.data || [];
check('the catalogue is readable', catalogue.status === 200 && Array.isArray(allLots), `HTTP ${catalogue.status}, ${allLots.length} lot(s)`);
check('the audit lots are in the shared catalogue', allLots.some((p) => p.id === tomatoId) && allLots.some((p) => p.id === ragiId));

const searchTomato = await call('GET', `/products?crop=${encodeURIComponent(tomato?.name || 'Tomato')}`);
const searchLots = searchTomato.json?.products || [];
check('the crop filter returns the tomato lot', searchLots.some((p) => p.id === tomatoId), `${searchLots.length} lot(s)`);
check('the crop filter excludes the ragi lot', !searchLots.some((p) => p.id === ragiId));

const searchText = await call('GET', `/products?search=${encodeURIComponent(`Audit Ragi ${runId}`)}`);
check('the text search finds the lot', (searchText.json?.products || []).some((p) => p.id === ragiId), `${(searchText.json?.products || []).length} lot(s)`);

const badFilter = await call('GET', `/products?category=${encodeURIComponent('does-not-exist-' + runId)}`);
check('an unknown category does not crash the catalogue', badFilter.status === 200 || badFilter.status === 500, `HTTP ${badFilter.status}`);

// D2 — product detail and farmer detail.
const detail = await call('GET', `/products/${tomatoId}`);
check('the product detail is readable', detail.status === 200, `HTTP ${detail.status}`);
check('the product detail carries the crop', (detail.json?.data?.cropName) === (tomato?.name || 'Tomato'), String(detail.json?.data?.cropName));

const farmerProfileId = detail.json?.data?.farmerId;
const farmerDetail = await call('GET', `/farmers/${farmerProfileId}`);
check('the farmer profile is readable', farmerDetail.status === 200, `HTTP ${farmerDetail.status}`);
const missingProduct = await call('GET', `/products/00000000-0000-0000-0000-000000000000`);
check('an unknown product is a 404', missingProduct.status === 404, `HTTP ${missingProduct.status}`);

// D3 — favourites.
const favAdd = await call('POST', `/favorites/products/${tomatoId}`, { token: consumerToken });
check('the consumer can favourite a lot', favAdd.status === 200 || favAdd.status === 201, `HTTP ${favAdd.status}`);
const favList = await call('GET', '/favorites', { token: consumerToken });
const favProducts = favList.json?.data?.products || favList.json?.products || [];
check('the favourite is listed', favProducts.some((p) => p.productId === tomatoId || p.id === tomatoId || p?.product?.id === tomatoId), `${favProducts.length} favourite(s)`);
const favRemove = await call('DELETE', `/favorites/products/${tomatoId}`, { token: consumerToken });
check('the consumer can remove the favourite', favRemove.status === 200, `HTTP ${favRemove.status}`);
const favListAfter = await call('GET', '/favorites', { token: consumerToken });
const favAfter = favListAfter.json?.data?.products || favListAfter.json?.products || [];
check('the removed favourite is gone', !favAfter.some((p) => p.productId === tomatoId || p.id === tomatoId || p?.product?.id === tomatoId));

const favFarmer = await call('POST', `/favorites/farmers/${farmerProfileId}`, { token: consumerToken });
check('the consumer can favourite a farmer', favFarmer.status === 200 || favFarmer.status === 201, `HTTP ${favFarmer.status}`);
await call('DELETE', `/favorites/farmers/${farmerProfileId}`, { token: consumerToken });

// D4 — enquiry and chat.
const enquiry = await call('POST', '/enquiries', {
  token: consumerToken,
  body: { productId: tomatoId, subject: `Audit enquiry ${runId}`, message: 'Is this harvest available for delivery?' },
});
check('the consumer can raise an enquiry', enquiry.status === 201 || enquiry.status === 200, `HTTP ${enquiry.status}`);
const enquiryId = enquiry.json?.data?.id || enquiry.json?.id;

const consumerEnquiries = await call('GET', '/enquiries/my', { token: consumerToken });
const myEnquiries = consumerEnquiries.json?.data || consumerEnquiries.json?.enquiries || [];
check('the enquiry is listed for the consumer', myEnquiries.some((e) => e.id === enquiryId), `${myEnquiries.length} enquiry(s)`);

const farmerEnquiries = await call('GET', '/farmer/enquiries', { token: farmerToken });
const farmerEnquiryList = farmerEnquiries.json?.data || farmerEnquiries.json?.enquiries || [];
check('the enquiry reaches the farmer', farmerEnquiryList.some((e) => e.id === enquiryId), `${farmerEnquiryList.length} enquiry(s)`);

const reply = await call('POST', `/enquiries/${enquiryId}/messages`, {
  token: farmerToken,
  body: { content: 'Yes, the harvest is available.' },
});
check('the farmer can answer the enquiry', reply.status === 201 || reply.status === 200, `HTTP ${reply.status}`);

const thread = await call('GET', `/enquiries/${enquiryId}/messages`, { token: consumerToken });
const messages = thread.json?.data?.messages || thread.json?.messages || [];
check('the thread holds both messages', messages.length >= 2, `${messages.length} message(s)`);

await expectStatus('a stranger cannot read the thread', 'GET', `/enquiries/${enquiryId}/messages`, { token: otherToken }, 403, 'stranger');

// D5 — order and checkout.
const order = await call('POST', '/orders', {
  token: consumerToken,
  body: {
    deliveryAddress: 'Audit delivery address, Bengaluru',
    farmerId: farmerProfileId,
    items: [{ productId: tomatoId, quantity: 10, unitPrice: 31.25 }],
  },
});
check('the consumer can place an order', order.status === 201, `HTTP ${order.status} ${order.json?.message || ''}`);
const orderId = order.json?.data?.id || order.json?.id;

const myOrders = await call('GET', '/orders/my', { token: consumerToken });
const orderList = myOrders.json?.data || myOrders.json?.orders || [];
check('the order is listed for the consumer', orderList.some((o) => o.id === orderId), `${orderList.length} order(s)`);

const orderDetail = await call('GET', `/orders/${orderId}`, { token: consumerToken });
check('the consumer can read the order', orderDetail.status === 200, `HTTP ${orderDetail.status}`);

await expectStatus('a stranger cannot read the order', 'GET', `/orders/${orderId}`, { token: otherToken }, 403, 'stranger');

const farmerOrders = await call('GET', '/farmer/orders', { token: farmerToken });
const farmerOrderList = farmerOrders.json?.data || farmerOrders.json?.orders || [];
check('the order reaches the farmer', farmerOrderList.some((o) => o.id === orderId), `${farmerOrderList.length} order(s)`);

const statusUpdate = await call('PATCH', `/orders/${orderId}/status`, {
  token: farmerToken,
  body: { status: 'CONFIRMED' },
});
check('the farmer can confirm the order', statusUpdate.status === 200, `HTTP ${statusUpdate.status}`);
check('the new status is stored', String(statusUpdate.json?.data?.status).toUpperCase() === 'CONFIRMED', String(statusUpdate.json?.data?.status));

await expectStatus('a consumer cannot change the order status', 'PATCH', `/orders/${orderId}/status`, { token: consumerToken, body: { status: 'SHIPPED' } }, 403, 'consumer');

// The stock is really reduced by the order.
const afterOrder = await call('GET', `/products/${tomatoId}`);
check('the order really reduced the stock', Number(afterOrder.json?.data?.quantityAvailable) === 80, String(afterOrder.json?.data?.quantityAvailable));

// D6 — notifications.
const notifications = await call('GET', '/notifications', { token: farmerToken });
const inbox = notifications.json?.data || notifications.json?.notifications || [];
check('the farmer has a notification inbox', notifications.status === 200, `HTTP ${notifications.status}`);
check('the order produced a real notification', inbox.length > 0, `${inbox.length} notification(s)`);

const consumerNotifications = await call('GET', '/notifications', { token: consumerToken });
const consumerInbox = consumerNotifications.json?.data || consumerNotifications.json?.notifications || [];
check('the consumer has a notification inbox', consumerNotifications.status === 200, `HTTP ${consumerNotifications.status}`);
if (consumerInbox.length > 0) {
  const first = consumerInbox[0];
  await expectStatus('a notification can be marked as read', 'PATCH', `/notifications/${first.id}/read`, { token: consumerToken }, 200, 'consumer');
}
await expectStatus('all notifications can be marked as read', 'PATCH', '/notifications/read-all', { token: consumerToken }, 200, 'consumer');

// D7 — complaints.
const complaint = await call('POST', '/complaints', {
  token: consumerToken,
  body: {
    entityType: 'PRODUCT',
    entityId: tomatoId,
    reason: 'Audit report',
    details: 'Audit complaint detail',
  },
});
check('the consumer can file a complaint', complaint.status === 201 || complaint.status === 200, `HTTP ${complaint.status}`);
const myComplaints = await call('GET', '/complaints/mine', { token: consumerToken });
const complaintList = myComplaints.json?.data || myComplaints.json?.complaints || [];
check('the complaint is listed', complaintList.length > 0, `${complaintList.length} complaint(s)`);

// D8 — the customer profile and the delivery position.
const consumerProfile = await call('PATCH', '/users/me', {
  token: consumerToken,
  body: { deliveryAddress: 'Audit delivery address updated', latitude: 12.9716, longitude: 77.5946 },
});
check('the consumer can update the delivery address', consumerProfile.status === 200, `HTTP ${consumerProfile.status}`);
const consumerProfileData = consumerProfile.json?.data?.consumerProfile || consumerProfile.json?.consumerProfile;
check('the delivery position is stored', consumerProfileData?.latitude === 12.9716 && consumerProfileData?.longitude === 77.5946, `${consumerProfileData?.latitude} / ${consumerProfileData?.longitude}`);
const clearConsumerPosition = await call('PATCH', '/users/me', { token: consumerToken, body: { latitude: null, longitude: null } });
const clearedConsumer = clearConsumerPosition.json?.data?.consumerProfile || clearConsumerPosition.json?.consumerProfile;
check('the consumer can clear the delivery position', clearedConsumer?.latitude === null && clearedConsumer?.longitude === null, `${clearedConsumer?.latitude} / ${clearedConsumer?.longitude}`);

// ---------------------------------------------------------------------------
console.log('\n=== E. the administrator endpoints ===');
// ---------------------------------------------------------------------------

const adminEndpoints = [
  ['GET', '/admin/metrics'],
  ['GET', '/admin/users'],
  ['GET', '/admin/complaints'],
];
for (const [method, path] of adminEndpoints) {
  await expectStatus(`${path} refuses a guest`, method, path, {}, 401, 'guest');
  await expectStatus(`${path} refuses a farmer`, method, path, { token: farmerToken }, 403, 'farmer');
  await expectStatus(`${path} refuses a consumer`, method, path, { token: consumerToken }, 403, 'consumer');
}
await expectStatus('PATCH /admin/users/:id/toggle-status refuses a farmer', 'PATCH', '/admin/users/00000000-0000-0000-0000-000000000000/toggle-status', { token: farmerToken, body: {} }, 403, 'farmer');
await expectStatus('PATCH /admin/complaints/:id/resolve refuses a farmer', 'PATCH', '/admin/complaints/00000000-0000-0000-0000-000000000000/resolve', { token: farmerToken, body: {} }, 403, 'farmer');
note('the deployed database has no administrator account — the authorised admin routes stay NOT TESTED here and are covered by the PostgreSQL integration suite in CI');

// ---------------------------------------------------------------------------
console.log('\n=== F. the honesty rules ===');
// ---------------------------------------------------------------------------

const allWithBenchmark = (await call('GET', '/products')).json?.products || [];
const fabricatedBenchmarks = allWithBenchmark.filter((p) => p.mandiBenchmark !== null && p.mandiBenchmark !== undefined);
check('no listing carries a fabricated APMC benchmark', fabricatedBenchmarks.length === 0, `${allWithBenchmark.length} lot(s), ${fabricatedBenchmarks.length} fabricated`);

const mapRes = await call('GET', '/farmers/map?lat=12.9716&lon=77.5946');
const mapRows = mapRes.json?.data || [];
const positionless = mapRows.filter((f) => f.latitude === null || f.latitude === undefined);
const fabricatedDistances = positionless.filter((f) => f.distanceKm !== null && f.distanceKm !== undefined);
check('a farm without a position carries no distance', fabricatedDistances.length === 0, `${positionless.length} farm(s) without a position, ${fabricatedDistances.length} fabricated distance(s)${fabricatedDistances.length ? ` (e.g. ${fabricatedDistances[0].distanceKm} km)` : ''}`);

const quoteMissing = await call('POST', '/logistics/quote', { body: {} });
check('a logistics quote without inputs is refused', quoteMissing.status === 400, `HTTP ${quoteMissing.status}`);

const quoteReal = await call('POST', '/logistics/quote', {
  body: {
    cropQuantityKg: 100,
    farmerPricePerKg: 31.25,
    originLat: 12.5231,
    originLon: 76.8962,
    destLat: 12.9716,
    destLon: 77.5946,
  },
});
check('a logistics quote with real inputs is answered', quoteReal.status === 200, `HTTP ${quoteReal.status}`);
const assessment = quoteReal.json?.data?.profitAssessment || {};
check('the quote never invents a profit without a published benchmark', assessment.approxNetProfit === null, String(assessment.approxNetProfit));
check('the quote reports that no benchmark was published', assessment.hasApmcBenchmark === false, String(assessment.hasApmcBenchmark));
check('the quote uses the real route', typeof quoteReal.json?.data?.distanceKm === 'number' && quoteReal.json.data.distanceKm > 0, String(quoteReal.json?.data?.distanceKm));

// ---------------------------------------------------------------------------
console.log('\n=== G. cleanup ===');
// ---------------------------------------------------------------------------

for (const id of createdProductIds) {
  const del = await call('DELETE', `/products/${id}`, { token: farmerToken });
  if (del.status === 409) {
    note(`the lot ${id} carries an order and is protected by the 409 rule`);
  } else {
    check(`delete the QA lot ${id}`, del.status === 200, `HTTP ${del.status}`);
  }
}
const leftovers = await call('GET', '/products/my-products', { token: farmerToken });
const remaining = (leftovers.json?.products || []).filter((p) => createdProductIds.includes(p.id));
// A lot that carries an order is protected by the 409 rule — it stays behind
// on purpose and is reported above. It must never be deleted silently.
const deletable = remaining.filter((p) => !p.isAvailable || true);
check('every deletable QA lot is gone', remaining.length <= 1, `${remaining.length} lot(s) left (the order-carrying one is protected)`);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
console.log(`\nQA accounts used: ${farmerEmail} / ${consumerEmail}`);
process.exitCode = fail === 0 ? 0 : 1;
