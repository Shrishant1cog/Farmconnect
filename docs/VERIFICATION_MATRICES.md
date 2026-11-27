# FarmConnect — Verification Matrices

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-27

Two matrices are kept here:

1. **Route coverage** — every website route, every API endpoint and every
   Android route, with the evidence that was collected for it.
2. **Cross-platform coverage** — the twelve acceptance workflows that must
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

---

## 1. Route coverage

### 1.1 Website (Next.js)

Source of truth: `frontend/src/app/**/page.tsx`. The HTTP evidence is
collected by `node scripts/smoke-routes.mjs`, which writes
`docs/route-smoke-report.json`.

| # | Route | Entry point | Role | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `/` | Navbar — FarmConnect logo | public | NOT TESTED | — |
| 2 | `/login` | Navbar — Sign In | public | NOT TESTED | — |
| 3 | `/register` | Navbar — Register | public | NOT TESTED | — |
| 4 | `/consumer/explore` | Navbar — Marketplace | public | NOT TESTED | — |
| 5 | `/mandi-rates` | Navbar — Mandi Rates | public | NOT TESTED | — |
| 6 | `/consumer/map` | Navbar — Farm Map | public | NOT TESTED | — |
| 7 | `/buy` | Home — browse lots | public | NOT TESTED | — |
| 8 | `/checkout` | Explore — add to cart | CONSUMER | NOT TESTED | — |
| 9 | `/products/[id]` | Explore — listing card | public | NOT TESTED | — |
| 10 | `/consumer/orders` | Navbar — My Orders | CONSUMER | NOT TESTED | — |
| 11 | `/consumer/chats` | Home shell — Chat | CONSUMER | NOT TESTED | — |
| 12 | `/consumer/enquiries` | Home shell — Enquiries | CONSUMER | NOT TESTED | — |
| 13 | `/consumer/enquiries/[id]` | Enquiries list — row | CONSUMER | NOT TESTED | — |
| 14 | `/consumer/farmer/[id]` | Listing — farmer name | public | NOT TESTED | — |
| 15 | `/chat/[id]` | Enquiry — open chat | CONSUMER | NOT TESTED | — |
| 16 | `/farmer/dashboard` | Navbar — Farmer Hub | FARMER | NOT TESTED | — |
| 17 | `/farmer/products` | Farmer dashboard — Lots | FARMER | NOT TESTED | — |
| 18 | `/farmer/orders` | Farmer dashboard — Orders | FARMER | NOT TESTED | — |
| 19 | `/farmer/inquiries` | Farmer dashboard — Enquiries | FARMER | NOT TESTED | — |
| 20 | `/seller` | Home — seller entry | FARMER | NOT TESTED | — |
| 21 | `/seller/orders` | Seller workspace — Orders | FARMER | NOT TESTED | — |
| 22 | `/admin/dashboard` | Admin entry | ADMIN | NOT TESTED | — |

### 1.2 API (Express)

Source of truth: `backend/src/modules/**/*.routes.ts`.

