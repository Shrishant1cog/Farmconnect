# FarmConnect — Android Parity Audit (Phase 0)

**Repository:** https://github.com/Shrishant1cog/Farmconnect
**Audited branch:** `fix/local-updates`
**Website:** Next.js 15 · React 19 · TypeScript · Tailwind CSS (`frontend/`)
**Backend:** Node.js · Express · TypeScript · Prisma · Socket.IO (`backend/`)
**Target client:** Flutter / Dart / Material 3 (`mobile/`)

This document is the complete discovery performed before any Android code was written.
It is the single source of truth for feature parity between the website and the Android app.

---

## 1. Website Feature Inventory

### 1.1 Public / marketing

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/` | `frontend/src/app/page.tsx` | Landing page: hero, trust badges ("Verified Direct Pricing", "Instant Real-Time Sync", "Hyper-Local Distance Engine"), regional farm showcases, farmer/buyer CTAs | Static marketing copy + hardcoded showcase cards | Functional (marketing only) |
| `/mandi-rates` | `frontend/src/app/mandi-rates/page.tsx` | APMC market rate browser (state / district / commodity, modal/min/max price) | `GET /api/apmc/rates` | Functional |

### 1.2 Authentication

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/login` | `frontend/src/app/(auth)/login/page.tsx` | Two tabs: **PASSWORD** and **OTP**. Password login via email/phone. OTP login via Firebase phone auth. Honors `?redirect=` query. | `POST /api/auth/login`, `POST /api/auth/login-phone`, `POST /api/auth/firebase-phone` | Functional |
| `/register` | `frontend/src/app/(auth)/register/page.tsx` | Registration for CONSUMER / FARMER: name, phone, email, password, pincode (live pincode lookup via `api.postalpincode.in`), state/district/taluk, address, farm name, map coordinates | `POST /api/auth/register` | Functional |
| — | `frontend/src/components/auth/PhoneAuthForm.tsx` | Reusable Firebase phone OTP form | `POST /api/auth/login-phone` | Functional |

### 1.3 Consumer

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/consumer/explore` | `frontend/src/app/consumer/explore/page.tsx` | Marketplace grid: search, organic-only filter, live product cards, pull-to-refresh, empty state | `GET /api/products` | Functional |
| `/consumer/map` | `frontend/src/app/consumer/map/page.tsx` | Farmer discovery map (Leaflet) + list of nearby farms | `GET /api/users/farmers` (**endpoint missing** — backend exposes `GET /api/farmers/map`) | Partially functional |
| `/consumer/farmer/[id]` | `frontend/src/app/consumer/farmer/[id]/page.tsx` | Farmer public profile: farm details, live harvest lots, start enquiry | `GET /api/farmers/:id`, `POST /api/enquiries` | Functional |
| `/consumer/orders` | `frontend/src/app/consumer/orders/page.tsx` | Order history, status timeline, "Confirm Delivery Receipt" dialog | `GET /api/orders/my`, `PATCH /api/orders/:id/received` | Functional |
| `/consumer/enquiries` | `frontend/src/app/consumer/enquiries/page.tsx` | List of buyer negotiation threads | `GET /api/enquiries/my` | Functional |
| `/consumer/enquiries/[id]` | `frontend/src/app/consumer/enquiries/[id]/page.tsx` | Thread view + live message send, socket room join/leave | `GET /api/enquiries/:id/messages`, `POST /api/enquiries/:id/messages` | Functional |
| `/consumer/chats` | `frontend/src/app/consumer/chats/page.tsx` | Conversation list | `GET /api/enquiries/my` | Functional |
| `/consumer/layout` | `frontend/src/app/consumer/layout.tsx` | Consumer shell (navbar + layout) | — | Functional |

### 1.4 Product / checkout

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/products/[id]` | `frontend/src/app/products/[id]/page.tsx` | Product detail, organic badge, farmer identity, **"Send Direct Crop Enquiry to Farmer"** form, live price socket updates | `GET /api/products/:id`, `POST /api/enquiries` | Functional |
| `/checkout` | `frontend/src/app/checkout/page.tsx` | Cart review + delivery address + place order | `POST /api/orders` (cart state from `CartContext`) | Functional (falls back to a `ord-demo-*` id if the API call fails) |
| `/buy` | `frontend/src/app/buy/page.tsx` | "Geo-Logistics & Live Trade Hub" — logistics/profit calculator, map side chat | `POST /api/logistics/quote`, `POST /api/enquiries` (map nodes are hardcoded) | Partially functional (hardcoded map nodes, hardcoded `Cart (0)` badge) |

