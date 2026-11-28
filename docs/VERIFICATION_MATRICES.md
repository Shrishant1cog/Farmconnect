# FarmConnect — Verification Matrices

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-28

Two matrices are kept here:

1. **Route coverage** — every website route, every API endpoint and every
   Android route, with the evidence that was collected for it.
2. **Cross-platform coverage** — the thirteen acceptance workflows that must
   work on the shared backend from either client.

## Status legend

| Status | Meaning |
| --- | --- |
| `PASS` | The route/workflow was executed and the recorded evidence shows the expected result. |
| `FAIL` | The route/workflow was executed and the recorded evidence shows a wrong result. |
| `NOT TESTED` | The route/workflow has **not** been executed yet. It is **not** a pass. |
| `BLOCKED` | The route/workflow cannot be executed in this environment; the reason is given. |

> **Rule:** a row is only marked `PASS` when there is recorded evidence (a
> command output, an HTTP status, a log line). Anything else stays
> `NOT TESTED`. No result is estimated, inferred or copied from another
> client.

### Deployed services under test

| Service | URL |
| --- | --- |
| API (shared backend for both clients) | `https://farmconnect-api-sn98.onrender.com/api` |
| Website | `https://farmconnect-web.onrender.com` |
| Socket.IO | `https://farmconnect-api-sn98.onrender.com` |

### Evidence files

| File | Produced by |
| --- | --- |
| `docs/route-smoke-report.json` | `node scripts/smoke-routes.mjs` |
| `docs/api-endpoint-smoke-report.json` | `node scripts/smoke-api-endpoints.mjs` |

A third script checks the multilingual catalogue against the deployed API:

| File | Produced by |
| --- | --- |
| — (console output only) | `node scripts/verify-localised-catalogue.mjs` |

---

## 1. Route coverage

### 1.1 Website (Next.js)

Source of truth: `frontend/src/app/**/page.tsx`. The HTTP evidence is
collected by `node scripts/smoke-routes.mjs` against the deployed website
(2026-11-28) and stored in `docs/route-smoke-report.json`.

A protected route answered with `307 -> /login?redirect=…` **is** the
expected result for an anonymous request: it proves the route exists and that
the authentication guard is active. A `308` is a Next.js permanent redirect
to the canonical route.

| # | Route | Entry point | Role | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `/` | Navbar — FarmConnect logo | public | PASS | HTTP 200 |
| 2 | `/login` | Navbar — Sign In | public | PASS | HTTP 200 |
| 3 | `/register` | Navbar — Register | public | PASS | HTTP 200 |
| 4 | `/consumer/explore` | Navbar — Marketplace | public | PASS | HTTP 200 |
| 5 | `/mandi-rates` | Navbar — Mandi Rates | public | PASS | HTTP 200 |
| 6 | `/consumer/map` | Navbar — Farm Map | public | PASS | HTTP 200 |
| 7 | `/buy` | Home — browse lots | public | PASS | HTTP 308 → `/checkout` (canonical redirect) |
| 8 | `/checkout` | Explore — add to cart | CONSUMER | PASS | HTTP 307 → `/login?redirect=%2Fcheckout` (auth guard) |
| 9 | `/products/[id]` | Explore — listing card | public | PASS | HTTP 200 (probed with `/products/unknown-id`) |
| 10 | `/consumer/orders` | Navbar — My Orders | CONSUMER | PASS | HTTP 307 → `/login?redirect=%2Fconsumer%2Forders` (auth guard) |
| 11 | `/consumer/chats` | Home shell — Chat | CONSUMER | PASS | HTTP 308 → `/consumer/enquiries` (canonical redirect) |
| 12 | `/consumer/enquiries` | Home shell — Enquiries | CONSUMER | PASS | HTTP 200 |
| 13 | `/consumer/enquiries/[id]` | Enquiries list — row | CONSUMER | PASS | HTTP 200 |
| 14 | `/consumer/farmer/[id]` | Listing — farmer name | public | PASS | HTTP 200 |
| 15 | `/chat/[id]` | Enquiry — open chat | CONSUMER | PASS | HTTP 200 |
| 16 | `/farmer/dashboard` | Navbar — Farmer Hub | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Fdashboard` (auth guard) |
| 17 | `/farmer/products` | Farmer dashboard — Lots | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Fproducts` (auth guard) |
| 18 | `/farmer/orders` | Farmer dashboard — Orders | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Forders` (auth guard) |
| 19 | `/farmer/inquiries` | Farmer dashboard — Enquiries | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Finquiries` (auth guard) |
| 20 | `/seller` | Home — seller entry | FARMER | PASS | HTTP 308 → `/farmer/dashboard` (canonical redirect) |
| 21 | `/seller/orders` | Seller workspace — Orders | FARMER | PASS | HTTP 308 → `/farmer/orders` (canonical redirect) |
| 22 | `/admin/dashboard` | Admin entry | ADMIN | PASS | HTTP 200 (the screen itself guards the data with the admin API) |

### 1.2 API (Express)

Source of truth: `backend/src/modules/**/*.routes.ts`.

The evidence comes from `node scripts/smoke-api-endpoints.mjs`, which drives
**every** endpoint with a real request — it registers its own QA accounts,
creates a QA listing, runs an enquiry, an order, a favourite, a notification
and a complaint against it, and finally removes the listing it created.
**50 probes, 0 unexpected statuses** (2026-11-28).

The two endpoints that live directly in `backend/src/app.ts` (and not in a
module router) are covered by `node scripts/smoke-routes.mjs` — they are rows
44 and 45 below.

