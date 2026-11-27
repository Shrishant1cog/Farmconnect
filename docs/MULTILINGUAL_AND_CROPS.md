# FarmConnect — Multilingual Support & Multiple Crop Listings

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-28

This document describes the two features added in this development phase:

* **Feature A — Multilingual support** in English, Kannada (ಕನ್ನಡ) and Hindi
  (हिन्दी) across the **Next.js website** and the **Flutter Android app**.
* **Feature B — Multiple independent crop listings** shared by both clients
  through the **same** Express/Prisma backend and the **same** PostgreSQL
  database.

Both clients remain two front ends of one platform. Nothing in this work
introduces a second backend, a second database or a client-side database.

---

## 1. Architecture overview

```
                    ┌──────────────────────────────────────┐
   Browser  ───────▶│  Next.js website (frontend/)         │
                    │  LocaleProvider + feature dictionaries │
                    └───────────────┬──────────────────────┘
                                    │  HTTPS + Socket.IO
                    ┌───────────────▼──────────────────────┐
   Android  ───────▶│  Flutter app (mobile/)                │
                    │  LocaleController + ARB localisations │
                    └───────────────┬──────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────┐
                    │  Express API (backend/)               │
                    │  /api/auth /api/users /api/products   │
                    │  /api/catalog /api/orders …           │
                    └───────────────┬──────────────────────┘
                                    │  Prisma
                    ┌───────────────▼──────────────────────┐
                    │  PostgreSQL (one database)            │
                    │  User.preferredLanguage               │
                    │  Product.cropName / Product.variety   │
                    └──────────────────────────────────────┘
```

### Shared state

| Item | Storage | Written by | Read by |
| --- | --- | --- | --- |
| Account language | `User.preferredLanguage` | `PATCH /api/users/me` | website + Android |
| Device language | `localStorage` (web) / encrypted keystore (Android) | the client | that client only |
| Live language change | Socket.IO room `user_<id>` | backend | both clients |
| Crop identity | `Product.cropName`, `Product.variety` | `POST/PUT /api/products` | both clients |
| Crop category | `Product.categoryId` → `Category` | crop picker | both clients |
| Crop catalogue | `GET /api/catalog/crops` | backend (static catalogue) | both clients |

---

## 2. Feature A — multilingual support

### 2.1 Supported languages

| Code | Language | Native name shown in the selector | `Intl` / BCP-47 tag |
| --- | --- | --- | --- |
| `en` | English | English | `en-IN` |
| `kn` | Kannada | ಕನ್ನಡ | `kn-IN` |
| `hi` | Hindi | हिन्दी | `hi-IN` |

The language names are always rendered in their **own script**, in both the
website selector and the Android bottom sheet.

### 2.2 Adding another Indian language later

The design deliberately keeps the language list in one place per tier:

| Tier | Where the list lives | What has to change |
| --- | --- | --- |
| Backend | `backend/src/utils/language.ts` (`SUPPORTED_LANGUAGES`) | add the code |
| Website | `frontend/src/i18n/types.ts` (`LOCALES`, `LOCALE_META`) | add the code + the native name |
| Android | `mobile/lib/core/locale/locale_controller.dart` (`AppLocales.supported`) | add the code + the native name |

Then add the matching dictionary file / ARB file. The translation tables are
split per feature group so several languages can be added independently.

### 2.3 Website implementation

| Concern | File |
| --- | --- |
| Locale types, metadata, interpolation | `frontend/src/i18n/types.ts` |
| Merged translation tables | `frontend/src/i18n/index.ts` |
| Dictionaries (one file per group × language) | `frontend/src/i18n/dictionaries/{core,auth,farmer,consumer,misc}.{en,kn,hi}.ts` |
| Provider (state, persistence, server sync, Socket.IO) | `frontend/src/context/LocaleContext.tsx` |
| Hook used by every screen | `frontend/src/hooks/useI18n.ts` |
| Selector | `frontend/src/components/ui/LanguageSwitcher.tsx` |

`useI18n()` returns:

```ts
{
  locale,          // 'en' | 'kn' | 'hi'
  setLocale,       // switch instantly, no reload
  t,               // translate + interpolate {placeholders}
  formatNumber,    // Intl.NumberFormat
  formatCurrency,  // Intl.NumberFormat (INR)
  formatDate,      // Intl.DateTimeFormat
  formatDateTime,
  intlTag,         // 'kn-IN' etc.
}
```