### 1.5 Farmer

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/farmer/dashboard` | `frontend/src/app/farmer/dashboard/page.tsx` | Farmer stats (products, available lots, enquiries, profile views, favorites), lot list, add/edit/delete lot, availability toggle | `GET /api/dashboard/farmer`, `GET /api/products/my-products`, `POST/PATCH/DELETE /api/products/:id` | Functional |
| `/farmer/products` | `frontend/src/app/farmer/products/page.tsx` | Full harvest-lot inventory management with filters, image upload, delete confirmation | `GET /api/products/my-products`, `POST /api/products`, `PUT/PATCH /api/products/:id`, `DELETE /api/products/:id` | Functional |
| `/farmer/orders` | `frontend/src/app/farmer/orders/page.tsx` | Incoming orders with status transitions (CONFIRMED → DISPATCHED) | `GET /api/orders/farmer`, `PATCH /api/orders/:id/status` | Functional |
| `/farmer/inquiries` | `frontend/src/app/farmer/inquiries/page.tsx` | Negotiation desk: inquiry list, live thread, typing indicators | `GET /api/enquiries/farmer`, `GET/POST /api/enquiries/:id/messages` | Functional |
| `/seller` | `frontend/src/app/seller/page.tsx` | Legacy farmer landing: dashboard summary + Aadhaar verification | `GET /api/dashboard/farmer`, `POST /api/farmer/verify-aadhaar` | Functional |
| `/seller/orders` | `frontend/src/app/seller/orders/page.tsx` | Legacy farmer orders screen | `GET /api/farmer/orders`, `PATCH /api/farmer/orders/:id/status` | Functional (alias endpoints) |
| `/farmer/layout` | `frontend/src/app/farmer/layout.tsx` | Farmer shell | — | Functional |

### 1.6 Chat

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/chat/[id]` | `frontend/src/app/chat/[id]/page.tsx` | Direct producer conversation with live socket messaging | `GET/POST /api/enquiries/:id/messages` | Functional |
| — | `frontend/src/components/MapSideChat.tsx` | Floating map-side chat panel | `POST /api/enquiries`, socket | Functional |

### 1.7 Admin

