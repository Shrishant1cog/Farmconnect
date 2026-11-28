# FarmConnect — managed PostgreSQL comparison and migration plan

**Status:** prepared, not executed. Nothing in this document has been applied.
The production database is untouched and stays untouched until the owner
approves the move.

**Figures below were taken from the vendors' own pages on 28 November 2026.**
Re-check them before buying anything — the prices move.

---

## 1. Why the database has to move

`render.yaml` declares:

```yaml
databases:
  - name: farmconnect-db
    plan: free          # <-- the problem
    postgresMajorVersion: 16
```

Render's own documentation states:

> "Free Render Postgres databases expire 30 days after creation. An expired
> Free database is inaccessible unless you upgrade it to a paid compute plan.
> After a Free database expires, you have a grace period of 14 days to upgrade
> it to a paid compute plan. After the grace period, Render deletes the
> database (along with all of its data)."
> — <https://render.com/docs/free>

and

> "Free Render Postgres databases have a fixed storage capacity of 1 GB."
> — <https://render.com/docs/free>

The instance also has **no backups of any kind** on the free plan, so the
database currently holds the only copy of the customer data.

**Consequence:** the data has a hard expiry date. On the day the instance
expires it becomes inaccessible; 14 days later it is deleted. Nothing in the
code can prevent that — it is a property of the plan, not of the application.

---

## 2. Comparison of the realistic options

| | **Render Postgres** | **Neon** | **Supabase** |
|---|---|---|---|
| Cheapest production plan | $6/mo (`0.1c-256mb`, 256 MB RAM) | Launch, pay-as-you-go, no minimum (~$15/mo typical small app) | Pro $25/mo (includes $10 compute credit for one Micro project) |
| Free tier | $0 — **but expires in 30 days and is deleted after a 14-day grace period** | $0 **permanent** (no card): 100 projects, 1 GB storage/project, 100 CU-hours/project, 5 GB egress | $0 — 500 MB database, **paused after 1 week of inactivity**, 2 active projects, no automatic backups |
| Storage | 1 GB free; expandable at $0.30/GB | 1 GB/project free; **unlimited** on paid plans, $0.35/GB-month | 500 MB free (2 GB disk); 8 GB on Pro, then $0.125/GB |
| Backups | Free: **none**. Paid: logical exports + PITR (3 days Hobby / 7 days Pro+) | Instant restore (PITR) 6 h free, 7 days Launch, 30 days Scale; 1 manual snapshot free, 100 on paid; scheduled backups on paid | Daily backups on paid (7 days Pro / 14 Team / 30 Enterprise); **PITR is a $100/mo add-on**; Free has none |
| Connection pooling | Connection pooler available on paid plans | **PgBouncer** — pooled endpoint accepts up to 10,000 client connections per compute; direct endpoint capped at 112 `max_connections` | **Supavisor** — separate pooled and direct endpoints |
| SSL | Required for external connections | Required (`sslmode=require`), direct and pooled endpoints | Required; pooled endpoint needs `?pgbouncer=true` in Prisma |
| Reliability / SLA | Point-in-time recovery and read replicas on paid instances; no published uptime SLA on the free plan | Scale plan only: published **uptime SLA**; branch + snapshot model | Team/Enterprise: SOC2, ISO 27001, SLAs, PrivateLink; Pro has email support |
| Prisma compatibility | Native PostgreSQL — works unchanged | Native PostgreSQL — works unchanged. Use the **direct** (non-pooled) endpoint for `prisma migrate deploy` | Native PostgreSQL — works unchanged. Prisma needs `?pgbouncer=true&connection_limit=1` on the pooled endpoint, or the direct endpoint |
| Migration complexity | **Lowest** — same provider, same region, same connection string format | Low — standard URI, plus `sslmode=require` | Low — standard URI, plus the pooler flags |
| Region | Singapore (`region: singapore` in `render.yaml`) | Choose an AWS region close to the app (Singapore / ap-southeast-1) | Choose a region (Singapore / ap-southeast-1) |

Other options considered and rejected for now:

- **Amazon RDS / Aurora** — the most capable and the most expensive; needs a
  VPC, subnet group and security-group work. Only worth it when there is a
  compliance requirement.
- **Railway** — a 30-day trial, then a $1/month credit. The database would
  still be on trial pricing in a year.
- **PlanetScale** — no free tier, and its MySQL-compatible behaviour does not
  fit a Prisma/PostgreSQL schema without changes.

### Recommendation

**Neon (Launch plan)** for the production database, with **Render Postgres
(starter, $6/mo)** kept as the interim step until the migration is verified.

Reasoning:

1. It is the only option in the comparison whose free tier does **not** delete
   the data, and whose paid tier is billed on usage with no minimum. If the
   app is quiet, the bill stays small.
2. It keeps the change **inside the standard PostgreSQL protocol**. The
   Prisma schema, every migration and the `pg_dump`/`pg_restore` tooling work
   unchanged — no Prisma adapter, no behavioural differences.
3. The pooled endpoint solves the connection problem that a serverless web
   service creates, without changing the application code.