| # | Endpoint | Purpose | Auth | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/health` | liveness + database probe | public | PASS | HTTP 200 — `{"status":"UP","database":"UP"}` |
| 2 | `POST /api/auth/register` | account creation | public | PASS | HTTP 201; the response carries `preferredLanguage`; `preferredLanguage: "kn-IN"` is stored as `kn`, an unsupported code is rejected with HTTP 400 |
| 3 | `POST /api/auth/login` | email + password sign-in | public | PASS | HTTP 200; the response carries `preferredLanguage` both at the top level of `data` and inside `data.user` |
| 4 | `POST /api/auth/login-phone` | phone sign-in | public | PASS | HTTP 200 (the documented weak path — see the limitations) |
| 5 | `POST /api/auth/phone-login` | phone sign-in (legacy alias) | public | PASS | HTTP 200 (same handler as `/login-phone`) |
| 6 | `POST /api/auth/firebase-phone` | Firebase phone OTP | public | PASS | HTTP 401 — Firebase is not configured on the deployment, so the endpoint rejects the request instead of accepting it (documented limitation) |
| 7 | `POST /api/auth/verify-aadhaar` | Aadhaar verification | bearer | PASS | HTTP 200 |
| 8 | `GET /api/auth/me` | profile of the signed-in account | bearer | PASS | HTTP 200 |
| 9 | `GET /api/catalog/categories` | crop categories with counts | public | PASS | HTTP 200 — 10 live categories, including `Grains & Millets` (`grains-millets`); **every** category carries its `nameKn` and `nameHi` |
| 10 | `GET /api/catalog/crops` | searchable crop catalogue | public | PASS | HTTP 200 — 78 crops (`?limit=200`, the default limit is 60); searchable by `Tomato`, `ಟೊಮೇಟೊ` and `टमाटर`; every crop carries the **live** `categoryId` **and** its `nameKn` / `nameHi` |
| 11 | `GET /api/products` | public catalogue feed | public | PASS | HTTP 200; `?crop=`, `?category=` and `?categoryId=` all filter correctly. The `search` / `?crop=` filter is **multilingual**: `?crop=Tomato`, `?crop=ಟೊಮೇಟೊ` and `?crop=टमाटर` all return the same 16 rows (verified by `scripts/verify-localised-catalogue.mjs`) |
| 12 | `POST /api/products` | create a crop listing | bearer (farmer) | PASS | HTTP 201; the stored `cropName` and `variety` are independent |
| 13 | `GET /api/products/[id]` | one listing | public | PASS | HTTP 200 |
| 14 | `PATCH /api/products/[id]` | edit one listing | bearer (owner) | PASS | HTTP 200 for the owner, HTTP 403 for a different account (the edit never reaches the database) |
| 15 | `DELETE /api/products/[id]` | delete one listing | bearer (owner) | PASS | HTTP 200 and the row is really gone; HTTP 409 with an explanation when the listing already carries an order; HTTP 403 for a different account |
| 16 | `GET /api/products/my-products` | farmer inventory | bearer (farmer) | PASS | HTTP 200 — every lot of the farmer is listed separately |
| 17 | `GET /api/products/farmer` | listings of the signed-in farmer | bearer (farmer) | PASS | HTTP 200 |
| 18 | `GET /api/users/me` | profile incl. `preferredLanguage` | bearer | PASS | HTTP 200 — `preferredLanguage` is returned |
| 19 | `PATCH /api/users/me` | update profile + language | bearer | PASS | HTTP 200; `kn-IN` → `kn`, `Hindi` → `hi`, `de` → HTTP 400 |
| 20 | `GET /api/users/farmers` | public farmer directory | public | PASS | HTTP 200 |
| 21 | `GET /api/orders/my` | consumer orders | bearer (consumer) | PASS | HTTP 200 |
| 22 | `GET /api/orders/farmer` | farmer orders | bearer (farmer) | PASS | HTTP 200 |
| 23 | `POST /api/orders` | place an order | bearer (consumer) | PASS | HTTP 201 — the lot quantity is reduced and the lot disappears from the catalogue when it is sold out |
| 24 | `GET /api/orders/[id]` | one order | bearer | PASS | HTTP 200 |
| 25 | `PATCH /api/orders/[id]/status` | order status | bearer (farmer) | PASS | HTTP 200 — `PACKED` and `IN_TRANSIT` are mapped to the real statuses |
| 26 | `PATCH /api/orders/[id]/received` | delivery confirmation | bearer (consumer) | PASS | HTTP 200 — the order becomes `DELIVERED` |
| 27 | `GET /api/enquiries/my` | consumer enquiries | bearer (consumer) | PASS | HTTP 200 |
| 28 | `GET /api/enquiries/farmer` | farmer enquiries | bearer (farmer) | PASS | HTTP 200 |
| 29 | `POST /api/enquiries` | create an enquiry | bearer | PASS | HTTP 201 |
| 30 | `GET /api/enquiries/[id]/messages` | enquiry messages | bearer | PASS | HTTP 200 |
| 31 | `POST /api/favorites/products/[id]` | favourite a listing | bearer | PASS | HTTP 201 |
| 32 | `POST /api/favorites/farmers/[id]` | favourite a farmer | bearer | PASS | HTTP 201 (the endpoint takes the `FarmerProfile.id`) |
| 33 | `GET /api/favorites` | favourites | bearer | PASS | HTTP 200 |
| 34 | `GET /api/notifications` | notification inbox | bearer | PASS | HTTP 200 — the inbox really contains the `NEW_ORDER` / `ORDER_STATUS` / `NEW_ENQUIRY` / `NEW_MESSAGE` entries |
| 35 | `PATCH /api/notifications/[id]/read` | mark one read | bearer | PASS | HTTP 200 — the entry becomes `isRead: true` |
| 36 | `PATCH /api/notifications/read-all` | mark all read | bearer | PASS | HTTP 200 |
| 37 | `GET /api/complaints/mine` | own complaints | bearer | PASS | HTTP 200 |
| 38 | `POST /api/complaints` | file a complaint | bearer | PASS | HTTP 201 |
| 39 | `GET /api/admin/users` | user administration | bearer (admin) | NOT TESTED | The route exists and the guard is active: HTTP 403 for a non-admin. The deployed database has **no administrator account** (registration only creates `FARMER`/`CONSUMER` and the seeded admin account is not present), so the endpoint could not be exercised with a valid admin token |
| 40 | `GET /api/admin/metrics` | platform metrics | bearer (admin) | NOT TESTED | HTTP 403 for a non-admin — same reason as row 39 |
| 41 | `GET /api/admin/complaints` | complaint queue | bearer (admin) | NOT TESTED | HTTP 403 for a non-admin — same reason as row 39 |
| 42 | `PATCH /api/admin/complaints/[id]/resolve` | resolve a complaint | bearer (admin) | NOT TESTED | No administrator account is available in the deployed environment |
| 43 | `PATCH /api/admin/users/[id]/toggle-status` | activate / suspend | bearer (admin) | NOT TESTED | No administrator account is available in the deployed environment |
| 44 | `GET /api/apmc/rates` | published APMC benchmark rates | public | PASS | HTTP 200 — the response carries the **real** rows of the shared database. The deployed table is currently **empty**, so the answer is `{"success":true,"data":[],"rates":[],"total":0}` — the endpoint never invents a price. The derived `category`, `categoryNameKn/Hi` and `commodityNameKn/Hi` fields are only filled in for rows that exist |
| 45 | `POST /api/logistics/quote` | logistics + profit quote | public | PASS | HTTP 200 — the quote is computed from the posted crop quantity, farm-gate price, coordinates, container type and APMC modal price |

