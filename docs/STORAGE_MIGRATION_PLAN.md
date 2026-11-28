# FarmConnect — durable image storage migration plan

**Provider decision (owner, 28 November 2026): Cloudflare R2.**

**Status:** the decision is taken and the code supports it; the **bucket does
not exist yet**. Creating the Cloudflare account, the bucket and the API
token is the owner's action — no account was created, no bucket was created
and no paid resource was enabled by this work.

The production storage provider is **not** switched by this document. Until
the seven environment variables of section 5 are set on `farmconnect-api`,
the API keeps using the local disk exactly as it does today.

---

## 1. What the current implementation does

`backend/src/services/storage.service.ts` implements a pluggable provider.

```
STORAGE_PROVIDER=local   (default)  ->  files are written to UPLOAD_DIR
STORAGE_PROVIDER=s3      (or r2, or spaces)  ->  files go to an S3-compatible bucket
```

### How an upload works

1. `POST /api/upload` in `backend/src/app.ts`.
2. The `authenticate` middleware resolves the session — **an upload requires
   a valid, active account**.
3. `multer` keeps the file in memory (`memoryStorage`) with a hard limit of
   **8 MB**. Nothing is written to the disk before the storage provider has
   decided where it goes.
4. `storeImage()` builds the file name (`<timestamp>-<random>.<ext>`) and
   writes the file:
   - `local` → `UPLOAD_DIR` on the local disk,
   - `s3` → `PutObjectCommand` with the key `uploads/<file name>`.
5. The response carries the public URL:

   ```json
   { "success": true, "imageUrl": "https://…/uploads/1712345678-123.jpg", "provider": "s3" }
   ```

   That URL is what the website stores in `Product.imageUrl` and what the
   browser then loads as `src`.

### How an image is retrieved

- **Local provider:** `app.use('/uploads', express.static(uploadDirectory))`
  in `backend/src/app.ts` serves the folder directly. The URL and the file
  name are separate parts, so renaming a file breaks the link.
- **S3 provider:** the object is served by the bucket itself. The bucket must
  be readable by the public (a public bucket or a public custom domain in
  front of it), and `STORAGE_PUBLIC_URL` must be the **root** of that public
  location.

### How an image is deleted

**There is no deletion code.** A search of the whole backend for `DeleteObject`,
`unlink`, `deleteImage` and `removeImage` returns nothing. Uploaded images
are never removed — not by the API, not by a product deletion, not by an
account deletion.

That has two consequences:

1. **Good:** no image is lost by a bug in a delete path.
2. **Bad:** the storage grows without bound and every upload is permanent.
   A deletion feature would have to be written and reviewed carefully; it
   must not be able to remove an image that another row still points at.

### How permissions are enforced

- The upload route requires a **valid session**: `authenticate` resolves the
  JWT and then reads the account from the database, rejecting unknown or
  suspended accounts.
- The file is **not** validated beyond its size. There is no check of the
  file type or of the content itself — a caller who is signed in can upload
  any 8 MB file with an image extension, and the API stores it with the
  `Content-Type` that the client sent.
  *Recommendation:* add a MIME/extension allow-list before the bucket is put
  in production. This is a small, self-contained change.
- The **read** path is public by design: the image URL is stored in the
  database and shown in the marketplace. Anyone who knows the URL can load
  the image. That is the same model as the current `/uploads` folder.

---

## 2. The actual risk

`render.yaml` sets:

```yaml
- key: STORAGE_PROVIDER
  value: local
```

Render's own documentation states:

> "Like all Render services, Free web services have an ephemeral filesystem.
> This means that any changes to your web service's filesystem (uploaded
> images, local SQLite databases, etc.) are lost every time the service
> redeploys, restarts, or spins down."
> — <https://render.com/docs/free>

So on the current deployment:

- every redeploy wipes the uploaded images,
- every free-tier spin-down/restart wipes them,
- the `imageUrl` values already stored in `Product.imageUrl` point at files
  that no longer exist.

The rows survive (they are in the database), but the **image behind the URL
is gone**. The website falls back to a placeholder, so the damage is silent.

---

## 3. A bug that was found and fixed during this review

The S3 branch built the object key and the public URL from **different**
paths:

```ts
const key = `uploads/${fileName}`;                       // the object is at uploads/<file>
const publicBase = STORAGE_PUBLIC_URL || `${publicBaseUrl}/uploads`;
return { url: `${publicBase}/${fileName}`, ... };        // the URL points at <file>
```

With `STORAGE_PUBLIC_URL=https://cdn.example.com` the API would have returned
`https://cdn.example.com/1712345678-123.jpg` for an object that is really at
`https://cdn.example.com/uploads/1712345678-123.jpg` — **every upload would
have produced a broken link** that was then stored in the database.

The fix keeps both on the same path and refuses to invent a URL:

```ts
export const buildStorageKey = (fileName) => `uploads/${fileName}`;
export const buildPublicUrl = (key) => `${STORAGE_PUBLIC_URL}/${key}`;
```

`STORAGE_PUBLIC_URL` is now **required** for the `s3` provider; without it
the upload fails with a clear message instead of storing a dead link.

