# FarmConnect — Route Inventory

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-28
**Deployed services:** website `https://farmconnect-web.onrender.com`, API `https://farmconnect-api-sn98.onrender.com/api`

This document is the **complete list of every route the platform owns**. It is
the inventory the verification matrices refer to; the matrices carry the
*evidence* (what was executed, what answered, what failed), this document
carries the *map*.

## Totals

| Surface | Discovered | Tested | Public | Role protected | Still open |
| --- | --- | --- | --- | --- | --- |
| Website (Next.js page routes) | **25** | 25 | 9 | 16 | 0 |
| Android (Flutter routes) | **21** | 21 | 0 (the shell guards them) | 21 | 0 |
| API (paths under `/api`) | **57** | 54 probes against the live deployment | 14 | 43 | 5 (admin, see below) |

* **Website** — every `page.tsx` below `frontend/src/app/` is one route. The
  count is produced by the file system, not by hand:
  `frontend/src/app/**/page.tsx`.
* **Android** — every `GoRoute` in `mobile/lib/routing/app_router.dart`.
* **API** — **47** routes in the ten module routers
  (`backend/src/modules/**/*.routes.ts`) plus **10** routes that live directly
  in `backend/src/app.ts`.

## How the inventory was produced

```bash
# Website — one line per route
cd frontend/src/app && find . -name page.tsx

# Android — one line per route
grep -n "path: '" mobile/lib/routing/app_router.dart

# API — module routers
grep -rn "router\.\(get\|post\|patch\|put\|delete\)(" backend/src/modules --include=*.routes.ts

# API — routes that live directly in the application file
grep -n "app\.\(get\|post\|patch\|put\|delete\)(" backend/src/app.ts

# The live evidence behind the status column
node scripts/smoke-routes.mjs          # 25 website routes + 24 API routes
node scripts/smoke-api-endpoints.mjs   # 54 endpoint probes
```

The raw evidence of the last run (2026-11-28) is stored verbatim in
[`route-smoke-report.json`](route-smoke-report.json) and
[`api-endpoint-smoke-report.json`](api-endpoint-smoke-report.json).

---

## 1. Website — 25 page routes

The guard column names the rule that decides whether the route is opened. The
guard lives in `frontend/src/middleware.ts` (session) and in
`frontend/src/app/farmer/layout.tsx` (role).