| Route | File | Purpose | Data source | Status |
| --- | --- | --- | --- | --- |
| `/admin/dashboard` | `frontend/src/app/admin/dashboard/page.tsx` | Three tabs: **overview** (platform metrics), **users** (list, activate/deactivate), **complaints** (list + resolve) | `GET /api/admin/metrics`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/toggle-status`, `GET /api/admin/complaints`, `PATCH /api/admin/complaints/:id/resolve` | Functional |

### 1.8 Shared frontend infrastructure

| File | Responsibility |
| --- | --- |
| `frontend/src/lib/api.ts` | Central `fetchApi()` wrapper — base URL from `NEXT_PUBLIC_API_URL`, JWT from `localStorage`, JSON parsing, structured error message extraction |
| `frontend/src/hooks/useAuth.ts` | Session hydration/persistence (`localStorage` + cookies), multi-tab sync, login/logout, role normalization |
| `frontend/src/hooks/useSocket.ts` | Socket.IO client lifecycle, room join/leave, event subscription |
| `frontend/src/context/CartContext.tsx` | Cart state, logistics quote via `POST /api/logistics/quote`, total computation |
| `frontend/src/context/LoadingContext.tsx` | Global loading overlay |
| `frontend/src/context/ModalContext.tsx` | Global modal orchestration |
| `frontend/src/middleware.ts` | Route protection by role |
| `frontend/src/lib/firebase.ts` | Firebase web config (mock key fallback for dev) |
| `frontend/src/components/ui/Navbar.tsx` | Top navigation: Home, Marketplace, Mandi Rates, Farm Map; role-aware actions |
| `frontend/src/components/cards/ProductCard.tsx` | Marketplace product tile |
| `frontend/src/components/farmer/AddCropModal.tsx`, `EditCropModal.tsx` | Product create/edit forms (image upload via `POST /api/upload`) |
| `frontend/src/components/ui/CropImageUpload.tsx`, `SafeCropImage.tsx` | Image picker/upload and guarded rendering |
| `frontend/src/components/maps/FarmerMap.tsx`, `LocationPickerModal.tsx` | Leaflet map + coordinate picker |
| `frontend/src/components/LogisticsProfitDrawer.tsx` | Logistics cost + profit calculation and enquiry launch |

---

## 2. Existing API Inventory (backend)

Base path `/api`. All protected routes require `Authorization: Bearer <JWT>`
(the middleware also accepts `x-auth-token` and `token` / `fc_token` / `farmconnect_token` cookies).

### 2.1 Auth — `backend/src/modules/auth/auth.routes.ts`

| Method | Path | Auth | Body / Query | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | public | `name, phone, email?, password, role, pincode?, state?, district?, taluk?, addressLine?, latitude?, longitude?, showOnMap?, farmName?` | `201 { success, token, user, data:{token,user} }` |
| POST | `/auth/login` | public | `identifier? / email? / phone?, password` | `200 { success, token, user, data:{token,user} }` |
| POST | `/auth/login-phone` | public | `phone, role` | `200 { success, message, token, user, data }` |
| POST | `/auth/phone-login` | public | alias of `/login-phone` | same |
| POST | `/auth/firebase-phone` | public | `idToken, role?, name?, district?, state?` | `200 { success, token, user, data }` |
| POST | `/auth/verify-aadhaar` | any | `aadhaarNumber` (12 digits) | `200 { success, message }` (also reachable at `/farmer/verify-aadhaar`) |
| GET | `/auth/me` | any | — | `200 { success, user, data:{user} }` |

### 2.2 Products — `backend/src/modules/products/products.routes.ts`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/products` | public | Query: `search`, `category`, `district`; returns `{ success, data[], products[] }` where each item carries `farmerPriceNotice: "Farmer Listed Price"` |
| GET | `/products/:id` | public | Product detail, increments `viewCount` |
| GET | `/products/my-products` | any | Farmer inventory (alias `/products/farmer`) |
| POST | `/products` | FARMER/ADMIN | Creates listing; auto-creates `FarmerProfile` if missing; falls back to the `vegetables` category; writes `PriceHistory` on later price changes |
| PUT/PATCH | `/products/:id` | FARMER/ADMIN | Validates numerics, records `PriceHistory` when the price changes |
| DELETE | `/products/:id` | FARMER/ADMIN | Deletes listing |

### 2.3 Orders — `backend/src/modules/orders/orders.routes.ts`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/orders` | CONSUMER/FARMER | Body `{ deliveryAddress, items:[{productId,quantity,unitPrice?}], farmerId?, transportCost?, containerCost?, totalAmount? }`; atomic stock deduction; emits `new_order_received` |
| GET | `/orders/my` | CONSUMER/FARMER | Consumer order history (alias `/farmer/orders` is the farmer list) |
| GET | `/orders/farmer` | FARMER | Incoming orders (alias `/farmer/orders`) |
| PATCH | `/orders/:id/status` | FARMER | `{ status }` — accepts `CONFIRMED`, `DISPATCHED` (and legacy `PACKED`/`IN_TRANSIT`); emits `order_status_updated` |
| PATCH | `/orders/:id/received` | CONSUMER/ADMIN | Confirms delivery → `DELIVERED`; emits `order_delivered` |
| GET | `/orders/:id` | — | **Controller exists but is not routed** — added during Phase 1 |

