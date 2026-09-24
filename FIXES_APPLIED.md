# FarmConnect — Fixes Applied

This documents every change made in response to the code review. See the chat
for the full original bug report; this file only covers what was actually
edited.

## Backend (`backend/src/app.ts`)

1. **Added `GET /api/products/:id`** — was missing entirely; the product
   detail page called it and always showed "Product not found."
2. **Added `POST /api/enquiries`** — creates an `Enquiry` + its first
   `Message`. Requires a logged-in CONSUMER. Was missing entirely; the
   product page's enquiry form and the Buy page's "Direct Message Farmer"
   button both called this with no backend support.
3. **Added `GET /api/enquiries/:id/messages`** — returns the enquiry plus
   its full message history (with sender name/role), gated to the two
   participants (consumer or the farmer's linked user). Didn't exist before;
   both chat pages had this call commented out / faked.
4. **Added `POST /api/enquiries/:id/messages`** — creates a `Message` and
   emits `new_chat_message` to the `enquiry_<id>` socket room so the other
   participant sees it live. Was missing entirely.
5. **Added `POST /api/orders`** — creates an `Order` + its `OrderItem`s,
   computing `totalItemsCost` server-side from the submitted items (the
   `Order` model requires this field; the old checkout payload never sent
   it). Also emits `new_order_received` to the farmer. Checkout previously
   had no backend endpoint to call at all.
6. **Fixed the real-time price-update bug**: `product_updated` now emits
   `{ ...updated, productId: updated.id }`. Previously it emitted the raw
   Prisma row (field `id`), while every frontend consumer checked
   `updated.productId` — always `undefined`, so live price/stock pushes
   silently never applied on the product page or in the marketplace grid.

## Backend (`backend/src/utils/logger.ts`)

Replaced the `pino`-based logger with a small dependency-free console
wrapper. `pino` was imported but never added to `package.json`/installed,
so `npm run build` (`tsc`) failed outright. This file is also currently
unused elsewhere in the app; if you want structured logging, install `pino`
properly and revert this, or start using this logger in `app.ts`.

## Backend (`backend/tsconfig.json`, `package.json`, `jest.config.js`)

- Excluded `src/__tests__/**/*` from the production `tsc` build, since it
  needs `supertest`/`jest` types that weren't installed and don't belong in
  a production build anyway.
- Added `jest`, `ts-jest`, `supertest`, `@types/jest`, `@types/supertest` to
  `devDependencies` and a `test` script, plus a minimal `jest.config.js`, so
  `src/__tests__/integration.test.ts` can actually be run once you
  `npm install`.

## Backend (`backend/.env`) — new file

Created the missing `backend/.env`. There was only a `.env` at the repo
root, which `dotenv.config()` never reads when the backend runs from
`backend/` (its actual working directory) — so `JWT_SECRET` and `CLIENT_URL`
were silently falling back to insecure defaults. Values mirror the root
`.env`/`.env.example`.

## Backend (`backend/src/socket/index.ts`)

Added a `leave_enquiry_room` handler to match the existing
`join_enquiry_room` one (the product room pair already had both). Harmless
before, but needed now that chat pages properly join/leave enquiry rooms.

## Frontend (`frontend/src/components/ui/Navbar.tsx`)

- Fixed `import Link from 'next/navigation'` → `import Link from 'next/link'`.
  The old import had no default export to speak of; `Link` was never
  actually used, which is why nothing errored — but it also meant every nav
  link was a plain `<a>` causing full page reloads instead of Next.js
  client-side navigation.
- Converted internal nav links (brand, Marketplace, Near Me, Farmer Hub,
  Admin Console, Sign In, Register) to use `<Link>`.

## Frontend (`frontend/src/components/maps/FarmerMap.tsx`)

- **Fixed a stored-XSS vector**: farm/product names (farmer-controlled,
  user-generated text) were interpolated directly into a Leaflet popup's
  HTML string. Added an `escapeHtml()` helper and applied it to every
  interpolated field.
- **Fixed duplicate-marker accumulation**: markers are now tracked in a ref
  and removed before each re-render adds new ones. Previously, every update
  to the `farmers` prop stacked a fresh set of markers on top of the old
  ones instead of replacing them.

## Frontend (`frontend/src/app/chat/[id]/page.tsx`)

- Replaced the hardcoded fake enquiry ("Negotiation for Organic Tomatoes")
  and commented-out history fetch with a real call to
  `GET /enquiries/:id/messages`.
- The socket connection now actually joins (`join_enquiry_room`) and leaves
  (`leave_enquiry_room`) the enquiry's room — previously it opened a socket
  but never joined any room, so it could never have received a broadcast
  even once the backend supported sending one.

## Frontend (`frontend/src/app/consumer/enquiries/[id]/page.tsx`)

- Replaced the dead placeholder fetch (`fetchApi('/products')`, result
  discarded) with a real call to `GET /enquiries/:id/messages`.
- Removed the hardcoded fake "Ramesh Kumar" message that displayed
  regardless of the actual conversation; replaced with a proper empty state.

---

## Backend (`backend/src/app.ts`, `backend/src/socket/index.ts`, `backend/.env`) — CORS fix

`CLIENT_URL` was a single hardcoded origin (`http://localhost:3001`), used both
for Express's `cors()` middleware and Socket.IO's CORS config. But `next dev`
defaults to **port 3000** with no config — so a plain `npm run dev` in
`frontend/` was silently CORS-blocked by the backend. This is exactly the bug
that produced "Failed to fetch" in the browser while `curl`/PowerShell's
`Invoke-WebRequest` worked fine (CORS is enforced by the browser, not the
server's response).

Fixed by making `CLIENT_URL` accept a comma-separated list, defaulting to
`http://localhost:3000,http://localhost:3001`, and passing the full list to
both `cors({ origin: [...] })` and Socket.IO's `cors.origin`. `backend/.env`
now sets `CLIENT_URL=http://localhost:3000,http://localhost:3001` so both the
default and the project's originally-documented port work out of the box.



These were flagged in the original review but **not** fixed here, either
because they're larger scope decisions or genuinely need your input:

- **`/buy` page is still 100% mock data** (`AgriMapExplorer.tsx`'s four
  hardcoded "sample nodes") and its cart badge is still a hardcoded
  `Cart (0)`. Wiring this to real products/farmers is a bigger change I'd
  want to confirm the intended design for before touching.
- **Register page and Admin dashboard are still stubs.** Building these out
  is a real feature-build task, not a bug fix.
- **Checkout still only uses `cart[0].farmerId`** for the whole order — a
  multi-farmer cart will still misattribute items. Proper fix likely means
  either restricting the cart to one farmer at a time, or splitting checkout
  into one order per farmer.
- **Farmer dashboard stats** (`totalEnquiries`, `profileViews`,
  `totalFavorites`, `recentEnquiries`) are still not returned by
  `GET /api/dashboard/farmer` — the frontend will keep showing zeros/empty
  until that endpoint is extended to actually compute and include them.
- **`docker-compose.yml` (Postgres) vs. `schema.prisma` (SQLite)** mismatch
  is unresolved — pick one and remove the other's leftover config.

## Environment note (not a code bug, but blocked full runtime testing here)

The `node_modules` and generated Prisma client that came in the zip were
built on **Windows** (confirmed via an error message that leaked the
original dev machine's path). In this Linux sandbox:
- `bcrypt`'s native binding had an "invalid ELF header" — I rebuilt it from
  source here to verify the logic, but the copy in this zip won't work
  as-is on a fresh machine either.
- The Prisma Query Engine only ships `query_engine-windows.dll.node` — no
  Linux/Mac binary is present, and generating one requires a network call
  Anthropic's sandbox couldn't make.

**Recommendation:** delete `frontend/node_modules` and `backend/node_modules`
before committing/sharing this project, and don't commit `node_modules` at
all going forward (add it to `.gitignore` if it isn't already). Whoever runs
this should do a plain `npm install` in `frontend/` and `backend/`, then
`npx prisma generate` in `backend/`, on their own machine. I removed both
`node_modules` folders from the zip I'm handing back for this reason — they
were 800MB+ of platform-specific, regenerable files.
