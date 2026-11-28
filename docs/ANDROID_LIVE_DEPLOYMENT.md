# FarmConnect — Android Live Deployment

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates` (pull request #2 — **not merged**)
**Document date:** 2026-11-27

This document describes how the Flutter Android application is connected to the
**deployed** FarmConnect backend, how to rebuild it, and the exact status of
every configuration item.

---

## 1. Production endpoints

| Service | URL |
| --- | --- |
| Website | https://farmconnect-web.onrender.com |
| REST API | https://farmconnect-api-sn98.onrender.com |
| API base (app) | `https://farmconnect-api-sn98.onrender.com/api` |
| Socket.IO origin (app) | `https://farmconnect-api-sn98.onrender.com` |
| Health probe | https://farmconnect-api-sn98.onrender.com/api/health |

The Socket.IO origin has **no** `/api` suffix — it is the API origin itself.

Both clients use exactly these values:

| Client | Variable | Value |
| --- | --- | --- |
| Next.js website | `NEXT_PUBLIC_API_URL` | `https://farmconnect-api-sn98.onrender.com/api` |
| Next.js website | `NEXT_PUBLIC_SOCKET_URL` | `https://farmconnect-api-sn98.onrender.com` |
| Flutter Android | `API_BASE_URL` | `https://farmconnect-api-sn98.onrender.com/api` |
| Flutter Android | `SOCKET_URL` | `https://farmconnect-api-sn98.onrender.com` |

The website values come from `render.yaml`. The Android values come from the
build scripts in `mobile/tool/` (see section 3).

There is **one** backend and **one** PostgreSQL database. The Android app never
connects to PostgreSQL directly; it only speaks HTTP and Socket.IO to the same
Express API the website uses.

---

## 2. How the app is configured

The Flutter client reads its endpoints at **build time** through
`String.fromEnvironment`, in `mobile/lib/core/config/app_config.dart`:

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

The defaults are the **development** values and are deliberately left in place
so a developer can run `flutter run` with no extra arguments. A production build
must always override both.

`AppConfig.isMissingProductionUrl` detects a local host or the RFC 2606
`.invalid` placeholder and the app then shows
`AppConfig.missingProductionUrlMessage` instead of failing with a cryptic
network error. `mobile/test/production_config_test.dart` fails the build if a
production build script is ever pointed back at the emulator address.

`mobile/lib/core/network/socket_service.dart` uses `AppConfig.socketUrl`, so
the REST client and the Socket.IO client can never drift apart.

---

## 3. Building a release

### 3.1 Recommended — the build scripts

The scripts pin the production URLs so a release build can never accidentally
ship `http://10.0.2.2:5000`.

**Windows**

```powershell
cd mobile
.\tool\build_production.ps1                 # APK + App Bundle
.\tool\build_production.ps1 -Target apk     # APK only
.\tool\build_production.ps1 -Target bundle  # App Bundle only
```

**macOS / Linux**

```bash
cd mobile
./tool/build_production.sh                  # APK + App Bundle
./tool/build_production.sh apk
./tool/build_production.sh bundle
```

Both scripts run `flutter pub get`, `flutter analyze` and `flutter test`
before building, so a release is never produced from a failing tree.

### 3.2 Raw commands

```bash
cd mobile
flutter pub get
flutter analyze
flutter test

flutter build apk --release \
  --dart-define=API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=SOCKET_URL=https://farmconnect-api-sn98.onrender.com

flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

### 3.3 Output locations

| Artefact | Path | Size |
| --- | --- | --- |
| Release APK | `mobile/build/app/outputs/flutter-apk/app-release.apk` | 57.8 MB (60,617,334 bytes) |
| Release App Bundle | `mobile/build/app/outputs/bundle/release/app-release.aab` | 56.0 MB (58,770,324 bytes) |
| Debug APK | `mobile/build/app/outputs/flutter-apk/app-debug.apk` | 157.6 MB (165,269,190 bytes) |

`mobile/build/` is excluded by `mobile/.gitignore`, so these are build
artifacts rather than tracked files. Rebuild them with section 3.1.

The two release artefacts were rebuilt on **2026-11-28** after the last source
change of the audit series (`d455244`) and were verified again:

| Check | Command | Result |
| --- | --- | --- |
| The package really points at production | `aapt2 dump badging app-release.apk` | package `in.farmconnect.farmconnect_mobile`, versionName `1.0.0`, label `FarmConnect`, `minSdkVersion 24`, `targetSdkVersion 36` |
| The permissions are the expected ones | `aapt2 dump badging app-release.apk` | `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA` — nothing else |
| The signature | `apksigner verify --print-certs app-release.apk` | `CN=Android Debug` — the artefact is **debug-signed**, so it is **not** Play Store ready (see section 7) |
| The embedded host | scan `libapp.so` of every ABI inside the APK | `farmconnect-api-sn98.onrender.com` **3×** in `arm64-v8a`, `armeabi-v7a` and `x86_64`; `10.0.2.2:5000` **0×** and `localhost:5000` **0×** in all three |

### 3.4 Verifying that a build points at production

```bash
# The API base URL is embedded in the compiled Dart code.
strings mobile/build/app/outputs/flutter-apk/app-release.apk 2>/dev/null \
  | grep -m1 'farmconnect-api-sn98.onrender.com'
