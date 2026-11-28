# FarmConnect — Verification Matrices

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-28

Three matrices are kept here:

1. **Route coverage** — every website route, every API endpoint and every
   Android route, with the evidence that was collected for it.
2. **Workflow coverage** — the eighteen acceptance workflows that must work
   on the shared backend from either client.
3. **Integration coverage** — the shared behaviour of the two clients: the
   same account, the same database, the same state.

The **inventory** of the routes themselves (which route exists, which file
owns it, which guard protects it) is in
[`ROUTE_INVENTORY.md`](ROUTE_INVENTORY.md) — **25 website routes, 21 Android
routes, 57 API paths**.

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
| `docs/ROUTE_INVENTORY.md` | the file system of the clients + the two smoke scripts |

A third script checks the multilingual catalogue against the deployed API:

| File | Produced by |
| --- | --- |
| — (console output only) | `node scripts/verify-localised-catalogue.mjs` |

---

## 1. Route coverage

### 1.1 Website (Next.js)

Source of truth: `frontend/src/app/**/page.tsx`. The HTTP evidence is
collected by `node scripts/smoke-routes.mjs` against the deployed website
(2026-11-28) and stored in `docs/route-smoke-report.json`. The complete
inventory — file, entry point and guard of every route — is in
[`ROUTE_INVENTORY.md`](ROUTE_INVENTORY.md).

A protected route answered with `307 -> /login?redirect=…` **is** the
expected result for an anonymous request: it proves the route exists and that
the authentication guard is active. A `308` is a Next.js permanent redirect
to the canonical route.