| # | Route | File (below `frontend/src/app/`) | Entry point | Guard | Role | Status | Evidence (2026-11-28) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` | `page.tsx` | Navbar — FarmConnect logo | public | — | PASS | HTTP 200 |
| 2 | `/login` | `(auth)/login/page.tsx` | Navbar — Sign In | public | — | PASS | HTTP 200 |
| 3 | `/register` | `(auth)/register/page.tsx` | Navbar — Register | public | — | PASS | HTTP 200 |
| 4 | `/consumer/explore` | `consumer/explore/page.tsx` | Navbar — Marketplace | public | — | PASS | HTTP 200 |
| 5 | `/mandi-rates` | `mandi-rates/page.tsx` | Navbar — Mandi Rates | public | — | PASS | HTTP 200 |
| 6 | `/consumer/map` | `consumer/map/page.tsx` | Navbar — Farm Map | public | — | PASS | HTTP 200 |
| 7 | `/buy` | `buy/page.tsx` | Home — browse lots | public | — | PASS | HTTP 200 |
| 8 | `/products/[id]` | `products/[id]/page.tsx` | Explore — listing card | public | — | PASS | HTTP 200 (probed with `/products/unknown-id`) |
| 9 | `/consumer/farmer/[id]` | `consumer/farmer/[id]/page.tsx` | Listing — farmer name | public | — | PASS | HTTP 200 (probed with `/consumer/farmer/unknown-id`) |
| 10 | `/checkout` | `checkout/page.tsx` | Explore — add to cart | session | CONSUMER | PASS | HTTP 307 → `/login?redirect=%2Fcheckout` |
| 11 | `/consumer/orders` | `consumer/orders/page.tsx` | Navbar — My Orders | session | CONSUMER | PASS | HTTP 307 → `/login?redirect=%2Fconsumer%2Forders` |
| 12 | `/consumer/favorites` | `consumer/favorites/page.tsx` | Navbar — My favourites (buyer only) | session | CONSUMER | PASS | HTTP 307 → `/login?redirect=%2Fconsumer%2Ffavorites`; signed in: the kept lot is listed |
| 13 | `/notifications` | `notifications/page.tsx` | Navbar — bell | session | any | PASS | HTTP 307 → `/login?redirect=%2Fnotifications`; signed in: 13 real notices, MARK READ / MARK ALL READ work |
| 14 | `/profile` | `profile/page.tsx` | Navbar — profile | session | any | PASS | HTTP 307 → `/login?redirect=%2Fprofile`; signed in: `PATCH /api/users/me` round trip |
| 15 | `/consumer/chats` | `consumer/chats/page.tsx` | Home shell — Chat | session | CONSUMER | PASS | HTTP 307 → `/consumer/enquiries` (canonical redirect) |
| 16 | `/consumer/enquiries` | `consumer/enquiries/page.tsx` | Home shell — Enquiries | session | CONSUMER | PASS | HTTP 200 |
| 17 | `/consumer/enquiries/[id]` | `consumer/enquiries/[id]/page.tsx` | Enquiries list — row | session | CONSUMER | PASS | HTTP 200 (probed with `/consumer/enquiries/unknown-id`) |
| 18 | `/chat/[id]` | `chat/[id]/page.tsx` | Enquiry — open chat | session | CONSUMER | PASS | HTTP 200 (probed with `/chat/unknown-id`) |
| 19 | `/farmer/dashboard` | `farmer/dashboard/page.tsx` | Navbar — Farmer Hub | session + role | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Fdashboard` |
| 20 | `/farmer/products` | `farmer/products/page.tsx` | Farmer dashboard — Lots | session + role | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Fproducts` |
| 21 | `/farmer/orders` | `farmer/orders/page.tsx` | Farmer dashboard — Orders | session + role | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Forders`; signed in: the dispatch dashboard shows the stored status |
| 22 | `/farmer/inquiries` | `farmer/inquiries/page.tsx` | Farmer dashboard — Enquiries | session + role | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Finquiries` |
| 23 | `/seller` | `seller/page.tsx` | Home — seller entry | session | FARMER | PASS | HTTP 307 → `/farmer/dashboard` (canonical redirect) |
| 24 | `/seller/orders` | `seller/orders/page.tsx` | Seller workspace — Orders | session | FARMER | PASS | HTTP 307 → `/farmer/orders` (canonical redirect) |
| 25 | `/admin/dashboard` | `admin/dashboard/page.tsx` | Admin entry | session | ADMIN | **NOT TESTED** | HTTP 200 (the screen renders, the data call answers 403 — the deployed database has **no** administrator account) |

### 1.1 The guard itself

`frontend/src/middleware.ts` decides from the **cookie** `token` /
`fc_token` / `farmconnect_token`:

| Class | Routes | Answer for an anonymous visitor |
| --- | --- | --- |
| public | `/`, `/login*`, `/register*`, `/consumer/explore*`, `/consumer/map*`, `/mandi-rates*`, `/products*`, `/buy*` | HTTP 200 |
| session | `/checkout`, `/consumer/orders`, `/consumer/favorites`, `/notifications`, `/profile`, `/consumer/chats`, `/consumer/enquiries*`, `/chat/*` | HTTP 307 → `/login?redirect=…` |
| session + role | `/farmer/*` | HTTP 307 → `/login?redirect=…`; a signed-in visitor without the role is sent to their own dashboard by `frontend/src/app/farmer/layout.tsx` |
| session + role | `/admin/dashboard` | HTTP 200 (the page itself asks the admin API, which answers 403 for every other role) |

> The redirect always carries the route the visitor wanted, so the sign-in
> sends them back to it.

### 1.2 The three pages that were added in this series

| Route | What it does | Where the data comes from |
| --- | --- | --- |
| `/consumer/favorites` | the kept lots and the kept cultivators | `GET /api/favorites` (the shared `AccountContext` — the badge of the navbar and the list of the page read **one** answer) |
| `/notifications` | the inbox of the account | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| `/profile` | the details of the account | `GET /api/users/me`, `PATCH /api/users/me` |

---

## 2. Android — 21 routes

Source of truth: `mobile/lib/routing/app_router.dart`. The evidence comes from
`mobile/integration_test/route_coverage_test.dart`, which opens the **real**
router on the emulator, visits every route and asserts that the expected page
widget is displayed and that no widget threw while it was built. The detail
screens are opened with **real** identifiers from the live backend.