### 2.4 Enquiries — `backend/src/modules/enquiries/enquiries.routes.ts`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/enquiries` | CONSUMER/FARMER | `{ productId, subject, message }`; creates thread + first message; emits `new_notification` |
| GET | `/enquiries/my` | CONSUMER/FARMER | Buyer threads (alias `/consumer/enquiries`) |
| GET | `/enquiries/farmer` | FARMER/ADMIN | Farmer threads (alias `/farmer/enquiries`) |
| GET | `/enquiries/:id/messages` | participant | Thread + messages |
| POST | `/enquiries/:id/messages` | participant | `{ content }`; emits `new_chat_message` to `enquiry_<id>` |

### 2.5 Users — `backend/src/modules/users/users.routes.ts`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/users/me` | any | Current profile with role-specific profile |
| PATCH/PUT | `/users/me` | any | Updates profile / delivery address / farm details |
| GET | `/users/farmers` | — | **Missing** — website map calls it; added during Phase 1 |

### 2.6 Admin — `backend/src/modules/admin/admin.routes.ts`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/admin/metrics` | ADMIN | Platform metrics |
| GET | `/admin/users` | ADMIN | User directory |
| PATCH | `/admin/users/:id/toggle-status` | ADMIN | Activate/deactivate |
| GET | `/admin/complaints` | ADMIN | Complaint queue |
| PATCH | `/admin/complaints/:id/resolve` | ADMIN | Resolve complaint |

### 2.7 Miscellaneous (defined in `backend/src/app.ts`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | Service health (extended with DB probe in Phase 1) |
| GET | `/` | public | Service banner |
| POST | `/upload` | any | Multer single-image upload → `{ success, imageUrl }` (local disk — made pluggable in Phase 1) |
| GET | `/farmers/map` | public | Verified farmers with distance, `lat`, `lon`, `maxDistanceKm` |
| GET | `/farmers/:id` | public | Farmer profile + available products; increments `profileViews` |
| POST | `/logistics/quote` | public | Logistics + profit computation |
| GET | `/apmc/rates` | public | APMC rates (latest 50) |
| GET | `/dashboard/farmer` | FARMER | Farmer dashboard stats + recent enquiries + products |

### 2.8 Endpoints added in Phase 1 (missing website/backend support)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/favorites` | Favourited products + farmers of the signed-in consumer |
| POST/DELETE | `/favorites/products/:productId` | Toggle product favourite |
| POST/DELETE | `/favorites/farmers/:farmerId` | Toggle farmer favourite |
| GET | `/notifications` | Notification inbox for the signed-in user |
| PATCH | `/notifications/:id/read` | Mark one notification read |
| PATCH | `/notifications/read-all` | Mark all notifications read |
| POST | `/complaints` | Raise a complaint (consumer or farmer) |
| GET | `/complaints/mine` | Complaints raised by the signed-in user |
| GET | `/users/farmers` | Public farmer directory used by the consumer map |
| GET | `/orders/:id` | Single order detail (consumer / farmer / admin) |

---

## 3. Database Model Inventory (Prisma)

Source: `backend/prisma/schema.prisma`. Provider migrated from **SQLite → PostgreSQL** in Phase 1.
No model was deleted or renamed.

