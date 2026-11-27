# FarmConnect — Android Application

The native Flutter client of the FarmConnect agriculture marketplace. It is a
**second client of the very same backend and database** as the Next.js website:
same REST endpoints, same Socket.IO events, same PostgreSQL rows and same
identifiers.

```
Next.js website ──NEXT_PUBLIC_API_URL──┐
                                        ├──▶ Express API + Socket.IO ──▶ PostgreSQL
FarmConnect Android ─API_BASE_URL──────┘
```

---

## Features

| Area | Screen |
| --- | --- |
| Authentication | Login, registration, session restore from the encrypted keystore |
| Consumer | Explore the catalogue, product detail, farmer detail, cart, checkout, order history |
| Farmer | Dashboard, inventory, create and edit listings, incoming orders, status updates |
| Orders | Order detail with the status timeline and delivery confirmation |
| Negotiation | Enquiry list and the real-time chat thread |
| Discovery | Farmer map with "use my location", APMC mandi rates, logistics and profit calculator |
| Engagement | Favourites (products and farmers), notification inbox, complaints |
| Profile | Edit the profile and sign out |
| Admin | Platform metrics, user directory and the complaint queue |

There is **no mock data**: every screen is driven by the live API.

---

## Configuration

The API host is supplied at build time — nothing is hardcoded.

| Define | Purpose | Default |
| --- | --- | --- |
| `API_BASE_URL` | REST base URL, including `/api` | `http://10.0.2.2:5000/api` |
| `SOCKET_URL` | Socket.IO origin, **no** `/api` suffix | `http://10.0.2.2:5000` |

`10.0.2.2` is how the Android emulator reaches the host machine. A physical
device needs the LAN address of the development machine.

### Running

```bash
flutter pub get

# Android emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api \
            --dart-define=SOCKET_URL=http://10.0.2.2:5000

# Physical device
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:5000/api \
            --dart-define=SOCKET_URL=http://192.168.x.x:5000
```

### Release build

A release build must never point at a local host:

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://<your-api-host>/api \
  --dart-define=SOCKET_URL=https://<your-api-host>
```

`AppConfig.isMissingProductionUrl` detects a local host or the RFC 2606
`.invalid` placeholder and the app then explains how to rebuild itself instead
of failing with a cryptic network error.

---

## Project layout

```
mobile/
├── lib/
│   ├── core/          config, API client, socket service, secure storage, theme, providers
│   ├── data/          models and the six repositories
│   ├── features/      26 screens across 13 feature areas
│   ├── routing/       the 20 go_router routes and the auth redirect
│   └── shared/        reusable product and farmer cards, empty/error/loading states
├── test/                          unit and widget tests
└── integration_test/              shared-data workflow test
```

### Key design points

* **One Dio client.** `ApiClient` owns the base URL, the JWT interceptor, the
  multipart upload and the error mapping, so no repository repeats that logic.
* **Injectable secure storage.** `TokenStorage` sits behind a `SecureStore`
  interface. Production uses `FlutterSecureStore`
  (`EncryptedSharedPreferences`); tests inject `InMemorySecureStore` and never
  touch a platform channel.
* **Envelope-tolerant parsing.** `ApiClient.extractList` understands a bare
  array, a flat envelope (`{"data": [...]}`) and a nested envelope
  (`{"data": {"orders": [...]}}`).
* **No duplicated business logic.** Prices, totals and status transitions are
  computed by the backend.

---

## Tests

```bash
# Static analysis
flutter analyze

# Unit and widget tests
flutter test

# On-device shared-data workflow test — needs the API running
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 \
  --dart-define=TEST_API_BASE_URL=http://10.0.2.2:5000/api \
  --dart-define=TEST_SOCKET_URL=http://10.0.2.2:5000
```

The integration test drives the real repositories against the real backend and
proves that a farmer registered on the website can sign in on the app, that a
listing created on Android appears on the website, that an order placed on the
website reaches the farmer on Android, that enquiries and chat messages are
shared, that favourites and complaints are persisted against the shared
profile, and that a real `new_order_received` Socket.IO event is broadcast.

---

## Backend

The app needs the FarmConnect API running with PostgreSQL. See
[`../docs/DATABASE_MIGRATION.md`](../docs/DATABASE_MIGRATION.md) for the
database and [`../docs/API_DOCUMENTATION.md`](../docs/API_DOCUMENTATION.md) for
the full endpoint reference.

```bash
cd ../backend
npm run db:setup
npm start
```