> Additional endpoint, exercised by the same script:
> `POST /api/enquiries/[id]/messages` → **HTTP 201** (the farmer's reply is
> stored in the shared thread and broadcast over Socket.IO).

### 1.3 Android app (Flutter)

Source of truth: `mobile/lib/routing/app_router.dart`.

The evidence comes from `mobile/integration_test/route_coverage_test.dart`,
which opens the **real** router on the emulator, visits every route and
asserts that the expected page widget is displayed and that no widget threw
while it was built. The detail screens are opened with **real** identifiers
from the live backend (a QA listing, a QA enquiry and a QA order), so they
really load their data.

**Result (2026-11-28): `00:15 +1: All tests passed!` — exit code 0, all
21 routes opened, no widget exception.** The only log line is the expected
`[ApiClient] /admin/metrics -> 403: Forbidden: Requires one of the following
roles: [ADMIN]` (the deployed database has no administrator account).

| # | Route | Screen | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `/splash` | splash / session restore | PASS | opens and redirects to `/home` for a signed-in session |
| 2 | `/login` | sign in | PASS | `LoginPage` displayed |
| 3 | `/register` | registration | PASS | `RegisterPage` displayed |
| 4 | `/home` | role aware shell (dashboard, lots, orders, enquiries, profile) | PASS | `HomeShell` displayed |
| 5 | `/product/:id` | listing detail | PASS | `ProductDetailPage` displayed with a real listing |
| 6 | `/farmer/:id` | farmer profile | PASS | `FarmerDetailPage` displayed with a real farmer |
| 7 | `/cart` | cart | PASS | `CartPage` displayed |
| 8 | `/checkout` | checkout | PASS | `CheckoutPage` displayed |
| 9 | `/orders` | consumer orders | PASS | `OrdersPage` displayed |
| 10 | `/order/:id` | order detail | PASS | `OrderDetailPage` displayed with a real order |
| 11 | `/enquiries` | enquiries | PASS | `EnquiriesPage` displayed |
| 12 | `/chat/:id` | chat | PASS | `ChatPage` displayed with a real conversation |
| 13 | `/market-rates` | mandi rates | PASS | `MarketRatesPage` displayed |
| 14 | `/logistics` | logistics calculator | PASS | `LogisticsPage` displayed |
| 15 | `/favorites` | favourites | PASS | `FavoritesPage` displayed |
| 16 | `/notifications` | notifications | PASS | `NotificationsPage` displayed |
| 17 | `/profile` | profile (language selector) | PASS | `ProfilePage` displayed |
| 18 | `/complaints` | complaints | PASS | `ComplaintsPage` displayed |
| 19 | `/admin` | admin dashboard | PASS | `AdminDashboardPage` displayed (the screen renders, the data call answers 403 — no admin account exists) |
| 20 | `/farmer/products/new` | new crop listing | PASS | `ProductFormPage` displayed |
| 21 | `/farmer/products/:id/edit` | edit crop listing | PASS | `ProductFormPage` displayed with the real listing loaded |

#### 1.3.1 Production defects the route coverage test uncovered

The route coverage test was written to fail on **any** widget exception, not
only on a missing screen. It therefore found five real crashes that the
manual walk-through had missed. All of them are fixed and the suite is green
again.