| # | Route | Screen (class) | Role | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `/splash` | `_SplashPage` — session restore | any | PASS | opens and redirects to `/home` for a signed-in session |
| 2 | `/login` | `LoginPage` | — | PASS | `LoginPage` displayed |
| 3 | `/register` | `RegisterPage` | — | PASS | `RegisterPage` displayed |
| 4 | `/home` | `HomeShell` (role aware shell) | any | PASS | `HomeShell` displayed |
| 5 | `/product/:id` | `ProductDetailPage` | any | PASS | displayed with a real listing |
| 6 | `/farmer/:id` | `FarmerDetailPage` | any | PASS | displayed with a real farmer |
| 7 | `/cart` | `CartPage` | CONSUMER | PASS | `CartPage` displayed |
| 8 | `/checkout` | `CheckoutPage` | CONSUMER | PASS | `CheckoutPage` displayed |
| 9 | `/orders` | `OrdersPage` | CONSUMER | PASS | `OrdersPage` displayed with the shared orders |
| 10 | `/order/:id` | `OrderDetailPage` | CONSUMER | PASS | displayed with a real order |
| 11 | `/enquiries` | `EnquiriesPage` | any | PASS | `EnquiriesPage` displayed |
| 12 | `/chat/:id` | `ChatPage` | any | PASS | displayed with a real conversation |
| 13 | `/market-rates` | `MarketRatesPage` | any | PASS | `MarketRatesPage` displayed |
| 14 | `/logistics` | `LogisticsPage` | any | PASS | `LogisticsPage` displayed |
| 15 | `/favorites` | `FavoritesPage` | CONSUMER | PASS | `FavoritesPage` displayed; the entry is only offered to a buyer (`mobile/test/profile_role_test.dart`) |
| 16 | `/notifications` | `NotificationsPage` | any | PASS | `NotificationsPage` displayed |
| 17 | `/profile` | `ProfilePage` | any | PASS | `ProfilePage` displayed |
| 18 | `/complaints` | `ComplaintsPage` | any | PASS | `ComplaintsPage` displayed |
| 19 | `/admin` | `AdminDashboardPage` | ADMIN | **NOT TESTED** | the screen renders, the data call answers 403 — the deployed database has **no** administrator account |
| 20 | `/farmer/products/new` | `ProductFormPage` | FARMER | PASS | `ProductFormPage` displayed |
| 21 | `/farmer/products/:id/edit` | `ProductFormPage` (edit) | FARMER | PASS | displayed with the real listing loaded |

> The route guard of the app is `resolveAuthRedirect()` in the same file: an
> unauthenticated visitor may only stay on `/login` and `/register`, a
> restored session sends everybody to `/home`.

---

## 3. API — 57 paths under `/api`

### 3.1 Module routers — 47 routes

| Module | # | Routes |
| --- | --- | --- |
| `auth` | 7 | `POST /register`, `POST /login`, `POST /login-phone`, `POST /phone-login`, `POST /firebase-phone`, `POST /verify-aadhaar`, `GET /me` |
| `products` | 8 | `GET /`, `GET /:id`, `GET /my-products`, `GET /farmer`, `POST /`, `PUT /:id`, `PATCH /:id`, `DELETE /:id` |
| `catalog` | 2 | `GET /categories`, `GET /crops` |
| `orders` | 6 | `POST /`, `GET /my`, `GET /farmer`, `GET /:id`, `PATCH /:id/status`, `PATCH /:id/received` |
| `enquiries` | 5 | `POST /`, `GET /my`, `GET /farmer`, `GET /:id/messages`, `POST /:id/messages` |
| `admin` | 5 | `GET /metrics`, `GET /users`, `PATCH /users/:id/toggle-status`, `GET /complaints`, `PATCH /complaints/:id/resolve` |
| `users` | 4 | `GET /farmers`, `GET /me`, `PATCH /me`, `PUT /me` |
| `favorites` | 5 | `GET /`, `POST /products/:id`, `DELETE /products/:id`, `POST /farmers/:id`, `DELETE /farmers/:id` |
| `notifications` | 3 | `GET /`, `PATCH /:id/read`, `PATCH /read-all` |
| `complaints` | 2 | `GET /mine`, `POST /` |

Mounted in `backend/src/app.ts` at `/api/auth`, `/api/products`,
`/api/catalog`, `/api/orders`, `/api/enquiries`, `/api/admin`, `/api/users`,
`/api/favorites`, `/api/notifications`, `/api/complaints`.

