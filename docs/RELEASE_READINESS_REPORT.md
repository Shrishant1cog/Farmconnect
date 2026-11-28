# FarmConnect — production release readiness report

**Date:** 28 November 2026
**Branch:** `fix/local-updates` — `main` was **not** modified, PR #2 was **not** merged.
**Scope:** second-phase production-readiness work (database protection, image
storage, the Farmer Orders button, and the administrator / Firebase / APMC /
Android-signing checks).

Everything below was **actually executed** on 28 November 2026 unless the
line says explicitly that it is blocked on the owner. No result is carried
over from an earlier run.

---

## Summary

| # | Item | Status |
|---|---|---|
| 1 | Production DB expiry | 🔴 **not read** — needs the owner (policy documented) |
| 2 | Production backup + integrity | 🟡 **tooling proven**; production dump blocked on the owner |
| 3 | Restore test | ✅ **passed** (local PG16, all 16 tables equal) |
| 4 | DB migration recommendation | ✅ **Neon Launch** recommended; owner deferred — Render stays |
| 5 | Image storage | ✅ **Cloudflare R2 chosen**; code fixed + hardened; bucket pending |
| 6 | Farmer Orders button | ✅ **complete and browser-verified** |
| 7 | Administrator | ✅ **CLI built and proven**; no production admin yet (owner action) |
| 8 | Firebase OTP | 🔴 **not configured** — no project, no credentials |
| 9 | APMC rates | 🟡 **import path proven**; production needs a real bulletin |
| 10 | Android signing | 🔴 **debug-signed** — the upload key is the owner's |
| 11 | PR / GitHub | ✅ PR #2 **OPEN**, unmerged, MERGEABLE, CI green |
| 12 | Render | ✅ both services **UP**, database **UP** |
| 13 | Tests executed | ✅ **167** backend · **57** website · **35** Flutter · i18n · 2 builds |
| 14 | Human actions | 📋 9 actions listed in §14 |
| 15 | Files changed | 📋 listed in §15 |
| 16 | Preserved user WIP | ✅ untouched, uncommitted |

**The one live defect that is fixed by this work:** the farmer's orders page
showed **₹0 for every incoming order** on the production site. See §6.

---

## 1. Production database expiry — 🔴 NOT READ (owner action required)

`render.yaml` declares:

```yaml
databases:
  - name: farmconnect-db
    plan: free          # <-- the problem
    postgresMajorVersion: 16
```

Render's own documentation (<https://render.com/docs/free>) states:

> "Free Render Postgres databases expire 30 days after creation. An expired
> Free database is inaccessible unless you upgrade it to a paid compute plan.
> After a Free database expires, you have a grace period of 14 days to upgrade
> it to a paid compute plan. After the grace period, Render deletes the
> database (along with all of its data)."

and

> "Free Render Postgres databases have a fixed storage capacity of 1 GB."

and — about the backups of a free instance — there are **none**.

**What could not be read, and why:**

| Fact | Status | Why |
|---|---|---|
| The exact expiry date | 🔴 not read | needs the Render dashboard session or an API key |
| The current database size | 🔴 not read | needs the connection string |
| The PostgreSQL version in use | 🔴 not read | needs the connection string |
| The row counts in production | 🔴 not read | needs the connection string |

There is **no Render session** in the browser (the dashboard shows the login
page) and **no `RENDER_API_KEY`** in the environment. `backend/.env` holds
`postgresql://…@localhost:5432/farmconnect`, which is the local database,
not the production one.

**Owner decision on record (28 Nov 2026):** *leave the instance on the free
plan for now*. The expiry therefore keeps running, and the data keeps having
a single copy. This is now the **highest risk** in the release, and it is
recorded as such — not as a solved item.

**What to do (5 minutes, no data movement):**

1. Open the Render dashboard → the `farmconnect-db` instance → **Upgrade**
   → the `$6/mo` starter plan. That removes the expiry and the deletion
   risk without moving a byte.
