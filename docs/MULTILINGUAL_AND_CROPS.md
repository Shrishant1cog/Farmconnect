# FarmConnect — Multilingual Support & Multiple Crop Listings

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-27

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

**Dictionary size (keys per language, verified by `scripts/verify-i18n.mjs`)**

| Group | en | kn | hi | Missing / extra |
| --- | --- | --- | --- | --- |
| `core` | 120 | 120 | 120 | 0 / 0 |
| `auth` | 126 | 126 | 126 | 0 / 0 |
| `farmer` | 301 | 301 | 301 | 0 / 0 |
| `consumer` | 232 | 232 | 232 | 0 / 0 |
| `misc` | 328 | 328 | 328 | 0 / 0 |

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

**ARB size:** 381 keys per language (`en`, `kn`, `hi`) — 0 missing / 0 extra,
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
| `GET /api/catalog/categories` | the database categories with live listing counts | website crop filters, Android crop filters, crop pickers |
| `GET /api/catalog/crops?search=&category=` | the searchable crop catalogue with English / Kannada / Hindi aliases | both crop pickers |

`GET /api/catalog/crops` resolves every catalogue entry against the live
`Category` table and returns the **real** `categoryId` and `categorySlug`, so
neither client has to know how the categories are seeded.

### 3.3 Product filters

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

`backend/src/data/cropCatalog.ts` holds roughly 70 crops across ten
categories, each with English, Kannada and Hindi aliases, for example:

| Crop | Category | Kannada alias | Hindi alias |
| --- | --- | --- | --- |
| Tomato | vegetables | ಟೊಮೇಟೊ | टमाटर |
| Ragi | grains-millets | ರಾಗಿ | रागी |
| Turmeric | spices-herbs | ಹಳ್ಳಿ | हल्दी |

The catalogue is **search assistance, not a restriction** — a farmer may always
type a crop that is not listed.

### 3.6 Farmer workflow (identical on both clients)

1. Open **List lot** / **Add crop**.
2. Pick a category (chips / dropdown built from `/api/catalog/categories`).
3. Type the crop name, or search the catalogue (`/api/catalog/crops`) and tap
   a suggestion to fill the field.
4. Optionally fill the variety, quantity, unit, price, availability,
   description and image.
5. Save — a **new** `Product` row is created; existing lots are untouched.
6. The farmer dashboard and the Lots list show **every** lot as its own card
   with its crop name and variety.
7. Edit, toggle availability or delete operate on the id of the selected lot
   only.

### 3.7 Customer workflow (identical on both clients)

1. The marketplace shows the crop-category chips and a crop search field.
2. Selecting a category filters by `category=<slug>`; typing filters by
   `search=` (which covers crop name and variety).
3. Each listing shows its crop name and variety below the title.

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
```

---

## 6. Test results (recorded 2026-11-28)

Every result below was produced by actually running the command — nothing is
estimated. The live route and cross-platform matrices are kept separately in
[`docs/VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md).

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Backend unit tests (no database) | `cd backend && npm run test:unit` | PASS | 26 / 26 tests green (3 suites: `language`, `productQuery`, `categoryResolver`) |
| Backend type check | `cd backend && npx tsc --noEmit` | PASS | exit code 0 |
| Website type check | `cd frontend && npx tsc --noEmit` | PASS | exit code 0 |
| Website production build | `cd frontend && npm run build` | see the matrix | recorded in `docs/VERIFICATION_MATRICES.md` |
| Android static analysis | `cd mobile && flutter analyze` | PASS | "No issues found!" |
| Android unit + widget tests | `cd mobile && flutter test` | PASS | 31 / 31 tests green (includes `locale_test.dart` and `crop_listing_test.dart`) |
| Localisation key parity | `node scripts/verify-i18n.mjs` | PASS | website `core` 120, `auth` 126, `farmer` 301, `consumer` 232, `misc` 328 keys; Android ARB 381 keys — 0 missing / 0 extra for Kannada and Hindi |
| Backend database integration suite | `cd backend && npm run test:integration` | BLOCKED | no PostgreSQL/Docker in the local environment — the suite (language storage, catalogue endpoints, independent crop lots, edit isolation, crop filtering) runs in pull-request CI with PostgreSQL 16 |

### What the unit tests actually cover

`backend/src/__tests__/language.test.ts`
: exactly English / Kannada / Hindi are supported, regional and alias forms
  (`en-IN`, `kn-IN`, `hi-IN`, `hi`) normalise correctly, unknown values fall
  back to English.

`backend/src/__tests__/productQuery.test.ts`
: the catalogue filters that both clients share — search, crop, category
  slug/name, `categoryId`, organic and district — plus the crop/variety
  normalisation that keeps `cropName` and `variety` separate.

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
