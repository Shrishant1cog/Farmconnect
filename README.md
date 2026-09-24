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

## Project Structure

```text
farmconnect/
├── backend/     Express, Prisma, Socket.IO, and Firebase Admin API
├── frontend/    Next.js application for farmers, consumers, and admins
├── docker-compose.yml
├── .env.example
└── start.bat
```

## Prerequisites

Install Node.js 20 or newer and npm 10 or newer. Docker Desktop is required if you want to run the included PostgreSQL service locally. Firebase credentials are required for the authentication features.

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
	npm run db:generate
	npm run db:push
	npm run db:seed
	```

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

The root-level `full-system-test.js` and `audit.js` scripts are available for broader local checks after the backend and required services are running.