# FarmConnect — Production Deployment Guide

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Branch:** `fix/local-updates`
**Target:** Render (web service + managed PostgreSQL) — **deployed by the project owner**

> The AI coding agent does **not** perform the Render deployment and does not
> create credentials, API keys or Firebase configuration values. This document
> describes exactly what the owner needs to configure.

---

## 1. Architecture in production

```
┌──────────────────┐        ┌──────────────────┐        ┌─────────────────────┐
│  Next.js website │        │  Flutter Android │        │  S3 / R2 bucket     │
│  (Render static  │        │  (released APK)  │        │  (product images)   │
│   or web service)│        │                  │        └─────────────────────┘
└────────┬─────────┘        └────────┬─────────┘                       ▲
         │  NEXT_PUBLIC_API_URL      │  API_BASE_URL / SOCKET_URL      │
         └──────────────┬───────────┘                                  │
                        ▼                                              │
              ┌───────────────────────┐          ┌────────────────────┐│
              │  Express API (Render) │─────────▶│  Managed PostgreSQL││
              │  + Socket.IO          │          │                    ││
              └───────────────────────┘          └────────────────────┘┘
```

The website and the Android app are **two clients of one backend and one
database**. There is no second API and no second database.

---

## 2. Environment variables

### 2.1 Backend web service (`backend/`)

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/farmconnect` | The managed PostgreSQL **internal** URL. |
| `DIRECT_URL` | – | `postgresql://user:pass@host:5432/farmconnect` | Only when the provider uses a pooler. Add `directUrl = env("DIRECT_URL")` to the datasource. |
| `JWT_SECRET` | ✅ | *(generate a random 48+ character string)* | `openssl rand -base64 48`. Must be at least 16 characters. |
| `JWT_EXPIRES_IN` | – | `7d` | Token lifetime. |
| `PORT` | – | `5000` | Render injects `PORT` automatically. |
| `NODE_ENV` | ✅ | `production` | |
| `CLIENT_URL` | ✅ | `https://farmconnect.vercel.app,https://farmconnect.onrender.com` | Comma-separated list of allowed origins (CORS + Socket.IO). |
| `STORAGE_PROVIDER` | ✅ | `s3` | **Must be `s3` in production** — a Render filesystem is ephemeral. |
| `STORAGE_BUCKET` | ✅ | `farmconnect-images` | |
| `STORAGE_REGION` | ✅ | `auto` | `auto` for R2, e.g. `us-east-1` for AWS S3. |
| `STORAGE_ACCESS_KEY_ID` | ✅ | *(from the bucket provider)* | |
| `STORAGE_SECRET_ACCESS_KEY` | ✅ | *(from the bucket provider)* | |
| `STORAGE_ENDPOINT` | – | `https://<account>.r2.cloudflarestorage.com` | For S3-compatible providers. |
| `STORAGE_PUBLIC_URL` | – | `https://cdn.example.com` | Public base URL of the bucket. Falls back to `<api-host>/uploads`. |
| `STORAGE_FORCE_PATH_STYLE` | – | `true` | Some S3-compatible providers need it. |
| `UPLOAD_DIR` | – | `./uploads` | Only used by the `local` storage provider. |
| `FIREBASE_PROJECT_ID` | – | *(from the Firebase console)* | Required only for Firebase phone OTP sign-in. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | – | *(the full JSON, single line)* | Alternative to the file path below. |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | – | `/etc/secrets/firebase.json` | Alternative to the inline key. |
| `RATE_LIMIT_MAX` | – | `300` | Requests per window per IP. |

### 2.2 Frontend (`frontend/`)

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | ✅ | `https://api.farmconnect.app/api` | Must end with `/api`. |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | `https://api.farmconnect.app` | Origin only, **no** `/api`. |
| `NEXT_PUBLIC_APP_URL` | – | `https://farmconnect.app` | Canonical URL of the website. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | – | *(from the Firebase console)* | Needed for the phone OTP tab. The repository contains a **mock development fallback** — replace it in production. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | – | *(from the Firebase console)* | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | – | *(from the Firebase console)* | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | – | *(from the Firebase console)* | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | – | *(from the Firebase console)* | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | – | *(from the Firebase console)* | |

> `NEXT_PUBLIC_*` variables are **inlined into the client bundle at build time**.
> Set them in Render before the build runs.

### 2.3 Android app

The Flutter app takes its configuration at **build time** through `--dart-define`:

| Define | Required | Example |
| --- | --- | --- |
| `API_BASE_URL` | ✅ | `https://api.farmconnect.app/api` |
| `SOCKET_URL` | ✅ | `https://api.farmconnect.app` |

There is **no** `localhost` in the release configuration. `AppConfig` treats a
local host or the RFC 2606 `.invalid` placeholder as "no production URL" and the
app explains how to rebuild instead of failing with a cryptic network error.

---

## 3. Backend service configuration

### 3.1 Build command

