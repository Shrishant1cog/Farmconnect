# FarmConnect

FarmConnect is a full-stack agriculture marketplace and logistics platform. It connects farmers and consumers for crop discovery, product listings, enquiries, orders, location-aware exploration, mandi rates, and real-time communication.

## Features

- Farmer product and crop management
- Consumer product discovery, cart, checkout, and order tracking
- Authentication with Firebase and JWT-backed backend sessions
- Farmer and consumer dashboards
- Map-based exploration using Leaflet and React Leaflet
- Enquiries and real-time chat through Socket.IO
- Logistics and delivery workflow support
- Prisma database access with PostgreSQL
- Admin endpoints and dashboard
- Native **Flutter Android app** (`mobile/`) that is a second client of the very same API and database

## Project Structure

```text
farmconnect/
├── backend/     Express, Prisma, Socket.IO, and Firebase Admin API
├── frontend/    Next.js application for farmers, consumers, and admins
├── mobile/      Flutter Android application (same backend, same database)
├── docs/        Audit, database migration, API and deployment documentation
├── docker-compose.yml
├── .env.example
└── start.bat
```

## Architecture

The website and the Android app are **two clients of one backend and one
PostgreSQL database** — there is no second API and no second database.

```text
Next.js website ──NEXT_PUBLIC_API_URL──┐
                                        ├──▶ Express API + Socket.IO ──▶ PostgreSQL
Flutter Android ───API_BASE_URL─────────┘
```

| Client | Configuration |
| --- | --- |
| Website | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL` |
| Android | `API_BASE_URL`, `SOCKET_URL` (supplied at build time via `--dart-define`) |

## Prerequisites

Install Node.js 22 or newer and npm 10 or newer. Docker Desktop is required if you want to run the included PostgreSQL service locally. Firebase credentials are required for the authentication features.

See [REQUIREMENTS.md](REQUIREMENTS.md) for the complete dependency and environment checklist.

## Installation

1. Clone the repository and open the project directory.
2. Create the local environment file:

	```powershell
	Copy-Item .env.example .env
	```

3. Install dependencies:

	```powershell
	cd frontend
	npm install

	cd ..\backend
	npm install
	```

4. Start PostgreSQL:

	```powershell
	cd ..
	docker compose up -d postgres
	```

5. Prepare the database:

	```powershell
	cd backend
	npm run db:setup
	```

	`db:setup` applies the Prisma migrations, seeds the demo data and syncs the
	agricultural category list. Use `npm run db:migrate` on its own for a
	production-safe migration (it never drops data).

## Running Locally

Run the backend and frontend in separate terminals.

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The API is available at `http://localhost:5000/api`, and the Socket.IO server is available at `http://localhost:5000`.

On Windows, `start.bat` can be used as a convenience launcher after the environment and database have been configured.

### Android app

```powershell
cd mobile
flutter pub get

# Android emulator — 10.0.2.2 is the host machine
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api `
            --dart-define=SOCKET_URL=http://10.0.2.2:5000

# Physical device — use the LAN IP of the development machine
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:5000/api `
            --dart-define=SOCKET_URL=http://192.168.x.x:5000
```

Release builds must point at the production API — never at `localhost`:

```powershell
flutter build apk --release `
  --dart-define=API_BASE_URL=https://<your-api-host>/api `
  --dart-define=SOCKET_URL=https://<your-api-host>
```

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/ANDROID_PARITY_AUDIT.md](docs/ANDROID_PARITY_AUDIT.md) | Feature, API and database parity audit for the Android app |
| [docs/DATABASE_MIGRATION.md](docs/DATABASE_MIGRATION.md) | SQLite → PostgreSQL migration guide and production migration steps |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Full REST and Socket.IO reference shared by both clients |
| [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) | Render environment variables, build/start commands and the Android release checklist |
| [docs/ANDROID_IMPLEMENTATION_REPORT.md](docs/ANDROID_IMPLEMENTATION_REPORT.md) | What was built, what was verified, and the known limitations |

## Useful Commands

From `frontend`:

```powershell
npm run build
npm run start
```

From `backend`:

```powershell
npm run build
npm test
```

Stop the local database with:

```powershell
docker compose down
```

## Environment Variables

Configure these values in the root `.env` file:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port, normally `5000` |
| `NODE_ENV` | Runtime environment |
| `CLIENT_URL` | Frontend origin allowed by the backend |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | JWT lifetime |
| `DATABASE_URL` | Prisma database connection string |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend Socket.IO URL |

Keep Firebase credentials and JWT secrets private. Never commit production secrets or Firebase service-account keys.

## Testing

Backend tests can be run with:

```powershell
cd backend
npm test
```

Flutter tests:

```powershell
cd mobile
flutter analyze
flutter test

# On-device shared-data workflow test (requires the API to be running)
flutter test integration_test/shared_data_workflow_test.dart -d emulator-5554 `
  --dart-define=TEST_API_BASE_URL=http://10.0.2.2:5000/api `
  --dart-define=TEST_SOCKET_URL=http://10.0.2.2:5000
```

The root-level `full-system-test.js` and `audit.js` scripts are available for broader local checks after the backend and required services are running.