```

A simpler check is to install the APK and watch `adb logcat` for
`[Socket] connected` while the app is signed in — the production host must
resolve.

---

## 4. Local development configuration

The development defaults are unchanged, so local work still works exactly as
before.

### 4.1 Android emulator

`10.0.2.2` is the alias the emulator uses to reach the host machine:

```bash
cd mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api \
            --dart-define=SOCKET_URL=http://10.0.2.2:5000
```

The debug and profile variants declare
`android:usesCleartextTraffic="true"` so plain HTTP reaches the local
backend. The **release** variant never inherits that attribute and therefore
only speaks HTTPS.

### 4.2 Physical device

Use the LAN address of the development machine:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:5000/api \
            --dart-define=SOCKET_URL=http://192.168.x.x:5000
```

### 4.3 Pointing a development build at the deployed backend

```bash
flutter run --dart-define=API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
            --dart-define=SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

This is useful for testing against production without producing a release
artefact. Remember that the Render free tier sleeps after a period of
inactivity, so the first request can take up to ~50 seconds while the service
wakes up.

### 4.4 Local backend

```bash
cd backend
cp .env.example .env          # set DATABASE_URL
npm run db:setup              # migrate + seed + categories (DEVELOPMENT ONLY)
npm start
```

> `npm run db:seed` **deletes every row** in the target database. Never point
> it at the hosted Render database.

---

## 5. Authentication status

### 5.1 Email and password — working

Both clients authenticate against the **same** endpoint and receive the same
kind of JWT:

| Client | Request |
| --- | --- |
| Website | `POST /api/auth/login` with `{ identifier, email, password, role }` |
| Android | `POST /api/auth/login` with `{ email, password }` |

The website's login page calls the backend first and only falls back to
Firebase when the backend rejects the credentials. The Android app always uses
the backend.

Verified live: a QA account registered through the Android app signed in on
the website-facing API and resolved to the **same user id** on both clients.

### 5.2 Token storage and session persistence

| Client | Storage | Key |
| --- | --- | --- |
| Android | `flutter_secure_storage` → Android `EncryptedSharedPreferences` | `farmconnect_token`, `farmconnect_user`, `farmconnect_role` |
| Website | Browser `localStorage` | `farmconnect_token` (also read as `fc_token`) |

Both send the token as `Authorization: Bearer <jwt>`. The backend accepts
`Authorization`, `x-auth-token` and the `token` / `fc_token` /
`farmconnect_token` cookies.

* **Session restore** — on app start the Android client reads the encrypted
  token and cached profile, then refreshes the profile from
  `GET /api/auth/me`. If the token is rejected it logs out automatically.
* **Logout** — `AuthController.logout()` wipes the encrypted store and
  disconnects the Socket.IO session.
* **Role isolation** — the router redirects signed-out users to `/login`, and
  the home shell renders the farmer, consumer or admin tabs based on the role
  inside the JWT.

All three behaviours are covered by the integration test (section 6.5). The
session restore was additionally verified on the **release APK** with a real
`am force-stop` + relaunch (section 6.3); doing so uncovered a splash-screen
defect that is described in section 6.4.

### 5.3 Firebase phone OTP — **NOT configured in production**

Firebase phone authentication is **not working** on the deployed services and
is reported here as such. No mock OTP or fake token was used to simulate it.

**Evidence gathered against the live services:**

* `POST https://farmconnect-api-sn98.onrender.com/api/auth/firebase-phone`
  with a probe token returns **HTTP 401**
  `"Invalid phone authentication token."` /
  `"Decoding Firebase ID token failed."` — Firebase Admin is loaded but has no
  service account to verify a token against.