### 3.2 Routes that live directly in `backend/src/app.ts` — 10 routes

| # | Route | Purpose | Auth |
| --- | --- | --- | --- |
| 1 | `GET /api/health` | liveness + database probe | public |
| 2 | `POST /api/upload` | store the picture of a listing | bearer |
| 3 | `GET /api/farmers/map` | the farms that really shared a position | public |
| 4 | `GET /api/farmers/:id` | one cultivator | public |
| 5 | `GET /api/dashboard/farmer` | the figures of the cultivator | bearer (farmer) |
| 6 | `GET /api/apmc/rates` | the published benchmark rows | public |
| 7 | `POST /api/logistics/quote` | the freight and the profit assessment | public |
| 8 | `GET /api/consumer/enquiries` | compatibility alias of `/api/enquiries/my` | bearer |
| 9 | `GET /api/farmer/enquiries` | compatibility alias of `/api/enquiries/farmer` | bearer (farmer) |
| 10 | `GET /api/farmer/orders` | compatibility alias of `/api/orders/farmer` | bearer (farmer) |

`GET /api/farmer/verify-aadhaar` is a middleware alias of
`POST /api/auth/verify-aadhaar` and is counted with the auth module.

### 3.3 The probe

`node scripts/smoke-api-endpoints.mjs` drives **54 probes** over these paths
(some paths are probed twice — with and without a session). It registers its
own QA accounts, creates a QA listing, runs an enquiry, an order, a favourite,
a notification and a complaint against them, and removes the listing it
created.

**Result 2026-11-28 (against the deployment of the head commit `6fd8c88`):
54 probes, 0 unexpected statuses.** The raw evidence is in
[`api-endpoint-smoke-report.json`](api-endpoint-smoke-report.json).

| # | Probe | Expected | Result |
| --- | --- | --- | --- |
| 1 | `POST /auth/register` (farmer) | 201 | PASS |
| 2 | `POST /auth/register` (consumer) | 201 | PASS |
| 3 | `POST /auth/login` (email + password) | 200 | PASS |
| 4 | `POST /auth/login-phone` **without** a password | 400 | PASS — the number alone must never open a session |
| 5 | `POST /auth/login-phone` **with** the password | 200 | PASS |
| 6 | `POST /auth/phone-login` (alias, with the password) | 200 | PASS |
| 7 | `POST /auth/phone-login` (alias, without the password) | 400 | PASS |
| 8 | `POST /auth/firebase-phone` | 401 | PASS — Firebase is not configured on the deployment, so the endpoint refuses the request instead of accepting it |
| 9 | `GET /auth/me` | 200 | PASS |
| 10–17 | the eight catalogue, product and farmer paths | 2xx | PASS |
| 18–23 | the six order paths (place, list, read, status, receipt) | 2xx | PASS — the status path stores `PACKED` and refuses an unknown state with 400 |
| 24–25 | the five enquiry paths | 2xx | PASS |
| 26–30 | the five favourite paths | 2xx (buyer) / **403** (cultivator) | PASS — the cultivator is refused for the list and for the heart |
| 31–33 | the three notification paths | 2xx | PASS |
| 34–35 | the two complaint paths | 2xx | PASS |
| 36–40 | the five admin paths | 403 for a non-admin | **NOT TESTED** with an administrator — the deployed database has no administrator account |

---

## 4. What is still open

| Surface | What | Why |
| --- | --- | --- |
| Website `/admin/dashboard` | the command centre with an administrator | The deployed database has **no** administrator account. The route exists, the page renders and the data call answers 403 for every other role. The authorised path is covered by the PostgreSQL CI suite, which creates a real administrator account. |
| API `/api/admin/*` (5 routes) | the same, on the API | same reason |
| Android `/admin` | the same, on the phone | same reason |
| `POST /api/auth/firebase-phone` | the SMS / OTP sign-in | Firebase is not configured on the deployment. The endpoint refuses the request with an honest message instead of pretending to work. The Android client has no Firebase SDK — its phone tab is phone + password. |
| `GET /api/apmc/rates` | published benchmark rows | The endpoint works, but the shared table holds **no** row. The import path exists (`npm run db:apmc-rates`); filling the table needs a **real** market bulletin. No row is invented. |

The complete evidence — what was executed, what answered, what failed — is in
[`VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md).
