// Verifies the multilingual catalogue and the real APMC benchmark endpoint
// against the **deployed** backend.
//
//   node scripts/verify-localised-catalogue.mjs
//
// Every check is a real HTTP request against the shared API that serves both
// the website and the Android app. The script never fabricates a result: a
// check that cannot be satisfied is reported as FAILED.
const API =
  process.env.API_BASE_URL || 'https://farmconnect-api-sn98.onrender.com/api';

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -> ${detail}` : ''}`);
}

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

// ---------------------------------------------------------------------------
// 1. The categories carry their Kannada and Hindi display names
// ---------------------------------------------------------------------------
{
  const { status, body } = await getJson('/catalog/categories');
  const list = body?.data || body?.categories || [];

  if (status !== 200 || !Array.isArray(list) || list.length === 0) {
    record('categories are returned', false, `HTTP ${status}`);
  } else {
    record('categories are returned', true, `${list.length} categories`);

    const withKn = list.filter((c) => c.nameKn && c.nameKn.trim()).length;
    const withHi = list.filter((c) => c.nameHi && c.nameHi.trim()).length;
    record(
      'every category carries a Kannada and a Hindi name',
      withKn === list.length && withHi === list.length,
      `${withKn}/${list.length} kn, ${withHi}/${list.length} hi`,
    );

    const grains = list.find((c) => c.slug === 'grains-millets');
    record(
      'Grains & Millets resolves to the real database record',
      Boolean(grains),
      grains ? `${grains.name} / ${grains.nameKn} / ${grains.nameHi}` : 'not found',
    );
  }
}

// ---------------------------------------------------------------------------
// 2. The crop catalogue carries its display names and is searchable in all
//    three languages
// ---------------------------------------------------------------------------
{
  const { status, body } = await getJson('/catalog/crops?limit=200');
  const list = body?.data || body?.crops || [];

  if (status !== 200 || !Array.isArray(list) || list.length === 0) {
    record('crop catalogue is returned', false, `HTTP ${status}`);
  } else {
    record('crop catalogue is returned', true, `${list.length} crops`);

    const withKn = list.filter((c) => c.nameKn && c.nameKn.trim()).length;
    const withHi = list.filter((c) => c.nameHi && c.nameHi.trim()).length;
    record(
      'every crop carries a Kannada and a Hindi name',
      withKn === list.length && withHi === list.length,
      `${withKn}/${list.length} kn, ${withHi}/${list.length} hi`,
    );

    const tomato = list.find((c) => c.name === 'Tomato');
    record(
      'Tomato carries its native names and a real category id',
      Boolean(tomato && tomato.nameKn && tomato.nameHi && tomato.categoryId),
      tomato ? `${tomato.nameKn} / ${tomato.nameHi} / category ${tomato.category}` : 'not found',
    );
  }

  for (const [term, language] of [
    ['Tomato', 'en'],
    ['ಟೊಮೇಟೊ', 'kn'],
    ['टमाटर', 'hi'],
  ]) {
    const { status: searchStatus, body: searchBody } = await getJson(
      `/catalog/crops?search=${encodeURIComponent(term)}`,
    );
    const found = (searchBody?.data || searchBody?.crops || []).some(
      (c) => c.name === 'Tomato',
    );
    record(
      `the catalogue finds Tomato when it is searched in ${language}`,
      searchStatus === 200 && found,
      `HTTP ${searchStatus}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. The product filter finds a listing through any of the three languages
// ---------------------------------------------------------------------------
{
  const english = await getJson('/products?crop=Tomato');
  const kannada = await getJson(`/products?crop=${encodeURIComponent('ಟೊಮೇಟೊ')}`);
  const hindi = await getJson(`/products?crop=${encodeURIComponent('टमाटर')}`);

  const count = (body) => {
    const list = body?.data || body?.products || [];
    return Array.isArray(list) ? list.length : -1;
  };

  const en = count(english.body);
  const kn = count(kannada.body);
  const hi = count(hindi.body);

  record(
    'the crop filter answers the same for English, Kannada and Hindi',
    en === kn && en === hi,
    `en=${en} kn=${kn} hi=${hi}`,
  );

  // Every listed crop must really be a tomato.
  const list = english.body?.data || english.body?.products || [];
  const onlyTomato = Array.isArray(list)
    ? list.every((p) => String(p.cropName || '').toLowerCase().includes('tomato'))
    : false;
  record('the filtered catalogue really contains tomatoes', onlyTomato, `${en} rows`);
}

// ---------------------------------------------------------------------------
// 4. The APMC endpoint returns the real rows (and nothing invented)
// ---------------------------------------------------------------------------
{
  const { status, body } = await getJson('/apmc/rates');
  const list = body?.data || body?.rates || [];

  record(
    'the APMC endpoint answers with the real rows',
    status === 200 && Array.isArray(list),
    `HTTP ${status}, ${Array.isArray(list) ? list.length : 'not an array'} rows`,
  );

  if (Array.isArray(list) && list.length > 0) {
    const complete = list.every(
      (row) =>
        row.commodity &&
        row.marketCenter &&
        row.state &&
        typeof row.modalPrice === 'number' &&
        typeof row.minPrice === 'number' &&
        typeof row.maxPrice === 'number',
    );
    record('every published row is complete', complete, `${list.length} rows`);

    const withKn = list.filter((r) => r.commodityNameKn).length;
    const withHi = list.filter((r) => r.commodityNameHi).length;
    record(
      'every published row carries its localised commodity name',
      withKn === list.length && withHi === list.length,
      `${withKn}/${list.length} kn, ${withHi}/${list.length} hi`,
    );
  } else {
    console.log(
      'NOTE  the shared APMC table holds no row yet - the clients show their honest empty state',
    );
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log('');
console.log(`${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length === 0 ? 0 : 1);