2. Change `render.yaml` from `plan: free` to `plan: starter` so that a
   future blueprint apply does not put it back. *(Not done — it needs the
   paid plan to exist first.)*

---

## 2. Backup location and integrity — 🟡 tooling proven, production dump pending

### The tooling (written and executed)

| File | What it does |
|---|---|
| `backend/scripts/db-backup.mjs` | `pg_dump` in the custom format, SHA-256, `pg_restore --list`, a JSON manifest, a `.sha256` file, and the restore test |
| `backend/scripts/db-restore-verify.mjs` | restores into a throwaway database and compares the tables, the migration history and every row count |

Both are **read-only** against the source database: they never write, never
drop and never migrate anything in it.

### The rehearsal that was actually run

```
Dump written : farmconnect-final-rehearsal-2026-11-28T15-24-16-201Z.dump
Size         : 51670 bytes
SHA-256      : 98d744d9a1fd23a6d319fb369b0b1070535b89b9308c3182d7504114a97fe5b2
Archive      : 139 entries
Restore      : 125 entries restored
```

The `.sha256` file was verified against a fresh `Get-FileHash` of the dump
— **match**.

### The production backup — still blocked

It needs the Render connection string. The owner has chosen to supply it
through a **local file outside the repository**:

```
C:\Users\user\AppData\Local\Temp\opencode\prod-db.url
```

with **only** the URI on the first line. The file was **not present** when
this report was written.

Then:

```powershell
cd C:\Users\user\OneDrive\Desktop\FarmConnect-Fixed-User\backend
$env:PG_BIN = "C:\Users\user\AppData\Local\Temp\opencode\pgsql\extract\pgsql\bin"
node scripts/db-backup.mjs `
  --out "D:\farmconnect-backups" `
  --url-file "$env:LOCALAPPDATA\Temp\opencode\prod-db.url"
```

The script **never prints the connection string**: it splits it into
`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, so the password
never reaches a command line or a process listing either.

**Where the backup has to live:** outside the database instance — an external
disk or a cloud object store. A dump inside the instance it protects against
is worth nothing.

---

## 3. Restore test — ✅ PASSED

`db-restore-verify.mjs` restores the dump into a **separate** temporary
database (`farmconnect_restore_test_<id>`), compares every table with the
counts recorded in the manifest, compares the Prisma migration history, and
drops the temporary database again. The source database is never touched.

```
table                     source   restored   result
-------------------------------------------------------
User                           5          5   ✅ equal
FarmerProfile                  2          2   ✅ equal
ConsumerProfile                3          3   ✅ equal
Category                      10         10   ✅ equal
Product                        1          1   ✅ equal
PriceHistory                   0          0   ✅ equal
Enquiry                        0          0   ✅ equal
Message                        0          0   ✅ equal
ChatMessage                    0          0   ✅ equal
Order                          1          1   ✅ equal
OrderItem                      1          1   ✅ equal
ApmcMarketRate                 3          3   ✅ equal
FavouriteProduct               0          0   ✅ equal
FavouriteFarmer                0          0   ✅ equal
Complaint                      0          0   ✅ equal
Notification                  39         39   ✅ equal

