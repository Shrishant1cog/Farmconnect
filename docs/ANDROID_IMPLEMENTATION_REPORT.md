# FarmConnect — Android Implementation Report

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (opened as PR #2 — **not merged**)
**Report date:** 2026-11-27
**Scope:** Transform the existing Next.js FarmConnect website into a complete
Flutter Android application that shares **one** Express/Prisma/Socket.IO backend
and **one** PostgreSQL database with the website.

---

## 1. Executive summary

The FarmConnect marketplace now has two clients and one server:

```
┌────────────────────┐          ┌─────────────────────┐         ┌────────────────────┐
│ Next.js 15 website │          │ Flutter Android app │         │  PostgreSQL 16/17  │
│ (frontend/)        │          │ (mobile/)           │         │  (Prisma ORM)     │
│                    │          │                     │         │                    │
│ NEXT_PUBLIC_API_URL│          │ API_BASE_URL        │         │  16 tables         │
│ NEXT_PUBLIC_SOCKET │          │ SOCKET_URL          │         │  43 indexes        │
└─────────┬──────────┘          └──────────┬──────────┘         │  5 native enums    │
            │                              │                    └─────────┬──────────┘
            └──────────────┬───────────────┘                              │
                           ▼                                              │
                 ┌────────────────────────────────┐                       │
                 │ Express API + Socket.IO         │───────────────────────┘
                 │ backend/  (port 5000)           │
                 └────────────────────────────────┘
```

* **No separate backend.** The Android app calls the identical REST endpoints
  and the identical Socket.IO events as the website.
* **No separate database.** The Prisma datasource was migrated from SQLite to
  PostgreSQL so both clients operate on identical rows and identical IDs.
* **No mock data anywhere.** Every screen is driven by the live API. Where an
  endpoint was missing it was **implemented on the server**, never faked in
  Flutter.
* **The website keeps working.** The frontend type-checks, builds and runs
  against the same API; the backend test suite passes against PostgreSQL.

### Deliverables

| Deliverable | Path | Status |
| --- | --- | --- |
| Phase 0 audit | `docs/ANDROID_PARITY_AUDIT.md` | ✅ |
| Database migration guide | `docs/DATABASE_MIGRATION.md` | ✅ |
| API reference | `docs/API_DOCUMENTATION.md` | ✅ |
| Production / Render guide | `docs/PRODUCTION_DEPLOYMENT.md` | ✅ |
| This report | `docs/ANDROID_IMPLEMENTATION_REPORT.md` | ✅ |
| Flutter application | `mobile/` | ✅ |
| Debug APK | `mobile/build/app/outputs/flutter-apk/app-debug.apk` | ✅ |
| Release APK | `mobile/build/app/outputs/flutter-apk/app-release.apk` | ✅ |

---

## 2. Phase-by-phase summary

| Phase | Goal | Result |
| --- | --- | --- |
| 0 | Discovery & parity audit | ✅ Feature/API/DB inventory written to `docs/ANDROID_PARITY_AUDIT.md` |
| 1 | PostgreSQL + backend prep | ✅ Prisma switched to PostgreSQL, initial migration added, 5 missing backend modules implemented |
| 2 | Flutter project scaffold | ✅ `mobile/` created with Riverpod, go_router, Dio, secure storage, theming |
| 3 | Core layers | ✅ config, network client, storage, theme, formatters, models, 6 repositories |
| 4 | Feature screens | ✅ 26 screens across 13 feature areas |
| 5 | Routing & role shells | ✅ 20 routes with auth redirect and role-based home shell |
| 6 | UI/UX polish | ✅ Material 3 theme, empty/error/loading states, reusable product/farmer cards |
| 7 | Website ↔ Android sync | ✅ 5 on-device integration tests prove one shared database and one Socket.IO broadcast |
| 8 | Testing & build | ✅ analyzer 0 issues, 8 unit/widget tests, 7 backend tests, 5 on-device tests, debug + release APKs |
| 9 | Production docs | ✅ `docs/PRODUCTION_DEPLOYMENT.md` with Render env vars, build/start commands and an Android release checklist |

---

## 3. Backend changes (server side — not faked in Flutter)

### 3.1 Database

| Change | Detail |
| --- | --- |
| Datasource | `sqlite` → `postgresql`, `url = env("DATABASE_URL")` |
| Models | All 16 models preserved, no renames, no deletions |
| Enums | 5 native PostgreSQL enum types (`Role`, `ContainerType`, `OrderStatus`, `EnquiryStatus`, `ComplaintStatus`) |
| Migration | `backend/prisma/migrations/20260101000000_init/migration.sql` — 16 tables, 43 indexes, all foreign keys |
| Lock file | `backend/prisma/migrations/migration_lock.toml` pins the provider to `postgresql` |

### 3.2 New backend modules (previously missing)

| Module | Endpoints added |
| --- | --- |
| `backend/src/modules/favorites/` | `GET /api/favorites`, `POST/DELETE /api/favorites/products/:id`, `POST/DELETE /api/favorites/farmers/:id` |
| `backend/src/modules/notifications/` | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| `backend/src/modules/complaints/` | `POST /api/complaints`, `GET /api/complaints/mine` |

Previously the `FavouriteProduct`, `FavouriteFarmer`, `Notification` and
`Complaint` tables existed with **no public API**, so the Android app could not
use them. They are now exposed on the server and the website can consume the
same endpoints.

### 3.3 Socket.IO room-key fix

The on-device integration test uncovered that the farmer **never** received
real-time order notifications:

* `Order.farmerId` and `Product.farmerId` reference `FarmerProfile.id`.
* A socket always joins `user_<User.id>` — the id inside the JWT.
* The server emitted `new_order_received` and `order_delivered` to
  `user_<FarmerProfile.id>` — a room nobody joins.

`backend/src/modules/orders/orders.controller.ts` now resolves
`FarmerProfile.userId` before emitting, and
`backend/src/modules/enquiries/enquiries.controller.ts` no longer falls back to
the `FarmerProfile.id` when notifying the farmer about a new enquiry.

This bug affected the **website as well** — the fix benefits both clients.

### 3.4 Routed but unreachable endpoints

| Fix | Detail |
| --- | --- |
| `GET /api/orders/:id` | The controller method existed but was never mounted. Required by the Android order-tracking screen. |
| `GET /api/users/farmers` | The website's consumer map already called this path; only `/api/farmers/map` existed on the server. |
| `GET /api/health` | Now performs a real `SELECT 1` probe and returns HTTP 503 when the database is down — usable as the Render health check. |
| `POST /api/upload` | Storage is now pluggable: local disk for development, any S3-compatible bucket (AWS S3 / Cloudflare R2 / DigitalOcean Spaces / MinIO) for production. `backend/src/services/storage.service.ts`. |

### 3.5 Data-correctness bugs found and fixed

| Bug | Symptom | Fix |
| --- | --- | --- |
| `ConsumerProfile.address` does not exist | Registration and profile updates silently wrote nothing because a `try/catch` swallowed the Prisma error | The field is `deliveryAddress`; both `auth.controller.ts` and `users.controller.ts` now write `deliveryAddress`, and the swallowing `catch` was removed |
| Case-sensitive `contains` | PostgreSQL `contains` is case-sensitive, so product / farmer search silently lost matches | Restored `mode: 'insensitive'` in `products.controller.ts` and `users.controller.ts` |
| `Category.name` unique violation | `add-categories.ts` upserted by `slug`, but the seed uses the short slug `grains` while the script generated `grains-millets` → Prisma `P2002` | The script now resolves the category by name **or** slug before updating |
| `import 'dotenv/config'` missing | `npm run db:seed`, `add-categories.ts` and the integration suite all failed with `Environment variable not found: DATABASE_URL` (the Prisma CLI loads `.env`, plain `ts-node` does not) | Added `import 'dotenv/config';` to `backend/prisma/seed.ts`, `backend/add-categories.ts` and `backend/src/__tests__/integration.test.ts` |
| Extra `}` in `favorites.controller.ts` | TypeScript parse error `TS1005` — a brace closed `findMany()`'s object early | Brace corrected; `npx tsc --noEmit` is clean |
| `rootDir: "."` broke `npm start` | `tsc` emitted `dist/src/app.js`, but `npm start` runs `node dist/app.js` → `MODULE_NOT_FOUND` | `backend/tsconfig.json` now uses `rootDir: "./src"` (+ `isolatedModules: true`), so the entry point is `backend/dist/app.js` |
| UTF-8 BOM in the migration | PostgreSQL rejected the migration with `ERROR: syntax error at or near "﻿"` (position 1) — PowerShell's `Out-File -Encoding utf8` writes a BOM | The committed migration is BOM-free (first bytes `2D 2D 20`). The fix is documented in `docs/DATABASE_MIGRATION.md` §3 |
| `GET /api/products` envelope ambiguity | Flutter's `ApiClient.extractList` only looked under the exact keys it was given, so `{"products": [...]}` and nested `{"data":{"orders":[...]}}` were missed | `extractList` now handles bare arrays, flat envelopes and nested envelopes (4-level fallback) |

### 3.6 Backend scripts

| Script | Command |
| --- | --- |
| `db:generate` | `npx prisma generate` |
| `db:migrate` | `prisma migrate deploy` (production-safe, never drops data) |
| `db:seed` | `npx ts-node prisma/seed.ts` — **deletes all rows**, never run in production |
| `db:categories` | `npx ts-node add-categories.ts` — syncs the 10 agricultural categories |
| `db:setup` | `db:migrate` → `db:seed` → `db:categories` |

---

## 4. The Flutter application

### 4.1 Scale

| Metric | Value |
| --- | --- |
| Dart source files | 52 |
| Lines of Dart | ~8,700 |
| Feature areas | 13 |
| Screens / widgets | 26 |
| Declared routes | 20 |
| Repositories | 6 |
| Data models | 5 files (`user`, `product`, `order`, `enquiry`, `misc`) |

### 4.2 Technology choices

| Concern | Package | Why |
| --- | --- | --- |
| State management | `flutter_riverpod` 2.6 | Compile-safe DI, no code generation step |
| Networking | `dio` 5.7 | Interceptors, multipart upload, typed errors |
| Real-time | `socket_io_client` 3.0 | Same protocol as the website's Socket.IO server |
| Navigation | `go_router` 14.6 | Declarative routes with auth redirect |
| Secure storage | `flutter_secure_storage` 9.2 | Encrypted `EncryptedSharedPreferences` on Android |
| Maps | `flutter_map` 7 + `latlong2` | OpenStreetMap tiles, no API key needed |
| Location | `geolocator` 13 | "Use my location" on the farmer map |
| Media | `image_picker` 1.1 | Product photo capture |
| Formatting | `intl` 0.19 | Currency / date formatting |

### 4.3 Layered architecture

```
lib/
├── core/
│   ├── config/app_config.dart        API_BASE_URL / SOCKET_URL + production guard
│   ├── constants/api_endpoints.dart   Every backend path in one place
│   ├── network/api_client.dart        Dio client, JWT interceptor, error mapping
│   ├── network/api_exception.dart     Typed API errors
│   ├── network/socket_service.dart    Socket.IO connection + rooms
│   ├── providers.dart                 Riverpod providers (single source of truth)
│   ├── storage/token_storage.dart     SecureStore abstraction + TokenStorage
│   ├── theme/app_theme.dart           Material 3 light/dark theme
│   └── utils/formatters.dart          Currency / quantity / date formatting
├── data/
│   ├── models/                        user, product, order, enquiry, misc
│   └── repositories/                  auth, catalog, order, enquiry, engagement, user, admin
├── features/
│   ├── auth/                          login, register, auth controller
│   ├── consumer/                      explore, product detail, farmer detail, cart, checkout, orders
│   ├── farmer/                        dashboard, products, product form, orders
│   ├── orders/                        order detail + status timeline
│   ├── chat/                          enquiries list, chat thread
│   ├── map/                           farmer map with geolocation
│   ├── market_rates/                  APMC mandi rates
│   ├── logistics/                     transport / profit calculator
│   ├── favorites/                     favourite products & farmers
│   ├── notifications/                 notification inbox
│   ├── profile/                       profile edit, complaints
│   ├── admin/                         admin dashboard
│   └── dashboard/                     role-aware bottom-navigation shell
├── routing/app_router.dart            20 routes + auth redirect + error page
└── shared/widgets/                    product card, farmer card, empty/error/loading states
```

### 4.4 Configuration and the production guard

`mobile/lib/core/config/app_config.dart` reads the endpoints at **build time**:

```dart
static const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5000/api',   // Android emulator → host machine
);

static const String socketUrl = String.fromEnvironment(
  'SOCKET_URL',
  defaultValue: 'http://10.0.2.2:5000',
);
```

There is **no hardcoded localhost in a release build**. In addition,
`AppConfig.isMissingProductionUrl` detects a local host or the RFC 2606
`.invalid` placeholder and the app then shows
`AppConfig.missingProductionUrlMessage` — a plain-language explanation of how
to rebuild — instead of a cryptic socket error.

### 4.5 Secure storage

`TokenStorage` is built on a small `SecureStore` interface:

| Implementation | Use |
| --- | --- |
| `FlutterSecureStore` | Production — Android `EncryptedSharedPreferences` |
| `InMemorySecureStore` | Unit and integration tests — no platform channel required |

The JWT is stored encrypted at rest, exactly the credential the website keeps in
`localStorage`.

### 4.6 Feature parity matrix

| Website feature (route) | Android screen | Shared endpoint |
| --- | --- | --- |
| `/` landing | `HomeShell` (role-aware tabs) | — |
| `/login`, `/register` | `LoginPage`, `RegisterPage` | `POST /api/auth/login`, `POST /api/auth/register` |
| `/consumer/explore` | `ExplorePage` | `GET /api/products` |
| `/products/[id]` | `ProductDetailPage` | `GET /api/products/:id` |
| `/consumer/farmer/[id]` | `FarmerDetailPage` | `GET /api/farmers/:id`, `GET /api/users/farmers` |
| `/consumer/map` | `FarmerMapPage` | `GET /api/farmers/map` |
| `/checkout` | `CartPage`, `CheckoutPage` | `POST /api/orders` |
| `/consumer/orders` | `OrdersPage`, `OrderDetailPage` | `GET /api/orders/my`, `GET /api/orders/:id` |
| `/seller/orders` | `FarmerOrdersPage`, `OrderDetailPage` | `GET /api/orders/farmer`, `PATCH /api/orders/:id/status` |
| `/farmer/products` | `ProductsPage`, `ProductFormPage` | `GET/POST/PATCH/DELETE /api/products` |
| `/farmer/dashboard` | `FarmerDashboardPage` | `GET /api/dashboard/farmer` |
| `/farmer/inquiries` | `EnquiriesPage` | `GET /api/enquiries/farmer` |
| `/consumer/enquiries`, `/consumer/chats` | `EnquiriesPage`, `ChatPage` | `GET /api/enquiries/my`, `GET/POST /api/enquiries/:id/messages` |
| `/chat/[id]` | `ChatPage` | Socket.IO `new_chat_message`, `user_typing` |
| `/mandi-rates` | `MarketRatesPage` | `GET /api/apmc/rates` |
| *(logistics calculator)* | `LogisticsPage` | `POST /api/logistics/quote` |
| *(favourites)* | `FavoritesPage` | `GET/POST/DELETE /api/favorites/...` |
| *(notifications)* | `NotificationsPage` | `GET /api/notifications`, `PATCH .../read` |
| *(complaints)* | `ComplaintsPage` | `POST /api/complaints`, `GET /api/complaints/mine` |
| `/admin/dashboard` | `AdminDashboardPage` | `GET /api/admin/metrics`, `/users`, `/complaints` |
| *(profile)* | `ProfilePage` | `GET/PATCH /api/users/me` |

---

## 5. Verification results

All commands were run on Windows 11 with Flutter 3.47.2 / Dart 3.13.2,
Node 24.20.0, JDK 21.0.12, Android SDK 36 and PostgreSQL 17.12.

### 5.1 Flutter — static analysis

```
cd mobile && flutter analyze
→ No issues found! (ran in 21.0s)
```

### 5.2 Flutter — unit & widget tests

```
cd mobile && flutter test
→ 00:00 +8: All tests passed! (8/8)
```

| Test file | Covers |
| --- | --- |
| `mobile/test/model_parsing_test.dart` | JSON parsing of products, orders, enquiries, users, prices, notifications |
| `mobile/test/cart_widget_test.dart` | Empty cart state, adding products, quantity changes, totals |

### 5.3 Flutter — on-device integration test (Phase 7 shared-data proof)

```
cd mobile && flutter test integration_test/shared_data_workflow_test.dart \
  -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=http://10.0.2.2:5000/api \
  --dart-define=TEST_SOCKET_URL=http://10.0.2.2:5000
```

Run on an **Android 17 (API 37) emulator** against the **live Express API +
PostgreSQL** instance. The test uses the app's real repositories and real
Dio/Socket.IO clients — no mocks.

**Result: `00:12 +5: All tests passed!` — 5/5.**

| # | Test | What it proves |
| --- | --- | --- |
| 1 | a farmer registered on one client is usable from the other | Same user id on both clients; a listing created on Android appears in the website feed; an order placed on the website appears for the farmer on Android; a status update made on Android is visible on the website |
| 2 | enquiries and messages are shared between both clients | An enquiry raised on the website appears for the farmer on Android; a reply sent from Android is readable on the website |
| 3 | favourites, notifications and complaints are persisted | A favourite toggled on Android is visible on the website for the same consumer profile; complaints land in the shared `Complaint` table; the shared notification inbox is readable |
| 4 | logout clears the session and the account can sign in again | Session restoration from secure storage works; logout wipes the credentials; the account signs in again on the other client with the same id |
| 5 | the Socket.IO server broadcasts order events to the Android client | A real `new_order_received` event is received over the wire when the order is placed on the "website" client |

### 5.4 Backend — integration tests

```
cd backend && npm test -- --runInBand
→ 7/7 pass (against PostgreSQL)
```

### 5.5 Backend — build & schema

| Check | Command | Result |
| --- | --- | --- |
| Prisma client | `npx prisma generate` | ✅ |
| Migration apply | `npx prisma migrate deploy` | ✅ 16 tables, 43 indexes |
| Migration status | `npx prisma migrate status` | ✅ *"Database schema is up to date!"* |
| Seed | `npm run db:seed` | ✅ |
| Categories | `npm run db:categories` | ✅ 10 categories |
| TypeScript | `npm run build` | ✅ `dist/app.js` emitted |
| Health probe | `GET /api/health` | ✅ `{"status":"UP","database":"UP"}` |
| Seeded data | `GET /api/products` | ✅ 3 listings |

### 5.6 Website — still green

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | ✅ exit 0 |
| Production build | `npm run build` | ✅ exit 0 — 24 routes compiled |

### 5.7 APK builds

| Variant | Command | Result |
| --- | --- | --- |
| Debug | `flutter build apk --debug` | ✅ `app-debug.apk` (157.6 MB) |
| Release | `flutter build apk --release --dart-define=API_BASE_URL=… --dart-define=SOCKET_URL=…` | ✅ `app-release.apk` (55.8 MB) |

---

## 6. Bugs discovered during verification

Every issue below was found by actually running the system, not by inspection.

| # | Where | Severity | Status |
| --- | --- | --- | --- |
| 1 | Migration SQL — UTF-8 BOM rejected by PostgreSQL | High (blocks deploy) | ✅ fixed |
| 2 | `favorites.controller.ts` — extra `}` broke the build | High (blocks build) | ✅ fixed |
| 3 | `tsconfig.json` `rootDir` — `npm start` could not find `dist/app.js` | High (blocks start) | ✅ fixed |
| 4 | `seed.ts` / `add-categories.ts` / integration test — missing `dotenv/config` | High (blocks setup) | ✅ fixed |
| 5 | `add-categories.ts` — `P2002` unique-constraint collision on `Category.name` | Medium | ✅ fixed |
| 6 | `ConsumerProfile.address` → `deliveryAddress` — address never persisted | High (data loss) | ✅ fixed |
| 7 | Case-sensitive `contains` — search lost matches on PostgreSQL | Medium | ✅ fixed |
| 8 | `ApiClient.extractList` — missed `{"products":[…]}` and nested envelopes | Medium | ✅ fixed |
| 9 | `TokenStorage` was not injectable — tests needed a platform channel | Low (testability) | ✅ refactored behind `SecureStore` |
| 10 | 16 Dart analyzer lints (`prefer_initializing_formals`, `prefer_final_fields`, unused imports, `no_leading_underscores_for_local_identifiers`) | Low | ✅ resolved (analyzer now reports 0 issues) |
| 11 | Integration test bug — one shared token store let a consumer login overwrite the farmer JWT (401 → 403) | Test-only | ✅ fixed by giving every logical client its own store |
| 12 | **Socket.IO room mismatch** — `new_order_received` and `order_delivered` were emitted to `user_<FarmerProfile.id>`, but sockets join `user_<User.id>`, so **the farmer never received real-time order notifications** (the website was affected too) | High (real-time broken) | ✅ fixed — the server now resolves `FarmerProfile.userId` before emitting |
| 13 | Integration test bug — the Socket.IO client connected as a **guest**, so it never joined the private room | Test-only | ✅ fixed — the test now authenticates the socket with the farmer's JWT |
| 14 | Docker Desktop unusable on this machine (WSL 2 not installed → daemon HTTP 500) | Environment | ✅ worked around with a portable PostgreSQL 17.12; `docker-compose.yml` remains the documented path |

---

## 7. Known limitations and honest caveats

1. **The release APK carries a placeholder API host.**
   No production hostname exists yet — the owner deploys the backend to Render.
   Rather than inventing a hostname, the delivered release APK was built with
   the RFC 2606 reserved placeholder `https://api.farmconnect.invalid/api`,
   which can never resolve. The app detects this at runtime and displays the
   rebuild instructions. The owner must rebuild with the real host:
   ```bash
   cd mobile
   flutter build apk --release \
     --dart-define=API_BASE_URL=https://<your-render-host>/api \
     --dart-define=SOCKET_URL=https://<your-render-host>
   ```
2. **No Render deployment was performed.** The agent does not create credentials,
   API keys or Firebase configuration. `docs/PRODUCTION_DEPLOYMENT.md` documents
   every environment variable, build command, start command and health-check
   path the owner needs.
3. **The release APK is not Play-Store signed.** It uses the Flutter default
   release signing. The upload-keystore steps are documented in
   `docs/PRODUCTION_DEPLOYMENT.md` §6.2.
4. **Firebase phone OTP** is wired to the same `POST /api/auth/firebase-phone`
   endpoint the website uses, but it only works once the owner supplies
   `FIREBASE_PROJECT_ID` and the service account. Email/password sign-in is
   fully functional and verified.
5. **Image uploads in production need object storage.** A Render filesystem is
   ephemeral, so `STORAGE_PROVIDER=s3` is mandatory in production. The local
   provider is for development only.
6. **`npm run db:seed` deletes every row.** It must never be pointed at a
   production database. This is called out in the script documentation, the
   migration guide and the deployment guide.
7. **Socket.IO delivery to a phone that is backgrounded** depends on the
   Android process being alive; the app re-syncs from REST when it resumes.

---

## 8. Running it locally

### 8.1 Backend + database

```bash
# Terminal 1 — database (Docker)
docker compose up -d postgres

# Terminal 1 — API
cd backend
cp .env.example .env          # then set DATABASE_URL
npm install
npm run db:setup              # migrate + seed + categories
npm start                     # → http://localhost:5000/api
```

Without Docker, point `DATABASE_URL` at any PostgreSQL 15+ instance
(native install or a portable distribution) and run the same `db:setup`.

### 8.2 Website

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:5000/api \
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000 \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
npm run dev
```

### 8.3 Android app

```bash
cd mobile
flutter pub get

# Android emulator → the host machine is 10.0.2.2
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api \
            --dart-define=SOCKET_URL=http://10.0.2.2:5000

# Physical device → use the LAN IP of the development machine
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:5000/api \
            --dart-define=SOCKET_URL=http://192.168.x.x:5000
```

Demo accounts seeded by `db:seed` (password `Password@123`):

| Role | Email |
| --- | --- |
| Admin | `admin@farmconnect.org` |
| Farmer (Mandya) | `ramesh.mandya@farmconnect.org` |
| Farmer (Mysuru) | `suresh.mysuru@farmconnect.org` |
| Consumer | `priya.bengaluru@gmail.com` |

### 8.4 Running the tests

```bash
# Flutter unit + widget tests
cd mobile && flutter test

# Flutter on-device integration test (needs a running API)
cd mobile && flutter test integration_test/shared_data_workflow_test.dart \
  -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=http://10.0.2.2:5000/api \
  --dart-define=TEST_SOCKET_URL=http://10.0.2.2:5000

# Backend integration tests (needs PostgreSQL)
cd backend && npm test -- --runInBand
```

---

## 9. Repository changes

### 9.1 New — `mobile/`

```
mobile/
├── android/                    Android host project (Gradle, manifest, permissions)
├── lib/                        52 Dart files (~8,700 lines)
├── test/                       unit + widget tests
├── integration_test/           shared-data workflow test
├── pubspec.yaml
├── analysis_options.yaml
└── README.md
```

### 9.2 New — `docs/`

| File | Purpose |
| --- | --- |
| `docs/ANDROID_PARITY_AUDIT.md` | Phase 0 audit — feature, API and database inventories plus the gap analysis |
| `docs/DATABASE_MIGRATION.md` | PostgreSQL migration guide (schema, queries, local setup, production steps, rollback) |
| `docs/API_DOCUMENTATION.md` | Full API reference — 50 endpoints, auth, envelopes, errors, rate limits, Socket.IO events |
| `docs/PRODUCTION_DEPLOYMENT.md` | Render env vars, build/start commands, health check, Android release + signing, deployment checklist |
| `docs/ANDROID_IMPLEMENTATION_REPORT.md` | This report |

### 9.3 Modified — backend

| Path | Change |
| --- | --- |
| `backend/prisma/schema.prisma` | PostgreSQL datasource |
| `backend/prisma/migrations/**` | New initial migration + lock file |
| `backend/prisma/seed.ts` | `dotenv/config` import |
| `backend/add-categories.ts` | `dotenv/config` import; name-or-slug resolution |
| `backend/package.json` | `db:categories`, `db:setup` scripts |
| `backend/tsconfig.json` | `rootDir: "./src"`, `isolatedModules: true` |
| `backend/src/app.ts` | Router mounts for favourites/notifications/complaints; `/api/health`; pluggable upload |
| `backend/src/modules/auth/auth.controller.ts` | `deliveryAddress` fix; error swallowing removed |
| `backend/src/modules/users/users.controller.ts` | `deliveryAddress` fix; `mode: 'insensitive'`; `GET /users/farmers` |
| `backend/src/modules/products/products.controller.ts` | `mode: 'insensitive'` restored |
| `backend/src/modules/orders/orders.routes.ts` | `GET /api/orders/:id` mounted |
| `backend/src/modules/orders/orders.controller.ts` | Socket.IO room key fixed — resolves `FarmerProfile.userId` before emitting to `user_<id>` |
| `backend/src/modules/enquiries/enquiries.controller.ts` | New-enquiry notification now targets the farmer's `User.id` |
| `backend/src/modules/favorites/**` | **New** module |
| `backend/src/modules/notifications/**` | **New** module |
| `backend/src/modules/complaints/**` | **New** module |
| `backend/src/services/storage.service.ts` | **New** — local + S3 storage |
| `backend/src/__tests__/integration.test.ts` | `dotenv/config` import |
| `backend/.env.example` | **New** |

### 9.4 Modified — infrastructure

| Path | Change |
| --- | --- |
| `docker-compose.yml` | PostgreSQL 16 service with a health check |
| `.env.example` | `DATABASE_URL` and the production variable set |
| `.github/workflows/verify.yml` | PostgreSQL 16 service container; `prisma migrate deploy` before the backend tests |

---

## 10. CI

`.github/workflows/verify.yml` now runs against a real PostgreSQL 16 service
container:

1. `frontend` — `npm ci`, `npx tsc --noEmit`, `npm run build`
2. `backend` — `npm ci`, `npx prisma generate`, `npm run build`,
   `npx prisma migrate deploy`, `npm test -- --runInBand`
3. `start.bat` static validation
4. A verified-source ZIP artifact

The workflow triggers on `push` to `fix/**` and on every pull request, so the
Android-parity branch is validated by the same pipeline.

---

## 11. Git and PR status

| Item | Value |
| --- | --- |
| Branch | `fix/local-updates` |
| Base | `main` |
| Pull request | https://github.com/Shrishant1cog/Farmconnect/pull/2 |
| Merged? | **No — intentionally not merged** |
| `main` modified? | **No** |

All Android, PostgreSQL and documentation work in this report is committed on
`fix/local-updates` only.

---

## 12. Appendix — API surface used by the Android app

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/login-phone`, `POST /api/auth/firebase-phone`, `GET /api/auth/me`, `POST /api/auth/verify-aadhaar` |
| Catalogue | `GET /api/products`, `GET /api/products/:id`, `GET /api/products/my-products`, `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` |
| Orders | `POST /api/orders`, `GET /api/orders/my`, `GET /api/orders/farmer`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status`, `PATCH /api/orders/:id/received` |
| Enquiries | `POST /api/enquiries`, `GET /api/enquiries/my`, `GET /api/enquiries/farmer`, `GET /api/enquiries/:id/messages`, `POST /api/enquiries/:id/messages` |
| Users | `GET /api/users/me`, `PATCH /api/users/me`, `GET /api/users/farmers`, `GET /api/farmers/map`, `GET /api/farmers/:id` |
| Engagement | `GET /api/favorites`, `POST/DELETE /api/favorites/products/:id`, `POST/DELETE /api/favorites/farmers/:id`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, `POST /api/complaints`, `GET /api/complaints/mine` |
| Admin | `GET /api/admin/metrics`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/toggle-status`, `GET /api/admin/complaints`, `PATCH /api/admin/complaints/:id/resolve` |
| Market & logistics | `GET /api/apmc/rates`, `POST /api/logistics/quote`, `GET /api/dashboard/farmer` |
| Media | `POST /api/upload` |
| Socket.IO | `join_product`, `join_order`, `join_enquiry`, `typing_start`, `typing_stop` → `new_order_received`, `order_status_updated`, `order_delivered`, `new_chat_message`, `new_notification`, `product_updated`, `user_typing`, `user_stopped_typing` |

The full reference, including request and response bodies, is in
[`docs/API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).
