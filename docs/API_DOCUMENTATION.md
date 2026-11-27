# FarmConnect — API Documentation

**Base URL (production):** `https://<your-api-host>/api`
**Local development:** `http://localhost:5000/api`
**Socket.IO origin:** `https://<your-api-host>` (no `/api` suffix)
**Branch:** `fix/local-updates`

This is the **single shared API** used by the Next.js website (`NEXT_PUBLIC_API_URL`)
and by the Flutter Android app (`API_BASE_URL`). Both clients therefore share
users, products, orders, enquiries, conversations and notifications.

---

## 1. Conventions

### 1.1 Authentication

Protected endpoints require a JWT:

```http
Authorization: Bearer <jwt>
```

The middleware also accepts `x-auth-token: <jwt>` and the cookies
`token`, `fc_token`, `farmconnect_token` (used by the website).

* Token payload: `{ id, role, phone, email }`
* Expiry: `7d` (`JWT_EXPIRES_IN`)
* Roles: `FARMER`, `CONSUMER`, `ADMIN`

### 1.2 Response envelopes

Most endpoints return a wrapper:

```json
{ "success": true, "data": { }, "message": "..." }
```

List endpoints additionally expose a named alias so either shape can be consumed:

```json
{ "success": true, "data": [ ], "products": [ ] }
```

The Flutter client (`ApiClient.extractList`) understands every shape used here:
a bare array, a flat envelope (`data`, `products`, `orders`, `enquiries`) and a
nested envelope (`data: { orders: [...] }`).

### 1.3 Errors

| Status | Meaning |
| --- | --- |
| `400` | Validation error (Zod) — `message` contains the failing field |
| `401` | Missing, malformed or expired token |
| `403` | Authenticated but the role is not allowed |
| `404` | Entity not found |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

### 1.4 Rate limits

A global limiter is applied to `/api` and a stricter limiter to `POST /api/orders`.

---

## 2. Health and service

### `GET /api/health`

Public. Probes the database with `SELECT 1`.

**200**

```json
{
  "status": "UP",
  "service": "FarmConnect Engine",
  "database": "UP",
  "uptime": 128,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

**503** — same body with `"status": "DEGRADED"` and `"database": "DOWN"`.
Use this path as the Render health check.

### `GET /`

Public service banner.

---

## 3. Authentication — `/api/auth`

### `POST /api/auth/register`

Public. Creates a consumer or farmer account and its role profile.

**Body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | ✅ | |
| `phone` | string | ✅ | digits only, last 10 kept |
| `password` | string | ✅ | bcrypt hash, 10 rounds |
| `email` | string | – | generated from the phone when omitted |
| `role` | `CONSUMER` \| `FARMER` | – | defaults to `CONSUMER` |
| `pincode`, `state`, `district`, `taluk`, `addressLine` | string | – | regional fields |
| `latitude`, `longitude` | number | – | used for the farmer map |
| `showOnMap` | boolean | – | farmer visibility on the map |
| `farmName` | string | – | farmer only |

**201**

```json
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "…", "name": "…", "role": "FARMER", "farmerProfile": { } },
  "data": { "token": "<jwt>", "user": { } }
}
```

### `POST /api/auth/login`

Public. Accepts `identifier`, `email` **or** `phone` together with `password`.
Returns the same envelope as `register`.

> The backend also keeps the demo accounts created by `npm run db:seed`
> (`admin@farmconnect.org`, `ramesh.mandya@farmconnect.org`,
> `suresh.mysuru@farmconnect.org`, `priya.bengaluru@gmail.com`) with the
> password `Password@123` for quick manual testing.

### `POST /api/auth/login-phone` · `POST /api/auth/phone-login`

Public. Phone sign-in without a password.

**Body:** `{ "phone": "9448123456", "role": "CONSUMER" }`

### `POST /api/auth/firebase-phone`

Public. Exchanges a Firebase ID token for a FarmConnect JWT.

**Body:** `{ "idToken": "<firebase id token>", "role": "CONSUMER", "name": "…", "district": "…", "state": "…" }`

Requires `FIREBASE_PROJECT_ID` and the service account to be configured on the
backend.

### `POST /api/auth/verify-aadhaar` · `POST /api/farmer/verify-aadhaar`

Authenticated. Farmer identity verification.

**Body:** `{ "aadhaarNumber": "123456789012" }` (exactly 12 digits)

**200:** `{ "success": true, "message": "…" }`

### `GET /api/auth/me`

Authenticated. Returns the current profile with the role-specific profile.

---

## 4. Products — `/api/products`

### `GET /api/products`

Public. The marketplace feed.

**Query**

| Parameter | Type | Notes |
| --- | --- | --- |
| `search` | string | case-insensitive match on title, description and location |
| `category` | string | category slug |
| `district` | string | case-insensitive match on `location` |

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "…",
      "title": "Vine-Ripened Native Tomatoes (Nati Tomato)",
      "description": "…",
      "farmerPrice": 28,
      "priceUnit": "PER_KG",
      "quantityAvailable": 250,
      "quantityUnit": "KG",
      "minOrderKg": 10,
      "grade": "Grade-A Export",
      "location": "Karnataka",
      "isAvailable": true,
      "isOrganic": true,
      "harvestDate": "2026-01-01T00:00:00.000Z",
      "containerType": "STANDARD_CRATE",
      "containerCostPerKg": 4,
      "imageUrl": "https://…",
      "viewCount": 12,
      "farmerId": "…",
      "farmerPriceNotice": "Farmer Listed Price",
      "farmer": { "id": "…", "farmName": "…", "user": { "id": "…", "name": "…" } },
      "category": { "id": "…", "name": "Vegetables", "slug": "vegetables" }
    }
  ],
  "products": [ ]
}
```