| # | Defect | Symptom in production | Root cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | `AppLocalizations.of(context)` inside `initState()` | `dependOnInheritedWidgetOfExactType<_LocalizationsScope>() … was called before _EnquiriesPageState.initState() completed` on **9** screens (admin dashboard, chat, enquiries, favourites, farmer map, market rates, notifications, order detail, complaints) | `AppLocalizations.of` may only be called after the widget is mounted | The lookup was moved into the `catch` blocks, which run **after** the `await` and are guarded by `mounted` — `mobile/lib/features/**` |
| 2 | `initializeDateFormatting()` was never called | `LocaleDataException: Locale data has not been initialized, call initializeDateFormatting(<locale>).` on **every** screen that formats a date | `intl` only loads the locale data when the initialiser runs | `mobile/lib/main.dart` is now `Future<void> main() async` and calls `initializeDateFormatting()` after importing `package:intl/date_symbol_data_local.dart` |
| 3 | `ref.read(...)` inside `dispose()` | `StateError: Cannot use "ref" after the widget was disposed.` — the socket listener was **never** removed and the room was never left | Flutter's `StatefulElement.unmount()` calls `super.unmount()` (which clears the element) **before** `state.dispose()`, so `context.mounted` is already `false` and Riverpod 2.6.1 rejects the access | The `SocketService` is cached in a `_socket` field while the screen is alive and the cached instance is used in `dispose()` — `mobile/lib/features/chat/chat_page.dart`, `mobile/lib/features/orders/order_detail_page.dart` |
| 4 | Missing `Scaffold` | `No Material widget found.` — the screen could not be opened at all | `TextField` needs a `Material` ancestor; both screens are pushed as full-screen routes | Both screens now bring their own `Scaffold` + `AppBar` — `mobile/lib/features/market_rates/market_rates_page.dart`, `mobile/lib/features/logistics/logistics_page.dart` |
| 5 | English fallback in the market-rate model | A row without a commodity was labelled `Commodity` | Hardcoded English fallback in the model | The fallback was removed and the model now carries the localised `commodityNameKn` / `commodityNameHi` of the shared catalogue — `mobile/lib/data/models/misc.dart`, `mobile/lib/features/market_rates/market_rates_page.dart` |

---

## 1.4 Mock data and fabricated states

The project must never show an invented number. Every dataset that used to be
bundled into the clients was removed and replaced by a real read of the
shared backend.