4. Neon is not free in the sense of "no card" for production, but the Launch
   plan has no monthly minimum, so it can be started and stopped without a
   standing charge beyond actual usage.

**Interim recommendation (the safe step, and the one to do first):** upgrade
the existing Render instance from `free` to the $6/mo starter plan. That
single change removes the 30-day expiry and the deletion risk **without moving
a single byte**. It should happen before any migration is attempted.

> This document does **not** change `render.yaml`, does not create any paid
> resource and does not touch the live database. Both require the owner's
> explicit approval.

---

## 3. Migration steps

The procedure below is written so that the production database is never the
only copy of the data at any point.

### Phase 0 — Preparation (no downtime)

1. **Upgrade the Render instance out of the free plan** (or ask the owner to
   do it). This removes the expiry clock. Until this is done, everything else
   is a race against the expiry date.
2. **Take and verify a backup** — see `docs/DATABASE_BACKUP_AND_RECOVERY.md`.
   Do not continue without a verified dump.
3. **Create the target database** in Neon (Launch plan) in the Singapore
   region. Use the **direct** connection string for the migration steps
   below — the pooled endpoint does not support `pg_dump` and some DDL.
4. Record the target version: Neon runs PostgreSQL 17/18 depending on the
   plan, Render runs 16. **Check the Prisma schema for anything version
   specific** — the current schema uses no PG16-only features, but a
   `pg_dump` from a 16 server restores into a 17/18 server without problem.
   The reverse (dump from 17 → restore into 16) can fail on features that do
   not exist in 16, so **the dump direction matters**.

### Phase 1 — Copy the data (read-only on production)

```bash
# From a machine that has the PostgreSQL 16+ client tools and can reach both
# servers. The URI never appears in a shell history if it comes from a file.

pg_dump \
  --format=custom --compress=9 --no-owner --no-privileges \
  --file farmconnect-production.dump \
  "$SOURCE_DATABASE_URL"

# Check that the archive is readable before touching the target.
pg_restore --list farmconnect-production.dump | head -50
```

Then restore it into the target:

```bash
createdb "$TARGET_DATABASE"      # or use the console's "create database"

pg_restore \
  --exit-on-error --no-owner --no-privileges \
  --dbname "$TARGET_DATABASE" \
  farmconnect-production.dump
```

Then run the Prisma migrations against the target so the schema is recorded
exactly as the application expects:

```bash
cd backend
DATABASE_URL="$TARGET_DATABASE_URL" npx prisma migrate deploy
```

`migrate deploy` only applies migrations that are **not** yet recorded in
`_prisma_migrations`. Because the dump already carried that table across,
the migrations are marked as applied and nothing is re-run — which is the
correct behaviour.

### Phase 2 — Verification (still no write traffic)

Run the validation queries in section 5 and compare the result with the
manifest that `backend/scripts/db-backup.mjs` wrote.

### Phase 3 — Cut-over (a few minutes of write downtime)

1. Put the application into **maintenance mode** — or, more simply, stop the
   API service in Render. Every write must stop, otherwise an order placed
   during the cut-over would land in the old database and be lost.
2. Take a **second** dump — the final one, taken after the maintenance
   window started. The first dump may be missing the last few minutes.
3. Restore that final dump into the target (repeat Phase 1).
4. Update `DATABASE_URL` of `farmconnect-api` in Render to the target
   connection string.
5. Start the API and run the health check:

   ```bash
   curl -s https://farmconnect-api-sn98.onrender.com/api/health
   # {"status":"UP","database":"UP",...}
   ```

6. Run the validation queries again, this time against the live target.
7. Keep the old Render instance **online but not used** for at least 7 days.
   That is the rollback window.

### Phase 4 — Decommission (only after 7 clean days)

1. Take one last dump of the old instance and archive it with the others.
2. Remove the `DATABASE_URL` of the old instance from the API service.
3. Only then consider cancelling the old Render database.

---

## 4. Environment variable changes

| Variable | Where | Change |
|---|---|---|
| `DATABASE_URL` | `farmconnect-api` on Render | The **only** change that is needed. It points at the new instance. |

Nothing else has to change:

- `JWT_SECRET` stays the same, so **existing sessions keep working** after the
  move. Do not regenerate it, or every user is logged out.
- `CLIENT_URL`, `CORS_ORIGIN`, `STORAGE_*`, `FIREBASE_*` are unaffected.

The connection string itself changes shape a little:

```
# Render (current)
postgresql://USER:PASSWORD@HOST:5432/DATABASE

# Neon — direct endpoint (use this for migrations and pg_dump)
postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Neon — pooled endpoint (use this for the running application)
postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

### Prisma and the pooled endpoint

Prisma needs to know whether it talks to a transaction-pooling proxy:

```
# Pooled (Supavisor / PgBouncer in transaction mode)
DATABASE_URL="...?sslmode=require&pgbouncer=true&connection_limit=1"