| Model | Key fields | Relations |
| --- | --- | --- |
| `User` | `id uuid`, `email @unique`, `passwordHash`, `name`, `phone`, `firebaseUid? @unique`, `role Role`, `isActive`, timestamps | 1–1 `FarmerProfile`, 1–1 `ConsumerProfile`; 1–N `Order` (consumer), `Enquiry` (consumer), `Message`, `ChatMessage` (sent/received), `Notification`, `Complaint` |
| `FarmerProfile` | `userId @unique`, `farmName`, `bio?`, `district`, `state`, `addressLine?`, `latitude`, `longitude`, `isAadhaarVerified`, `aadhaarMasked?`, `isVerified`, `profileViews` | 1–N `Product`, `Order`, `Enquiry`, `FavouriteFarmer` |
| `ConsumerProfile` | `userId @unique`, `deliveryAddress?`, `district?`, `latitude?`, `longitude?` | 1–N `FavouriteProduct`, `FavouriteFarmer` |
| `Category` | `name @unique`, `slug @unique`, `description?` | 1–N `Product` |
| `Product` | `farmerId`, `categoryId`, `title`, `description`, `farmerPrice Float`, `priceUnit`, `quantityAvailable Float`, `quantityUnit`, `minOrderKg`, `grade`, `location`, `isAvailable`, `isOrganic`, `harvestDate?`, `containerType`, `containerCostPerKg`, `imageUrl?`, `viewCount` | N–1 `FarmerProfile`, `Category`; 1–N `OrderItem`, `Enquiry`, `FavouriteProduct`, `PriceHistory`, `ChatMessage` |
| `PriceHistory` | `productId`, `oldPrice`, `newPrice`, `changedAt` | N–1 `Product` |
| `Enquiry` | `productId`, `consumerId`, `farmerId`, `subject`, `status EnquiryStatus` | 1–N `Message` |
| `Message` | `enquiryId`, `senderId`, `content`, `isRead`, `createdAt` | N–1 `Enquiry`, `User` |
| `ChatMessage` | `senderId`, `receiverId`, `cropId?`, `message` | N–1 `User` (sent/received), `Product` |
| `Order` | `consumerId`, `farmerId`, `status OrderStatus`, `totalItemsCost`, `transportCost`, `containerCost`, `grandTotal`, `deliveryAddress` | 1–N `OrderItem`; N–1 `User`, `FarmerProfile` |
| `OrderItem` | `orderId`, `productId`, `quantity Float`, `unitPrice Float` | N–1 `Order`, `Product` |
| `ApmcMarketRate` | `state`, `district`, `marketCenter`, `commodity`, `modalPrice`, `minPrice`, `maxPrice`, `updatedAt` | — |
| `FavouriteProduct` | `consumerId`, `productId`, `@@unique([consumerId, productId])` | N–1 `ConsumerProfile`, `Product` |
| `FavouriteFarmer` | `consumerId`, `farmerId`, `@@unique([consumerId, farmerId])` | N–1 `ConsumerProfile`, `FarmerProfile` |
| `Complaint` | `reporterId`, `entityType`, `entityId`, `reason`, `details`, `status ComplaintStatus`, `adminNotes?` | N–1 `User` |
| `Notification` | `userId`, `title`, `message`, `type`, `link?`, `isRead` | N–1 `User` |

Enums: `Role` (FARMER, CONSUMER, ADMIN), `ContainerType`, `OrderStatus`
(PENDING, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED), `EnquiryStatus`
(OPEN, NEGOTIATING, ACCEPTED, CLOSED), `ComplaintStatus`
(PENDING, INVESTIGATING, RESOLVED, DISMISSED).

---

## 4. Frontend → Backend Mapping