| # | Removed mock | Where | Replacement | State |
| --- | --- | --- | --- | --- |
| 1 | `ALL_INDIA_MANDI_DATA` — 1150 lines of hardcoded mandi records | `frontend/src/app/mandi-rates/page.tsx` | `GET /api/apmc/rates` — the **real** rows of the shared database, with honest loading / empty / error states | DONE |
| 2 | `MANDI_TICKER_ITEMS` — 8 hardcoded ticker entries | `frontend/src/app/page.tsx` | The same `/api/apmc/rates` rows; the ticker shows "no benchmark published yet" while the table is empty | DONE |
| 3 | `cropEconomics` — hardcoded retail / farm-gate prices for Tomato, Ragi and Banana | `frontend/src/app/page.tsx` (savings calculator) | The **real** APMC modal price (÷ 100 for a per-kg value) compared with the **real** average farm-gate price of the live `/api/products` listings; missing data shows "—" and an explanation | DONE |
| 4 | `12 APMC yards synced` (a constant) | `frontend/src/app/page.tsx` (hero metric) | The number of distinct market yards that actually published a benchmark | DONE |
| 5 | `FALLBACK_*`, `INITIAL_SEED_PRODUCTS`, `DEFAULT_PRODUCTS`, `DEFAULT_LEADS`, `SEED_THREADS`, locally simulated farmer chat replies | backend + website | Removed earlier in this branch — the clients only ever show what the API returns | DONE |
| 6 | `Commodity` as a hardcoded English fallback in the market-rate model | `mobile/lib/data/models/misc.dart` | The localised `commodityNameKn` / `commodityNameHi` of the shared catalogue, with an empty fallback | DONE |
| 7 | The "APMC modal rate" of a listing was derived from the farmer's **own** price (`farmerPrice * 1.05`) | `frontend/src/app/farmer/dashboard/page.tsx` | The **published** APMC row of the crop, resolved by the shared backend (`backend/src/utils/apmcBenchmark.ts`) and attached to every listing as `mandiBenchmark` (₹/kg) — `null` when nothing was published | DONE |
| 8 | The logistics benchmark was derived from the farmer's price (`farmerPrice * 1.25`) and the coordinates defaulted to two fixed cities | `backend/src/services/logisticsService.ts` | The benchmark is now an **optional** input; without a published row the profit assessment is reported as unknown (`null` + `hasApmcBenchmark: false`) | DONE |
| 9 | The logistics endpoint replaced missing inputs with defaults (100 kg, ₹20/kg, `12.5218/76.8951`, `12.9716/77.5946`, ₹3200/quintal) | `backend/src/app.ts` | `POST /api/logistics/quote` validates the mandatory inputs and answers **HTTP 400** with the list of the missing fields | DONE |
| 10 | The website logistics drawer started from a fixed quantity, a fixed ₹3400 benchmark and the fixed Bengaluru coordinates | `frontend/src/components/LogisticsProfitDrawer.tsx` | The listing's **real** farmer price and farm coordinates, the **real** delivery coordinates of the signed-in consumer profile and the **published** benchmark of the crop; a missing value is reported instead of being replaced | DONE |
| 11 | The Android logistics screen started from a fabricated price (`20`), a fabricated benchmark (`3200`) and the same two fixed cities | `mobile/lib/features/logistics/logistics_page.dart` | The screen picks a **live crop lot** of the shared catalogue, takes the farmer's price and the farm coordinates from that lot, the delivery coordinates from the consumer profile and the benchmark from the published market rates | DONE |
| 12 | The Android logistics quote card rendered `estimatedDays`, `apmcValue`, `profit` and `profitMarginPercent` as if they were always present — the backend never returned them, so the card showed zeros | `mobile/lib/data/models/misc.dart`, `mobile/lib/features/logistics/logistics_page.dart` | The model now mirrors the **real** response shape (`breakdown.*`, `profitAssessment.*`), the APMC fields are nullable and the card shows "—" plus an explanation when no benchmark was published | DONE |
| 13 | The Android repository always sent `apmcModalPricePerQuintal = 3200` | `mobile/lib/data/repositories/catalog_repository.dart` | The field is **optional** and is only sent when a published benchmark exists | DONE |
| 14 | The buy map showed **simulated** map nodes and a fixed "₹3,100 / Quintal" yard with invented distances | `frontend/src/components/AgriMapExplorer.tsx` | The layer reads the **real** `/api/apmc/rates` and `/api/products`; a layer without a published dataset says so instead of showing an invented node | DONE |
| 15 | The consumer map placed farmers on invented coordinates (`12.5218 + idx * 0.05`) | `frontend/src/app/consumer/map/page.tsx` | Only farmers whose **real** coordinates are stored in the shared database are plotted; the others are not shown on the map | DONE |
| 16 | `DEFAULT_NODES` — 4 invented farms with invented prices, 2 invented APMC yards (one at "₹3,100 / Quintal"), an invented cold-storage hub and an invented distribution centre were appended to the real map nodes | `frontend/src/components/maps/FarmerMap.tsx` | The bundled list was deleted. Only cultivators backed by a database row are plotted; the layers without a published dataset report that instead of showing invented places | DONE |
| 17 | Every account without a GPS position was stored at the fixed place `12.5218 / 76.8951` — the register form, the phone-login flow, the profile upsert and the listing creation | `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/users/users.controller.ts`, `backend/src/modules/products/products.controller.ts`, `frontend/src/app/(auth)/register/page.tsx` | `FarmerProfile.latitude` / `longitude` became **nullable** (additive migration `20261128000000_optional_farmer_coordinates`). The position is stored only when it was really shared | DONE |
| 18 | The shopping cart replaced the farmer's and the buyer's coordinates with two fixed cities and derived the freight cost from that invented route | `frontend/src/context/CartContext.tsx` | The cart keeps the **real** coordinates only. An unknown route yields `distanceKm = null` and the published minimum dispatch tariff; the freight quote request is only sent with real values | DONE |
| 19 | The marketplace added a lot to the cart with a fallback price of ₹20/kg and a fallback stock of 1000 kg | `frontend/src/app/consumer/explore/page.tsx` | The real listed price and the real available quantity are used; a lot without a quantity is refused | DONE |
| 20 | The checkout showed a **fake order id** (`ord-demo-XXXXXX`) and cleared the cart when the network request failed | `frontend/src/app/checkout/page.tsx` | A failed request reports the error. An order is only reported as placed when the shared backend confirmed it | DONE |
| 21 | The consumer's delivery receipt and the farmer's order status were marked locally even when the shared backend rejected the change | `frontend/src/app/consumer/orders/page.tsx`, `frontend/src/app/farmer/orders/page.tsx` | The status only changes when the backend confirms it; otherwise the real status is restored from the backend and the error is shown | DONE |
| 22 | A message that the backend did not store stayed in the farmer's conversation | `frontend/src/app/farmer/inquiries/page.tsx` | The placeholder is removed when the shared backend does not confirm the message | DONE |
| 23 | `Number(null)` is `0`: the consumer map, the cart and the logistics drawer turned a **missing** position into the point `0 / 0` in the Gulf of Guinea | `frontend/src/app/consumer/map/page.tsx`, `frontend/src/context/CartContext.tsx`, `frontend/src/components/LogisticsProfitDrawer.tsx` | Every client rejects `null` / `undefined` **before** the conversion. A missing position stays "unknown" and the farm is not plotted | DONE |
| 24 | `PATCH /api/users/me` used `z.coerce.number()`, so a **cleared** position (`latitude: null`) was stored as the number `0` | `backend/src/modules/users/users.controller.ts` | `backend/src/utils/coordinate.ts` keeps the three states apart: absent → untouched, `null` → cleared, number → the real position. A malformed or out-of-range value is rejected with HTTP 400 | DONE |
| 25 | The consumer profile never stored the delivery position, so the freight distance could never be computed | `backend/src/modules/users/users.controller.ts` | `ConsumerProfile.latitude` / `longitude` are written from the same shared endpoint as the farm position | DONE |
| 26 | **All 53** farmer profiles of the production database still carried the old placeholder `12.5218 / 76.8951`, so the map stacked 53 markers on one invented point | `backend/prisma/migrations/20261128010000_clear_placeholder_farmer_coordinates/migration.sql` | The additive migration clears the rows that carry **exactly** the constant the old code wrote. No farm, listing or order is deleted — a farm without a position simply stays off the map | DONE |
| 27 | No client offered a way to share a **real** position, so removing the placeholder would have left the map permanently empty | `frontend/src/app/farmer/dashboard/page.tsx`, `mobile/lib/features/profile/profile_page.dart` | Both clients capture the device's own GPS and store it on the shared account. The success message only appears after the backend confirmed the update | DONE |
| 28 | There was **no way at all** to put a published APMC rate into the shared database — the only way to make the benchmark screens show a price would have been to invent rows | `backend/import-apmc-rates.ts`, `backend/src/utils/apmcRateCsv.ts` | An import path that accepts a **real** market bulletin: a row it cannot read is rejected with its reason, a missing value is never replaced by a default, and a file without a single usable row writes nothing. See [`docs/APMC_RATE_IMPORT.md`](APMC_RATE_IMPORT.md) | DONE |

### Current data gap — the APMC rate table is empty

`GET /api/apmc/rates` returns `{"success":true,"data":[],"rates":[],"total":0}`
against the deployed database: the shared `ApmcMarketRate` table contains
**no rows**.

Consequences (all of them honest and visible to the user):

* the website's **Mandi Rates** page shows "No APMC benchmark has been
  published yet" together with the explanation that the shared database holds
  no rate row;
* the website's **home ticker** shows "No APMC benchmark has been published
  yet";
* the website's **savings calculator** shows "—" for the benchmark, the
  farm-gate value and the saving, with a hint that both a published benchmark
  and live listings are required;
* the Android **market rates** screen shows its own empty state.

The **import path now exists**
(`npm run db:apmc-rates -- <file.csv>`, documented in
[`docs/APMC_RATE_IMPORT.md`](APMC_RATE_IMPORT.md)) and it was verified with a
dry run against a test bulletin:

```
read    : 2 usable rate row(s)
mapped  : 1 commodity/commodities resolve to the crop catalogue
unmapped: 1 row(s) — Not A Crop
           (these rows are published, but they do not become a benchmark)
⚠️  1 row(s) were rejected:
   line 4: the price(s) modalPrice are not a number
✅ Dry run finished — nothing was written to the database.
```