# Direct
DATABASE_URL="...?sslmode=require"
```

`connection_limit=1` with `pgbouncer=true` is the documented Prisma setting
for a transaction pooler. FarmConnect's Prisma version is **6.19.3**, which
supports both settings.

**Important:** `prisma migrate deploy` and `pg_dump` must always use the
**direct** endpoint. A transaction pooler cannot serve them.

---

## 5. Data validation queries

Run every query against the **source** and against the **target** and compare
the two results. They must be identical.

```sql
-- 1. The schema is there
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- 2. The tables are named as expected
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. The migration history is complete and finished
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY started_at;

-- 4. The customer data is all there
SELECT 'User'            AS t, count(*) FROM "User"
UNION ALL SELECT 'FarmerProfile',   count(*) FROM "FarmerProfile"
UNION ALL SELECT 'ConsumerProfile', count(*) FROM "ConsumerProfile"
UNION ALL SELECT 'Product',         count(*) FROM "Product"
UNION ALL SELECT 'Order',           count(*) FROM "Order"
UNION ALL SELECT 'OrderItem',       count(*) FROM "OrderItem"
UNION ALL SELECT 'Enquiry',         count(*) FROM "Enquiry"
UNION ALL SELECT 'Message',         count(*) FROM "Message"
UNION ALL SELECT 'ChatMessage',     count(*) FROM "ChatMessage"
UNION ALL SELECT 'Notification',    count(*) FROM "Notification"
UNION ALL SELECT 'Complaint',       count(*) FROM "Complaint"
UNION ALL SELECT 'FavouriteProduct',count(*) FROM "FavouriteProduct"
UNION ALL SELECT 'FavouriteFarmer', count(*) FROM "FavouriteFarmer"
UNION ALL SELECT 'ApmcMarketRate',  count(*) FROM "ApmcMarketRate"
UNION ALL SELECT 'Category',        count(*) FROM "Category"
UNION ALL SELECT 'PriceHistory',    count(*) FROM "PriceHistory";

-- 5. The roles are unchanged
SELECT role, count(*) FROM "User" GROUP BY role ORDER BY role;

-- 6. No order lost its buyer or its farmer
SELECT count(*) AS orphaned_orders
FROM "Order" o
LEFT JOIN "User" c ON c.id = o."consumerId"
LEFT JOIN "User" f ON f.id = o."farmerId"
WHERE c.id IS NULL OR f.id IS NULL;

-- 7. The order money adds up
SELECT status, count(*), sum(totalAmount)
FROM "Order"
GROUP BY status
ORDER BY status;

-- 8. The APMC bulletins are unchanged
SELECT count(*) AS apmc_rows,
       min("updatedAt") AS oldest,
       max("updatedAt") AS newest
FROM "ApmcMarketRate";

-- 9. The database is the expected size
SELECT pg_database_size(current_database()) AS bytes;
```

---

## 6. Rollback

The rollback is possible for as long as the old instance exists and its data
is intact.

| Situation | Action | Downtime |
|---|---|---|
| The target fails during Phase 2 | Delete the target database and fix it. **The production database was never touched.** | none |
| The target fails after the cut-over | Point `DATABASE_URL` back at the Render instance and restart the API. | ~1 minute |
| The target loses data **after** it went live | Restore the **final** dump that was taken at cut-over into the target. | the time of the restore |
| Both fail | Restore the newest verified backup into a fresh database and point `DATABASE_URL` at it. | depends on the size of the data |

**Before the cut-over, the rollback is free.** After the cut-over, the old
instance is the fallback — which is why Phase 3 keeps it alive for at least
7 days.

**The one thing that cannot be rolled back** is an order that was placed
between the last dump and the cut-over. That is why the final dump is taken
*after* the write traffic has been stopped.

---

## 7. Downtime considerations

| Step | Downtime | Why |
|---|---|---|
| Phase 0–2 | **none** | The production database is only read from. |
| Phase 3, step 1 | starts here | The API is stopped. |
| Phase 3, steps 2–3 | 2–10 minutes | A final dump + restore of a small database. A 100 MB database restores in well under a minute; the time is dominated by the dump over the network. |
| Phase 3, steps 4–6 | 1–3 minutes | Restart, health check, validation. |
| **Total** | **3–15 minutes** | For a database of the current size (well under the 1 GB free-plan limit). |

How the downtime can be avoided entirely:

1. Use **logical replication** from Render to Neon instead of dump/restore —
   then the target is caught up continuously and the cut-over is a DNS/env
   change of a few seconds.
2. Accept the writes to the old database during the cut-over and replay them
   afterwards — **not recommended**, because the replay logic is new code and
   therefore new risk.

For a database this small, the simple dump/restore with a short maintenance
window is the safer choice.

---

## 8. What still needs a human

1. **Approve the target provider.** No paid resource may be created without
   approval.
2. **Approve the interim step** of upgrading the Render instance out of the
   free plan. This is the single most important action, because it stops the
   deletion clock without moving any data.
3. **Create the target database** and hand the connection string over as a
   local file (never in a chat message).
4. **Run the migration** during a low-traffic window.