| Website capability | Frontend location | Backend endpoint | Android target |
| --- | --- | --- | --- |
| Register | `(auth)/register/page.tsx` | `POST /api/auth/register` | `mobile/lib/features/auth/register_page.dart` |
| Login (password) | `(auth)/login/page.tsx` | `POST /api/auth/login` | `mobile/lib/features/auth/login_page.dart` |
| Login (OTP / phone) | `(auth)/login/page.tsx`, `PhoneAuthForm.tsx` | `POST /api/auth/login-phone`, `POST /api/auth/firebase-phone` | `mobile/lib/features/auth/login_page.dart` |
| Session persistence | `hooks/useAuth.ts` | `GET /api/auth/me` | `mobile/lib/core/storage/token_storage.dart` + `auth_controller.dart` |
| Logout | `hooks/useAuth.ts` | — (local) | `auth_controller.dart` |
| Browse products | `consumer/explore/page.tsx` | `GET /api/products` | `mobile/lib/features/consumer/explore_page.dart` |
| Search / filter | `consumer/explore/page.tsx` | `GET /api/products?search=&category=&district=` | same |
| Product detail | `products/[id]/page.tsx` | `GET /api/products/:id` | `mobile/lib/features/consumer/product_detail_page.dart` |
| Farmer map | `consumer/map/page.tsx` | `GET /api/users/farmers` (added), `GET /api/farmers/map` | `mobile/lib/features/map/farmer_map_page.dart` |
| Farmer profile | `consumer/farmer/[id]/page.tsx` | `GET /api/farmers/:id` | `mobile/lib/features/consumer/farmer_detail_page.dart` |
| Favourites | *(no website UI)* | `GET/POST/DELETE /api/favorites/*` (added) | `mobile/lib/features/favorites/favorites_page.dart` |
| Cart + checkout | `checkout/page.tsx`, `context/CartContext.tsx` | `POST /api/orders` | `mobile/lib/features/consumer/cart_page.dart`, `checkout_page.dart` |
| Order history | `consumer/orders/page.tsx` | `GET /api/orders/my` | `mobile/lib/features/consumer/orders_page.dart` |
| Order tracking | `consumer/orders/page.tsx` | `GET /api/orders/:id` (added) | `mobile/lib/features/consumer/order_detail_page.dart` |
| Confirm delivery | `consumer/orders/page.tsx` | `PATCH /api/orders/:id/received` | `order_detail_page.dart` |
| Enquiries | `products/[id]`, `consumer/enquiries/*` | `POST /api/enquiries`, `GET /api/enquiries/my` | `mobile/lib/features/chat/enquiries_page.dart` |
| Messaging | `chat/[id]`, `consumer/enquiries/[id]`, `farmer/inquiries` | `GET/POST /api/enquiries/:id/messages` | `mobile/lib/features/chat/chat_page.dart` |
| Farmer dashboard | `farmer/dashboard/page.tsx` | `GET /api/dashboard/farmer` | `mobile/lib/features/farmer/dashboard_page.dart` |
| Product CRUD | `farmer/products/page.tsx`, `AddCropModal`, `EditCropModal` | `POST/PUT/PATCH/DELETE /api/products` | `mobile/lib/features/farmer/products_page.dart`, `product_form_page.dart` |
| Product images | `components/ui/CropImageUpload.tsx` | `POST /api/upload` | `mobile/lib/features/farmer/product_form_page.dart` (multipart) |
| Incoming orders | `farmer/orders/page.tsx` | `GET /api/orders/farmer` | `mobile/lib/features/farmer/orders_page.dart` |
| Order status update | `farmer/orders/page.tsx` | `PATCH /api/orders/:id/status` | `mobile/lib/features/farmer/order_detail_page.dart` |
| Buyer enquiries | `farmer/inquiries/page.tsx` | `GET /api/enquiries/farmer` | `mobile/lib/features/farmer/enquiries_page.dart` |
| APMC rates | `mandi-rates/page.tsx` | `GET /api/apmc/rates` | `mobile/lib/features/market_rates/market_rates_page.dart` |
| Logistics + profit | `buy/page.tsx`, `LogisticsProfitDrawer.tsx` | `POST /api/logistics/quote` | `mobile/lib/features/logistics/logistics_page.dart` |
| Complaints | *(no website UI)* | `POST /api/complaints` (added), `GET /api/complaints/mine` (added) | `mobile/lib/features/profile/complaints_page.dart` |
| Notifications | *(no website UI)* | `GET /api/notifications` (added) | `mobile/lib/features/notifications/notifications_page.dart` |
| Admin dashboard | `admin/dashboard/page.tsx` | `GET /api/admin/metrics`, `/users`, `/complaints`, PATCH variants | `mobile/lib/features/admin/admin_dashboard_page.dart` |
| Profile | `hooks/useAuth.ts`, `users/me` | `GET /api/users/me`, `PATCH /api/users/me` | `mobile/lib/features/profile/profile_page.dart` |
| Aadhaar verification | `seller/page.tsx` | `POST /api/farmer/verify-aadhaar` | `mobile/lib/features/profile/profile_page.dart` |