A missing file and a file without a single usable row both end with exit
code **1** and write nothing.

What is still open is the **data**, not the tool: the production table stays
empty until a real market bulletin is handed to the importer. Inventing rows
would reintroduce exactly the mock data that was removed here, so that is not
done.

---

## 2. Cross-platform coverage

Both clients use **one** backend (`https://farmconnect-api-sn98.onrender.com/api`),
**one** database and **one** account system. A workflow is only `PASS` when it
was actually executed against the deployed backend from the stated direction.

| # | Workflow | Website direction | Android direction | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Register a farmer | PASS | PASS | PASS | Website direction: `scripts/live-verify.mjs` → `register farmer -> HTTP 201`, the response carries the account id and the token. Android direction: integration test 1 registers the farmer **through the website client** and signs the same account in on Android; both resolve to the same shared user id |
| 2 | Register a consumer | PASS | PASS | PASS | Website direction: `scripts/live-verify.mjs` → `register consumer -> HTTP 201`. Android direction: integration test 1 registers the consumer through the website client and signs it in on Android |
| 3 | Sign in with an account created on the other client | PASS | PASS | PASS | Integration test 1: the Android client signs in with the website-registered account and `expect(androidFarmerSession.user.id, farmerSession.user.id)` passes. `scripts/live-verify.mjs`: `login response carries preferredLanguage=kn` — the same account returns the same id, role and language on both clients |
| 4 | Create a crop listing | PASS | PASS | PASS | Website direction: `scripts/live-verify.mjs` → `create crop lot A (Tomato) -> HTTP 201` and `create crop lot B (Ragi) -> HTTP 201`. Android direction: integration test 2 creates the listing through the Android repository, integration test 7 creates two different crops |
| 5 | A listing created on one client is visible on the other | PASS | PASS | PASS | Integration test 2: a listing created on the website appears in the Android catalogue **and** in the farmer's Android inventory. Integration test 1: a listing created on Android appears in the website feed |
| 6 | Edit price / quantity / availability — the edit is visible on the other client and never touches a second crop | PASS | PASS | PASS | `scripts/live-verify.mjs`: `edit lot A price and quantity` → 200, `lot A keeps the new price -> 27.5`, `lot B price is untouched -> 48`, `lot B quantity is untouched -> 90`. Integration test 7: `untouched.farmerPrice, 48.0` and `untouched.quantityAvailable, 90` after the tomato lot was edited, and the website then reads the edited values (`websiteTomato.farmerPrice, 27.5`) |
| 7 | Several independent crop lots per farmer (own crop name, variety, quantity, unit, price, availability, description, image) | PASS | PASS | PASS | `scripts/live-verify.mjs`: two lots with their own crop, variety, price, quantity and availability, and the crop filters keep them apart (`crop=Tomato excludes the ragi lot`, `crop=Ragi excludes the tomato lot`). Integration test 7: the same on Android, including the live category filter for both crops |
| 8 | Favourites are shared | PASS | PASS | PASS | Integration test 4: the Android client favourites the listing and the **website** client reads the same favourite from the shared consumer profile; toggling again removes it |
| 9 | Enquiries and chat messages are shared | PASS | PASS | PASS | Integration test 3: the website raises the enquiry, the farmer sees it on Android and replies, and the website reads the reply (`thread.messages.any(... contains('18.50'))`). `scripts/live-verify.mjs`: `create an enquiry -> HTTP 201`, `reply to an enquiry -> HTTP 201` |
| 10 | Orders and order status are shared | PASS | PASS | PASS | Integration test 1: the website places the order, the farmer sees it on Android, the farmer changes the status on Android and the website then reads `OrderStatus.confirmed` |
| 11 | Notifications arrive over Socket.IO on both clients | PASS | PASS | PASS | Integration test 6: the Socket.IO server delivers `new_order_received` to the authenticated Android socket (`expect(event['orderId'], isA<String>())`). `scripts/live-verify.mjs`: the durable inbox really contains the entries (`GET /notifications -> HTTP 200` with `NEW_ORDER` / `ORDER_STATUS`) |
| 12 | Language change propagates in both directions | PASS | PASS | PASS | Integration test 8: the website sets `kn` and the Android profile reads `kn`; the Android app sets `hi` and the website profile reads `hi`. `scripts/live-verify.mjs`: `PATCH preferredLanguage=hi -> hi`, `GET /users/me returns preferredLanguage=kn -> kn`, `login response carries preferredLanguage=kn -> kn` |
| 13 | Logout clears the session; the other client's session is isolated | PASS | PASS | PASS | Integration test 5: `logout` wipes the stored session (`restoreSession()` is `null`), the same account signs in again on the other client with the same id, and a second account never sees the first account's orders |
| 14 | The farm / delivery position is shared | PASS | PASS | PASS | Integration test 9: a farmer registered **without** a position has none on the shared account (`latitude` and `longitude` are `null`); the **Android** app shares a real position and the **website** reads it (`closeTo(12.5231, 0.0001)`); the **website** clears it and the **Android** app reads `null` again — a cleared position never becomes the number `0`. The same holds for the delivery position of a consumer. `scripts/live-verify.mjs`: `a shared position is stored on the shared account -> 12.5231 / 76.8962`, `a cleared position stays null instead of becoming 0`, `a malformed coordinate is rejected -> HTTP 400`, `an out-of-range coordinate is rejected -> HTTP 400`. Browser: the farmer dashboard shows **"12.52310, 76.89620"** after the position was shared and **"अभी साझा नहीं किया गया"** (not shared yet) once it was cleared |

### 2.1 Automated evidence for the cross-platform workflows

The shared workflows are covered by the live integration suite
`mobile/integration_test/shared_data_workflow_test.dart`. It runs against the
deployed API and drives both clients through the same HTTP API.