**Persistence and synchronisation**

1. On mount the locally stored value (`localStorage["farmconnect_locale"]`) is
   restored — this also works for signed-out visitors.
2. When a session exists the account preference is fetched from
   `GET /api/users/me` and applied.
3. `setLocale()` writes the value to `localStorage` **and** sends
   `PATCH /api/users/me { preferredLanguage }` so the account follows.
4. The backend emits `language_preference_updated` to the room `user_<id>`;
   the website listens on it and switches immediately.
5. On sign-out the local preference is kept (it is a device preference).
6. `document.documentElement.lang` follows the active locale on **every**
   change — not only when the language switcher is used. The server renders
   `lang="en"` (it cannot know the visitor's language), so a restored
   preference would otherwise leave the wrong language announced to screen
   readers and to the browser hyphenation rules.

**Dictionary size (keys per language, verified by `scripts/verify-i18n.mjs`)**

| Group | en | kn | hi | Missing / extra |
| --- | --- | --- | --- | --- |
| `core` | 120 | 120 | 120 | 0 / 0 |
| `auth` | 126 | 126 | 126 | 0 / 0 |
| `farmer` | 301 | 301 | 301 | 0 / 0 |
| `consumer` | 232 | 232 | 232 | 0 / 0 |
| `misc` | 352 | 352 | 352 | 0 / 0 |

### 2.4 Android implementation

| Concern | File |
| --- | --- |
| ARB sources | `mobile/lib/l10n/app_{en,kn,hi}.arb` |
| Generated classes | `mobile/lib/l10n/generated/app_localizations*.dart` |
| Generator configuration | `mobile/l10n.yaml` |
| Controller (state, persistence, server sync, Socket.IO) | `mobile/lib/core/locale/locale_controller.dart` |
| Selector widget | `mobile/lib/shared/widgets/language_selector.dart` |
| Application wiring | `mobile/lib/main.dart` |

The app uses the official `flutter gen-l10n` tool chain with
`flutter_localizations`. `MaterialApp.router` receives the active `Locale`, so
switching the language rebuilds the widget tree in place — **no restart, no
refresh and no flicker**.

The language is stored in the encrypted keystore
(`farmconnect_locale`) and deliberately **survives a logout**.

**ARB size:** 390 keys per language (`en`, `kn`, `hi`) — 0 missing / 0 extra,
verified by `scripts/verify-i18n.mjs`.

### 2.5 Scope rules

* Only *interface* text is translated. Farmer- and customer-entered content
  (crop names, variety, listing titles, descriptions, chat messages) is never
  translated or overwritten.
* Numbers, dates and currency are formatted with `Intl` (web) and `intl`
  (Android) using the active locale.
* Every language file must contain the complete key set of the English
  reference. This is enforced by `scripts/verify-i18n.mjs` (see section 5).

---

## 3. Feature B — multiple independent crop listings

### 3.1 Data model

The change is **additive**; existing rows keep working untouched.

```sql
ALTER TABLE "User"   ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cropName" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "variety"  TEXT;
CREATE INDEX IF NOT EXISTS "Product_cropName_idx" ON "Product" ("cropName");
```

Migration file:
`backend/prisma/migrations/20261127000000_add_language_and_crop_fields/migration.sql`

It is applied automatically on Render by
`npm run db:migrate` (`prisma migrate deploy`) in the service build command.

> **One listing = one crop.** A farmer publishes one `Product` row per crop
> lot. Each row keeps its **own** crop name, variety, quantity, unit, price,
> availability, description and image. Two crops of the same farmer are two
> different rows with two different ids — editing one never touches the other.

### 3.2 New shared endpoints

| Endpoint | Purpose | Used by |
| --- | --- | --- |
| `GET /api/catalog/categories` | the database categories with live listing counts **and** their Kannada / Hindi display names | website crop filters, Android crop filters, crop pickers |
| `GET /api/catalog/crops?search=&category=` | the searchable crop catalogue with English / Kannada / Hindi aliases and display names | both crop pickers |

`GET /api/catalog/crops` resolves every catalogue entry against the live
`Category` table and returns the **real** `categoryId` and `categorySlug`, so
neither client has to know how the categories are seeded.

### 3.3 Localised catalogue labels

The catalogue endpoints return the **canonical English name** plus the
Kannada and Hindi display name next to it:

```jsonc
// GET /api/catalog/categories
{
  "id": "…",
  "name": "Grains & Millets",     // the stored value — never translated
  "nameKn": "ಧಾನ್ಯ ಮತ್ತು ಮಿಲೆಟ್ಸ್",
  "nameHi": "अनाज और मिलेट",
  "slug": "grains-millets"
}

// GET /api/catalog/crops
{
  "name": "Tomato",                // the stored value
  "nameKn": "ಟೊಮೇಟೊ",
  "nameHi": "टमाटर",
  "category": "vegetables",
  "categoryId": "…",
  "categoryName": "Vegetables",
  "categoryNameKn": "ತರೆಕೆಕ್ಕೆಕ್ಕೆ",
  "categoryNameHi": "सब्ज़ियाँ"
}
```

| Layer | How the localised name is produced | How the client picks it |
| --- | --- | --- |
| Backend | `CROP_CATEGORY_LABELS` in `backend/src/data/cropCatalog.ts` for the categories; the native alias of the catalogue entry for the crops (`localizedCropNames()`), and `localizedCategoryNames()` for the live database rows | — |
| Website | — | `localizedName(item, locale)` in `frontend/src/lib/localized.ts` — used by the marketplace category chips and by both crop pickers (`AddCropModal`, `EditCropModal`) |
| Android | — | `CropCategory.displayName(languageCode)` / `CropSuggestion.displayName(languageCode)` in `mobile/lib/data/models/product.dart` — used by the marketplace chips and by the crop picker |

**The stored value stays English.** The crop picker shows the native name
*and* the canonical English name as a hint, but it writes the **canonical
English name** into `Product.cropName`. Farmer- and customer-entered content
is never translated — only the *catalogue* (which is shared reference data
owned by the backend) is displayed in the active language.

### 3.4 Multilingual crop search

A listing stores the canonical crop name (`Tomato`), but the farmer may search
for it in their own script (`ಟೊಮೇಟೊ`, `टमाटर`). `expandCropSearchTerms()` in
`backend/src/data/cropCatalog.ts` expands a search term into **every** name
the shared catalogue knows for the matched crop, so one query finds the
listing in all three languages:

```
search=ಟೊಮೇಟೊ  →  cropName contains "ಟೊಮೇಟೊ" OR "Tomato" OR "tomatoes" OR "टमाटर"
search=टमाटर   →  cropName contains "टमाटर"   OR "Tomato" OR "tomatoes" OR "ಟೊಮೇಟೊ"
```

Terms shorter than three characters are **not** expanded — they would match
half of the catalogue and destroy the result list. The expansion is applied
to both the `search` and the `crop` filter of `GET /api/products`.

### 3.5 Product filters

`GET /api/products` accepts the new filters and keeps every old one:

| Parameter | Behaviour |
| --- | --- |
| `search` | matches title, description, location, crop name and variety |
| `crop` | matches crop name, variety and title |
| `category` | category slug **or** display name (resolved against the database) |
| `categoryId` | exact category record |
| `isOrganic`, `district` | unchanged |

### 3.4 Category resolution

The seeded category slugs are not identical on every installation (the seed
script keeps an already existing slug, so `Grains & Millets` may be stored as
`grains` or as `grains-millets`). `backend/src/utils/categoryResolver.ts`
therefore resolves a category by slug, by canonical display name and by the
slugified display name, and the product filter resolves to the real
`categoryId` before the query runs. Both clients therefore select exactly the
same listings.

### 3.5 Crop catalogue

`backend/src/data/cropCatalog.ts` holds **78** crops across ten categories,
each with English, Kannada and Hindi aliases, for example:

| Crop | Category | Kannada alias | Hindi alias |
| --- | --- | --- | --- |
| Tomato | vegetables | ಟೊಮೇಟೊ | टमाटर |
| Ragi | grains-millets | ರಾಗಿ | रागी |
| Turmeric | spices-herbs | ಹಳ್ಳಿ | हल्दी |

Every one of the 78 entries carries a native Kannada **and** a native Hindi
alias — this is asserted by a unit test, so the localised display names can
never silently fall back to English.

The catalogue is **search assistance, not a restriction** — a farmer may always
type a crop that is not listed.

### 3.6 Farmer workflow (identical on both clients)

1. Open **List lot** / **Add crop**.
2. Pick a category (chips / dropdown built from `/api/catalog/categories`,
   shown in the active language).
3. Type the crop name, or search the catalogue (`/api/catalog/crops`) and tap
   a suggestion to fill the field. The suggestion is shown in the active
   language with the canonical English name as a hint; the **English** name
   is stored.
4. Optionally fill the variety, quantity, unit, price, availability,
   description and image.
5. Save — a **new** `Product` row is created; existing lots are untouched.
6. The farmer dashboard and the Lots list show **every** lot as its own card
   with its crop name and variety.
7. Edit, toggle availability or delete operate on the id of the selected lot
   only.

### 3.7 Customer workflow (identical on both clients)

1. The marketplace shows the crop-category chips (in the active language) and
   a crop search field.
2. Selecting a category filters by `category=<slug>`; typing filters by
   `search=` (which covers crop name and variety in all three languages).
3. Each listing shows its crop name and variety below the title — in the
   language the farmer typed them, because that is user-entered content.

---

## 4. What is deliberately **not** changed

* No new tables, no duplicate product model, no separate "crop" table.
* No change to the authentication flow, the password hashing, the JWT format
  or the role model.
* No translation of user-entered content.
* No destructive seed against the hosted database.

---

## 5. Verification tooling

```bash
# 1. Every language contains the complete English key set (website + Android)
node scripts/verify-i18n.mjs

# 2. Backend unit tests (no database required)
cd backend && npx jest src/__tests__/language.test.ts \
                     src/__tests__/productQuery.test.ts \
                     src/__tests__/categoryResolver.test.ts

# 3. Website types
cd frontend && npx tsc --noEmit

# 4. Android analysis + tests
cd mobile && flutter analyze && flutter test

# 5. Real HTTP evidence for every public website route and API endpoint
node scripts/smoke-routes.mjs
node scripts/smoke-api-endpoints.mjs

# 6. Live cross-platform workflow suites (need an emulator)
cd mobile
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
flutter test integration_test/route_coverage_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

The HTTP evidence of step 5 is stored verbatim in
`docs/route-smoke-report.json` and `docs/api-endpoint-smoke-report.json`.

---

## 6. Test results (recorded 2026-11-28)

Every result below was produced by actually running the command — nothing is
estimated. The live route and cross-platform matrices are kept separately in
[`docs/VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md).

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Backend unit tests (no database) | `cd backend && npm run test:unit` | PASS | 48 / 48 tests green (5 suites: `language`, `productQuery`, `categoryResolver`, `apmcBenchmark`, `logisticsService`) |
| Backend type check | `cd backend && npx tsc --noEmit` | PASS | exit code 0 |
| Website type check | `cd frontend && npx tsc --noEmit` | PASS | exit code 0 |
| Website production build | `cd frontend && npm run build` | PASS | exit code 0 — 21 routes prerendered/built, no prerender errors |
| Android static analysis | `cd mobile && flutter analyze` | PASS | "No issues found!" |
| Android unit + widget tests | `cd mobile && flutter test` | PASS | 31 / 31 tests green (includes `locale_test.dart` and `crop_listing_test.dart`) |
| Localisation key parity | `node scripts/verify-i18n.mjs` | PASS | website `core` 120, `auth` 126, `farmer` 305, `consumer` 233, `misc` 362 keys; Android ARB 390 keys — 0 missing / 0 extra for Kannada and Hindi |
| Hardcoded-English scan of the website JSX | `node C:\Users\user\AppData\Local\Temp\opencode\find-hardcoded-jsx.mjs` | PASS | 3 hits — all false positives (`Promise` type annotations) |
| Website + API route smoke (deployed) | `node scripts/smoke-routes.mjs` | PASS | 22 / 22 website routes + 24 / 24 API routes answered with the expected status (200, or the expected auth redirect) |
| API endpoint smoke (deployed) | `node scripts/smoke-api-endpoints.mjs` | PASS | 50 probes, 0 unexpected statuses — every endpoint of the shared backend was exercised with a real request |
| Live feature verification (deployed) | `node scripts/live-verify.mjs` | PASS | 46 / 46 checks green against the deployed API |
| Multilingual catalogue verification (deployed) | `node scripts/verify-localised-catalogue.mjs` | PASS | 12 / 12 checks green — every category and crop carries its Kannada and Hindi name, the catalogue and the product filter find a crop in English, Kannada and Hindi, and the APMC endpoint answers with the real rows |
| Android route coverage (emulator, deployed API) | `cd mobile && flutter test integration_test/route_coverage_test.dart -d emulator-5554 …` | PASS | 21 / 21 routes opened, no widget exception — `00:15 +1: All tests passed!` |
| Cross-platform workflow suite (emulator, deployed API) | `cd mobile && flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 …` | PASS | 8 / 8 tests green |
| Backend database integration suite | `cd backend && npm run test:integration` | BLOCKED | no PostgreSQL/Docker in the local environment — the suite (language storage, catalogue endpoints, independent crop lots, edit isolation, crop filtering, listing authorisation, notification inbox) runs in pull-request CI with PostgreSQL 16 and is green there |

