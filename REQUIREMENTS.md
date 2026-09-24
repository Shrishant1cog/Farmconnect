# FarmConnect Requirements

## Runtime

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop, if using the included PostgreSQL container
- A Firebase project with Authentication enabled for client and admin authentication

## Services

- PostgreSQL 16 is provided by `docker-compose.yml`.
- The backend runs on `http://localhost:5000`.
- The frontend runs on `http://localhost:3000`.

## Dependencies

Install the frontend dependencies from `frontend/package.json` and the backend dependencies from `backend/package.json`:

```powershell
cd frontend
npm install

cd ..\backend
npm install
```

The frontend requires these map packages:

- `leaflet`
- `react-leaflet`
- `@types/leaflet` (development dependency)

## Environment

Copy `.env.example` to `.env` at the project root and update values for the local environment. At minimum, configure:

- `PORT`
- `CLIENT_URL`
- `JWT_SECRET`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

Firebase client and Firebase Admin credentials must also be configured for the authentication flows used by the application. Do not commit private keys, service-account files, or production secrets.

## Database

Start PostgreSQL with Docker Compose:

```powershell
docker compose up -d postgres
```

Then, from `backend`, generate the Prisma client and apply the schema:

```powershell
npm run db:generate
npm run db:push
npm run db:seed
```