* `render.yaml` sets **no** `FIREBASE_*` variable on the API service.
* `render.yaml` sets **no** `NEXT_PUBLIC_FIREBASE_*` variable on the web
  service, so `frontend/src/lib/firebase.ts` falls back to its **mock
  development** placeholder (`AIzaSyMockKeyForDevelopmentOnly12345`,
  project `farmconnect-dev`).

**What has to be supplied to switch it on** (owner action — no credential is
invented or committed here):

*Backend — `farmconnect-api` service:*

| Variable | Value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | The Firebase project id |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | The **entire** service-account JSON, on one line |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | *Alternative* — the absolute path of the service-account JSON file |

*Frontend — `farmconnect-web` service (must be set **before** the build,
because `NEXT_PUBLIC_*` values are inlined into the bundle):*

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API key from the Firebase console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | The Firebase project id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From the Firebase console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From the Firebase console |

Until then, use email/password sign-in — it is fully functional and verified.

> The website's OTP tab contains a pre-existing client-side bypass that
> pre-fills `123456` when Firebase cannot dispatch an SMS, and the backend's
> `POST /api/auth/login-phone` signs a user in by phone number without a
> password. That behaviour was **not changed** by this work, because the
> brief forbids weakening existing authentication — but it should be reviewed
> before the deployment is used for real transactions.

---

## 6. Test results

All of the following were executed against the **deployed Render services**
or the real local stack. No mock server, mock repository or fake success
response was used.

### 6.1 Flutter static analysis

```
cd mobile && flutter analyze
→ No issues found!
```

### 6.2 Flutter unit and widget tests

```
cd mobile && flutter test
→ 00:01 +35: All tests passed!    (35/35)
```

| File | Covers |
| --- | --- |
| `test/model_parsing_test.dart` | JSON parsing of products, orders, enquiries, users, prices, notifications — and the **round trip** of every order status, including the new `PACKED` |
| `test/cart_widget_test.dart` | Empty cart state, adding products, quantity changes, minimum order quantity |
| `test/production_config_test.dart` | The production build scripts pin the deployed Render API and never point at the emulator address |
| `test/router_session_test.dart` | The session-restore redirect: a restored session leaves the splash screen (see section 6.4) |
| `test/locale_test.dart`, `test/crop_listing_test.dart` | The three languages, the language switch and the independent crop lots |
| `test/profile_role_test.dart` | The entry "My favourites" is offered to a **buyer** and not to a cultivator — the favourites belong to a buyer, the shared backend refuses them with HTTP 403 |

### 6.2.1 Live integration suites against the deployed backend

Four suites run on the emulator against the **live** Render services. None of
them uses a mock server or a fake response.

```
cd mobile
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
→ 00:57 +9: All tests passed!      (9/9)

flutter test integration_test/route_coverage_test.dart -d emulator-5554 … 
→ 01:32 +1: All tests passed!      (21/21 routes opened)

flutter test integration_test/auth_journey_test.dart -d emulator-5554 …
→ 00:57 +5: All tests passed!      (5/5)

flutter test integration_test/cross_platform_test.dart -d emulator-5554 …
→ 00:53 +2: All tests passed!      (2/2)

flutter test integration_test/packed_status_test.dart -d emulator-5554 …
→ 00:17 +1: All tests passed!      (1/1)
```

| Suite | What it proves on the live backend |
| --- | --- |
| `shared_data_workflow_test.dart` | the nine shared workflows: the listing of one client is visible on the other, the enquiries and the chat, the favourites, the order, the socket event, the language preference and the shared positions |
| `route_coverage_test.dart` | all **21** routes open on the real router without a widget exception |
| `auth_journey_test.dart` | the sign-in, the session restore, the logout and the re-sign-in of the **same** account |
| `cross_platform_test.dart` | the order that the website placed is listed on the phone — the run really printed `Order #68f854b8 \| Delivered \| Web QA Tomato 1795847693410` |
| `packed_status_test.dart` | the state `PACKED` is **stored** by the shared backend (the answer of the API carries it), an unknown state is refused with **HTTP 400**, and the Android list shows "Packed" **in the card of that order** |

### 6.3 Release APK on the emulator against the **live** services

The release APK itself — not a debug build — was installed on the emulator and
exercised against the deployed backend.