The path layout was deliberately **not** changed (`uploads/<file name>`),
because it is identical to the local path (`/uploads/<file name>`). That is
what makes the migration below a pure base-URL swap.

Regression test: `backend/src/__tests__/storageService.test.ts` (6 tests).

---

## 4. Supported providers

The implementation uses `@aws-sdk/client-s3`, so **every S3-compatible
service** works:

| Provider | `STORAGE_REGION` | `STORAGE_ENDPOINT` | `STORAGE_FORCE_PATH_STYLE` |
|---|---|---|---|
| Amazon S3 | `ap-south-1`, `eu-central-1`, … | *(leave empty)* | `false` |
| **Cloudflare R2** | `auto` | `https://<account-id>.r2.cloudflarestorage.com` | `true` |
| DigitalOcean Spaces | `<region>` | `https://<region>.digitaloceanspaces.com` | `false` |
| MinIO (self-hosted) | `us-east-1` | `https://minio.example.com` | `true` |

### Recommendation

**Cloudflare R2** is the best fit for FarmConnect's image storage — and it
is the provider the owner has chosen.

- no egress fees for images served through the CDN — the marketplace is
  image-heavy, and S3 egress would dominate the bill,
- S3-compatible, so the existing `@aws-sdk/client-s3` code needs no change,
- a free tier that covers a small application,
- a public bucket domain (`https://pub-<id>.r2.dev`) or a custom domain.

The second choice would have been **Amazon S3** — it is the reference
implementation, at the cost of egress per GB.

**Amazon S3 + CloudFront** is the most complete but the most expensive setup
and is not needed at this scale.

No account has been created and no bucket has been created. The choice and
the account creation belong to the owner.

### A silent fallback to the local disk is now impossible

A hosted deployment has an **ephemeral** disk. If `STORAGE_PROVIDER=r2` was
set but one of the credentials was missing, the old code would quietly write
the image to that disk — answer `"success"`, and lose the file at the next
deploy.

That cannot happen any more. An explicitly requested object store that is
not fully configured now makes the upload **fail loudly**:

```
The storage provider "r2" was requested, but it is not configured.
Missing: STORAGE_SECRET_ACCESS_KEY. The upload was NOT written to the local
disk, because that disk is ephemeral on a hosted service.
```

The same applies to a missing `STORAGE_PUBLIC_URL`: it is now checked
**before** the object is written, so a misconfigured bucket cannot collect
orphan objects that no row can point at.

Regression tests: `backend/src/__tests__/storageService.test.ts` (9 tests).

---

## 5. Required environment variables

For the API service (`farmconnect-api` on Render):

| Variable | Required | Value | Notes |
|---|---|---|---|
| `STORAGE_PROVIDER` | yes | `s3` | `r2` and `spaces` are accepted as aliases of `s3` |
| `STORAGE_BUCKET` | yes | the bucket name | |
| `STORAGE_REGION` | yes | `auto` for R2 | |
| `STORAGE_ENDPOINT` | for R2 / Spaces / MinIO | `https://<account>.r2.cloudflarestorage.com` | empty for AWS S3 |
| `STORAGE_ACCESS_KEY_ID` | yes | the access key id | **secret** |
| `STORAGE_SECRET_ACCESS_KEY` | yes | the secret access key | **secret** |
| `STORAGE_PUBLIC_URL` | yes | `https://pub-<id>.r2.dev` | the **root** of the public location, without a trailing slash |
| `STORAGE_FORCE_PATH_STYLE` | for R2 / MinIO | `true` | `false` for AWS S3 |

**Set these as secret environment variables in the Render dashboard — never
in `render.yaml`, never in a commit, never in a chat message.**

The code also accepts `r2` and `spaces` as the provider name, so
`STORAGE_PROVIDER=r2` works exactly like `STORAGE_PROVIDER=s3`.

### 5.1 The exact values for Cloudflare R2

R2 is the chosen provider, so these are the seven values to enter in the
Render dashboard for `farmconnect-api`.

**Step 1 — create the bucket**

1. <https://dash.cloudflare.com> → **R2** → **Create bucket**.
2. Name: `farmconnect-images` (any name works; it becomes `STORAGE_BUCKET`).
3. Location: **Automatic** (or the region closest to the Render instance).
4. Storage class: **Standard**.

**Step 2 — the API token**

1. R2 → **Manage R2 API Tokens** → **Create Account API token**.
2. Permission: **Object Read & Write**.
3. Specify the bucket `farmconnect-images` (a bucket-scoped token is enough).
4. The token shows an **Access Key ID** and a **Secret Access Key** — these
   are `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`.
   **They are shown only once.** Store them in a password manager.

**Step 3 — the account id**

The Cloudflare **account id** is shown on the R2 overview page. It is part
of `STORAGE_ENDPOINT`:

```
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

**Step 4 — the public URL**

R2 → the bucket → **Settings** → **Public access**. Either

* enable the **r2.dev** subdomain (the URL looks like
  `https://pub-<something>.r2.dev`), or
* attach a custom domain (e.g. `https://cdn.farmconnect.example`).