```bash
cd backend && npm ci && npm run db:generate && npm run build && npm run db:migrate
```

`npm run db:migrate` runs `prisma migrate deploy`, which only applies pending
migrations and never drops data — safe on every deploy.

### 3.2 Start command

```bash
cd backend && npm start
```

`npm start` runs `node dist/app.js`. The compiled entry point is
`backend/dist/app.js` because `backend/tsconfig.json` sets
`rootDir: "./src"` and `outDir: "./dist"`.

### 3.3 Health check path

```
/api/health
```

The endpoint probes PostgreSQL with `SELECT 1` and returns **HTTP 503** when
the database is unreachable, so Render marks the service unhealthy instead of
routing traffic to a broken instance.

Expected healthy response:

```json
{ "status": "UP", "service": "FarmConnect Engine", "database": "UP", "uptime": 42, "timestamp": "…" }
```

### 3.4 WebSocket support

Render's Node web services support WebSocket upgrades natively. No extra
configuration is required — Socket.IO falls back to HTTP long-polling when a
WebSocket upgrade is refused.

---

## 4. Frontend service configuration

### 4.1 Build command

```bash
cd frontend && npm ci && npm run build
```

### 4.2 Start command

```bash
cd frontend && npm run start
```

Next.js must run with `NODE_ENV=production` (the default on Render).

### 4.3 Output

Next.js 15 writes the production server to `.next/`. Render's Node runtime
serves it through `next start`; no static-export configuration is required.

---

## 5. PostgreSQL migration instructions

Full details are in [`docs/DATABASE_MIGRATION.md`](./DATABASE_MIGRATION.md). The
short version for production:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

Verify:

```bash
npx prisma migrate status   # → "Database schema is up to date!"
curl https://<your-api-host>/api/health
```

> `npm run db:seed` **deletes all rows** and inserts demo data. Never run it
> against a production database.

---

## 6. Android release configuration

### 6.1 Build

```bash
cd mobile
flutter pub get
flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.farmconnect.app/api \
  --dart-define=SOCKET_URL=https://api.farmconnect.app
```

The APK is written to `mobile/build/app/outputs/flutter-apk/app-release.apk`.

For an App Bundle (Play Store):

```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.farmconnect.app/api \
  --dart-define=SOCKET_URL=https://api.farmconnect.app
```

### 6.2 Signing

The current debug/release build uses the default Flutter debug keystore for the
debug variant. Before publishing to Google Play, create an upload keystore and
add `mobile/android/key.properties`:

```properties
storePassword=<store password>
keyPassword=<key password>
keyAlias=upload
storeFile=<absolute path to the .jks file>
```

Then add the signing config to `mobile/android/app/build.gradle(.kts)`. Keep the
keystore file and `key.properties` **out of version control**.

### 6.3 Permissions

`mobile/android/app/src/main/AndroidManifest.xml` requests:

| Permission | Why |
| --- | --- |
| `INTERNET` | REST API and Socket.IO |
| `ACCESS_NETWORK_STATE` | Connectivity checks |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | "Use my location" on the farmer map |
| `CAMERA` | Capture a product photo |

### 6.4 Cleartext traffic

The development configuration allows cleartext HTTP so the emulator can reach
`http://10.0.2.2:5000`. For a production build, the API must use HTTPS so
cleartext can be disabled.

### 6.5 Versioning

`mobile/pubspec.yaml` carries `version: 1.0.0+1`. Increment the build number
for every Play Store upload.

---

## 7. Deployment checklist

### Backend

- [ ] `DATABASE_URL` points at the managed PostgreSQL instance
- [ ] `JWT_SECRET` is a strong random value (not the development default)
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_URL` lists the production website origin
- [ ] `STORAGE_PROVIDER=s3` with a complete bucket configuration
- [ ] Health check path set to `/api/health`
- [ ] Build command includes `npm run db:migrate`

### Frontend

- [ ] `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` set before the build
- [ ] Real Firebase configuration (no mock key) if phone OTP is enabled
- [ ] `npm run build` completes without errors

### Android

- [ ] `API_BASE_URL` / `SOCKET_URL` point at the production API
- [ ] Release signing keystore configured
- [ ] `app-release.apk` installed on a physical device and verified against the production API

### After the deploy

- [ ] `GET /api/health` returns `{"status":"UP","database":"UP"}`
- [ ] Register a user on the website and sign in with the same account on the app
- [ ] Create a listing on the app and see it on the website
- [ ] Place an order on the website and see it on the app in real time

---

## 8. Rollback

| Situation | Action |
| --- | --- |
| Bad backend build | Roll back to the previous Render deploy. |
| Failed migration | Restore the PostgreSQL snapshot (Render → *Backups*), then re-run `npx prisma migrate deploy`. |
| Bad frontend build | Roll back to the previous Render deploy. |
| Bad Android APK | Rebuild with the previous `--dart-define` values and redistribute. |