---

## 5. Authentication & Real-Time Implementation

### 5.1 Authentication (existing)

- JWT signed with `JWT_SECRET`, payload `{ id, role, phone, email }`, expiry `7d`.
- Transport: `Authorization: Bearer <token>` (also `x-auth-token` and cookies).
- Role guards via `requireRole('FARMER' | 'CONSUMER' | 'ADMIN')`.
- Passwords hashed with bcrypt (fallback to `bcryptjs`), 10 rounds.
- Phone sign-in has two paths: a direct `login-phone` endpoint and Firebase ID-token exchange
  (`firebase-phone`) using Firebase Admin (`firebaseAdmin.auth().verifyIdToken`).
- The Android app must use the **same** endpoints and store the **same** JWT so the website and the
  app are interchangeable clients of one account.

### 5.2 Socket.IO (existing)

- Server: `backend/src/socket/index.ts` + `handlers.ts`, transports `websocket` + `polling`,
  CORS from `CLIENT_URL` list.
- Handshake auth: `auth.token`, `Authorization` header or `?token=`; guest connections are allowed
  (public price feeds).
- Rooms: `user_<userId>` (private), `product_<productId>`, `order_<orderId>`, `enquiry_<enquiryId>`.
- Client events: `join_product`, `join_product_room`, `leave_product`, `leave_product_room`,
  `join_order`, `join_order_room`, `leave_order`, `leave_order_room`, `join_enquiry`,
  `join_enquiry_room`, `leave_enquiry`, `leave_enquiry_room`, `typing_start`, `typing_stop`.
- Server events: `new_order_received`, `order_status_updated`, `order_delivered`,
  `new_chat_message`, `new_notification`, `product_updated`, `user_typing`, `user_stopped_typing`,
  `order_room_joined`, `enquiry_room_joined`, `socket_error`.

---

## 6. Missing or Incomplete Functionality (found during discovery)

| # | Item | Evidence | Resolution |
| --- | --- | --- | --- |
| 1 | Prisma datasource is SQLite (`file:./dev.db`) while `docker-compose.yml` and `env.ts` assume PostgreSQL | `backend/prisma/schema.prisma`, `backend/src/config/env.ts` | Phase 1 — switch provider to `postgresql`, add migration, keep SQLite working through `DATABASE_URL` for local dev |
| 2 | Uploads are written to the local disk (`backend/uploads`) — ephemeral on Render | `backend/src/app.ts` | Phase 1 — pluggable storage service (local disk + S3-compatible object storage) |
| 3 | No favourites API although the schema has `FavouriteProduct` / `FavouriteFarmer` | schema vs. routes | Phase 1 — `/api/favorites/*` endpoints; Phase 3 — Android favourites screen |
| 4 | No notifications API although `Notification` model exists | schema vs. routes | Phase 1 — `/api/notifications` endpoints |
| 5 | No complaint creation API (only admin listing/resolution) | `admin.routes.ts` | Phase 1 — `POST /api/complaints`, `GET /api/complaints/mine` |
| 6 | `getOrderById` controller is never routed | `orders.controller.ts` | Phase 1 — `GET /api/orders/:id` |
| 7 | Website map calls `GET /api/users/farmers`, which does not exist | `consumer/map/page.tsx` | Phase 1 — implement the endpoint (website keeps working, Android uses the same) |
| 8 | Product search uses case-sensitive `contains` (SQLite limitation) | `products.controller.ts` | Phase 1 — restore `mode: 'insensitive'` (PostgreSQL-supported) |
| 9 | `/buy` page uses hardcoded map nodes and a hardcoded `Cart (0)` badge | `buy/page.tsx` | Phase 2 — Android logistics screen uses the real quote API and real cart |
| 10 | Checkout falls back to a fake `ord-demo-*` order id when the API call fails | `checkout/page.tsx` | Android shows the real API error instead |
| 11 | Admin dashboard, register and complaints have no Android equivalent | website-only | Phase 3 — Android admin + complaint screens |
| 12 | CI checks out `verify/final` instead of the PR branch and uses a SQLite `DATABASE_URL` | `.github/workflows/verify.yml` | Phase 1 — check out the PR branch, run a PostgreSQL service container |
| 13 | Firebase client key has a mock fallback in `frontend/src/lib/firebase.ts` | frontend | Documented; production requires real Firebase config (never committed) |