That URL — **without** a trailing slash and **without** `/uploads` — is
`STORAGE_PUBLIC_URL`. The API appends `/uploads/<file name>` itself.

**Step 5 — the seven values**

| Variable | Value |
|---|---|
| `STORAGE_PROVIDER` | `r2` |
| `STORAGE_BUCKET` | `farmconnect-images` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `STORAGE_ACCESS_KEY_ID` | the access key id from step 2 |
| `STORAGE_SECRET_ACCESS_KEY` | the secret access key from step 2 |
| `STORAGE_PUBLIC_URL` | `https://pub-<something>.r2.dev` |
| `STORAGE_FORCE_PATH_STYLE` | `true` |

**Step 6 — verify before it matters**

```bash
# a new upload must land in the bucket
curl -s -X POST https://farmconnect-api-sn98.onrender.com/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg"

# the returned URL must load
curl -sI "<the returned imageUrl>" | head -1
```

The response must contain `"provider":"s3"` and a URL of the form
`https://pub-<something>.r2.dev/uploads/<file name>`. If the provider is
still `local`, the environment variables did not reach the service — the
upload was written to the **ephemeral** disk and will disappear at the next
deploy.

---

## 6. Migration steps

The existing images must **not** be deleted, and the existing URLs should
survive the move. Because the object key and the local path have the same
shape, the move is a **base-URL swap**.

### Step 1 — create the bucket

Create the bucket in the chosen provider (R2, S3, …) and enable public
read access on the `uploads/` prefix. Note the public URL — it is the value
of `STORAGE_PUBLIC_URL`.

### Step 2 — copy the files that still exist

The current images live on the Render instance's ephemeral disk, so **only
the files that are still there** can be copied. The rest have already been
lost to a redeploy — that is the damage the ephemeral disk has already done.

On a machine that can reach the API (or by using a Render shell):

```bash
# 1. find the image URLs that are in use
psql "$DATABASE_URL" -t -A -c \
  "SELECT DISTINCT \"imageUrl\" FROM \"Product\" WHERE \"imageUrl\" LIKE '%/uploads/%';"

# 2. download each file
curl -sS -o /tmp/images/photo.jpg "https://farmconnect-api-sn98.onrender.com/uploads/photo.jpg"

# 3. upload it under the same key
aws s3 cp /tmp/images/photo.jpg s3://<bucket>/uploads/photo.jpg \
  --endpoint-url https://<account>.r2.cloudflarestorage.com
```

The script above is a manual walkthrough. A proper one-file migration script
can be written once the bucket exists; it must never delete anything.

### Step 3 — rewrite the stored URLs

Only the **host** changes. The path `/uploads/<file name>` stays exactly as
it is.

```sql
-- Run this inside a transaction. Take a backup first.
BEGIN;

UPDATE "Product"
SET "imageUrl" = replace("imageUrl",
     'https://farmconnect-api-sn98.onrender.com/uploads/',
     'https://pub-<account-id>.r2.dev/uploads/')
WHERE "imageUrl" LIKE 'https://farmconnect-api-sn98.onrender.com/uploads/%';

-- Check how many rows were touched before committing.
SELECT count(*) FROM "Product"
WHERE "imageUrl" LIKE 'https://pub-<account-id>.r2.dev/uploads/%';

COMMIT;   -- or ROLLBACK;
```

The same update may be needed for other columns that hold an image URL.
Search the schema for every URL column before running it:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND data_type = 'text'
  AND (column_name ILIKE '%url%' OR column_name ILIKE '%image%');
```

### Step 4 — switch the API over

Set the seven environment variables from section 5 on the Render API service
and deploy. The new uploads then go straight into the bucket.

**The provider is not switched silently** — `STORAGE_PROVIDER` has to be set
explicitly, and the code only falls back to `local` when the object-store
credentials are missing.

### Step 5 — verify

```bash
# a new upload must land in the bucket
curl -s -X POST https://farmconnect-api-sn98.onrender.com/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg"

# the returned URL must load
curl -sI "<the returned imageUrl>" | head -1
```

Then sign in on the website and on the Android app and look at a product
that has an image.

---

## 7. Rollback

Until step 4 is done, **nothing has changed** — the API still writes to the
local disk.

After step 4:

1. Set `STORAGE_PROVIDER=local` again and deploy. New uploads go back to the
   local disk. **The images already in the bucket are not deleted.**
2. If the URL rewrite in step 3 has to be undone, run the reverse `replace()`
   inside a transaction.

---

## 8. Remaining improvements (not urgent, not done here)

1. **Deletion.** There is no deletion path at all. A safe one would have to
   check that no other row points at the same image before removing it, and
   it should only ever remove objects that this platform uploaded.
2. **File-type validation.** The upload route accepts any 8 MB file. An
   allow-list of `image/jpeg`, `image/png`, `image/webp` plus a check of the
   magic bytes would close that gap.
3. **Serving the images through the API.** Today the bucket is public. A
   private bucket behind a signed-URL route would give finer control, at the
   cost of more code and of a CDN that can no longer cache the objects
   anonymously.
4. **Image resizing.** Thumbnails would cut the egress bill considerably.
   Not needed while the image volume is small.