```bash
cd mobile
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

**Result (2026-11-28, final run against the deployed head commit `5654272`):
9 / 9 tests passed** on `emulator-5554` (Pixel_10a, Android 17 / API 37) —
`00:54 +9: All tests passed!`, exit code 0. The only log lines are the two
expected `409` answers for deleting a listing that already carries an order
("This listing already has orders and can no longer be deleted. Mark it as
unavailable instead.").

| # | Test case | Covers workflow | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | a farmer registered on one client is usable from the other | 1, 3, 4, 5, 10 | PASS | `00:04 +1` — the same user id on both clients, the listing visible in the other feed, the order mirrored and the status change mirrored back |
| 2 | a product created on the website is visible in the Android app | 4, 5 | PASS | `00:12 +2` — the listing appears in the Android catalogue and in the Android farmer inventory |
| 3 | enquiries and messages are shared between both clients | 9 | PASS | `00:17 +3` — the enquiry raised on the website is visible on Android and the reply is readable on the website |
| 4 | favourites, notifications and complaints are persisted | 8, 11 | PASS | `00:22 +4` — the favourite is shared with the website client, the complaint is stored, the notification inbox is readable |
| 5 | logout clears the session and the account can sign in again | 13 | PASS | `00:27 +5` — the session is wiped and restored, and the accounts stay isolated |
| 6 | the Socket.IO server broadcasts order events to the Android client | 10, 11 | PASS | `00:33 +6` — `new_order_received` arrives on the authenticated socket with the order id |
| 7 | a farmer can manage several independent crop listings | 6, 7 | PASS | `00:40 +7` — two crops with their own price, quantity, availability, crop name and variety; editing one never touches the other; the website reads the edit; the crop and category filters keep the crops apart |
| 8 | the interface language preference is shared between the clients | 12 | PASS | `00:43 +8` — the website sets `kn`, Android reads `kn`; Android sets `hi`, the website reads `hi` |
| 9 | the farm and delivery positions are shared between the clients | 14 | PASS | `00:53 +9` — the account starts without a position (`null`), Android shares a real position and the website reads it, the website clears it and Android reads `null` again — a cleared position never becomes the number `0`. The delivery position of a consumer is shared the same way |

### 2.2 Build-time verification (already executed)

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Backend unit tests (no database) | `cd backend && npm run test:unit` | PASS | 70 / 70 tests green (7 suites: `language`, `productQuery`, `categoryResolver`, `apmcBenchmark`, `logisticsService`, `coordinate`, `apmcRateCsv` — including the 8 tests of the APMC benchmark resolver, the 5 tests that prove the logistics quote never invents a benchmark or a route, the 9 tests of the coordinate schema, which prove that a cleared position never becomes the point `0 / 0`, and the 13 tests of the APMC rate importer, which prove that a malformed bulletin row is rejected instead of being corrected) |
| Backend type check | `cd backend && npx tsc --noEmit` | PASS | exit code 0 |
| Website type check | `cd frontend && npx tsc --noEmit` | PASS | exit code 0 |
| Website production build | `cd frontend && npm run build` | PASS | exit code 0 — 21 routes prerendered/built, no prerender errors |
| Android static analysis | `cd mobile && flutter analyze` | PASS | "No issues found!" |
| Android unit + widget tests | `cd mobile && flutter test` | PASS | 31 / 31 tests green |
| Localisation key parity (3 languages, website + Android) | `node scripts/verify-i18n.mjs` | PASS | website `core` 120, `auth` 126, `farmer` 313, `consumer` 233, `misc` 362 keys — 0 missing / 0 extra for kn and hi; Android ARB 397 keys — 0 missing / 0 extra for kn and hi |
| Hardcoded-English scan of the website JSX | `node C:\Users\user\AppData\Local\Temp\opencode\find-hardcoded-jsx.mjs` | PASS | 3 hits — all false positives (`Promise` type annotations in `CartContext.tsx` / `ModalContext.tsx`) |
| Website route smoke (deployed) | `node scripts/smoke-routes.mjs` | PASS | 22 / 22 website routes + 24 / 24 API routes answered as expected |
| API endpoint smoke (deployed) | `node scripts/smoke-api-endpoints.mjs` | PASS | 50 probes, 0 unexpected statuses |
| Live feature verification (deployed) | `node scripts/live-verify.mjs` | PASS | 61 / 61 checks green — 46 feature checks plus 15 that prove no fabricated benchmark, route, coordinate or success state reaches the deployed backend |
| Android route coverage (emulator, deployed API) | `cd mobile && flutter test integration_test/route_coverage_test.dart -d emulator-5554 …` | PASS | 21 / 21 routes opened, no widget exception — `01:18 +1: All tests passed!`, exit code 0. The only log line is the expected `[ApiClient] /admin/metrics -> 403` (the deployed database has no administrator account) |
| APMC rate importer (dry run, no database write) | `cd backend && npm run db:apmc-rates -- <test bulletin>.csv --dry-run` | PASS | 2 usable row(s), 1 commodity resolves to the crop catalogue, 1 published commodity does not (reported as such), 1 row rejected with the reason `the price(s) modalPrice are not a number` — **nothing was written**. A missing file and a file without a usable row both end with exit code 1 and write nothing. The 13 unit tests of `apmcRateCsv` cover the same rules |
| Cross-platform workflow suite (emulator, deployed API) | `cd mobile && flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 …` | PASS | 9 / 9 tests green — `00:54 +9: All tests passed!`, exit code 0 |
| Backend database integration suite | `cd backend && npm run test:integration` | BLOCKED | no PostgreSQL/Docker in the local environment — the suite (language storage, catalogue endpoints, independent crop lots, edit isolation, crop filtering, listing authorisation, notification inbox) runs in pull-request CI with PostgreSQL 16 and is green there |
| Pull-request CI | `gh run list --branch fix/local-updates` | PASS | `FarmConnect Verification` — the push and the pull-request runs are green, including the PostgreSQL 16 integration suite. **Runs for the head commit `459aeee`:** push run [`46087077962`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46087077962) (success, 1m37s) and pull-request run [`46087083317`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46087083317) (success, 1m30s). The previous heads `5654272` and `60cf464` were green as well — push [`46085702742`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46085702742), pull request [`46085708809`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46085708809). Every run executes the localisation check, the frontend type check and production build, the backend type check, the migrations, the PostgreSQL 16 integration suite, the `start.bat` validation and the source packaging |
| Release artefact build | `cd mobile && powershell -ExecutionPolicy Bypass -File .\tool\build_production.ps1 -Target all` | PASS | exit code 0 — `app-release.apk` 57.8 MB (60,617,334 bytes) and `app-release.aab` 56.1 MB (58,781,991 bytes), both against the live Render host |
| Release artefact on a device | `adb -s emulator-5554 install -r mobile\build\app\outputs\flutter-apk\app-release.apk` | PASS | `Success`. `aapt2 dump badging` → package `in.farmconnect.farmconnect_mobile`, versionName `1.0.0`, label `FarmConnect`; `aapt2 dump permissions` → `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA`. `apksigner verify --print-certs` → `CN=Android Debug` — the artefact is **debug-signed**, so it is **not** Play Store ready (see [`docs/MULTILINGUAL_AND_CROPS.md`](MULTILINGUAL_AND_CROPS.md), limitation 3) |
| Release artefact — embedded host | scan `libapp.so` of every ABI inside the APK | PASS | `farmconnect-api-sn98.onrender.com` appears **3×** in `arm64-v8a`, `armeabi-v7a` and `x86_64`; `10.0.2.2:5000` appears **0×** in all three |
| Release artefact points at production | `unzip -p app-release.apk lib/arm64-v8a/libapp.so \| grep -c 'http://10.0.2.2:5000'` | PASS | The local development URL occurs **0** times in all three ABIs (`arm64-v8a`, `armeabi-v7a`, `x86_64`), while `https://farmconnect-api-sn98.onrender.com/api` occurs once per ABI — the compile-time `--dart-define` resolved to the live host |