```
adb install -r mobile/build/app/outputs/flutter-apk/app-release.apk
→ Performing Streamed Install
→ Success
```

| Check | Command | Result |
| --- | --- | --- |
| Manifest permissions | `aapt2 dump permissions app-release.apk` | ✅ `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA` |
| Application label | `aapt2 dump badging app-release.apk` | ✅ `application-label:'FarmConnect'` |
| Cleartext traffic | release manifest | ✅ not enabled — release only speaks HTTPS |
| Embedded host | scan `libapp.so` inside the APK | ✅ `farmconnect-api-sn98.onrender.com` appears 3× in `arm64-v8a`, `armeabi-v7a` and `x86_64`; `10.0.2.2:5000` appears 0×. The single `localhost` token in the Dart symbol table is a library symbol, not an endpoint. |
| Signature | `apksigner verify --print-certs` | ✅ valid, signed with the **Android Debug** certificate (see section 7) |
| Cold start | `adb shell am start -W …/.MainActivity` | ✅ `Status: ok`, no crash in the crash buffer |
| Login | credentials of a live QA account typed into the release APK | ✅ the **Farmer dashboard** is rendered with the production farm record `Handover QA Fields 1795792181770` |
| Live TLS connection | `/proc/net/tcp` for the app uid | ✅ `local=10.0.2.16:58702 -> remote=216.24.57.18:443 [ESTABLISHED]` — `216.24.57.18` is one of the two addresses `farmconnect-api-sn98.onrender.com` resolves to |
| Session restore | `adb shell am force-stop` + relaunch | ✅ the app returns straight to the dashboard |
| Write path | "List lot" form in the release APK UI → `Publish harvest lot` | ✅ `POST` reached the live API; `GET /api/products?search=…` returns 1 match (`73e9975a-1ba2-4163-9841-ea7534bf80f2`, ₹40 / KG, 200 KG) and `GET /api/products/my-products` returns the same lot |
| Dashboard refresh | create a second lot (`QA-RAPK-Lot2-181770`) and return to the dashboard | ✅ the dashboard changes from 1 to 2 lots **without an app restart** after the fix described in section 6.4.2 |
| Android → website visibility | `https://farmconnect-web.onrender.com/consumer/explore` opened in a real browser | ✅ both release-APK lots are rendered: `QA-RAPK-Lot-181770` (₹40 / kg, 200 KG) and `QA-RAPK-Lot2-181770` (₹45 / kg, 150 KG), both under `HANDOVER QA FIELDS 1795792181770` |

The QA account used for this check was created through the **website API**
(`POST https://farmconnect-api-sn98.onrender.com/api/auth/register`) and then
signed in **on the release APK**, which proves that both clients resolve to the
same account in the same PostgreSQL database.

### 6.3.1 The release APK after the audit series (2026-11-28)

The release APK was rebuilt after the last source change (`d455244`), installed
again and driven through the whole journey of **both** roles with the QA
accounts of the audit. Every observation below was read from the screen of the
device (`uiautomator dump`), not from a mock.

| Step | Observation |
| --- | --- |
| Install | `adb install -r app-release.apk` → `Success`; `am start -W` → `Status: ok`, `LaunchState: COLD` |
| Sign in as the **cultivator** | the dashboard reads "Farmer dashboard", "Web QA Fields", **1** harvest lots, **1** available lots, **1** enquiries, **6** profile views, and the real lot "Web QA Tomato 1795847693410" (₹27.50 · 100 kg) |
| The profile of the cultivator | "My Profile", "Web QA Cultivator", "Share my farm position — **Not shared yet**", "My complaints", "Logistics & profit calculator", "APMC mandi rates", "Verify cultivator identity", "Sign out" — and **no** "My favourites". The favourites belong to a buyer, the shared backend refuses them with HTTP 403 |
| Sign out | the dialog "Log out?" appears; after the confirmation the app is back on the sign-in screen ("FarmConnect", "Direct trade between cultivators and buyers", "Sign in", "Create an account") |
| Sign in as the **buyer** | the marketplace reads "Marketplace", "**49 listings**", with the real lots of the shared database |
| The orders of the buyer | the list shows the state that the **website** set: `Order #3b37abb3 — **Packed** — Web QA Tomato 1795847693410`, `Order #8efa3976 — Packed`, `Order #6dc1db0c — Packed`, `Order #c757f218 — Packed`, and the pending ones of the socket suite. The state "packed" was created by the backend, stored by the shared database and is read by the phone |
| The profile of the buyer | "Web QA Buyer", "2847693410", "Buyer", "Share my delivery position — Not shared yet", and **"My favourites"** — the entry a buyer may really use |
| The favourites of the buyer | the screen "Favourite listings" lists exactly the lot that the **website** kept: "QA Socket Lot 1795855741642 — Socket QA Fields — ₹15 / per kg — 10 kg Available" |
| End state | the buyer was signed out again — the app waits at the sign-in screen |