### `GET /api/products/:id`

Public. Product detail. Increments `viewCount`.

### `GET /api/products/my-products` · `GET /api/products/farmer`

Authenticated. The signed-in farmer's inventory.

### `POST /api/products`

Authenticated · `FARMER` or `ADMIN`. Creates a listing. The `FarmerProfile` is
created automatically when it is missing and the `vegetables` category is used as
a fallback.

**Body**

```json
{
  "title": "Vine-Ripened Native Tomatoes",
  "description": "…",
  "farmerPrice": 28,
  "priceUnit": "PER_KG",
  "quantityAvailable": 250,
  "quantityUnit": "KG",
  "minOrderKg": 10,
  "grade": "Grade-A Export",
  "location": "Karnataka",
  "isOrganic": true,
  "imageUrl": "https://…",
  "categoryId": "…"
}
```

**201** — the created product.

### `PUT /api/products/:id` · `PATCH /api/products/:id`

Authenticated · `FARMER` or `ADMIN`. Updates a listing. Every accepted field is
optional. When `farmerPrice` changes, a `PriceHistory` row is written so the
price audit trail is preserved.

### `DELETE /api/products/:id`

Authenticated · `FARMER` or `ADMIN`. Deletes a listing.

---

## 5. Orders — `/api/orders`

### `POST /api/orders`

Authenticated · `CONSUMER` or `FARMER`. Rate limited. Places an order and
deducts the stock atomically in a transaction.

**Body**

```json
{
  "deliveryAddress": "Indiranagar, Bengaluru",
  "items": [ { "productId": "…", "quantity": 100, "unitPrice": 28 } ],
  "farmerId": "…",
  "transportCost": 150,
  "containerCost": 45
}
```

`unitPrice` is optional — the backend reads the current `farmerPrice`.
All totals (`totalItemsCost`, `grandTotal`) are computed **by the backend**;
the client never recalculates them.

**201** — the created order including its `items`.

Emits `new_order_received` to the farmer's private room.

### `GET /api/orders/my`

Authenticated · `CONSUMER` or `FARMER`. The signed-in user's order history.

### `GET /api/orders/farmer` · `GET /api/farmer/orders`

Authenticated · `FARMER`. Incoming orders.

### `GET /api/orders/:id`

Authenticated · `CONSUMER`, `FARMER` or `ADMIN`. A single order with its items.
Used by the Android order-tracking screen.

### `PATCH /api/orders/:id/status`

Authenticated · `FARMER`. Updates the dispatch status.

**Body:** `{ "status": "CONFIRMED" }`

Accepted values: `PENDING`, `CONFIRMED` (`PACKED`), `DISPATCHED` (`IN_TRANSIT`),
`DELIVERED`, `CANCELLED`.

Emits `order_status_updated`.

### `PATCH /api/orders/:id/received`

Authenticated · `CONSUMER` or `FARMER`. Confirms the delivery receipt and sets
the order to `DELIVERED`.

Emits `order_delivered`.

---

## 6. Enquiries and messaging — `/api/enquiries`

### `POST /api/enquiries`

Authenticated · `CONSUMER` or `FARMER`. Opens a negotiation thread on a product
and stores the first message.

**Body:** `{ "productId": "…", "subject": "Bulk rate request", "message": "…" }`

**201** — the created enquiry. Emits `new_notification` to the farmer.

### `GET /api/enquiries/my` · `GET /api/consumer/enquiries`