---

## 3. How to reproduce

```bash
# 1. Localisation completeness for all three languages
npm run i18n:check

# 2. Backend unit tests (no database required)
cd backend && npm run test:unit

# 3. Route evidence against the deployed services
npm run smoke:routes
node scripts/smoke-api-endpoints.mjs

# 4. The multilingual catalogue and the multilingual crop filter
node scripts/verify-localised-catalogue.mjs

# 5. The live feature verification (registers its own QA account and removes
#    the listings it created — the account itself stays behind)
node scripts/live-verify.mjs

# 6. Live cross-platform workflow suites (need an emulator)
cd mobile
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
flutter test integration_test/route_coverage_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com

# 7. The release artefacts against the live host
cd mobile
powershell -ExecutionPolicy Bypass -File .\tool\build_production.ps1 -Target all
```

The HTTP evidence of step 3 is stored verbatim in
`docs/route-smoke-report.json` and `docs/api-endpoint-smoke-report.json`.

### 3.1 Browser walk-through of the deployed website

The website was driven in a real browser against the deployed services. The
recorded observations:

| Page | Locale | Observation |
| --- | --- | --- |
| `/` | `hi` | `document.documentElement.lang` = `hi`; the ticker reads "अभी तक कोई APMC बेंचमार्क प्रकाशित नहीं है।"; the hero metric reads `0 APMC`; the savings calculator shows `—` for the benchmark and the saving, and "किसान को सीधे ₹22.63/किलो" from the live listings |
| `/mandi-rates` | `hi` | the honest empty state "अभी तक कोई APMC बेंचमार्क प्रकाशित नहीं हुआ"; the **Export CSV** button is disabled; all four KPIs read `0` / `—`; no table row exists |
| `/consumer/explore` | `hi` | the category chips show the native names — नकदी फसलें, अनाज और मिलेट, सब्ज़ियाँ, … |
| `/consumer/explore` | `hi` | `?search=ಟೊಮೇಟೊ` → **16** tomato lots, each labelled "फसल: Tomato · किस्म: Hybrid" |
| `/farmer/dashboard` | `hi` | the **नई कटाई सूचीबद्ध करें** dialog: searching `टमाटर` offers the suggestion `टमाटर Tomato`, and selecting it writes **Tomato** (the canonical English name) into the crop-name field |
| `/farmer/dashboard` | `hi` | the new **खेत का स्थान** card reads **"अभी साझा नहीं किया गया"** (not shared yet) — the honest state after the cleanup migration removed the placeholder — and offers **मेरे खेत का स्थान साझा करें**, which captures the device's own GPS. The card contains **no** `0.00000` and no placeholder coordinate |
| `/farmer/dashboard` | `hi` | after a real position (`12.5231 / 76.8962`) was stored on the shared account, the card shows **"12.52310, 76.89620"**; clearing it again brings back **"अभी साझा नहीं किया गया"**. The QA account was restored to the cleared state afterwards |
| `/consumer/map` | `hi` | the honest empty state "कर्नाटक के खेतों के निर्देशांक मानचित्र पर दर्ज किए जा रहे हैं…"; **0** map markers — no farm is plotted at a position it never shared, and no marker sits at `0 / 0` |
| `/buy` | `kn` | the map and the chat panel show their honest empty state; **0** markers; the page contains **no** `₹3,100`, no `12.5218` and no `76.8951` |
| `/api/users/farmers` | — | of the **63** farmer profiles of the production database **0** carry a position after the cleanup migration; while the QA farmer held a real position it was the **only** one that appeared — the map plots exactly the farms that shared a position |
| — | — | **no console error** was raised on any of the pages above |