---

## 7. Android Implementation Plan

### 7.1 Architecture

```
mobile/lib/
  main.dart                 app bootstrap, Riverpod providers, theme
  core/
    config/app_config.dart  API_BASE_URL / SOCKET_URL resolution (dart-define)
    constants/              endpoint paths, roles, order statuses
    network/                Dio client, interceptors, ApiException, SocketService
    storage/                secure token storage + shared preferences
    theme/                  Material 3 theme built from the website palette
    utils/                  formatters, validators
  data/
    models/                 immutable Dart models mirroring the API payloads
    repositories/           one repository per domain, Dio-backed
  features/
    auth/ farmer/ consumer/ products/ orders/ enquiries/ chat/
    favorites/ notifications/ market_rates/ farmer_map/ profile/
    dashboard/ logistics/ admin/
  shared/widgets/           reusable cards, empty/error/loading states
  routing/app_router.dart   GoRouter with role-aware redirects
```

**Why this shape:** the brief's structure is followed, with two deliberate refinements:

1. **Repositories are split by domain** (`data/repositories`) rather than living inside feature
   folders, so the website-parity layer is reusable from every feature and can be unit-tested
   without widget bindings.
2. **State management is Riverpod 2 (Notifier/AsyncNotifier)** instead of legacy `StateProvider`,
   because the app has cross-feature state (session, cart, live socket) that benefits from
   explicit dependency injection and test overrides.

### 7.2 Packages

| Package | Purpose |
| --- | --- |
| `dio` | REST client with interceptors (auth header, error mapping, timeouts) |
| `socket_io_client` | Real-time parity with the website (`socket_io_client`) |
| `flutter_riverpod` | State management |
| `go_router` | Declarative, role-aware routing |
| `flutter_secure_storage` | JWT storage (encrypted) |
| `shared_preferences` | Non-sensitive preferences (last used API base, theme, cart draft) |
| `cached_network_image` | Product image caching |
| `flutter_map` + `latlong2` | OpenStreetMap-based farmer map (no Google Maps key required) |
| `geolocator` | Device location for distance sorting / farm coordinates |
| `image_picker` | Product image capture/selection |
| `intl` | Currency / date formatting |
| `google_fonts` | Consistent typography (falls back to system fonts offline) |

### 7.3 Shared-data guarantees

- One API base URL for both clients (`API_BASE_URL` for Flutter, `NEXT_PUBLIC_API_URL` for the website).
- The same JWT is accepted by both clients; the same `User.id`, `Product.id`, `Order.id` and
  `Enquiry.id` are used in both.
- Socket.IO rooms and event names are identical, so a farmer on Android receives
  `new_order_received` raised by a website consumer, and vice versa.
- No Flutter-side business rules for pricing, stock, order totals or status transitions —
  every number comes from the API.

---

## 8. Technical Dependencies

| Area | Dependency |
| --- | --- |
| Android toolchain | Flutter 3.47.2, Dart 3.13.2, Android SDK 36, JDK 21 |
| Backend runtime | Node.js 22+, npm 10+, Express 4, Prisma 6.19.3, Socket.IO 4.7.5 |
| Database | PostgreSQL 15+ (Prisma provider `postgresql`), migrations via `prisma migrate deploy` |
| Web | Next.js 15, React 19, Tailwind 3.4 |
| Real-time | Socket.IO 4 (server) ↔ `socket_io_client` (mobile) |
| Auth | JWT (7d), bcrypt, Firebase Admin (optional phone OTP path) |
| Object storage (optional) | S3-compatible bucket via `STORAGE_*` env vars |
| Deployment | Render web service + managed PostgreSQL (owner-managed, not performed by the agent) |