Authenticated · `CONSUMER` or `FARMER`. The buyer's threads.

### `GET /api/enquiries/farmer` · `GET /api/farmer/enquiries`

Authenticated · `FARMER` or `ADMIN`. The farmer's threads.

### `GET /api/enquiries/:id/messages`

Authenticated (participant only). The thread with its full message history.

### `POST /api/enquiries/:id/messages`

Authenticated (participant only).

**Body:** `{ "content": "We can offer 18.50 per KG for 100 KG." }`

**201** — the stored message. Also broadcast to the room `enquiry_<id>` as
`new_chat_message`.

---

## 7. Users and profiles — `/api/users`

### `GET /api/users/me`

Authenticated. The current profile with `farmerProfile` / `consumerProfile`.

### `PATCH /api/users/me` · `PUT /api/users/me`

Authenticated. Updates the profile.

**Body (all optional):** `name`, `phone`, `email`, `state`, `district`, `taluk`,
`pincode`, `address`, `deliveryAddress`, `addressLine`, `farmName`,
`latitude`, `longitude`.

> The consumer address is stored in `ConsumerProfile.deliveryAddress`.

### `GET /api/users/farmers`

Public. The farmer directory used by the consumer map and farmer discovery.

**Query:** `district`, `search` (both case-insensitive).

**200**

```json
{
  "success": true,
  "data": [
    {
      "id": "…",
      "farmName": "…",
      "farmerName": "…",
      "phone": "…",
      "district": "Mandya",
      "state": "Karnataka",
      "address": "…",
      "latitude": 12.5218,
      "longitude": 76.8951,
      "isVerified": true,
      "profileViews": 42,
      "availableProducts": [ ]
    }
  ],
  "farmers": [ ]
}
```

---

## 8. Favourites — `/api/favorites`

Authenticated. Favourites are scoped to the signed-in consumer's
`ConsumerProfile` (created automatically on first use).

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/favorites` | `{ data: { products: [...], farmers: [...] }, products, farmers }` |
| `POST` | `/api/favorites/products/:id` | Adds the favourite → `{ success, isFavorite: true }` |
| `DELETE` | `/api/favorites/products/:id` | Removes the favourite |
| `POST` | `/api/favorites/farmers/:id` | Adds the favourite farmer |
| `DELETE` | `/api/favorites/farmers/:id` | Removes the favourite farmer |

`POST` and `DELETE` are both **toggle** operations and return the resulting
`isFavorite` flag.

---

## 9. Notifications — `/api/notifications`

Authenticated.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/notifications` | `{ data: [...], notifications: [...], unreadCount }` (latest 100) |
| `PATCH` | `/api/notifications/:id/read` | Marks one notification as read |
| `PATCH` | `/api/notifications/read-all` | Marks every notification as read → `{ success, updated }` |

---

## 10. Complaints — `/api/complaints`

Authenticated.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/complaints` | Raises a complaint (201) |
| `GET` | `/api/complaints/mine` | The complaints raised by the signed-in user |

**Body for `POST`**

```json
{
  "entityType": "ORDER",
  "entityId": "<order-id>",
  "reason": "Quality clarification",
  "details": "Please confirm the grading of this lot before dispatch."
}
```

`entityType` is free-form; the Android client offers `ORDER`, `PRODUCT`,
`FARMER` and `ENQUIRY`. A notification is fanned out to the active admins.

---

## 11. Admin — `/api/admin`

Authenticated · `ADMIN`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/metrics` | Platform metrics (users, products, orders, …) |
| `GET` | `/api/admin/users` | The user directory |
| `PATCH` | `/api/admin/users/:id/toggle-status` | Activates / deactivates a user |
| `GET` | `/api/admin/complaints` | The complaint queue |
| `PATCH` | `/api/admin/complaints/:id/resolve` | Resolves a complaint (optional `adminNotes`) |

---

## 12. Uploads

### `POST /api/upload`

Authenticated. `multipart/form-data` with the field name `image`
(maximum 8 MB).

**200**

```json
{ "success": true, "imageUrl": "https://cdn.example.com/uploads/1712-ab12.jpg", "provider": "s3" }
```

Storage is pluggable:

| `STORAGE_PROVIDER` | Behaviour |
| --- | --- |
| `local` (default) | Written to `UPLOAD_DIR` and served from `/uploads` by the API. Development only. |
| `s3` | Written to any S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO). **Required in production** because a Render filesystem is ephemeral. |

S3 variables: `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`,
`STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT` (optional),
`STORAGE_PUBLIC_URL` (optional), `STORAGE_FORCE_PATH_STYLE` (optional).

