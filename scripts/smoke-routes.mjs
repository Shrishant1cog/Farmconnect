#!/usr/bin/env node
/**
 * FarmConnect — route smoke test.
 *
 * Requests every public website route and every public API endpoint against a
 * deployed environment and prints the real HTTP status of each response.
 *
 *   node scripts/smoke-routes.mjs
 *   node scripts/smoke-routes.mjs --web https://farmconnect-web.onrender.com \
 *                                 --api https://farmconnect-api-sn98.onrender.com/api
 *
 * The script never fabricates a result: a route that cannot be reached is
 * reported as `ERROR` with the transport error, and an HTTP error status is
 * reported verbatim.
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

const WEB = arg('web', 'https://farmconnect-web.onrender.com').replace(/\/+$/, '');
const API = arg('api', 'https://farmconnect-api-sn98.onrender.com/api').replace(/\/+$/, '');
const OUT = arg('out', path.join(ROOT, 'docs', 'route-smoke-report.json'));

// ---------------------------------------------------------------------------
// Route inventory
// ---------------------------------------------------------------------------

const WEB_ROUTES = [
  { route: '/', entry: 'Navbar — FarmConnect logo', role: 'public' },
  { route: '/login', entry: 'Navbar — Sign In', role: 'public' },
  { route: '/register', entry: 'Navbar — Register', role: 'public' },
  { route: '/consumer/explore', entry: 'Navbar — Marketplace', role: 'public' },
  { route: '/mandi-rates', entry: 'Navbar — Mandi Rates', role: 'public' },
  { route: '/consumer/map', entry: 'Navbar — Farm Map', role: 'public' },
  { route: '/buy', entry: 'Home — browse lots', role: 'public' },
  { route: '/checkout', entry: 'Explore — add to cart', role: 'CONSUMER' },
  { route: '/products/unknown-id', entry: 'Explore — listing card', role: 'public' },
  { route: '/consumer/orders', entry: 'Navbar — My Orders', role: 'CONSUMER' },
  { route: '/consumer/chats', entry: 'Home shell — Chat', role: 'CONSUMER' },
  { route: '/consumer/enquiries', entry: 'Home shell — Enquiries', role: 'CONSUMER' },
  { route: '/consumer/enquiries/unknown-id', entry: 'Enquiries list — row', role: 'CONSUMER' },
  { route: '/consumer/farmer/unknown-id', entry: 'Listing — farmer name', role: 'public' },
  { route: '/chat/unknown-id', entry: 'Enquiry — open chat', role: 'CONSUMER' },
  { route: '/farmer/dashboard', entry: 'Navbar — Farmer Hub', role: 'FARMER' },
  { route: '/farmer/products', entry: 'Farmer dashboard — Lots', role: 'FARMER' },
  { route: '/farmer/orders', entry: 'Farmer dashboard — Orders', role: 'FARMER' },
  { route: '/farmer/inquiries', entry: 'Farmer dashboard — Enquiries', role: 'FARMER' },
  { route: '/seller', entry: 'Home — seller entry', role: 'FARMER' },
  { route: '/seller/orders', entry: 'Seller workspace — Orders', role: 'FARMER' },
  { route: '/admin/dashboard', entry: 'Admin entry', role: 'ADMIN' },
];

const API_ROUTES = [
  { route: '/health', auth: false, note: 'liveness + database probe' },
  { route: '/catalog/categories', auth: false, note: 'crop categories with counts' },
  { route: '/catalog/crops', auth: false, note: 'crop catalogue' },
  { route: '/catalog/crops?search=Tomato', auth: false, note: 'crop catalogue search (en)' },
  { route: '/catalog/crops?search=ಟೊಮೇಟೊ', auth: false, note: 'crop catalogue search (kn)' },
  { route: '/catalog/crops?search=टमाटर', auth: false, note: 'crop catalogue search (hi)' },
  { route: '/catalog/crops?category=vegetables', auth: false, note: 'crop catalogue by category' },
  { route: '/products', auth: false, note: 'public catalogue' },
  { route: '/products?crop=Tomato', auth: false, note: 'catalogue filtered by crop' },
  { route: '/products?category=vegetables', auth: false, note: 'catalogue filtered by category' },
  { route: '/products?search=QA', auth: false, note: 'catalogue filtered by search' },
  { route: '/users/farmers', auth: false, note: 'public farmer directory' },
  { route: '/auth/me', auth: true, note: 'profile of the signed-in account' },
  { route: '/users/me', auth: true, note: 'profile incl. preferredLanguage' },
  { route: '/products/my-products', auth: true, note: 'farmer inventory' },
  { route: '/orders/my', auth: true, note: 'consumer orders' },
  { route: '/orders/farmer', auth: true, note: 'farmer orders' },
  { route: '/enquiries/my', auth: true, note: 'consumer enquiries' },
  { route: '/enquiries/farmer', auth: true, note: 'farmer enquiries' },
  { route: '/favorites/', auth: true, note: 'favourites' },
  { route: '/notifications/', auth: true, note: 'notification inbox' },
  { route: '/complaints/mine', auth: true, note: 'own complaints' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function probe(url, options = {}) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timer);

    let body = '';
    try {
      body = (await response.text()).slice(0, 400);
    } catch {
      body = '<body unreadable>';
    }

    return {
      status: response.status,
      ok: response.ok,
      location: response.headers.get('location'),
      ms: Date.now() - started,
      body,
    };
  } catch (error) {
    return {
      status: null,
      ok: false,
      error: error?.message || String(error),
      ms: Date.now() - started,
    };
  }
}

function summarise(result) {
  if (result.status === null) return `ERROR (${result.error})`;
  if (result.status >= 300 && result.status < 400) {
    return `${result.status} -> ${result.location || 'redirect'}`;
  }
  return String(result.status);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(`Website : ${WEB}`);
console.log(`API     : ${API}`);
console.log('');

const report = { generatedAt: new Date().toISOString(), web: WEB, api: API, website: [], api: [] };

console.log('WEBSITE ROUTES');
console.log('-'.repeat(96));
for (const item of WEB_ROUTES) {
  const result = await probe(`${WEB}${item.route}`);
  report.website.push({ ...item, ...result });
  console.log(
    `${item.route.padEnd(42)} ${String(summarise(result)).padEnd(26)} ${String(result.ms).padStart(6)} ms  (${item.role})`,
  );
}

console.log('');
console.log('API ROUTES');
console.log('-'.repeat(96));
for (const item of API_ROUTES) {
  const result = await probe(`${API}${item.route}`);
  report.api.push({ ...item, ...result });
  console.log(
    `${item.route.padEnd(42)} ${String(summarise(result)).padEnd(26)} ${String(result.ms).padStart(6)} ms  (${item.auth ? 'auth' : 'public'})`,
  );
}

fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log('');
console.log(`Report written to ${path.relative(ROOT, OUT)}`);