The two clients really share one state: the **website** kept the lot and the
**phone** shows it; the **website** packed the order and the **phone** shows
"Packed".

### 6.4 Bugs found and fixed during the release APK verification

Two defects were only reachable through the real app UI; both were fixed,
covered by tests where possible, and re-verified on the release APK.

#### 6.4.1 Session restore hung on the splash screen

The first release APK hung on the splash screen **forever** after an app
restart: the login worked, but as soon as the app was closed and reopened it
stayed on the loading splash and never reached the dashboard.

**Root cause** — `mobile/lib/routing/app_router.dart`: the redirect function
only knew the authentication routes (`/login`, `/register`). The splash route
(`/splash`) was never redirected away from once the session restore finished.
A restored session *is* authenticated, so neither

```dart
if (!auth.isAuthenticated && !isAuthRoute) return '/login';
if (auth.isAuthenticated && isAuthRoute) return '/home';
```

matched, and the app stayed on `/splash` indefinitely.

**Fix** — the redirect logic was extracted into the pure function
`resolveAuthRedirect()` and the splash route is now handled explicitly:

```dart
if (location == '/splash') {
  return isAuthenticated ? '/home' : '/login';
}
```

The behaviour is locked down by `test/router_session_test.dart` (7 test cases).
The fixed release APK was rebuilt, reinstalled and re-verified: the app now
restores the session and returns straight to the farmer dashboard after a
force-stop.

> This defect was only reachable through the real app UI. The integration test
> in section 6.5 drives the repositories directly and therefore never entered
> the router.

#### 6.4.2 Farmer dashboard and Lots list stayed stale after creating a lot

A lot created from the app's "List lot" form was saved correctly on the
backend, and was visible after an app restart, but the dashboard and the Lots
tab kept showing the old list. Both screens load once in `initState` and nothing
reloaded them when the form route popped.

**Fix** — a `catalogRevisionProvider` counter in
`mobile/lib/core/providers.dart` is bumped after a create, update, availability
toggle or delete. The three farmer catalogue screens in
`mobile/lib/features/farmer/` listen to it and call `_load()`, so every entry
point (dashboard button, Lots button, bottom-bar FAB) refreshes the list. This
also keeps the dashboard and the Lots tab consistent with each other.

Verified on the release APK: after publishing `QA-RAPK-Lot2-181770` the
dashboard immediately showed **2 Harvest lots** and both cards, with no
restart; the website showed both lots as well.

### 6.5 On-device integration test against the **live** backend

```
cd mobile && flutter test integration_test/shared_data_workflow_test.dart \
  -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com
```

```
00:00 +0: a farmer registered on one client is usable from the other
00:05 +1: a product created on the website is visible in the Android app
00:14 +2: enquiries and messages are shared between both clients
00:20 +3: favourites, notifications and complaints are persisted
00:26 +4: logout clears the session and the account can sign in again
00:30 +5: the Socket.IO server broadcasts order events to the Android client
00:38 +6: All tests passed!          (6/6)
```

Run on an **Android 17 (API 37) emulator** against
`https://farmconnect-api-sn98.onrender.com`. The test uses the app's real
repositories and real Dio / Socket.IO clients.

| # | Test | What it proves |
| --- | --- | --- |
| 1 | a farmer registered on one client is usable from the other | The same user id on both clients; a listing created on Android appears in the website feed; an order placed on the website appears for the farmer on Android; a status update made on Android is visible on the website |
| 2 | a product created on the website is visible in the Android app | The reverse direction: a website listing appears in the Android catalogue **and** in the farmer's shared inventory |
| 3 | enquiries and messages are shared between both clients | An enquiry raised on the website appears for the farmer on Android; a reply sent from Android is readable on the website |
| 4 | favourites, notifications and complaints are persisted | A favourite toggled on Android is visible on the website for the same consumer profile; complaints land in the shared `Complaint` table; the shared notification inbox is readable |
| 5 | logout clears the session and the account can sign in again | Session restoration from secure storage works; logout wipes the credentials; the account signs in again on the other client with the same id; a second account never sees the first account's orders |
| 6 | the Socket.IO server broadcasts order events to the Android client | A real `new_order_received` event is received over the wire when the order is placed on the "website" client |