**25 routes discovered, 25 probed, 24 PASS, 1 NOT TESTED** (the administrator
command centre — the deployed database has no administrator account).

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
| 11 | `/consumer/favorites` | Navbar — My favourites (buyer only) | CONSUMER | PASS | HTTP 307 → `/login?redirect=%2Fconsumer%2Ffavorites` (auth guard). Signed in: the heart on a lot of the marketplace sets `aria-pressed="true"`, `GET /api/favorites` answers with the kept lot and the page lists it with the link to it |
| 12 | `/notifications` | Navbar — bell | any | PASS | HTTP 307 → `/login?redirect=%2Fnotifications` (auth guard). Signed in: 13 real notices, `MARK READ` moves the backend to `unreadCount: 4`, `MARK ALL READ` to `0`, and the badge of the navbar follows the **same** state |
| 13 | `/profile` | Navbar — profile | any | PASS | HTTP 307 → `/login?redirect=%2Fprofile` (auth guard). Signed in: the delivery address is written with `PATCH /api/users/me`, read back from the API and restored afterwards |
| 14 | `/consumer/chats` | Home shell — Chat | CONSUMER | PASS | HTTP 307 → `/consumer/enquiries` (canonical redirect) |
| 15 | `/consumer/enquiries` | Home shell — Enquiries | CONSUMER | PASS | HTTP 200 |
| 16 | `/consumer/enquiries/[id]` | Enquiries list — row | CONSUMER | PASS | HTTP 200 |
| 17 | `/consumer/farmer/[id]` | Listing — farmer name | public | PASS | HTTP 200 |
| 18 | `/chat/[id]` | Enquiry — open chat | CONSUMER | PASS | HTTP 200 |
| 19 | `/farmer/dashboard` | Navbar — Farmer Hub | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Fdashboard` (auth guard) |
| 20 | `/farmer/products` | Farmer dashboard — Lots | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Fproducts` (auth guard) |
| 21 | `/farmer/orders` | Farmer dashboard — Orders | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Forders` (auth guard). Signed in: the dispatch dashboard shows the status that the shared backend **stored** (`PACKED` after "MARK PACKED IN CRATES") |
| 22 | `/farmer/inquiries` | Farmer dashboard — Enquiries | FARMER | PASS | HTTP 307 → `/login?redirect=%2Ffarmer%2Finquiries` (auth guard) |
| 23 | `/seller` | Home — seller entry | FARMER | PASS | HTTP 307 → `/farmer/dashboard` (canonical redirect) |
| 24 | `/seller/orders` | Seller workspace — Orders | FARMER | PASS | HTTP 307 → `/farmer/orders` (canonical redirect) |
| 25 | `/admin/dashboard` | Admin entry | ADMIN | **NOT TESTED** | HTTP 200 (the screen itself guards the data with the admin API). The deployed database has **no** administrator account, so the authorised path could not be executed — see section 1.4 |

### 1.2 API (Express)

Source of truth: `backend/src/modules/**/*.routes.ts`.

The evidence comes from `node scripts/smoke-api-endpoints.mjs`, which drives
**every** endpoint with a real request — it registers its own QA accounts,
creates a QA listing, runs an enquiry, an order, a favourite, a notification
and a complaint against it, and finally removes the listing it created.
**54 probes, 0 unexpected statuses** (2026-11-28, against the deployment of
the head commit `6fd8c88`).

The two endpoints that live directly in `backend/src/app.ts` (and not in a
module router) are covered by `node scripts/smoke-routes.mjs` — they are rows
44 and 45 below.

The full inventory of the API — **47 module routes + 10 routes of
`app.ts` = 57 paths** — is in [`ROUTE_INVENTORY.md`](ROUTE_INVENTORY.md).

| # | Endpoint | Purpose | Auth | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/health` | liveness + database probe | public | PASS | HTTP 200 — `{"status":"UP","database":"UP"}` |
| 2 | `POST /api/auth/register` | account creation | public | PASS | HTTP 201; the response carries `preferredLanguage`; `preferredLanguage: "kn-IN"` is stored as `kn`, an unsupported code is rejected with HTTP 400 |
| 3 | `POST /api/auth/login` | email + password sign-in | public | PASS | HTTP 200; the response carries `preferredLanguage` both at the top level of `data` and inside `data.user` |
| 4 | `POST /api/auth/login-phone` | phone sign-in | public | PASS | HTTP **400** when the request carries nothing but a phone number — the number alone must never open a session. HTTP **200** when it carries the password of the account: the phone is only an identifier, the proof is the password |
| 5 | `POST /api/auth/phone-login` | phone sign-in (legacy alias) | public | PASS | HTTP **400** without a password, HTTP **200** with it (same handler as `/login-phone`) |
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
| 25 | `PATCH /api/orders/[id]/status` | order status | bearer (farmer) | PASS | HTTP 200 — the state that is asked for is the state that is **stored**: `PACKED` stays `PACKED`, `IN_TRANSIT` is still accepted as the other name of `DISPATCHED`, and a state that does not exist is refused with HTTP 400 (`{"message":"Unknown order status \"TELEPORTED\"."}`) instead of being stored as something else |
| 26 | `PATCH /api/orders/[id]/received` | delivery confirmation | bearer (consumer) | PASS | HTTP 200 — the order becomes `DELIVERED` |
| 27 | `GET /api/enquiries/my` | consumer enquiries | bearer (consumer) | PASS | HTTP 200 |
| 28 | `GET /api/enquiries/farmer` | farmer enquiries | bearer (farmer) | PASS | HTTP 200 |
| 29 | `POST /api/enquiries` | create an enquiry | bearer | PASS | HTTP 201 |
| 30 | `GET /api/enquiries/[id]/messages` | enquiry messages | bearer | PASS | HTTP 200 |
| 31 | `POST /api/favorites/products/[id]` | favourite a listing | bearer (buyer) | PASS | HTTP 201 for a buyer; **HTTP 403** for a cultivator — the favourites belong to a buyer, and the endpoint creates no buyer profile for an account of another role |
| 32 | `POST /api/favorites/farmers/[id]` | favourite a farmer | bearer (buyer) | PASS | HTTP 201 (the endpoint takes the `FarmerProfile.id`) |
| 33 | `GET /api/favorites` | favourites | bearer (buyer) | PASS | HTTP 200 for a buyer; **HTTP 403** for a cultivator — even when a buyer profile of an earlier version still exists for that account: the role of the **live** account decides |
| 34 | `GET /api/notifications` | notification inbox | bearer | PASS | HTTP 200 — the inbox really contains the `NEW_ORDER` / `ORDER_STATUS` / `NEW_ENQUIRY` / `NEW_MESSAGE` entries |
| 35 | `PATCH /api/notifications/[id]/read` | mark one read | bearer | PASS | HTTP 200 — the entry becomes `isRead: true` |
| 36 | `PATCH /api/notifications/read-all` | mark all read | bearer | PASS | HTTP 200 |
| 37 | `GET /api/complaints/mine` | own complaints | bearer | PASS | HTTP 200 |
| 38 | `POST /api/complaints` | file a complaint | bearer | PASS | HTTP 201 |
| 39 | `GET /api/admin/users` | user administration | bearer (admin) | NOT TESTED | The route exists and the guard is active: HTTP 403 for a non-admin. The deployed database has **no administrator account** (registration only creates `FARMER`/`CONSUMER` and the seeded admin account is not present), so the endpoint could not be exercised with a valid admin token against the deployment. The **authorised** path is executed by the PostgreSQL CI suite, which creates a real administrator account (`ADMIN: the administrator sees the user list and can filter it` — PASS in CI) |
| 40 | `GET /api/admin/metrics` | platform metrics | bearer (admin) | NOT TESTED | HTTP 403 for a non-admin — same reason as row 39. CI: `ADMIN: an administrator account can sign in and sees the platform metrics` and `ADMIN: every figure of the command center is really counted` — PASS in CI |
| 41 | `GET /api/admin/complaints` | complaint queue | bearer (admin) | NOT TESTED | HTTP 403 for a non-admin — same reason as row 39. CI: `ADMIN: the administrator sees the complaint queue and can resolve a complaint` — PASS in CI |
| 42 | `PATCH /api/admin/complaints/[id]/resolve` | resolve a complaint | bearer (admin) | NOT TESTED | No administrator account is available in the deployed environment — same reason as row 39 |
| 43 | `PATCH /api/admin/users/[id]/toggle-status` | activate / suspend | bearer (admin) | NOT TESTED | No administrator account is available in the deployed environment — same reason as row 39. CI: `ADMIN: the administrator can suspend and reactivate an account` and `ADMIN: an administrator cannot suspend its own account` — PASS in CI |
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