Migrations in the restored database: 6 (all finished)
The restored database holds 5 users (1 administrators).
✅ The restore test PASSED — the backup restores into a usable database.
```

**16 of 16 tables equal.** The recovery procedure is documented in
`docs/DATABASE_BACKUP_AND_RECOVERY.md` §6 (database gone / a broken
migration / a damaged table).

---

## 4. Database migration recommendation — ✅ Neon Launch (owner deferred)

The full comparison — Render Postgres, Neon, Supabase, RDS/Aurora, Railway,
PlanetScale — with the 2026 pricing, the phased migration, the environment
changes, the Prisma and pooler notes, nine validation queries, the rollback
table and the downtime table is in **`docs/DATABASE_MIGRATION_PLAN.md`**.

**Recommendation: Neon (Launch plan)**, because

1. it is the only candidate whose free tier does **not** delete the data,
2. it stays inside the standard PostgreSQL protocol, so the Prisma schema,
   every migration and the `pg_dump`/`pg_restore` tooling work unchanged,
3. its PgBouncer endpoint solves the connection pressure of a serverless
   web service without a code change,
4. it has no monthly minimum, so a quiet app stays cheap.

**Owner decision on record (28 Nov 2026):** *decide later — keep Render for
now.* **No migration is planned and no database was moved.** The plan stays
documented and ready. The interim step (upgrading Render out of the free
plan) was also declined for now, so §1 stays open.

---

## 5. Image storage — ✅ Cloudflare R2 chosen, code fixed and hardened

### The real bug that was found and fixed

`backend/src/services/storage.service.ts` built the object **key** and the
public **URL** from two different paths:

```ts
const key = `uploads/${fileName}`;                       // the object is at uploads/<file>
const publicBase = STORAGE_PUBLIC_URL || `${publicBaseUrl}/uploads`;
return { url: `${publicBase}/${fileName}`, ... };        // the URL points at <file>
```

With `STORAGE_PUBLIC_URL=https://cdn.example.com` the API would have
returned `https://cdn.example.com/<file>` for an object that is really at
`https://cdn.example.com/uploads/<file>` — **every upload would have
produced a broken link** that was then stored in the database.

The fix keeps both on the same path and refuses to invent a URL:

```ts
export const buildStorageKey = (fileName) => `uploads/${fileName}`;
export const buildPublicUrl = (key) => `${STORAGE_PUBLIC_URL}/${key}`;
```

`STORAGE_PUBLIC_URL` is now **required** for the object store.

### Two further hardening changes, both found by the new tests

1. **No silent fallback to the ephemeral disk.** With `STORAGE_PROVIDER=r2`
   set but a credential missing, the old code quietly wrote the image to the
   Render disk — answered "success", and lost the file at the next deploy.
   An explicitly requested object store that is not fully configured now
   **fails loudly** and names the missing variable.
2. **The public URL is validated before the object is written.** Otherwise a
   missing `STORAGE_PUBLIC_URL` would leave an orphan object in the bucket
   that no row can ever point at. (The test caught this ordering bug.)

### The owner decision and what is still missing

**Provider: Cloudflare R2** (owner, 28 Nov 2026). The **bucket does not
exist yet** — creating the Cloudflare account, the bucket and the API token
is the owner's action.

The exact values are in `docs/STORAGE_MIGRATION_PLAN.md` §5.1:

```
STORAGE_PROVIDER=r2
STORAGE_BUCKET=farmconnect-images
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=<from the R2 API token>
STORAGE_SECRET_ACCESS_KEY=<from the R2 API token>
STORAGE_PUBLIC_URL=https://pub-<something>.r2.dev
STORAGE_FORCE_PATH_STYLE=true
```

Set them as **secret** environment variables on `farmconnect-api` in Render,
deploy, and then check that the upload response contains `"provider":"s3"` and
a URL of the form `https://pub-….r2.dev/uploads/<file>`. If the provider is
still `local`, the variables did not reach the service.

**No existing image is deleted by any of this.** The move is a base-URL swap
because the object key and the local path have the same shape.

---

## 6. Farmer Orders button — ✅ COMPLETE, browser-verified

**What was asked for:** a button under the Navbar that shows the real number
of incoming orders.

**What was delivered:** the **first element of `<main>`**, immediately under
the white Navbar tab.

Measured in the browser against the local stack:

```
viewport            912 px (desktop)
button width        858 px
container width     906 px      → the button is NOT full width on desktop
position in <main>  first child of the first wrapper
accessible name     "Wholesale customer orders — 1 incoming order"
badge               "1 INCOMING ORDER"
```

