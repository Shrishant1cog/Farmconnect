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

There is **no seed or import path** for APMC rates yet — filling the table
with invented rows would reintroduce exactly the mock data that was removed
here. Loading real benchmark rows into the shared database is the open item.

---

## 2. Cross-platform coverage

Both clients use **one** backend (`https://farmconnect-api-sn98.onrender.com/api`),
**one** database and **one** account system. A workflow is only `PASS` when it
was actually executed against the deployed backend from the stated direction.

| # | Workflow | Website direction | Android direction | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Register a farmer | PASS | PASS | PASS | Website direction: `live-verify.mjs` → `register farmer -> HTTP 201`, the response carries the account id and the token. Android direction: integration test 1 registers the farmer **through the website client** and signs the same account in on Android; both resolve to the same shared user id |
| 2 | Register a consumer | PASS | PASS | PASS | Website direction: `live-verify.mjs` → `register consumer -> HTTP 201`. Android direction: integration test 1 registers the consumer through the website client and signs it in on Android |
| 3 | Sign in with an account created on the other client | PASS | PASS | PASS | Integration test 1: the Android client signs in with the website-registered account and `expect(androidFarmerSession.user.id, farmerSession.user.id)` passes. `live-verify.mjs`: `login response carries preferredLanguage=kn` — the same account returns the same id, role and language on both clients |
| 4 | Create a crop listing | PASS | PASS | PASS | Website direction: `live-verify.mjs` → `create crop lot A (Tomato) -> HTTP 201` and `create crop lot B (Ragi) -> HTTP 201`. Android direction: integration test 2 creates the listing through the Android repository, integration test 7 creates two different crops |
| 5 | A listing created on one client is visible on the other | PASS | PASS | PASS | Integration test 2: a listing created on the website appears in the Android catalogue **and** in the farmer's Android inventory. Integration test 1: a listing created on Android appears in the website feed |
| 6 | Edit price / quantity / availability — the edit is visible on the other client and never touches a second crop | PASS | PASS | PASS | `live-verify.mjs`: `edit lot A price and quantity` → 200, `lot A keeps the new price -> 27.5`, `lot B price is untouched -> 48`, `lot B quantity is untouched -> 90`. Integration test 7: `untouched.farmerPrice, 48.0` and `untouched.quantityAvailable, 90` after the tomato lot was edited, and the website then reads the edited values (`websiteTomato.farmerPrice, 27.5`) |
| 7 | Several independent crop lots per farmer (own crop name, variety, quantity, unit, price, availability, description, image) | PASS | PASS | PASS | `live-verify.mjs`: two lots with their own crop, variety, price, quantity and availability, and the crop filters keep them apart (`crop=Tomato excludes the ragi lot`, `crop=Ragi excludes the tomato lot`). Integration test 7: the same on Android, including the live category filter for both crops |
| 8 | Favourites are shared | PASS | PASS | PASS | Integration test 4: the Android client favourites the listing and the **website** client reads the same favourite from the shared consumer profile; toggling again removes it |
| 9 | Enquiries and chat messages are shared | PASS | PASS | PASS | Integration test 3: the website raises the enquiry, the farmer sees it on Android and replies, and the website reads the reply (`thread.messages.any(... contains('18.50'))`). `live-verify.mjs`: `create an enquiry -> HTTP 201`, `reply to an enquiry -> HTTP 201` |
| 10 | Orders and order status are shared | PASS | PASS | PASS | Integration test 1: the website places the order, the farmer sees it on Android, the farmer changes the status on Android and the website then reads `OrderStatus.confirmed` |
| 11 | Notifications arrive over Socket.IO on both clients | PASS | PASS | PASS | Integration test 6: the Socket.IO server delivers `new_order_received` to the authenticated Android socket (`expect(event['orderId'], isA<String>())`). `live-verify.mjs`: the durable inbox really contains the entries (`GET /notifications -> HTTP 200` with `NEW_ORDER` / `ORDER_STATUS`) |
| 12 | Language change propagates in both directions | PASS | PASS | PASS | Integration test 8: the website sets `kn` and the Android profile reads `kn`; the Android app sets `hi` and the website profile reads `hi`. `live-verify.mjs`: `PATCH preferredLanguage=hi -> hi`, `GET /users/me returns preferredLanguage=kn -> kn`, `login response carries preferredLanguage=kn -> kn` |
| 13 | Logout clears the session; the other client's session is isolated | PASS | PASS | PASS | Integration test 5: `logout` wipes the stored session (`restoreSession()` is `null`), the same account signs in again on the other client with the same id, and a second account never sees the first account's orders |

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

**Result (2026-11-28): 8 / 8 tests passed** on `emulator-5554`
(Pixel_10a, Android 17 / API 37).

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

### 2.2 Build-time verification (already executed)

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Backend unit tests (no database) | `cd backend && npm run test:unit` | PASS | 35 / 35 tests green (7 new tests for the multilingual crop-search expansion, the localised catalogue labels, the APMC commodity lookup and the farm-name / category search) |
| Backend type check | `cd backend && npx tsc --noEmit` | PASS | exit code 0 |
| Website type check | `cd frontend && npx tsc --noEmit` | PASS | exit code 0 |
| Website production build | `cd frontend && npm run build` | PASS | exit code 0 — 21 routes prerendered/built, no prerender errors |
| Android static analysis | `cd mobile && flutter analyze` | PASS | "No issues found!" |
| Android unit + widget tests | `cd mobile && flutter test` | PASS | 31 / 31 tests green |
| Localisation key parity (3 languages, website + Android) | `node scripts/verify-i18n.mjs` | PASS | website `core` 120, `auth` 126, `farmer` 301, `consumer` 232, `misc` 352 keys — 0 missing / 0 extra for kn and hi; Android ARB 381 keys — 0 missing / 0 extra for kn and hi |
| Hardcoded-English scan of the website JSX | `node C:\Users\user\AppData\Local\Temp\opencode\find-hardcoded-jsx.mjs` | PASS | 3 hits — all false positives (`Promise` type annotations in `CartContext.tsx` / `ModalContext.tsx`) |
| Website route smoke (deployed) | `node scripts/smoke-routes.mjs` | PASS | 22 / 22 website routes + 24 / 24 API routes answered as expected |
| API endpoint smoke (deployed) | `node scripts/smoke-api-endpoints.mjs` | PASS | 50 probes, 0 unexpected statuses |
| Live feature verification (deployed) | `node live-verify.mjs` | PASS | 46 / 46 checks green |
| Android route coverage (emulator, deployed API) | `cd mobile && flutter test integration_test/route_coverage_test.dart -d emulator-5554 …` | PASS | 21 / 21 routes opened, no widget exception — `00:15 +1: All tests passed!` |
| Cross-platform workflow suite (emulator, deployed API) | `cd mobile && flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 …` | PASS | 8 / 8 tests green |
| Backend database integration suite | `cd backend && npm run test:integration` | BLOCKED | no PostgreSQL/Docker in the local environment — the suite (language storage, catalogue endpoints, independent crop lots, edit isolation, crop filtering, listing authorisation, notification inbox) runs in pull-request CI with PostgreSQL 16 and is green there |
| Pull-request CI | `gh run list --branch fix/local-updates` | PASS | `FarmConnect Verification` — the push and the pull-request runs are green, including the PostgreSQL 16 integration suite |

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

# 4. Live cross-platform workflow suites (need an emulator)
cd mobile
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
flutter test integration_test/route_coverage_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

The HTTP evidence of step 3 is stored verbatim in
`docs/route-smoke-report.json` and `docs/api-endpoint-smoke-report.json`.
