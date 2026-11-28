#!/usr/bin/env node
/**
 * FarmConnect — live verification of the multilingual + multiple crop features
 * against the DEPLOYED Render API.
 *
 *   node scripts/live-verify.mjs
 *
 * Every result printed here is the real HTTP response of the deployed service.
 * The script creates its own QA account and removes the listings it created.
 *
 * The account itself cannot be removed — the shared backend has no
 * account-deletion endpoint — so one QA account per run stays behind. That is
 * a documented limitation, see docs/MULTILINGUAL_AND_CROPS.md section 7.
 */

const API = (process.env.API_BASE || 'https://farmconnect-api-sn98.onrender.com/api').replace(/\/+$/, '');
const runId = Date.now();
const email = `i18n.qa.farmer.${runId}@farmconnect.test`;
const phone = `9${String(runId).slice(-9)}`;
const password = 'QaPass!2026';

let pass = 0;
let fail = 0;
const createdProductIds = [];

function check(label, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`PASS  ${label}${detail ? ` -> ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${label}${detail ? ` -> ${detail}` : ''}`);
  }
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

console.log(`API: ${API}`);
console.log(`QA account: ${email}\n`);

// ---------------------------------------------------------------------------
console.log('--- 1. register a farmer on the shared backend ---');
const reg = await call('POST', '/auth/register', {
  body: {
    name: 'i18n QA Fields',
    phone,
    email,
    password,
    role: 'FARMER',
    pincode: '571401',
    state: 'Karnataka',
    district: 'Mandya',
    taluk: 'Mandya',
    addressLine: 'QA verification field',
    farmName: 'i18n QA Fields',
    showOnMap: false,
  },
});
check('register farmer', reg.status === 201 || reg.status === 200, `HTTP ${reg.status}`);
const token = reg.json?.data?.token || reg.json?.token;
const userId = reg.json?.data?.user?.id || reg.json?.user?.id;
check('register returns a token', Boolean(token));
check('register response carries preferredLanguage', reg.json?.data?.preferredLanguage === 'en' || reg.json?.preferredLanguage === 'en', String(reg.json?.data?.preferredLanguage ?? reg.json?.preferredLanguage));

// ---------------------------------------------------------------------------
console.log('\n--- 1b. the language may already be chosen during sign-up ---');
const regKn = await call('POST', '/auth/register', {
  body: {
    name: 'i18n QA Fields Kannada',
    phone: `8${String(runId).slice(-9)}`,
    email: `i18n.qa.kn.${runId}@farmconnect.test`,
    password,
    role: 'CONSUMER',
    preferredLanguage: 'kn-IN',
  },
});
check('register with a regional language code', regKn.status === 201 || regKn.status === 200, `HTTP ${regKn.status}`);
check('the regional code is stored canonically', regKn.json?.data?.preferredLanguage === 'kn', String(regKn.json?.data?.preferredLanguage));

const regBad = await call('POST', '/auth/register', {
  body: {
    name: 'i18n QA Fields Unsupported',
    phone: `7${String(runId).slice(-9)}`,
    email: `i18n.qa.de.${runId}@farmconnect.test`,
    password,
    role: 'CONSUMER',
    preferredLanguage: 'de',
  },
});
check('register with an unsupported language is rejected', regBad.status === 400, `HTTP ${regBad.status}`);

// ---------------------------------------------------------------------------
console.log('\n--- 2. the account language is stored and returned to both clients ---');
const patchKn = await call('PATCH', '/users/me', { token, body: { preferredLanguage: 'kn' } });
check('PATCH /users/me preferredLanguage=kn', patchKn.status === 200, `HTTP ${patchKn.status}`);
check('PATCH response echoes preferredLanguage=kn', patchKn.json?.data?.preferredLanguage === 'kn', String(patchKn.json?.data?.preferredLanguage));

const meKn = await call('GET', '/users/me', { token });
check('GET /users/me returns preferredLanguage=kn', meKn.json?.data?.preferredLanguage === 'kn', String(meKn.json?.data?.preferredLanguage));

const loginKn = await call('POST', '/auth/login', { body: { email, password } });
check('login response carries preferredLanguage=kn', loginKn.json?.data?.preferredLanguage === 'kn', String(loginKn.json?.data?.preferredLanguage));
check('login response carries preferredLanguage inside the user object', loginKn.json?.data?.user?.preferredLanguage === 'kn', String(loginKn.json?.data?.user?.preferredLanguage));

const patchHi = await call('PATCH', '/users/me', { token, body: { preferredLanguage: 'hi' } });
check('PATCH preferredLanguage=hi', patchHi.status === 200 && patchHi.json?.data?.preferredLanguage === 'hi', String(patchHi.json?.data?.preferredLanguage));

const patchBad = await call('PATCH', '/users/me', { token, body: { preferredLanguage: 'de' } });
check('an unsupported language is rejected', patchBad.status === 400, `HTTP ${patchBad.status}`);

const patchRegional = await call('PATCH', '/users/me', { token, body: { preferredLanguage: 'kn-IN' } });
check('a regional code normalises to the supported code', patchRegional.status === 200 && patchRegional.json?.data?.preferredLanguage === 'kn', String(patchRegional.json?.data?.preferredLanguage));

const patchAlias = await call('PATCH', '/users/me', { token, body: { preferredLanguage: 'Hindi' } });
check('a language name alias normalises to the supported code', patchAlias.status === 200 && patchAlias.json?.data?.preferredLanguage === 'hi', String(patchAlias.json?.data?.preferredLanguage));

await call('PATCH', '/users/me', { token, body: { preferredLanguage: 'en' } });

// ---------------------------------------------------------------------------
console.log('\n--- 3. the shared crop catalogue ---');
const cats = await call('GET', '/catalog/categories');
check('GET /catalog/categories', cats.status === 200 && Array.isArray(cats.json?.data) && cats.json.data.length > 0, `${cats.json?.data?.length} categories`);
const grains = (cats.json?.data || []).find((c) => /grain|millet/i.test(c.name) || /grain|millet/i.test(c.slug || ''));
const vegetables = (cats.json?.data || []).find((c) => /vegetable/i.test(c.name) || /vegetable/i.test(c.slug || ''));
check('the live Grains & Millets category is present', Boolean(grains), grains ? `${grains.name} (${grains.slug})` : 'missing');

for (const [label, term] of [['English', 'Tomato'], ['Kannada', 'ಟೊಮೇಟೊ'], ['Hindi', 'टमाटर']]) {
  const res = await call('GET', `/catalog/crops?search=${encodeURIComponent(term)}`);
  const found = (res.json?.data || []).some((c) => c.name === 'Tomato');
  check(`crop catalogue finds Tomato by ${label} name`, res.status === 200 && found, `${res.json?.total} result(s)`);
}

const cropsByCategory = await call('GET', `/catalog/crops?category=${encodeURIComponent(grains.slug)}`);
const cropIds = (cropsByCategory.json?.data || []).map((c) => c.categoryId);
check('catalogue crops carry the real live categoryId', cropIds.length > 0 && cropIds.every((id) => Boolean(id)), `${cropIds.length} crops for ${grains.slug}`);

// ---------------------------------------------------------------------------
console.log('\n--- 4. two independent crop lots for the same farmer ---');
const lotA = await call('POST', '/products', {
  token,
  body: {
    title: `QA-Tomato-Lot-${runId}`,
    cropName: 'Tomato',
    variety: 'Hybrid',
    description: 'First independent QA crop lot.',
    categoryId: vegetables.id,
    farmerPrice: 22.5,
    priceUnit: 'PER_KG',
    quantityAvailable: 180,
    quantityUnit: 'KG',
    minOrderKg: 25,
    isOrganic: false,
  },
});
check('create crop lot A (Tomato)', lotA.status === 201, `HTTP ${lotA.status}`);
check('lot A stores its own cropName and variety', lotA.json?.data?.cropName === 'Tomato' && lotA.json?.data?.variety === 'Hybrid', `${lotA.json?.data?.cropName} / ${lotA.json?.data?.variety}`);
if (lotA.json?.data?.id) createdProductIds.push(lotA.json.data.id);

const lotB = await call('POST', '/products', {
  token,
  body: {
    title: `QA-Ragi-Lot-${runId}`,
    cropName: 'Ragi',
    variety: 'Local',
    description: 'Second independent QA crop lot.',
    categoryId: grains.id,
    farmerPrice: 48,
    priceUnit: 'PER_KG',
    quantityAvailable: 90,
    quantityUnit: 'KG',
    minOrderKg: 25,
    isOrganic: false,
  },
});
check('create crop lot B (Ragi)', lotB.status === 201, `HTTP ${lotB.status}`);
if (lotB.json?.data?.id) createdProductIds.push(lotB.json.data.id);

check('the two lots are different records', lotA.json?.data?.id !== lotB.json?.data?.id);

// ---------------------------------------------------------------------------
console.log('\n--- 5. editing one lot never touches the other ---');
const patchLot = await call('PATCH', `/products/${lotA.json?.data?.id}`, {
  token,
  body: { farmerPrice: 27.5, quantityAvailable: 150 },
});
check('edit lot A price and quantity', patchLot.status === 200, `HTTP ${patchLot.status}`);
check('lot A keeps the new price', Number(patchLot.json?.data?.farmerPrice) === 27.5, String(patchLot.json?.data?.farmerPrice));
check('lot A keeps its own crop', patchLot.json?.data?.cropName === 'Tomato', String(patchLot.json?.data?.cropName));

const lotBAfter = await call('GET', `/products/${lotB.json?.data?.id}`);
check('lot B price is untouched', Number(lotBAfter.json?.data?.farmerPrice) === 48, String(lotBAfter.json?.data?.farmerPrice));
check('lot B quantity is untouched', Number(lotBAfter.json?.data?.quantityAvailable) === 90, String(lotBAfter.json?.data?.quantityAvailable));
check('lot B crop is untouched', lotBAfter.json?.data?.cropName === 'Ragi', String(lotBAfter.json?.data?.cropName));

const toggle = await call('PATCH', `/products/${lotA.json?.data?.id}`, { token, body: { isAvailable: false } });
check('availability can be toggled independently', toggle.status === 200 && toggle.json?.data?.isAvailable === false, String(toggle.json?.data?.isAvailable));

// The public catalogue only lists available lots, so the tomato lot has to
// be put back on the market before the crop filter can be exercised.
const putBack = await call('PATCH', `/products/${lotA.json?.data?.id}`, { token, body: { isAvailable: true } });
check('the lot can be put back on the market', putBack.status === 200 && putBack.json?.data?.isAvailable === true, String(putBack.json?.data?.isAvailable));

// ---------------------------------------------------------------------------
console.log('\n--- 6. the farmer inventory lists every lot separately ---');
const mine = await call('GET', '/products/my-products', { token });
const mineIds = (mine.json?.data || []).map((p) => p.id);
check('the inventory contains both lots', mineIds.includes(lotA.json?.data?.id) && mineIds.includes(lotB.json?.data?.id), `${(mine.json?.data || []).length} lot(s)`);

// ---------------------------------------------------------------------------
console.log('\n--- 7. the shared catalogue filters by crop type ---');
const byTomato = await call('GET', '/products?crop=Tomato');
const tomatoIds = (byTomato.json?.data || []).map((p) => p.id);
check('crop=Tomato returns the tomato lot', tomatoIds.includes(lotA.json?.data?.id), `${tomatoIds.length} match(es)`);
check('crop=Tomato excludes the ragi lot', !tomatoIds.includes(lotB.json?.data?.id));

const byRagi = await call('GET', '/products?crop=Ragi');
const ragiIds = (byRagi.json?.data || []).map((p) => p.id);
check('crop=Ragi returns the ragi lot', ragiIds.includes(lotB.json?.data?.id), `${ragiIds.length} match(es)`);
check('crop=Ragi excludes the tomato lot', !ragiIds.includes(lotA.json?.data?.id));

const byCategory = await call('GET', `/products?category=${encodeURIComponent(grains.slug)}`);
const categoryIds = (byCategory.json?.data || []).map((p) => p.id);
check(`category=${grains.slug} returns the ragi lot`, categoryIds.includes(lotB.json?.data?.id), `${categoryIds.length} match(es)`);
check(`category=${grains.slug} excludes the tomato lot`, !categoryIds.includes(lotA.json?.data?.id));

const byCategoryId = await call('GET', `/products?categoryId=${encodeURIComponent(grains.id)}`);
const categoryIdIds = (byCategoryId.json?.data || []).map((p) => p.id);
check('categoryId filters the shared catalogue', categoryIdIds.includes(lotB.json?.data?.id) && !categoryIdIds.includes(lotA.json?.data?.id), `${categoryIdIds.length} match(es)`);

// A sold-out lot must disappear from the public catalogue.
await call('PATCH', `/products/${lotA.json?.data?.id}`, { token, body: { isAvailable: false } });
const soldOut = await call('GET', '/products?crop=Tomato');
check('a sold-out lot disappears from the public crop filter', !(soldOut.json?.data || []).map((p) => p.id).includes(lotA.json?.data?.id));

// the lot must be visible again once it is put back on the market
await call('PATCH', `/products/${lotA.json?.data?.id}`, { token, body: { isAvailable: true } });
const backOnMarket = await call('GET', '/products?crop=Tomato');
check('the lot returns to the public crop filter', (backOnMarket.json?.data || []).map((p) => p.id).includes(lotA.json?.data?.id));

// ---------------------------------------------------------------------------
console.log('\n--- 7b. no fabricated benchmark, route or success state ---');

// The APMC table of the shared database is empty, so the benchmark of a
// listing has to be `null` — never the farmer's own price times a factor.
const catalogue = await call('GET', '/products?crop=Tomato');
const tomatoLots = catalogue.json?.data || [];
const benchmarksAreNull = tomatoLots.every(
  (p) => p.mandiBenchmark === null || p.mandiBenchmark === undefined,
);
check(
  'no listing carries a fabricated APMC benchmark',
  benchmarksAreNull,
  `${tomatoLots.length} lot(s), benchmark = ${tomatoLots[0]?.mandiBenchmark ?? 'null'}`,
);

// A logistics quote without the mandatory inputs has to be rejected — the
// endpoint may not substitute a default quantity, price or coordinate.
const quoteMissing = await call('POST', '/logistics/quote', {
  body: { cropQuantityKg: 100 },
});
check(
  'a logistics quote without the mandatory inputs is rejected',
  quoteMissing.status === 400,
  `HTTP ${quoteMissing.status}`,
);
check(
  'the rejection names the missing fields',
  Array.isArray(quoteMissing.json?.missing) && quoteMissing.json.missing.includes('farmerPricePerKg'),
  JSON.stringify(quoteMissing.json?.missing || []),
);

// Half a position is not a position.
const quoteHalf = await call('POST', '/logistics/quote', {
  body: {
    cropQuantityKg: 100,
    farmerPricePerKg: 20,
    originLat: 12.5218,
    destLat: 12.9716,
    destLon: 77.5946,
  },
});
check(
  'a logistics quote with half a position is rejected',
  quoteHalf.status === 400,
  `HTTP ${quoteHalf.status}`,
);

// With real inputs the quote is answered, but the profit against the mandi
// stays unknown because no benchmark was published.
const quoteReal = await call('POST', '/logistics/quote', {
  body: {
    cropQuantityKg: 100,
    farmerPricePerKg: 20,
    originLat: 12.5218,
    originLon: 76.8951,
    destLat: 12.9716,
    destLon: 77.5946,
    containerType: 'STANDARD_CRATE',
  },
});
check('a logistics quote with real inputs is answered', quoteReal.status === 200, `HTTP ${quoteReal.status}`);
const assessment = quoteReal.json?.data?.profitAssessment || {};
check(
  'the quote reports that no APMC benchmark was published',
  assessment.hasApmcBenchmark === false,
  `hasApmcBenchmark = ${assessment.hasApmcBenchmark}`,
);
check(
  'the quote does not invent a benchmark rate',
  assessment.apmcBenchmarkRatePerKg === null || assessment.apmcBenchmarkRatePerKg === undefined,
  `apmcBenchmarkRatePerKg = ${assessment.apmcBenchmarkRatePerKg ?? 'null'}`,
);
check(
  'the quote does not invent a profit',
  assessment.approxNetProfit === null || assessment.approxNetProfit === undefined,
  `approxNetProfit = ${assessment.approxNetProfit ?? 'null'}`,
);
check(
  'the landed cost is computed from the real inputs',
  Number(quoteReal.json?.data?.breakdown?.farmerProduceCost) === 2000,
  `farmerProduceCost = ${quoteReal.json?.data?.breakdown?.farmerProduceCost}`,
);

// ---------------------------------------------------------------------------
console.log('\n--- 7c. a position is stored only when it is really shared ---');

// The QA account registered without a position, so the profile must not
// carry one — in particular not the old placeholder.
const profileBefore = await call('GET', '/users/me', { token });
const farmBefore = profileBefore.json?.data?.farmerProfile || profileBefore.json?.farmerProfile || {};
check(
  'a farmer without a shared position has no coordinates',
  farmBefore.latitude === null || farmBefore.latitude === undefined,
  `latitude = ${farmBefore.latitude ?? 'null'}`,
);

// A real position is stored ...
const patchPosition = await call('PATCH', '/users/me', {
  token,
  body: { latitude: 12.5231, longitude: 76.8962 },
});
const farmAfter = patchPosition.json?.data?.farmerProfile || patchPosition.json?.farmerProfile || {};
check(
  'a shared position is stored on the shared account',
  Number(farmAfter.latitude) === 12.5231 && Number(farmAfter.longitude) === 76.8962,
  `${farmAfter.latitude} / ${farmAfter.longitude}`,
);

// ... and a cleared position stays cleared instead of becoming the point 0/0.
const clearPosition = await call('PATCH', '/users/me', {
  token,
  body: { latitude: null, longitude: null },
});
const farmCleared = clearPosition.json?.data?.farmerProfile || clearPosition.json?.farmerProfile || {};
check(
  'a cleared position stays null instead of becoming 0',
  farmCleared.latitude === null || farmCleared.latitude === undefined,
  `latitude = ${farmCleared.latitude ?? 'null'}`,
);
check(
  'the cleared longitude stays null as well',
  farmCleared.longitude === null || farmCleared.longitude === undefined,
  `longitude = ${farmCleared.longitude ?? 'null'}`,
);

// A malformed coordinate is rejected instead of being stored.
const badPosition = await call('PATCH', '/users/me', {
  token,
  body: { latitude: 'not-a-number', longitude: 76.8962 },
});
check('a malformed coordinate is rejected', badPosition.status === 400, `HTTP ${badPosition.status}`);

// An out-of-range coordinate is rejected as well.
const outOfRange = await call('PATCH', '/users/me', {
  token,
  body: { latitude: 999, longitude: 76.8962 },
});
check('an out-of-range coordinate is rejected', outOfRange.status === 400, `HTTP ${outOfRange.status}`);

// ---------------------------------------------------------------------------
console.log('\n--- 8. cleanup ---');
for (const id of createdProductIds) {
  const del = await call('DELETE', `/products/${id}`, { token });
  check(`delete QA lot ${id.slice(0, 8)}`, del.status === 200 || del.status === 204, `HTTP ${del.status}`);
}
const afterDelete = await call('GET', '/products/my-products', { token });
const remaining = (afterDelete.json?.data || []).filter((p) => createdProductIds.includes(p.id));
check('no QA lot is left behind', remaining.length === 0, `${remaining.length} left`);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
console.log(`QA account used: ${email}`);
process.exit(fail === 0 ? 0 : 1);