On mobile the compiled CSS carries `.w-full { width: 100%; }` as the base
rule and `.sm\:w-auto { width: auto; }` inside `@media (min-width: 640px)` —
so it is full width on a phone and auto width on a desktop.

**The count is real.** It comes from `GET /orders/farmer`; `null` means
*unknown* and is never rendered as a fabricated zero. Proven by moving the
count from `[]` to `1` after a real order was placed through the API.

**The button navigates** to `/farmer/orders`, and the order page renders the
real order (buyer Priya Narayanan, 50 kg, status DELIVERED).

### 🔴 A live defect that this work fixed

The farmer's orders page read `order.totalAmount` and `item.price` — but the
shared backend sends **`grandTotal`** and **`unitPrice`**. Both were read
with `Number(undefined || 0)`, so **every incoming order was shown to the
farmer as ₹0**.

The live API was inspected directly:

```
=== the keys the LIVE API sends on an order ===
consumer, consumerId, containerCost, createdAt, deliveryAddress, farmerId,
grandTotal, id, items, status, totalItemsCost, transportCost, updatedAt

=== the keys the LIVE API sends on an order item ===
id, orderId, product, productId, quantity, unitPrice

=== the money the OLD page code asked for ===
order.totalAmount = (undefined)
item.price       = (undefined)

=== the money the API really sends ===
order.grandTotal = 375
item.unitPrice   = 27.5
```

And on the live site, all five real production orders rendered as:

```
Web QA Tomato 1795847693410
10 kg @ ₹0/kg
₹0
TOTAL LOT VALUE:
₹0
```

After the fix, against the local stack with the same shape of data:

```
Verification Mandya Ragi
50 kg @ ₹42/kg
₹2,100
TOTAL LOT VALUE:
₹2,295
```

The rules live in `frontend/src/lib/orderAmounts.ts` and are pinned by
**13 regression tests** (`frontend/src/lib/__tests__/orderAmounts.test.mjs`).

**The fix is committed but NOT deployed.** The live site still shows ₹0
until the branch is deployed.

### The order lifecycle, proven over HTTP

`PENDING → CONFIRMED → PACKED → DISPATCHED` (farmer, 200 each) →
`DELIVERED` via `PATCH /orders/:id/received` (200). A consumer attempting
`PATCH /orders/:id/status` → **403**.

---

## 7. Administrator — ✅ CLI built and proven; no production admin yet

There is **no backdoor** in the authentication or the authorisation:
`requireRole` reads the role from the **live database row**, so a token
cannot claim a role it does not have, and a suspended administrator loses the
role immediately. **No HTTP route can create, promote or delete an
administrator**, and there must not be one.

The administrator is therefore an ordinary `User` row with `role = ADMIN`,
provisioned by a manual CLI: `backend/provision-admin.ts`
(`npm run db:provision-admin`).

**The rules it enforces, all proven against the local database:**

| Check | Result |
|---|---|
| Missing arguments | usage printed, nothing written |
| Missing `--confirm` | 🟡 "Nothing was written" — dry run |
| With `--confirm` | ✅ created (id `98f239d0-…`) |
| Re-run for the same account | ✅ "already an administrator — nothing was changed" |
| Existing CONSUMER **without** `--promote` | ❌ refused, exit 1 |
| The password on the command line | ❌ refused as an unknown argument |
| The password in any console call | ❌ refused by a test |

The password is **never** accepted on the command line, is read from a hidden
prompt / a file / an environment variable, is never printed, and the script
is **not** part of the Render build command — a deploy can never create or
promote an account by itself.

**The administrator journey over HTTP** (local API, real tokens):