### 6.6 QA data

Every account and record created by the integration test is a clearly
identifiable QA record:

| Kind | Pattern |
| --- | --- |
| Account | `handover.qa.<role>.<runId>@farmconnect.test` (integration test: `<tag>.qa.<runId>@farmconnect.test`) |
| Listing title | `QA-RAPK-Lot…`, `QA-RAPK-Lot2…` (release APK) / `QA … <runId>` (integration test) |

The release APK check in section 6.3 used the account
`handover.qa.farmer.1795792181770@farmconnect.test` with the farm name
`Handover QA Fields 1795792181770`, and published the QA lots
`QA-RAPK-Lot-181770` and `QA-RAPK-Lot2-181770`.

Real user data is never read destructively, modified or deleted.

**Cleanup:** listings that are not referenced by an order are removed again
through the supported `DELETE /api/products/:id` endpoint. Two categories of QA
data remain and are documented rather than hidden:

* A listing that already has an order cannot be deleted, because
  `OrderItem.product` is `onDelete: Restrict` — the backend deliberately
  protects the order history.
* The QA **accounts** remain, because the API exposes no account-deletion
  endpoint. They are inert QA records with `.test` email addresses.

### 6.7 Backend and website

| Check | Command | Result |
| --- | --- | --- |
| Live API health | `GET /api/health` | ✅ `{"status":"UP","database":"UP"}` |
| Live website | `GET https://farmconnect-web.onrender.com` | ✅ HTTP 200 |
| Backend unit tests | `cd backend && npm run test:unit` | ✅ 92/92 |
| Backend build | `cd backend && npm run build` | ✅ exit 0 |
| Frontend types | `cd frontend && npx tsc --noEmit` | ✅ exit 0 |
| Frontend regression tests | `cd frontend && npm test` | ✅ 44/44 |
| Frontend build | `cd frontend && npm run build` | ✅ exit 0, 25 app routes (21 static, 4 dynamic) |
| Android analysis | `cd mobile && flutter analyze` | ✅ "No issues found!" |
| Android tests | `cd mobile && flutter test` | ✅ 35/35 |
| CI — `verify` job | `gh run list --branch fix/local-updates` | ✅ the localisation check, the localisation **usage** check, the frontend types, the frontend tests, the frontend build, the backend types, the backend unit tests and the PostgreSQL 16 integration suite (141 tests) |
| CI — `Android client` job | the same command | ✅ a **separate** job with Flutter 3.47.2 stable: `flutter analyze --no-fatal-infos` and `flutter test` |
| PR CI | run `46148588861` (branch head `e5c6e0e`) | ✅ PostgreSQL 16 container, migrations applied, 141/141 |

### 6.8 Ten-workflow verification matrix

Each workflow from the handover brief is listed with the evidence that actually
exercised it. "Verified" always refers to the live Render backend, never a mock.

| # | Workflow | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Android registration / login | ✅ Verified (login on release APK; registration on-device) | Release APK signed in through its UI as `handover.qa.farmer.1795792181770@farmconnect.test` (section 6.3). Registration against the live API is exercised by integration test 1 on the emulator through the app's real `AuthRepository`; the registration **form UI** itself was not driven manually. |
| 2 | Website login | ✅ Verified in a real browser | `https://farmconnect-web.onrender.com/login` → Email & Password → Buyer (Consumer) with the QA consumer account → redirected to `/consumer/explore`, header shows `Handover QA Consumer` / `CONSUMER`. |
| 3 | Farmer profile / listings | ✅ Verified | Release APK dashboard shows `Handover QA Fields 1795792181770`; two lots listed from the app; `GET /api/products/my-products` returns them (section 6.3). |
| 4 | Android product visible on website | ✅ Verified in a real browser | `/consumer/explore` renders `QA-RAPK-Lot-181770` (₹40 / kg, 200 KG) and `QA-RAPK-Lot2-181770` (₹45 / kg, 150 KG), both created from the release APK UI. |
| 5 | Website product visible on Android | ✅ Verified on device | Integration test 2: a product created through the website-facing API appears in the Android catalogue and the farmer's shared inventory. |
| 6 | Favourites | ✅ Verified on device | Integration test 4: a favourite toggled on Android is visible to the same consumer profile via the website-facing API. |
| 7 | Enquiries / chat | ✅ Verified on device | Integration test 3: enquiry raised on the website side appears for the farmer on Android; the Android reply is readable on the website side. |
| 8 | Orders and status sync | ✅ Verified on device | Integration test 1: order placed on the website side appears for the farmer on Android; a status change made on Android is visible to the website side. |
| 9 | Notifications / Socket.IO | ✅ Verified on device | Integration test 4 (shared notification inbox) and test 6: Android receives a real `new_order_received` Socket.IO event when the order is placed by the other client. |
| 10 | Logout / session restore / account isolation | ✅ Verified | Release APK: `am force-stop` + relaunch returns straight to the dashboard. Integration test 5: logout wipes the stored session, the account signs in again with the same id, and a second account cannot see the first account's orders. |