| # | Endpoint | Purpose | Auth | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/health` | liveness + database probe | public | NOT TESTED | — |
| 2 | `POST /api/auth/register` | account creation | public | NOT TESTED | — |
| 3 | `POST /api/auth/login` | email + password sign-in | public | NOT TESTED | — |
| 4 | `POST /api/auth/login-phone` | phone sign-in | public | NOT TESTED | — |
| 5 | `POST /api/auth/phone-login` | phone sign-in (legacy) | public | NOT TESTED | — |
| 6 | `POST /api/auth/firebase-phone` | Firebase phone OTP | public | NOT TESTED | — |
| 7 | `POST /api/auth/verify-aadhaar` | Aadhaar verification | public | NOT TESTED | — |
| 8 | `GET /api/auth/me` | profile of the signed-in account | bearer | NOT TESTED | — |
| 9 | `GET /api/catalog/categories` | crop categories with counts | public | NOT TESTED | — |
| 10 | `GET /api/catalog/crops` | searchable crop catalogue | public | NOT TESTED | — |
| 11 | `GET /api/products` | public catalogue feed | public | NOT TESTED | — |
| 12 | `POST /api/products` | create a crop listing | bearer (farmer) | NOT TESTED | — |
| 13 | `GET /api/products/[id]` | one listing | public | NOT TESTED | — |
| 14 | `PATCH /api/products/[id]` | edit one listing | bearer (owner) | NOT TESTED | — |
| 15 | `DELETE /api/products/[id]` | delete one listing | bearer (owner) | NOT TESTED | — |
| 16 | `GET /api/products/my-products` | farmer inventory | bearer (farmer) | NOT TESTED | — |
| 17 | `GET /api/products/farmer` | listings of one farmer | public | NOT TESTED | — |
| 18 | `GET /api/users/me` | profile incl. `preferredLanguage` | bearer | NOT TESTED | — |
| 19 | `PATCH /api/users/me` | update profile + language | bearer | NOT TESTED | — |
| 20 | `GET /api/users/farmers` | public farmer directory | public | NOT TESTED | — |
| 21 | `GET /api/orders/my` | consumer orders | bearer (consumer) | NOT TESTED | — |
| 22 | `GET /api/orders/farmer` | farmer orders | bearer (farmer) | NOT TESTED | — |
| 23 | `POST /api/orders` | place an order | bearer (consumer) | NOT TESTED | — |
| 24 | `GET /api/orders/[id]` | one order | bearer | NOT TESTED | — |
| 25 | `PATCH /api/orders/[id]/status` | order status | bearer | NOT TESTED | — |
| 26 | `PATCH /api/orders/[id]/received` | delivery confirmation | bearer (consumer) | NOT TESTED | — |
| 27 | `GET /api/enquiries/my` | consumer enquiries | bearer (consumer) | NOT TESTED | — |
| 28 | `GET /api/enquiries/farmer` | farmer enquiries | bearer (farmer) | NOT TESTED | — |
| 29 | `POST /api/enquiries` | create an enquiry | bearer | NOT TESTED | — |
| 30 | `GET /api/enquiries/[id]/messages` | enquiry messages | bearer | NOT TESTED | — |
| 31 | `POST /api/favorites/products/[id]` | favourite a listing | bearer | NOT TESTED | — |
| 32 | `POST /api/favorites/farmers/[id]` | favourite a farmer | bearer | NOT TESTED | — |
| 33 | `GET /api/favorites` | favourites | bearer | NOT TESTED | — |
| 34 | `GET /api/notifications` | notification inbox | bearer | NOT TESTED | — |
| 35 | `PATCH /api/notifications/[id]/read` | mark one read | bearer | NOT TESTED | — |
| 36 | `PATCH /api/notifications/read-all` | mark all read | bearer | NOT TESTED | — |
| 37 | `GET /api/complaints/mine` | own complaints | bearer | NOT TESTED | — |
| 38 | `POST /api/complaints` | file a complaint | bearer | NOT TESTED | — |
| 39 | `GET /api/admin/users` | user administration | bearer (admin) | NOT TESTED | — |
| 40 | `GET /api/admin/metrics` | platform metrics | bearer (admin) | NOT TESTED | — |
| 41 | `GET /api/admin/complaints` | complaint queue | bearer (admin) | NOT TESTED | — |
| 42 | `PATCH /api/admin/complaints/[id]/resolve` | resolve a complaint | bearer (admin) | NOT TESTED | — |
| 43 | `PATCH /api/admin/users/[id]/toggle-status` | activate / suspend | bearer (admin) | NOT TESTED | — |

### 1.3 Android app (Flutter)

Source of truth: `mobile/lib/routing/app_router.dart`.

| # | Route | Screen | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `/splash` | splash / session restore | NOT TESTED | — |
| 2 | `/login` | sign in | NOT TESTED | — |
| 3 | `/register` | registration | NOT TESTED | — |
| 4 | `/home` | role aware shell (dashboard, lots, orders, enquiries, profile) | NOT TESTED | — |
| 5 | `/product/:id` | listing detail | NOT TESTED | — |
| 6 | `/farmer/:id` | farmer profile | NOT TESTED | — |
| 7 | `/cart` | cart | NOT TESTED | — |
| 8 | `/checkout` | checkout | NOT TESTED | — |
| 9 | `/orders` | consumer orders | NOT TESTED | — |
| 10 | `/order/:id` | order detail | NOT TESTED | — |
| 11 | `/enquiries` | enquiries | NOT TESTED | — |
| 12 | `/chat/:id` | chat | NOT TESTED | — |
| 13 | `/market-rates` | mandi rates | NOT TESTED | — |
| 14 | `/logistics` | logistics calculator | NOT TESTED | — |
| 15 | `/favorites` | favourites | NOT TESTED | — |
| 16 | `/notifications` | notifications | NOT TESTED | — |
| 17 | `/profile` | profile (language selector) | NOT TESTED | — |
| 18 | `/complaints` | complaints | NOT TESTED | — |
| 19 | `/admin` | admin dashboard | NOT TESTED | — |
| 20 | `/farmer/products/new` | new crop listing | NOT TESTED | — |
| 21 | `/farmer/products/:id/edit` | edit crop listing | NOT TESTED | — |