| Request | Expected | Got |
|---|---|---|
| admin → `GET /api/admin/metrics` | 200 | ✅ 200 (5 users, 2 farmers, 2 consumers) |
| admin → `GET /api/admin/users` | 200 | ✅ 200 |
| admin → `GET /api/admin/complaints` | 200 | ✅ 200 |
| farmer → `GET /api/admin/metrics` | 403 | ✅ 403 |
| consumer → `GET /api/admin/users` | 403 | ✅ 403 |
| anonymous → `GET /api/admin/metrics` | 401 | ✅ 401 |

**Production:** no administrator exists, so the journey could **not** be run
against the live site. Creating the account needs the production connection
string and is the owner's action — see §14.

---

## 8. Firebase phone authentication (OTP) — 🔴 NOT CONFIGURED

**Backend:** implemented. `POST /api/auth/firebase-phone` verifies a
**Firebase ID token** with the Admin SDK, reads `phone_number` and `uid`
from the **verified** token, finds the account by phone number and by
`firebaseUid`, gives a new account a **random password hash** (so it can
never be signed into with a guessed password), and issues the normal
FarmConnect session. The backend never trusts a phone number the client
sent.

**Website:** implemented and gated honestly — `isFirebasePhoneAuthConfigured`
disables the phone sign-in with an honest "not available" message when the
configuration is missing. The placeholder values in `frontend/src/lib/firebase.ts`
are **not** a configuration.

**Android:** **not implemented at all.** `mobile/pubspec.yaml` has no
`firebase_core`, no `firebase_auth`, no `google-services.json`, no
`Firebase.initializeApp()`. The app uses the email/phone + password flow.

**No successful OTP was fabricated.** Without a Firebase project there is no
token to verify, so the happy path could not be executed here. It must be
tested by the owner after the setup in `docs/ADMIN_AND_FIREBASE_SETUP.md`
Part 2 §2.3.

---

## 9. APMC market rates — 🟡 import path proven; production needs a real bulletin

`backend/data/apmc-rates.example.csv` is **header-only by design** — it
contains no invented market data. The importer correctly refuses it:

```
❌ The rate file does not contain a single usable rate row. Nothing was written.
```

A clearly-labelled **test fixture** was added at
`backend/src/__tests__/fixtures/apmc-rates.fixture.csv` (market centres
`TEST STATE` / `TEST DISTRICT` / `TEST CENTRE FIXTURE`, with a sibling
`README.md`). It is only ever imported into the **local** database, never
into production.

**The dry run** (3 usable rows, 3 rejections with reasons):

```
read    : 3 usable rate row(s)
mapped  : 1 commodity resolves to the crop catalogue
unmapped: 2 row(s) — Rice, Not A Crop

⚠️  3 row(s) were rejected:
   line 5: the price(s) modalPrice are not a number
   line 6: the publication date is missing or cannot be read
   line 7: the value(s) marketCenter are empty
```

**The real import into the local database:** 3 inserted / 0 updated, and the
re-run → **0 inserted / 3 updated** — it is idempotent.

`GET /api/apmc/rates` then returns the rows with the Kannada and Hindi
names, and with an honest `category: null` for the commodities that do not
resolve to the crop catalogue. **No client invents a benchmark.**

**Production:** the rows there must come from a real official bulletin, and
the import needs the production connection string.

---

## 10. Android production signing — 🔴 DEBUG-SIGNED (the key is the owner's)

| Property | Value |
|---|---|
| Application id | `in.farmconnect.farmconnect_mobile` |
| Version | `1.0.0+1` |
| Java / Kotlin target | 17 |
| API base URL (release) | `https://farmconnect-api-sn98.onrender.com/api` |
| Socket URL (release) | `https://farmconnect-api-sn98.onrender.com` |
| **Release signing** | **the Android debug certificate** |

`mobile/android/app/build.gradle.kts` checks for
`mobile/android/key.properties`. When it is **absent**, the release build
still succeeds but is signed with the debug key **and prints a warning**
during the build. That is the right behaviour: the build never fails because
of a missing secret, and it never claims to be a store release when it is
not.