> **Note (2026-11-28):** the table above records the workflows that were
> verified against the deployment that existed **before** the multilingual and
> multiple-crop work was pushed. The new features add two more workflows
> (independent crop lots and a shared language preference) and the complete,
> up-to-date route and cross-platform matrices live in
> [`docs/VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md). Rows in that
> document stay `NOT TESTED` until the corresponding command has actually been
> executed — nothing is marked as verified by inference.

---

## 7. Multilingual support and multiple crop listings (added 2026-11-27)

Two features were added to **both** clients on the **same** backend and the
**same** PostgreSQL database. The full design is in
[`docs/MULTILINGUAL_AND_CROPS.md`](MULTILINGUAL_AND_CROPS.md); the route and
cross-platform matrices are in
[`docs/VERIFICATION_MATRICES.md`](VERIFICATION_MATRICES.md).

### 7.1 Multilingual support (English / Kannada / Hindi)

| Item | Website | Android |
| --- | --- | --- |
| Implementation | `frontend/src/context/LocaleContext.tsx` + `frontend/src/i18n/dictionaries/*.{en,kn,hi}.ts` | `mobile/lib/core/locale/locale_controller.dart` + `mobile/lib/l10n/app_{en,kn,hi}.arb` |
| Selector | `frontend/src/components/ui/LanguageSwitcher.tsx` (navbar **and** footer) | `mobile/lib/shared/widgets/language_selector.dart` (app bar **and** profile) |
| Instant switch | yes — `setLocale()` re-renders without a reload | yes — `MaterialApp.router` receives the active `Locale` |
| Local persistence | `localStorage["farmconnect_locale"]` | encrypted keystore `farmconnect_locale` (survives logout) |
| Account sync | `PATCH /api/users/me { preferredLanguage }` → `User.preferredLanguage` | same endpoint, same column |
| Live sync | Socket.IO `language_preference_updated` in room `user_<id>` | same event, same room |
| Formatting | `Intl.NumberFormat` / `Intl.DateTimeFormat` with `en-IN` / `kn-IN` / `hi-IN` | `intl` `NumberFormat` / `DateFormat` with the active locale |

The account language is the single source of truth for a signed-in user; the
device value is only the local cache for signed-out visitors.

### 7.2 Multiple independent crop listings

* One listing is one `Product` row with its **own** `cropName`, `variety`,
  quantity, unit, price, availability, description and image.
* New shared endpoints: `GET /api/catalog/categories` and
  `GET /api/catalog/crops?search=&category=`.
* New product filters: `crop`, `category`, `categoryId` (the existing
  `search`, `district` and `isOrganic` filters are unchanged).
* Category filters are resolved against the live `Category` table, because the
  seeded slugs differ per installation (`Grains & Millets` may be stored as
  `grains`).
* Website: `frontend/src/components/farmer/AddCropModal.tsx`,
  `EditCropModal.tsx` and `frontend/src/app/farmer/products/page.tsx`.
* Android: `mobile/lib/features/farmer/product_form_page.dart` and
  `mobile/lib/features/farmer/products_page.dart`.

### 7.3 Database migration

`backend/prisma/migrations/20261127000000_add_language_and_crop_fields/migration.sql`
adds `User.preferredLanguage`, `Product.cropName`, `Product.variety` and an
index on `Product.cropName`. It is **additive** — no existing row is rewritten
— and Render applies it with `npm run db:migrate` in the build command before
the new API starts. The new columns therefore only exist in production after
the branch has been pushed and the service redeployed.

### 7.4 New verification tooling

```bash
# Localisation completeness (website + Android, all three languages)
npm run i18n:check

# HTTP route evidence against the deployed services
npm run smoke:routes

# Backend unit tests (no database required)
cd backend && npm run test:unit
```

---

## 8. Signing status

### 8.1 Current state

| Item | Status |
| --- | --- |
| Release APK | Built and **installable** on a device or emulator |
| Release APK signature | **Flutter debug key** (`signingConfigs.getByName("debug")`) |
| Release App Bundle | Built, **debug key** |
| Play Store upload key | **Does not exist in this repository and was not generated** |
| `android/key.properties` | **Not present**, and `android/.gitignore` already excludes it, `*.keystore` and `*.jks` |

### 8.2 Testable vs Play Store ready

| | Testable APK/AAB | Play Store ready APK/AAB |
| --- | --- | --- |
| Installs on a device | ✅ | ✅ |
| Talks to the production API | ✅ | ✅ |
| Signed with the debug key | ✅ | ❌ |
| Accepted by Google Play | ❌ | ✅ |

**The delivered artefacts are testable but NOT Play Store ready.**

### 8.3 How to produce a Play Store ready build

The owner generates the upload keystore **once**, locally, with the Android
SDK tools. That key is a secret and must never be committed:

```bash
keytool -genkey -v -keystore ~/farmconnect-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `mobile/android/key.properties` (already gitignored):

```properties
storePassword=<store password>
keyPassword=<key password>
keyAlias=upload
storeFile=<absolute path to the .jks file>
```

`mobile/android/app/build.gradle.kts` picks this file up automatically, uses
the `release` signing config, and logs a loud warning when the file is absent:

```
FarmConnect: android/key.properties was not found. The release artefact is
signed with the DEBUG key. It is installable and testable, but it is NOT a
Play Store ready release.
```

No keystore, password or `key.properties` file was created, inspected or
committed by this work.

---

## 9. Known limitations

1. **The release APK is signed with the debug key.** See section 7. The
   artefact runs correctly against the production API but must be re-signed
   before it goes to Google Play.
2. **Firebase phone OTP is not configured** on the deployed services. See
   section 5.3 for the exact variables required. Email/password sign-in is
   fully functional.
3. **The website's OTP tab has a pre-existing client-side bypass** and the
   backend exposes a passwordless phone sign-in. This was deliberately left
   untouched because the brief forbids weakening authentication, but it should
   be reviewed before real transactions.
4. **Uploaded images are stored on an ephemeral filesystem.** `render.yaml`
   sets `STORAGE_PROVIDER=local`, and a Render filesystem is wiped on every
   redeploy and restart. For a durable deployment, set `STORAGE_PROVIDER=s3`
   with an S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces,
   MinIO) and the matching `STORAGE_*` variables.
5. **The Render free tier sleeps.** The API and website are suspended after a
   period of inactivity and the first request can take roughly 50 seconds.
   The free PostgreSQL instance also expires after 30 days (noted in
   `render.yaml`).
6. **The production database contains only the seeded categories plus QA
   records.** The destructive demo seed was deliberately **not** run against
   the hosted database; the only listings present are QA lots created by the
   release-APK and integration-test workflows (section 6.6).
7. **QA accounts created by the integration test are not deleted** — the API
   has no account-deletion endpoint. Listings with order history are also
   retained by design.
8. **Real-time delivery while the app is backgrounded** depends on the Android
   process staying alive. The app re-syncs from REST when it resumes.
9. **The Android app has no push notification channel.** Notifications are
   delivered in-app through the shared Socket.IO stream and the
   `GET /api/notifications` inbox; Firebase Cloud Messaging is not wired up
   (it depends on the missing Firebase configuration in section 5.3).

---

## 10. Quick reference

```bash
# Local development
cd mobile && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api \
                         --dart-define=SOCKET_URL=http://10.0.2.2:5000

# Production release (APK + AAB)
cd mobile && ./tool/build_production.sh

# Live integration test
cd mobile && flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=https://farmconnect-api-sn98.onrender.com/api \
  --dart-define=TEST_SOCKET_URL=https://farmconnect-api-sn98.onrender.com

# Live services
curl https://farmconnect-api-sn98.onrender.com/api/health
curl https://farmconnect-web.onrender.com
```