---

## 13. Discovery, logistics and market data

### `GET /api/farmers/map`

Public. Verified farmers with their coordinates and, when `lat` / `lon` are
supplied, the distance from the requester.

**Query:** `lat`, `lon`, `maxDistanceKm`

### `GET /api/farmers/:id`

Public. Farmer profile with the available listings. Increments `profileViews`.

### `POST /api/logistics/quote`

Public. Logistics cost and profit calculation.

**Body**

```json
{
  "cropQuantityKg": 100,
  "farmerPricePerKg": 20,
  "originLat": 12.5218,
  "originLon": 76.8951,
  "destLat": 12.9716,
  "destLon": 77.5946,
  "containerType": "STANDARD_CRATE",
  "apmcModalPricePerQuintal": 3200
}
```

**200**

```json
{
  "success": true,
  "data": {
    "distanceKm": 51.4,
    "transportCost": 640,
    "containerCost": 400,
    "totalCost": 1040,
    "apmcModalPrice": 3200,
    "apmcValue": 32000,
    "profit": 10960,
    "profitMarginPercent": 34.25,
    "estimatedDays": 2
  }
}
```

### `GET /api/apmc/rates`

Public. The latest 50 APMC mandi rates.

### `GET /api/dashboard/farmer`

Authenticated · `FARMER`. Dashboard statistics.

**200**

```json
{
  "success": true,
  "data": {
    "farmerName": "Ramesh Kumar",
    "stats": {
      "totalProducts": 4,
      "availableProducts": 3,
      "totalEnquiries": 7,
      "profileViews": 128,
      "totalFavorites": 12
    },
    "recentEnquiries": [ ],
    "products": [ ]
  }
}
```

---

## 14. Socket.IO — real-time events

Connect to the API origin (no `/api` suffix).

```js
import { io } from 'socket.io-client';

const socket = io('https://<your-api-host>', {
  auth: { token: '<jwt>' },   // optional: guests may join public price rooms
  transports: ['websocket', 'polling'],
});
```

### Client → server

| Event | Payload | Effect |
| --- | --- | --- |
| `join_product` / `join_product_room` | `{ productId }` | Joins `product_<id>` |
| `leave_product` / `leave_product_room` | `{ productId }` | Leaves `product_<id>` |
| `join_order` / `join_order_room` | `{ orderId }` | Joins `order_<id>` |
| `leave_order` / `leave_order_room` | `{ orderId }` | Leaves `order_<id>` |
| `join_enquiry` / `join_enquiry_room` | `{ enquiryId }` | Joins `enquiry_<id>` |
| `leave_enquiry` / `leave_enquiry_room` | `{ enquiryId }` | Leaves `enquiry_<id>` |
| `typing_start` | `{ enquiryId }` | Broadcasts `user_typing` |
| `typing_stop` | `{ enquiryId }` | Broadcasts `user_stopped_typing` |

### Server → client

| Event | Payload | Emitted when |
| --- | --- | --- |
| `new_order_received` | `{ orderId, … }` | A buyer places an order |
| `order_status_updated` | `{ orderId, status, … }` | The farmer changes the status |
| `order_delivered` | `{ orderId, … }` | The delivery receipt is confirmed |
| `new_chat_message` | `{ id, content, senderId, … }` | A message is sent in a thread |
| `new_notification` | `{ title, message, type, link }` | A notification is created |
| `product_updated` | `{ productId, farmerPrice, … }` | A listing changes |
| `user_typing` / `user_stopped_typing` | `{ enquiryId, userId }` | Typing indicator |
| `order_room_joined` / `enquiry_room_joined` | `{ … }` | Room join confirmation |
| `socket_error` | `{ message }` | Socket-level error |

### Rooms

| Room | Members |
| --- | --- |
| `user_<userId>` | The authenticated user only (private notifications) |
| `product_<productId>` | Anyone watching a listing (public price feed) |
| `order_<orderId>` | The buyer and the farmer of that order |
| `enquiry_<enquiryId>` | The participants of the thread |

> **Room key = `User.id`, never `FarmerProfile.id`.**
> `Order.farmerId` and `Product.farmerId` reference `FarmerProfile.id`, but a
> socket always joins `user_<User.id>` (the id inside the JWT). The server
> therefore resolves `FarmerProfile.userId` before emitting
> `new_order_received`, `order_delivered` and `new_notification`. Clients do
> not need to know about this distinction — they only ever use their own
> `User.id`.

The Android app connects with the same JWT and uses the same room names and
event names, so a farmer on Android receives an order raised from the website
and vice versa.