**No upload keystore was generated, invented or guessed** — a key that an
agent knows is not a secret. The owner creates it with `keytool`; the exact
commands, the `key.properties` layout (with the **double backslashes**), the
verification with `apksigner` and the Play Console checklist are in
`docs/ANDROID_PRODUCTION_SIGNING.md`.

Also still to do before the first upload: bump the version to `1.0.0+2`.

---

## 11. PR / GitHub status — ✅ PR #2 OPEN, not merged, CI green

```
PR #2   OPEN   (mergedAt: null)   base: main   head: fix/local-updates
        MERGEABLE
        https://github.com/Shrishant1cog/Farmconnect/pull/2

Runs at af17559 (the current branch head):
  46149400004  push         SUCCESS
  46149404878  pull_request SUCCESS
```

Branch protection on `main` returns **HTTP 404** — no protection rule is
configured, so nothing prevents a merge. `main` is at `f82042d` and was
**not** touched.

**PR #2 was not merged**, as instructed.

---

## 12. Render status — ✅ both services UP, database UP

```
GET https://farmconnect-api-sn98.onrender.com/api/health
  {"status":"UP","service":"FarmConnect Engine","database":"UP","uptime":7201}
  http=200

GET https://farmconnect-web.onrender.com/          → 200 (0.28 s)
GET https://farmconnect-web.onrender.com/farmer/dashboard
  → 307 → /login?redirect=%2Ffarmer%2Fdashboard   (the session guard works)
```

Both services deploy the **audit branch** `fix/local-updates` per
`render.yaml`, so the running commit is `af17559` — the code **before** this
phase's fixes. That is why the live site still shows ₹0.

**Production API behaviour, verified with real QA accounts:**

| Check | Result |
|---|---|
| `GET /api/health` | 200, `database: UP` |
| QA farmer → `GET /orders/farmer` | 200, **5 real orders** (grandTotal 375 ×4, 429.5) |
| QA consumer → `GET /orders/farmer` | 403 ✅ |
| anonymous → `GET /orders/farmer` | 401 ✅ |
| QA farmer → `GET /api/admin/metrics` | 403 ✅ |

---

## 13. Tests actually executed — ✅ all green

Everything below was run on 28 November 2026 in this session.

| Check | Command | Result |
|---|---|---|
| Backend unit + integration | `npm test` (backend) | ✅ **167 / 167**, 12 suites |
| Backend compile | `npm run build` (tsc) | ✅ exit 0 |
| Website tests | `npm test` (frontend) | ✅ **57 / 57** (13 new) |
| Website type check | `npx tsc --noEmit` | ✅ exit 0 |
| Website production build | `npm run build` | ✅ compiled successfully |
| i18n parity | `node scripts/verify-i18n.mjs` | ✅ PASSED (farmer 316 keys × en/kn/hi; Android 400 × 3) |
| i18n usage | `node scripts/verify-i18n-usage.mjs` | ✅ PASSED (0 missing) |
| Android static analysis | `flutter analyze` | ✅ "No issues found!" |
| Android tests | `flutter test` | ✅ **35 / 35** |
| Backup chain | `node scripts/db-backup.mjs` | ✅ dump + SHA-256 + archive + restore test |
| Restore verification | `node scripts/db-restore-verify.mjs` | ✅ 16/16 tables equal |
| Admin CLI | 6 scenarios end to end | ✅ all correct |
| Admin journey (HTTP) | 6 role checks | ✅ 200/200/200/403/403/401 |
| Order lifecycle (HTTP) | 4 transitions | ✅ 200 each; consumer → 403 |
| APMC import | dry run + real + re-run | ✅ 3 rows, idempotent |
| Production API | 5 checks | ✅ as listed in §12 |

The **167** backend tests comprise **118 unit** and **49 integration**. The
integration suite ran against the **local PostgreSQL 16.16 cluster** — never
against the production database, because it creates and deletes rows.