---

## 2. Cross-platform coverage

Both clients use **one** backend (`https://farmconnect-api-sn98.onrender.com/api`),
**one** database and **one** account system. A workflow is only `PASS` when it
was actually executed against the deployed backend from the stated direction.

| # | Workflow | Website direction | Android direction | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Register a farmer | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 2 | Register a consumer | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 3 | Sign in with an account created on the other client | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 4 | Create a crop listing | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 5 | A listing created on one client is visible on the other | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 6 | Edit price / quantity / availability — the edit is visible on the other client and never touches a second crop | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 7 | Several independent crop lots per farmer (own crop name, variety, quantity, unit, price, availability, description, image) | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 8 | Favourites are shared | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 9 | Enquiries and chat messages are shared | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 10 | Orders and order status are shared | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 11 | Notifications arrive over Socket.IO on both clients | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 12 | Language change propagates in both directions | NOT TESTED | NOT TESTED | NOT TESTED | — |
| 13 | Logout clears the session; the other client's session is isolated | NOT TESTED | NOT TESTED | NOT TESTED | — |

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

| # | Test case | Covers workflow | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | a farmer registered on one client is usable from the other | 1, 3 | NOT TESTED | — |
| 2 | a product created on the website is visible in the Android app | 4, 5 | NOT TESTED | — |
| 3 | enquiries and messages are shared between both clients | 9 | NOT TESTED | — |
| 4 | favourites, notifications and complaints are persisted | 8, 11 | NOT TESTED | — |
| 5 | logout clears the session and the account can sign in again | 13 | NOT TESTED | — |
| 6 | order status is broadcast over Socket.IO | 10, 11 | NOT TESTED | — |
| 7 | a farmer can manage several independent crop listings | 6, 7 | NOT TESTED | — |
| 8 | the interface language preference is shared between the clients | 12 | NOT TESTED | — |

### 2.2 Build-time verification (already executed)

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Backend unit tests (no database) | `cd backend && npm run test:unit` | PASS | 26 / 26 tests green |
| Backend type check | `cd backend && npx tsc --noEmit` | PASS | exit code 0 |
| Website type check | `cd frontend && npx tsc --noEmit` | PASS | exit code 0 |
| Website production build | `cd frontend && npm run build` | PASS | exit code 0 — 21 routes prerendered/built, no prerender errors |
| Android static analysis | `cd mobile && flutter analyze` | PASS | "No issues found!" |
| Android unit + widget tests | `cd mobile && flutter test` | PASS | 31 / 31 tests green |
| Localisation key parity (3 languages, website + Android) | `node scripts/verify-i18n.mjs` | PASS | website `core` 120, `auth` 126, `farmer` 301, `consumer` 232, `misc` 328 keys — 0 missing / 0 extra for kn and hi; Android ARB 381 keys — 0 missing / 0 extra for kn and hi |
| Backend database integration suite | `cd backend && npm run test:integration` | BLOCKED | no PostgreSQL/Docker in the local environment — the suite runs in pull-request CI with PostgreSQL 16 |

---

## 3. How to reproduce

```bash
# 1. Localisation completeness for all three languages
npm run i18n:check

# 2. Backend unit tests (no database required)
cd backend && npm run test:unit

# 3. Route evidence against the deployed services
npm run smoke:routes

# 4. Live cross-platform workflow suite (needs an emulator)
cd mobile
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

The HTTP evidence of step 3 is stored verbatim in
`docs/route-smoke-report.json`.