---

## 15. Endpoint summary

| # | Method | Path | Auth |
| --- | --- | --- | --- |
| 1 | GET | `/api/health` | public |
| 2 | POST | `/api/auth/register` | public |
| 3 | POST | `/api/auth/login` | public |
| 4 | POST | `/api/auth/login-phone` | public |
| 5 | POST | `/api/auth/firebase-phone` | public |
| 6 | POST | `/api/auth/verify-aadhaar` | any |
| 7 | GET | `/api/auth/me` | any |
| 8 | GET | `/api/products` | public |
| 9 | GET | `/api/products/:id` | public |
| 10 | GET | `/api/products/my-products` | any |
| 11 | POST | `/api/products` | FARMER / ADMIN |
| 12 | PATCH | `/api/products/:id` | FARMER / ADMIN |
| 13 | DELETE | `/api/products/:id` | FARMER / ADMIN |
| 14 | POST | `/api/orders` | CONSUMER / FARMER |
| 15 | GET | `/api/orders/my` | CONSUMER / FARMER |
| 16 | GET | `/api/orders/farmer` | FARMER |
| 17 | GET | `/api/orders/:id` | CONSUMER / FARMER / ADMIN |
| 18 | PATCH | `/api/orders/:id/status` | FARMER |
| 19 | PATCH | `/api/orders/:id/received` | CONSUMER / FARMER |
| 20 | POST | `/api/enquiries` | CONSUMER / FARMER |
| 21 | GET | `/api/enquiries/my` | CONSUMER / FARMER |
| 22 | GET | `/api/enquiries/farmer` | FARMER / ADMIN |
| 23 | GET | `/api/enquiries/:id/messages` | participant |
| 24 | POST | `/api/enquiries/:id/messages` | participant |
| 25 | GET | `/api/users/me` | any |
| 26 | PATCH | `/api/users/me` | any |
| 27 | GET | `/api/users/farmers` | public |
| 28 | GET | `/api/favorites` | any |
| 29 | POST/DELETE | `/api/favorites/products/:id` | any |
| 30 | POST/DELETE | `/api/favorites/farmers/:id` | any |
| 31 | GET | `/api/notifications` | any |
| 32 | PATCH | `/api/notifications/:id/read` | any |
| 33 | PATCH | `/api/notifications/read-all` | any |
| 34 | POST | `/api/complaints` | any |
| 35 | GET | `/api/complaints/mine` | any |
| 36 | GET | `/api/admin/metrics` | ADMIN |
| 37 | GET | `/api/admin/users` | ADMIN |
| 38 | PATCH | `/api/admin/users/:id/toggle-status` | ADMIN |
| 39 | GET | `/api/admin/complaints` | ADMIN |
| 40 | PATCH | `/api/admin/complaints/:id/resolve` | ADMIN |
| 41 | POST | `/api/upload` | any |
| 42 | GET | `/api/farmers/map` | public |
| 43 | GET | `/api/farmers/:id` | public |
| 44 | POST | `/api/logistics/quote` | public |
| 45 | GET | `/api/apmc/rates` | public |
| 46 | GET | `/api/dashboard/farmer` | FARMER |
| 47 | POST | `/api/farmer/verify-aadhaar` | any |
| 48 | GET | `/api/farmer/orders` | FARMER |
| 49 | GET | `/api/farmer/enquiries` | FARMER |
| 50 | GET | `/api/consumer/enquiries` | CONSUMER / FARMER |

---

## 16. Endpoints added during the Android parity work

These were **missing** in the original backend and were implemented on the
server (never faked inside Flutter) so that both clients share one API:

| Endpoint | Why it was needed |
| --- | --- |
| `GET /api/favorites`, `POST/DELETE /api/favorites/products/:id`, `POST/DELETE /api/favorites/farmers/:id` | The `FavouriteProduct` / `FavouriteFarmer` tables existed but had no API. The website map already called a farmer directory that did not exist. |
| `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` | The `Notification` model existed but had no API. |
| `POST /api/complaints`, `GET /api/complaints/mine` | Only the admin listing/resolution endpoints existed; users could not raise a complaint. |
| `GET /api/orders/:id` | The controller existed but was never routed — required for the Android order-tracking screen. |
| `GET /api/users/farmers` | The website's consumer map already called this path; the backend only exposed `/api/farmers/map`. |

Implementation: `backend/src/modules/favorites/`, `backend/src/modules/notifications/`,
`backend/src/modules/complaints/`, `backend/src/modules/orders/orders.routes.ts`,
`backend/src/modules/users/users.routes.ts`.