**Result (2026-11-28, final run against the head commit `6fd8c88`:
`01:32 +1: All tests passed!` — exit code 0, all
21 routes opened, no widget exception.** The only log line is the expected
`[ApiClient] /admin/metrics -> 403: Forbidden: Requires one of the following
roles: [ADMIN]` (the deployed database has no administrator account).

**21 routes discovered, 21 opened, 20 PASS, 1 NOT TESTED** (`/admin` — the
deployed database has no administrator account; the screen renders, the data
call answers 403).

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
| 15 | `/favorites` | favourites | PASS | `FavoritesPage` displayed; the entry in the profile is only offered to a buyer (`mobile/test/profile_role_test.dart`) |
| 16 | `/notifications` | notifications | PASS | `NotificationsPage` displayed |
| 17 | `/profile` | profile (language selector) | PASS | `ProfilePage` displayed |
| 18 | `/complaints` | complaints | PASS | `ComplaintsPage` displayed |
| 19 | `/admin` | admin dashboard | **NOT TESTED** | `AdminDashboardPage` displayed (the screen renders, the data call answers 403 — no admin account exists) |
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

#### 1.3.2 The build depended on a third-party font download

The push run of the CI failed while the pull-request run of the **same**
commit passed — both build the identical code. The cause was
`next/font/google`, which downloads the font files while the site is
built:

```
An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
    at next/dist/compiled/@next/font/dist/google/loader.js:122:78
```

A build that reaches out to a third-party host is a build that fails at
random, and a failed build means a failed deploy. Plus Jakarta Sans is
now **self-hosted**: the variable latin subset is part of the repository
(`frontend/src/app/fonts/PlusJakartaSans-Variable-latin.woff2`) together
with its SIL Open Font License 1.1, and `frontend/src/app/layout.tsx`
uses `next/font/local`.

| Check | Result |
| --- | --- |
| The built CSS declares the same font stack | `--font-sans: "jakarta", "jakarta Fallback", system-ui, sans-serif` |
| The emitted font file | `be6419ffe34f1ed7-s.p.woff2` — 27,348 bytes, byte for byte the committed file |
| `@font-face` rules in the built CSS | 2 (the family + its size-adjusted fallback) |
| Build without a network call to Google Fonts | PASS — `npm run build` exit code 0, 25 app routes |

The font was also **not being used at all**: the layout published it as
the `--font-sans` variable and gave the body the `font-sans` utility
class, but the Tailwind config never mapped that utility to the
variable — so `font-sans` resolved to Tailwind's default
(`ui-sans-serif, system-ui, sans-serif, …`) and the site rendered in the
system UI font while the webfont was served unused. The config now maps
it:

```js
fontFamily: { sans: ['var(--font-sans)'] }
```

and the built CSS reads `.font-sans{font-family:var(--font-sans)}`.

---

## 1.4 The administrator paths — why they are `NOT TESTED` in production

The audit was **not** allowed to invent an administrator and it was **not**
allowed to bypass the authorisation. The deployed PostgreSQL database of
Render has **no** account with the role `ADMIN`:

* the registration route only creates `FARMER` and `CONSUMER`,
* the seeded accounts are a farmer and a consumer,
* there is no route that promotes an account, and inventing one would be a
  bypass.

What was therefore done:

| Path | How it was tested | Status |
| --- | --- | --- |
| The website `/admin/dashboard` | opened as a guest (HTTP 200 — the page renders and the data call answers 401), as a **farmer** and as a **buyer** (the data call answers **403** *"Forbidden: Requires one of the following roles: [ADMIN]"*) | NOT TESTED (authorised path) |
| The five `/api/admin/*` routes | the same: the guard answers 403 for every non-administrator; the smoke script probes all of them | NOT TESTED (authorised path) |
| The Android `/admin` screen | opened on the emulator; the screen renders, `GET /api/admin/metrics` answers 403 | NOT TESTED (authorised path) |
| The **authorised** administrator paths | the PostgreSQL CI suite creates a **real** administrator account and exercises every one of them | PASS (CI) — see section 2.2 |

The CI suite proves the authorised behaviour, but a CI database is not the
production database, so the rows stay `NOT TESTED` for the deployment. The
honest answer to "can an administrator use the command centre on the live
site?" is: **not verified on the live site**.

---

## 1.5 Mock data and fabricated states

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

## 2. Workflow and integration coverage

Both clients use **one** backend (`https://farmconnect-api-sn98.onrender.com/api`),
**one** database and **one** account system. A workflow is only `PASS` when it
was actually executed against the deployed backend from the stated direction.

The **workflow matrix** (rows 1–18) asks "does this journey work from the
website, from the phone, and across both?". The **integration matrix** (row 19
and section 2.1) asks "do the two clients really share one state?".

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
| 15 | The whole order lifecycle — **placed → confirmed → packed → dispatched → delivered** | PASS | PASS | PASS | Website direction: the dispatch dashboard of the cultivator really pressed "MARK PACKED IN CRATES" (HTTP 200) and the shared database answered `status: "PACKED"` for the **same** order (`68f854b8-6937-4b57-b6ad-d64aa3f35718`); "HAND OVER TO TRANSPORT TRUCK" → `DISPATCHED`; the buyer ticked the inspection box, pressed "CONFIRM AND ACCEPT DELIVERY" → `DELIVERED`. Android direction: `mobile/integration_test/packed_status_test.dart` — the request of the website is replayed against the live backend (`PACKED` is stored, an unknown state is refused with 400) and the **Android** order list shows the state "Packed" in the card of the order (`00:17 +1: All tests passed!`). CI: `backend/src/__tests__/integration.test.ts` runs the five steps and asserts the **row** of the database (`expect(storedOrder?.status).toBe('PACKED')`) |
| 16 | The favourites of the buyer are one shared list | PASS | PASS | PASS | Website direction: the heart on a lot of the marketplace sets `aria-pressed="true"` and `GET /api/favorites` answers with the kept lot; `/consumer/favorites` lists it and the navbar badge reads "My favourites, 1 entry". Android direction: integration test 4 of `shared_data_workflow_test.dart` favourites the listing on Android and the website client reads the same favourite. The list is a **buyer** feature: a cultivator is refused with HTTP 403 and receives no buyer profile (`FAVOURITES: a cultivator is refused and never receives a buyer profile` — PASS in CI) |
| 17 | The inbox of the account is shared and the badge follows it | PASS | PASS | PASS | Website direction: `/notifications` lists 13 real notices, `MARK READ` moves the backend to `unreadCount: 4`, `MARK ALL READ` to `0`, and the navbar badge reads "Notifications, 0 unread" — the badge and the list are read from **one** answer (`AccountContext`), so they cannot disagree. The state survives a refresh (the badge still reads "0 unread" after a reload). Android direction: the Android screen `/notifications` reads the same inbox of the same account |
| 18 | The details of the account can be changed and are shared | PASS | PASS | PASS | Website direction: `/profile` writes the delivery address with `PATCH /api/users/me`, the API answers with the new value, the screen shows it, and the original value was restored afterwards. Android direction: the Android profile screen writes the same fields through the same endpoint, and the language selector of both clients changes the language of the **shared account** (workflow 12). The counts of the navbar use the right grammar in all three languages ("My favourites, 1 entry" / "… 3 entries") — `frontend/src/lib/__tests__/plural.test.mjs` |
| 19 | **Integration**: the two clients share one account system, one database and one session | PASS | PASS | PASS | One sign-in on the website opens the same session on the phone: `mobile/integration_test/auth_journey_test.dart` signs the QA account in on the emulator and reads the same user id, role and language. The logout on the website removes the token from **both** the local storage and the cookie, the guest is sent to the sign-in page (HTTP 307 → `/login?redirect=…`), the sign-in again restores the session, and a refresh of a protected route keeps it. No data of another account was ever visible in either direction (`shared_data_workflow_test.dart`, test 5) |

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