**One stale-Prisma-client trap was hit and resolved:** the local
`node_modules/.prisma/client` predated the `PACKED` order status, so the
first integration run failed with a 500 on `PATCH /orders/:id/status`.
`npx prisma generate` fixed it. **CI already runs `prisma generate`**
(`.github/workflows/verify.yml:119`), so CI was correct — only the local
client was stale.

---

## 14. Human actions that only the owner can do

| # | Action | Why it cannot be automated here | Priority |
|---|---|---|---|
| 1 | Create `C:\Users\user\AppData\Local\Temp\opencode\prod-db.url` with the Render connection URI on the first line, and `render-api-key.txt` with the Render API key | Secrets must not travel through a chat or a commit | 🔴 high |
| 2 | Run the production backup + restore test once those files exist | Needs the connection string | 🔴 high |
| 3 | Upgrade `farmconnect-db` out of the free plan (or decide definitively to keep it free) | Creates a paid resource | 🔴 high |
| 4 | Create the Cloudflare R2 account, the `farmconnect-images` bucket and the R2 API token, then set the 8 `STORAGE_*` variables on `farmconnect-api` | Needs the owner's Cloudflare account | 🟠 medium |
| 5 | Create the Android upload keystore with `keytool`, store it outside the repository, write `mobile/android/key.properties`, bump the version to `1.0.0+2` | The upload key must never be known to an agent | 🟠 medium |
| 6 | Provision the first administrator: `npm run db:provision-admin -- --email … --name … --phone … --confirm` with the production `DATABASE_URL` | Needs the production connection string, and it creates a privileged account | 🟠 medium |
| 7 | Create the Firebase project, enable Phone Authentication, add the service-account JSON to `farmconnect-api` and the six `NEXT_PUBLIC_FIREBASE_*` values to `farmconnect-web` | Needs the owner's Firebase project | 🟡 normal |
| 8 | Obtain a real official APMC bulletin and import it (`npm run db:apmc-rates -- <file>`) | The rates must be a real publication, never invented | 🟡 normal |
| 9 | Review and merge PR #2 when the branch has been reviewed | Merging was explicitly out of scope | 🟡 normal |

**Nothing above has been done by this work.** No account was created, no
bucket was created, no keystore was generated, no administrator was promoted
and no production data was moved.

---

## 15. Files changed by this work

### Modified (7 tracked files)

| File | What changed |
|---|---|
| `backend/package.json` | added `db:provision-admin`, extended `test:unit` with the two new suites |
| `backend/src/services/storage.service.ts` | the S3 key/URL fix, the required `STORAGE_PUBLIC_URL`, the loud failure on a misconfigured object store, the URL validated before the write |
| `frontend/src/app/farmer/dashboard/page.tsx` | the Orders button — first position, the real `incomingOrderCount` |
| `frontend/src/app/farmer/orders/page.tsx` | the ₹0 fix (`grandTotal` / `unitPrice`) + the widened interfaces |
| `frontend/src/i18n/dictionaries/farmer.en.ts` | `farmer.dashboard.incomingOrdersCount` + the two plural forms |
| `frontend/src/i18n/dictionaries/farmer.hi.ts` | the same three keys in Hindi |
| `frontend/src/i18n/dictionaries/farmer.kn.ts` | the same three keys in Kannada |

### New (14 files)