### What the unit tests actually cover

`backend/src/__tests__/language.test.ts`
: exactly English / Kannada / Hindi are supported, regional and alias forms
  (`en-IN`, `kn-IN`, `hi-IN`, `hi`) normalise correctly, unknown values fall
  back to English — and `resolveSupportedLanguage()` returns `null` for a
  genuinely unsupported code so the API can answer HTTP 400 for `de` while
  still accepting `kn-IN`.

`backend/src/__tests__/productQuery.test.ts`
: the catalogue filters that both clients share — search, crop, category
  slug/name, `categoryId`, organic and district — plus the crop/variety
  normalisation that keeps `cropName` and `variety` separate. It also proves
  the **multilingual crop search**: `crop: 'ಟೊಮೇಟೊ'` expands to the
  canonical `Tomato` and to the Hindi `टमाटर`, `search: 'tomato'` expands to
  both native names, and a term shorter than three characters is **not**
  expanded. Two further tests assert that every one of the 78 catalogue
  entries and all ten categories really carry a Kannada and a Hindi name in
  their own script, and that a published APMC commodity ("Green Chilli",
  "Tomato (Hybrid)") resolves onto the right catalogue entry while an unknown
  commodity resolves to nothing.

`backend/src/__tests__/categoryResolver.test.ts`
: the live-category lookup that maps a seeded slug, a canonical name and a
  slugified name onto the real `Category` row of the current installation,
  which is what makes `Grains & Millets` filter correctly whether it is
  stored as `grains` or `grains-millets`.