**Result (2026-11-28, final run against the head commit `6fd8c88`:
9 / 9 tests passed** on `emulator-5554` (Pixel_10a, Android 17 / API 37) —
`00:57 +9: All tests passed!`, exit code 0. The only log lines are the two
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
| Backend unit tests (no database) | `cd backend && npm run test:unit` | PASS | **92 / 92** tests green (9 suites: `language`, `productQuery`, `categoryResolver`, `apmcBenchmark`, `logisticsService`, `coordinate`, `geo`, `jwtSecret`, `apmcRateCsv` — including the tests that prove a cleared position never becomes the point `0 / 0`, that the published fallback secrets of the JWT are refused, and that a malformed bulletin row is rejected instead of being corrected) |
| Backend type check | `cd backend && npx tsc --noEmit` | PASS | exit code 0 |
| Backend database integration suite (CI, PostgreSQL 16) | `cd backend && npm run test:integration` | PASS (CI) | **141 / 141** tests green in 10 suites (140 after `db01ae4`, 141 after the new *leftover buyer row* test of `d455244`) — including the five steps of the order lifecycle `PENDING → CONFIRMED → PACKED → DISPATCHED → DELIVERED` with the assertion on the **stored row**, the refusal of an unknown state (HTTP 400) and the three new favourite tests (`a cultivator is refused and never receives a buyer profile`, `a leftover buyer row does not give a cultivator the buyer interface`, `the heart of the buyer really stores the lot`). Locally **BLOCKED** — no PostgreSQL/Docker in the local environment |
| Website type check | `cd frontend && npx tsc --noEmit` | PASS | exit code 0 |
| Website regression tests | `cd frontend && npm test` | PASS | **44 / 44** tests green (`node --test`, no dependency) — 35 before, plus the 9 tests of the plural forms |
| Website production build | `cd frontend && npm run build` | PASS | exit code 0 — the route table of the build names **25** app routes (21 static `○` and 4 dynamic `ƒ`: `/chat/[id]`, `/consumer/enquiries/[id]`, `/consumer/farmer/[id]`, `/products/[id]`), 24 static pages generated, no prerender error |
| Android static analysis | `cd mobile && flutter analyze` | PASS | "No issues found!" |
| Android unit + widget tests | `cd mobile && flutter test` | PASS | **35 / 35** tests green (33 before, plus the 2 tests of the profile role) |
| Localisation key parity (3 languages, website + Android) | `node scripts/verify-i18n.mjs` | PASS | website `core` 132, `auth` 121, `farmer` 313, `consumer` 248, `misc` 395 keys — 0 missing / 0 extra for kn and hi; Android ARB 400 keys — 0 missing / 0 extra for kn and hi |
| Localisation **usage** (every key the website asks for exists) | `node scripts/verify-i18n-usage.mjs` | PASS | 66 files scanned (the committed tree — 68 in the local working tree, which additionally holds two work-in-progress components), 1 209 known keys, 1 003 keys asked for, **0 missing**. The script says honestly that 12 calls in 7 files build their key at runtime and are therefore **not** checked statically. Wired into the CI workflow |
| Hardcoded-English scan of the website JSX | `node C:\Users\user\AppData\Local\Temp\opencode\find-hardcoded-jsx.mjs` | PASS | 3 hits — all false positives (`Promise` type annotations in `CartContext.tsx` / `ModalContext.tsx`) |
| Website route smoke (deployed) | `node scripts/smoke-routes.mjs` | PASS | **25 / 25** website routes + 24 / 24 API routes answered as expected |
| API endpoint smoke (deployed) | `node scripts/smoke-api-endpoints.mjs` | PASS | **54** probes, 0 unexpected statuses — every endpoint of the shared backend was exercised with a real request, including the refusal of the favourites for a cultivator (HTTP 403) |
| Live feature verification (deployed) | `node scripts/live-verify.mjs` | PASS | 61 / 61 checks green — 46 feature checks plus 15 that prove no fabricated benchmark, route, coordinate or success state reaches the deployed backend |
| Android route coverage (emulator, deployed API) | `cd mobile && flutter test integration_test/route_coverage_test.dart -d emulator-5554 …` | PASS | 21 / 21 routes opened, no widget exception — `01:32 +1: All tests passed!`, exit code 0, re-run against the head commit `6fd8c88`. The only log line is the expected `[ApiClient] /admin/metrics -> 403` (the deployed database has no administrator account) |
| Android auth journey (emulator, deployed API) | `cd mobile && flutter test integration_test/auth_journey_test.dart -d emulator-5554 …` | PASS | 5 / 5 tests green — `00:57 +5: All tests passed!`, exit code 0 |
| Android cross-platform order (emulator, deployed API) | `cd mobile && flutter test integration_test/cross_platform_test.dart -d emulator-5554 …` | PASS | 2 / 2 tests green — `00:53 +2: All tests passed!`, exit code 0. The order list really shows the shared order `Order #68f854b8 \| Delivered \| Web QA Tomato 1795847693410` |
| Android **packed** state (emulator, deployed API) | `cd mobile && flutter test integration_test/packed_status_test.dart -d emulator-5554 …` | PASS | 1 / 1 test green — `00:17 +1: All tests passed!`, exit code 0. The state `PACKED` is stored by the shared backend, an unknown state is refused with 400 and the Android list shows "Packed" **in the card of that order** |
| APMC rate importer (dry run, no database write) | `cd backend && npm run db:apmc-rates -- <test bulletin>.csv --dry-run` | PASS | 2 usable row(s), 1 commodity resolves to the crop catalogue, 1 published commodity does not (reported as such), 1 row rejected with the reason `the price(s) modalPrice are not a number` — **nothing was written**. A missing file and a file without a usable row both end with exit code 1 and write nothing. The 16 unit tests of `apmcRateCsv` cover the same rules |
| Cross-platform workflow suite (emulator, deployed API) | `cd mobile && flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 …` | PASS | 9 / 9 tests green — `00:57 +9: All tests passed!`, exit code 0 |
| Pull-request CI | `gh run list --branch fix/local-updates` | PASS | `FarmConnect Verification` — the push and the pull-request runs are green, including the PostgreSQL 16 integration suite (**141 tests**) and the new Android job (`flutter analyze --no-fatal-infos`, `flutter test`). **Every commit of this series is green on both runs.** The recorded pairs (push / pull request): `e5c6e0e` [`46148582375`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46148582375) / [`46148588861`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46148588861), `8159ec9` [`46148099021`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46148099021) / [`46148104474`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46148104474), `6fd8c88` [`46146832937`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46146832937) / [`46146837425`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46146837425), `d455244` [`46145110746`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46145110746) / [`46145115931`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46145115931), `db01ae4` [`46144456179`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46144456179) / [`46144461044`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46144461044), `ff0557c` [`46142331067`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46142331067) / [`46142336784`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46142336784), `beaf205` [`46142331067`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46142331067) / [`46142336784`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46142336784), `7211101` [`46141151918`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46141151918) / [`46141156321`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46141156321), `f6c1181` [`46138551221`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46138551221) / [`46138556092`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46138556092), `1065b28`, `e4e632c` [`46136456284`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46136456284) / [`46136462767`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46136462767), `ede50cb` [`46091384831`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46091384831) / [`46091389161`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46091389161), `a94a92d` [`46091036137`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46091036137) / [`46091041374`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46091041374), `0ad8866` [`46090676215`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46090676215) / [`46090681489`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46090681489), `cbe809b` [`46089957177`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46089957177) / [`46089961341`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46089961341), `cb30578` [`46089343352`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46089343352) / [`46089349520`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46089349520), `5eeac32` [`46088926057`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46088926057) / [`46088930632`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46088930632), `d7703af` [`46088640695`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46088640695) / [`46088644582`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46088644582), `459aeee` [`46087077962`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46087077962) / [`46087083317`](https://github.com/Shrishant1cog/Farmconnect/actions/runs/46087083317), `5654272` and `60cf464`. `gh run list --branch fix/local-updates` is the source of truth for the branch head. Every run executes the localisation check, the frontend type check and production build, the backend type check, the migrations, the PostgreSQL 16 integration suite, the `start.bat` validation and the source packaging. The run of `d597f74` failed while the pull-request run of the same commit passed — `next/font/google` could not reach Google Fonts; the font is self-hosted since `d7703af`, so the build no longer depends on a third-party host (see §1.3.2) |
| Release artefact build | `cd mobile && powershell -ExecutionPolicy Bypass -File .\tool\build_production.ps1 -Target all` | PASS | exit code 0 — `app-release.apk` **57.8 MB (60,617,334 bytes)** and `app-release.aab` **56.0 MB (58,770,324 bytes)**, both against the live Render host, rebuilt after the last source change (`d455244`) |
| Release artefact on a device | `adb -s emulator-5554 install -r mobile\build\app\outputs\flutter-apk\app-release.apk` | PASS | `Success`. `aapt2 dump badging` → package `in.farmconnect.farmconnect_mobile`, versionName `1.0.0`, label `FarmConnect`, `minSdkVersion 24`, `targetSdkVersion 36`; permissions → `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA`. `apksigner verify --print-certs` → `CN=Android Debug` — the artefact is **debug-signed**, so it is **not** Play Store ready (see [`docs/MULTILINGUAL_AND_CROPS.md`](MULTILINGUAL_AND_CROPS.md), limitation 3) |
| Release artefact — embedded host | scan `libapp.so` of every ABI inside the APK | PASS | `farmconnect-api-sn98.onrender.com` appears **3×** in `arm64-v8a`, `armeabi-v7a` and `x86_64`; `10.0.2.2:5000` appears **0×** and `localhost:5000` **0×** in all three |
| Release artefact points at production | `unzip -p app-release.apk lib/arm64-v8a/libapp.so \| grep -c 'http://10.0.2.2:5000'` | PASS | The local development URL occurs **0** times in all three ABIs (`arm64-v8a`, `armeabi-v7a`, `x86_64`), while `https://farmconnect-api-sn98.onrender.com/api` occurs once per ABI — the compile-time `--dart-define` resolved to the live host |

---

## 3. How to reproduce

```bash
# 1. Localisation completeness for all three languages
npm run i18n:check

# 1b. Every key the website asks for really exists
node scripts/verify-i18n-usage.mjs

# 2. Backend unit tests (no database required)
cd backend && npm run test:unit

# 2b. The website regression tests (no dependency, node --test)
cd frontend && npm test

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
flutter test integration_test/auth_journey_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
flutter test integration_test/cross_platform_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
flutter test integration_test/packed_status_test.dart -d emulator-5554 \
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
| `/api/users/farmers` | — | of the farmer profiles of the production database **0** carry a position after the cleanup migration (the count grows with every QA run — 53 at the migration, 63 at the first check, 82 at the last one — and the number of positions stayed **0** throughout); while the QA farmer held a real position it was the **only** one that appeared — the map plots exactly the farms that shared a position |
| `/` | `en` | the self-hosted webfont is really used: `getComputedStyle(document.body).fontFamily` = `jakarta, "jakarta Fallback", system-ui, sans-serif` and `document.fonts.check('16px jakarta')` is `true` (`jakarta 400 800` reports `loaded`). The document does not scroll sideways (`scrollWidth` 906 ≤ `innerWidth` 912) |
| `/farmer/dashboard` | `hi` | the language selector switches the interface **instantly**: after picking **हिन्दी** the card reads **"खेत का स्थान / अभी साझा नहीं किया गया"**, `document.documentElement.lang` = `hi`, no English string of the card is left (`Share my farm position`, `Not shared yet`, `Farm position` are all absent) and there is **no horizontal overflow** |
| `/farmer/dashboard` | `kn` | the same after picking **ಕನ್ನಡ**: the card reads **"ಜಮೀನಿನ ಸ್ಥಾನ / ಇನ್ನೂ ಹಂಚಿಕೊಳ್ಳಿಲ್ಲ"**, `lang` = `kn`, no English leak, no horizontal overflow |
| — | — | the Devanagari and Kannada glyphs render correctly — the screenshot shows real letters, **no missing-glyph box**; the latin subset of the webfont does not cover those scripts, so the browser falls back to the system font for them, exactly as before |
| `/mandi-rates` | `kn` | the **visible** page is completely Kannada (`document.body.innerText` carries no English): the header, the `#main-content` block and the footer. The server-rendered HTML is delivered inside the Next.js Suspense boundary `div#S:0`, which carries `display: none` — it is never painted and is excluded from the accessibility tree, so the account language never flashes in English. The **Export CSV** button is `disabled` because no rate was published, and the KPI reads "0 ಮಾರುಕಟ್ಟೆ ಗಡಿಗಳು ಹೊಂದಿಗೆ ಪ್ರಕಟಿಸಿವೆ" (0 market yards published a rate) |
| `/`, `/mandi-rates`, `/consumer/explore`, `/consumer/map`, `/buy` | `kn` | the self-hosted webfont is applied on every page, `document.documentElement.scrollWidth` never exceeds `window.innerWidth` (no sideways page scroll), the page contains **no** `₹3,100`, `12.5218`, `76.8951`, `0.0000` or `383.25`, and the two map pages show **0** markers |
| `/farmer/orders` | `en` | the dispatch dashboard of the cultivator shows the status that the shared backend **stored**: the order `68f854b8` reads `Order #A3F35718`, the filter chips are **All / Pending / Confirmed / Packed / Dispatched / Delivered**, and the raw key `farmer.orders.orderNumber` is **not** on the screen any more (it reads "Order #A3F35718") |
| `/farmer/orders` | `en` | pressing **MARK PACKED IN CRATES** changed the button to **HAND OVER TO TRANSPORT TRUCK** and the shared database answered `status: "PACKED"` for that order; pressing it again answered `status: "DISPATCHED"` |
| `/consumer/explore` | `en` | the heart of a lot sets `aria-pressed="true"` and the label becomes "Remove from favourites"; `GET /api/favorites` then answers with the kept lot (`QA Socket Lot 1795855741642`) |
| `/consumer/favorites` | `en` | the page lists the kept lot with its link; the navbar badges read **"Cart, 0 lots"**, **"Notifications, 5 unread"**, **"My favourites, 1 entries"** — the wrong grammar that was fixed in this series |
| `/consumer/favorites` | `en` | after the fix the badge reads **"My favourites, 1 entry"** (singular) and the list of the page still shows the same lot — one answer, one state |
| `/notifications` | `en` | the inbox lists 13 real notices ("Order status updated — Order 68f854b8… is now packed."); **MARK READ** moved the shared backend to `unreadCount: 4`, **MARK ALL READ** to `0`, and the navbar badge followed to **"Notifications, 0 unread"**. After a **refresh** the badge still reads "0 unread" |
| `/profile` | `en` | the form carries the real values of the shared account ("Web QA Buyer", "2847693410", "Bengaluru Urban", the delivery address); saving writes them with `PATCH /api/users/me` and the API answers with the new value. The original address was restored afterwards |
| `/login` → `/consumer/orders` | `en` | the **logout** button empties the local storage and the cookie, the visitor is sent to `/login?redirect=%2Fprofile`, the sign-in restores the session (`fc_token`, `farmconnect_token` and `fc_user` are back) and a **refresh** of the protected route keeps the session |
| — | — | **no console error** was raised on any of the pages above |

---

## 4. The honest summary — what is **not** proven

A green build is not a proof. This section lists everything that is **not**
covered by an executed test on the deployed services.

| # | Item | Status | Why | What would close it |
| --- | --- | --- | --- | --- |
| 1 | The website `/admin/dashboard` with a real administrator | **NOT TESTED** | The deployed database has no `ADMIN` account. The guard was proven (401 for a guest, 403 for a farmer and for a buyer), the authorised behaviour is proven in the PostgreSQL CI suite | an authorised QA administrator account on the deployment |
| 2 | The five `/api/admin/*` routes with a real administrator | **NOT TESTED** | same reason | same |
| 3 | The Android `/admin` screen with a real administrator | **NOT TESTED** | same reason | same |
| 4 | `POST /api/auth/firebase-phone` (SMS / OTP sign-in) | **NOT TESTED** (happy path) | Firebase is not configured on the deployment. The endpoint refuses the request with an honest message (HTTP 401) instead of pretending to work | a Firebase project with the phone auth provider, plus the `google-services.json` of the Android client (the app has no Firebase SDK — its phone tab is phone + password) |
| 5 | `GET /api/apmc/rates` with published rows | **NOT TESTED** (with data) | The endpoint works, but the shared table holds **no** row. The import path exists and is proven with a dry run; filling the table needs a **real** market bulletin | a real bulletin for `npm run db:apmc-rates` |
| 6 | A **suspended** account on the Android client | **NOT TESTED** | No administrator account exists on the deployment, so no QA account could be suspended. The path is proven in the CI suite (`SESSION: a token of a suspended account is refused`, `PHONE: a suspended account is refused on every sign-in path`) | an authorised QA administrator account |
| 7 | The PostgreSQL integration suite **locally** | **BLOCKED** | No local PostgreSQL and no reachable Docker daemon. The suite runs in the CI job with PostgreSQL 16 and is green there (141 tests) | a local PostgreSQL 16 |
| 8 | The release APK as a **Play Store** artefact | **NOT READY** | The repository carries no upload keystore: `android/key.properties` is absent, so the release build is signed with the **debug** key. It installs and runs, but the Play Store will not accept it | the owner's upload keystore in `android/key.properties` (never in the repository) |
| 9 | The **free** Render PostgreSQL instance | **expires 27 Dec 2026** | The platform runs on the free tier | a paid instance (or a managed database) |
| 10 | The image storage | **ephemeral** | The uploaded files live on the file system of the instance and are lost when it is recycled | an object store (S3 / Cloudflare R2) — the storage service already supports it through `STORAGE_PROVIDER` / `STORAGE_PUBLIC_URL` |
| 11 | The QA accounts of the audit | **accumulate** | The platform has no route to delete an account, and the audit must not delete customer data | an account deletion route (not part of this series) |

Nothing in this list is a defect of the code that is still open — every item is
either an environment fact or a missing piece of real data. But they are
**not** passes, and they are listed here so that nobody reads a green CI run
as a proof that the platform was fully tested.