```
backend/provision-admin.ts                              the administrator CLI
backend/src/cli/provisionAdminCore.ts                   the testable rules of that CLI
backend/scripts/db-backup.mjs                           the backup tooling
backend/scripts/db-restore-verify.mjs                   the restore-verification tooling
backend/src/__tests__/provisionAdmin.test.ts            17 tests
backend/src/__tests__/storageService.test.ts             9 tests
backend/src/__tests__/fixtures/apmc-rates.fixture.csv   the synthetic APMC fixture
backend/src/__tests__/fixtures/README.md                what the fixture is and is not
frontend/src/lib/orderAmounts.ts                        the money rules of an order
frontend/src/lib/__tests__/orderAmounts.test.mjs        13 tests
docs/DATABASE_MIGRATION_PLAN.md                         the managed-DB comparison
docs/DATABASE_BACKUP_AND_RECOVERY.md                    the backup and recovery procedure
docs/STORAGE_MIGRATION_PLAN.md                          the R2 migration plan
docs/ANDROID_PRODUCTION_SIGNING.md                      the signing and release procedure
docs/ADMIN_AND_FIREBASE_SETUP.md                        the administrator and Firebase setup
docs/RELEASE_READINESS_REPORT.md                        this report
```

### The six commits (on `fix/local-updates`, **not pushed**)

| Commit | Subject |
|---|---|
| `362015e` | `fix(storage): the object key and the public URL must be the same path` |
| `81d074a` | `feat(admin): a safe CLI to provision an administrator` |
| `ca812a0` | `fix(farmer): the Orders button, and the money of an incoming order` |
| `a8226ea` | `feat(ops): a verified PostgreSQL backup and a restore test` |
| `c70d48a` | `test(apmc): a synthetic fixture that proves the import path` |
| `52abce8` | `docs(release): the readiness report and the four production plans` |

*(the hash of the last commit is the one of this document — list them with
`git log --oneline af17559..HEAD`)*

They sit on top of `af17559` (the commit the live deployment runs). They
are **not pushed**, so PR #2 and the deployed services still point at
`af17559`.

### Two build artefacts of this work were removed again

`backend/provision-admin.js` (emitted by a first, failed `tsc` run) was
deleted, and `frontend/tsconfig.tsbuildinfo` (changed by a `tsc` run) was
restored to `HEAD`. Both were confirmed to be **this session's** side
effects and are not part of the change.

---

## 16. Preserved uncommitted user work — ✅ untouched

The following belong to the owner and were **excluded from every change and
from every commit**:

| File | State |
|---|---|
| `frontend/src/app/globals.css` | the `.uiverse-btn*` rules — **not** edited by this work |
| `frontend/src/components/ui/UiverseButton.tsx` | **untracked, not committed** |
| `frontend/src/components/ui/UiverseLoader.tsx` | **untracked, not committed** |

(The components are spelled **Uiverse**, not *Universe*.)

No unrelated change was reverted, no file was deleted, and no destructive
Git command (`reset`, `clean`, `checkout` over user work) was run. `main`
was never checked out or modified.

---

## Appendix A — the tooling that now exists

| Command | What it does |
|---|---|
| `cd backend && npm run db:provision-admin -- --email … --name … --phone … --confirm` | create or promote an administrator, safely |
| `node backend/scripts/db-backup.mjs --out <dir> --url-file <file>` | a verified backup with a manifest |
| `node backend/scripts/db-restore-verify.mjs --dump <file>` | prove that a backup restores |
| `cd backend && npm run db:apmc-rates -- <csv> [--dry-run]` | import a real published bulletin |
| `cd mobile && .\tool\build_production.ps1` | the release build against the live backend |

## Appendix B — the documents that now exist

| Document | Purpose |
|---|---|
| `docs/RELEASE_READINESS_REPORT.md` | this report — the 16 items |
| `docs/DATABASE_MIGRATION_PLAN.md` | the managed-DB comparison and the phased migration |
| `docs/DATABASE_BACKUP_AND_RECOVERY.md` | how to back up, how to prove it, how to recover |
| `docs/STORAGE_MIGRATION_PLAN.md` | the Cloudflare R2 migration and its rollback |
| `docs/ANDROID_PRODUCTION_SIGNING.md` | the keystore, the build and the Play Console |
| `docs/ADMIN_AND_FIREBASE_SETUP.md` | the administrator CLI and the Firebase setup |