`mobile/test/locale_test.dart`, `mobile/test/crop_listing_test.dart`
: the Android locale controller persists and restores the selected language,
  and the Android crop catalogue / listing model keeps one crop's name,
  variety, quantity, unit, price and availability independent of a second
  crop.

### Honest behaviour notes

* A **failing filtered catalogue query returns HTTP 500** with the real error
  instead of silently answering with the unfiltered catalogue. Both clients
  show their real error state.
* Every demo/fallback dataset that existed before this work was removed
  (`FALLBACK_*`, `INITIAL_SEED_PRODUCTS`, `DEFAULT_PRODUCTS`, `DEFAULT_LEADS`,
  `SEED_THREADS` and the locally simulated farmer chat replies). An empty
  backend answer now renders a translated empty state, not a fake listing.
* The **website's own mock datasets** were removed as well:
  `ALL_INDIA_MANDI_DATA` (1150 lines of hardcoded mandi records),
  `MANDI_TICKER_ITEMS` and `cropEconomics`. The Mandi Rates page, the home
  ticker and the savings calculator now read the **real** shared backend
  (`GET /api/apmc/rates` and `GET /api/products`) and show an honest "not
  published yet" state while the data is missing. The full list is in
  [`docs/VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md), section 1.4.
* **A listing can only be edited or deleted by the cultivator who published
  it.** Both endpoints answer HTTP 403 for anyone else (an administrator is
  still allowed).
* **Deleting a listing that already carries an order is refused with HTTP
  409** and an explanation, because the order history has to stay intact. The
  endpoint never answers "deleted" for a delete that did not happen — the
  cultivator is asked to mark the lot as unavailable instead.
* The **notification inbox is filled from the real events**: a farmer gets
  `NEW_ORDER` and `ORDER_DELIVERED`, a consumer gets `ORDER_STATUS`, and the
  participants of a conversation get `NEW_ENQUIRY` / `NEW_MESSAGE`. The
  Socket.IO broadcast is the instant delivery, the stored row is the durable
  entry that both clients list.
* The **public catalogue only lists available lots**, so a lot that a farmer
  has taken off the market disappears from the marketplace immediately — that
  is the expected behaviour, not a bug.

---

## 7. Known limitations

These limitations are inherited from the platform and are **not** fixed by
this work:

1. **Firebase phone OTP is not configured** on the deployed services — email
   and password sign-in is the working path. See
   `docs/ANDROID_LIVE_DEPLOYMENT.md`, section 5.3.
2. **The existing phone authentication is weak** (the backend exposes a
   passwordless phone sign-in and the website OTP tab has a pre-existing
   client-side bypass). It was deliberately left untouched because the brief
   forbids weakening or changing authentication, but it must be reviewed
   before real transactions.
3. **The release APK/AAB is debug-signed** and therefore not Play Store ready.
4. **The Render free PostgreSQL instance expires on 27 December 2026.**
5. **Uploaded images are stored on an ephemeral filesystem** and disappear on
   every redeploy.
6. **The shared database contains no APMC rate row.** `GET /api/apmc/rates`
   answers `{"success":true,"data":[],"rates":[],"total":0}`, so the Mandi
   Rates page, the home ticker, the savings calculator and the farmer
   dashboard show their honest "not published yet" state. There is **no seed
   or import path** for APMC rates yet — and adding one with invented rows
   would reintroduce exactly the mock data that was removed. Loading real
   benchmark rows into the shared database is the open item.
7. **A farm without a shared position stays off the map.** Since the
   fabricated coordinates were removed (see §7.2), a farmer who never shared
   a GPS position has no `latitude` / `longitude` in the shared database.
   Such a farm is not plotted on the map and the logistics quote reports the
   missing coordinates instead of inventing a route.
8. **The deployed database has no administrator account** (registration only
   creates `FARMER` / `CONSUMER`). The five `/api/admin/*` endpoints and the
   Android admin dashboard therefore stay `NOT TESTED` in the matrices — the
   admin guard answers HTTP 403 for every non-admin token.
9. **The QA accounts created by the live verification scripts stay in the
   production database** — there is no account-deletion endpoint.

### 7.1 Production defects that were found and fixed

The new Android route coverage test (`mobile/integration_test/route_coverage_test.dart`)
asserts that **no widget throws** while a route is built, and it therefore
uncovered five real crashes that the manual walk-through had missed. All of
them are fixed:

| Defect | Symptom | Fix |
| --- | --- | --- |
| `AppLocalizations.of(context)` inside `initState()` on **9** screens | `dependOnInheritedWidgetOfExactType<_LocalizationsScope>() … was called before … initState() completed` | the lookup moved into the `catch` blocks, which run after the `await` and are guarded by `mounted` |
| `initializeDateFormatting()` was never called | `LocaleDataException: Locale data has not been initialized` on every date-rendering screen | `mobile/lib/main.dart` is now `async` and calls the initialiser |
| `ref.read(...)` inside `dispose()` | `StateError: Cannot use "ref" after the widget was disposed.` — the socket listener was never removed and the room was never left | the `SocketService` is cached while the screen is alive and the cached instance is used in `dispose()` |
| Missing `Scaffold` on the market-rates and logistics screens | `No Material widget found.` — both screens could not be opened at all | both screens bring their own `Scaffold` + `AppBar` |
| Hardcoded English in the farmer dashboard JSX | "Buyer Inquiries & Chats", "{count} Active", "Target Rate: ₹…/kg" stayed English in a translated screen | the existing dictionary keys are now wired up |

The website had three smaller gaps of the same kind, all fixed:

* `document.documentElement.lang` was only updated by the language switcher —
  a **restored** preference left `lang="en"` on the page. A `useEffect` now
  keeps the attribute in sync with the active locale.
* The Mandi Rates page carried the `ALL_INDIA_MANDI_DATA` mock (see
  limitation 6).
* The marketplace filtered the **search term a second time in the browser**
  over the rows the API had already returned. The stored crop name is the
  canonical English one, so that second filter silently dropped every row
  the backend had found through a Kannada or Hindi term — the multilingual
  search worked in the API but not on the screen. The redundant filter was
  removed and the two fields it used to cover (the farmer's farm name and
  the crop category) were added to the **backend** search, so the API stays
  the single source of truth for search — exactly like the Android app.
* The **cached account object** in `localStorage` kept the *old*
  `preferredLanguage` after a language switch. The auth hook hydrates the
  account from that cache on every page load, so the stale value was applied
  again on the next mount and the interface briefly fell back to the previous
  language before the account request came back. The language switcher (and
  the Socket.IO `language_preference_updated` handler) now write the new
  language into the cached account object as well, so the cache can never
  contradict the account — `frontend/src/context/LocaleContext.tsx`,
  `frontend/src/hooks/useAuth.ts`.

### 7.2 Fabricated numbers and fake success states that the audit removed

The "no mock data" rule reaches further than the obvious demo arrays. A
second pass over both clients found the following, and all of them are fixed
(the complete table is in
[`docs/VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md) §1.4):

| # | Fabrication | Where | Fix |
| --- | --- | --- | --- |
| 1 | The dashboard's "APMC modal rate" was the farmer's **own** price × 1.05 | `frontend/src/app/farmer/dashboard/page.tsx` | The **published** APMC row is resolved by the shared backend (`backend/src/utils/apmcBenchmark.ts`) and attached to every listing as `mandiBenchmark` (₹/kg) — `null` when nothing was published |
| 2 | The logistics benchmark was the farmer's price × 1.25 and the coordinates defaulted to two fixed cities | `backend/src/services/logisticsService.ts` | The benchmark is an optional input; without a published row the profit assessment is unknown (`null` + `hasApmcBenchmark: false`) |
| 3 | The logistics endpoint replaced missing inputs with defaults (100 kg, ₹20/kg, ₹3200/quintal, two fixed cities) | `backend/src/app.ts` | `POST /api/logistics/quote` validates the mandatory inputs and answers **HTTP 400** with the list of the missing fields |
| 4 | The Android logistics screen started from a fabricated price (`20`), a fabricated benchmark (`3200`) and the same two fixed cities | `mobile/lib/features/logistics/logistics_page.dart` | The screen picks a **live crop lot**, takes the price and the farm coordinates from that lot, the delivery coordinates from the consumer profile and the benchmark from the published market rates |
| 5 | The Android quote card rendered values the backend never returned (`estimatedDays`, `apmcValue`, `profit`, `profitMarginPercent`) — so it showed zeros | `mobile/lib/data/models/misc.dart` | The model mirrors the **real** response shape (`breakdown.*`, `profitAssessment.*`); the APMC fields are nullable and the card shows "—" plus an explanation |
| 6 | The buy map showed **simulated** nodes and a fixed "₹3,100 / Quintal" yard; the consumer map's `FarmerMap` carried a whole `DEFAULT_NODES` list of invented farms | `frontend/src/components/AgriMapExplorer.tsx`, `frontend/src/components/maps/FarmerMap.tsx` | Both layers read the real backend; a layer without a published dataset reports that instead of showing invented places |
| 7 | Every account without a GPS position was stored at `12.5218 / 76.8951` | backend + register form | `FarmerProfile.latitude` / `longitude` became nullable (additive migration); the position is stored only when it was really shared |
| 8 | The cart replaced the farmer's and the buyer's coordinates with two fixed cities and derived the freight cost from that invented route | `frontend/src/context/CartContext.tsx` | The cart keeps the real coordinates only; an unknown route yields `distanceKm = null` and the published minimum dispatch tariff |
| 9 | The checkout showed a **fake order id** (`ord-demo-XXXXXX`) when the network failed; the delivery receipt and the farmer's order status were marked locally even when the backend rejected them | `frontend/src/app/checkout/page.tsx`, `frontend/src/app/consumer/orders/page.tsx`, `frontend/src/app/farmer/orders/page.tsx` | The state only changes when the shared backend confirms it — a failed request is reported instead of being faked |
