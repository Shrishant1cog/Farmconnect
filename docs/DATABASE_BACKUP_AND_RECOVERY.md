# FarmConnect — database backup and recovery procedure

This document describes how a **real** PostgreSQL backup of the FarmConnect
database is taken, how its integrity is proven, how it is tested by restoring
it, and how the database is recovered when something goes wrong.

The tooling lives in `backend/scripts/`:

| File | What it does |
|---|---|
| `backend/scripts/db-backup.mjs` | Takes the dump, hashes it, checks the archive, writes the manifest, and (by default) runs the restore test. |
| `backend/scripts/db-restore-verify.mjs` | Restores a dump into a throwaway database and proves that the tables, the migration history and the data are all there. |

Both scripts are **read-only** against the source database. They never write,
never delete and never migrate anything in it.

---

## 1. Why a backup file alone is not enough

A `pg_dump` file that was never restored is not a backup — it is a hope. Three
things have to be true, and each of them is checked separately:

1. **The dump completed.** — `pg_dump` exits with code 0.
2. **The file is intact.** — the SHA-256 is written next to it and
   `pg_restore --list` can read the whole archive.
3. **The file restores into a working database.** — it is restored into a
   separate temporary database and the row counts are compared with the
   counts that were recorded when the dump was taken.

Only the third one proves the backup. `db-backup.mjs` runs it by default.

---

## 2. Prerequisites

The PostgreSQL **client** tools are needed (`pg_dump`, `pg_restore`, `psql`,
`createdb`, `dropdb`). They are *not* the same as the server.

- **Windows / macOS:** install the PostgreSQL client tools, or download the
  official binaries from <https://www.postgresql.org/download/windows/>.
- **Linux:** `apt install postgresql-client` (Debian/Ubuntu),
  `dnf install postgresql` (Fedora).
- The scripts look for the binaries in `PATH` first and then in a few common
  locations. `PG_BIN` overrides the search.

Verify:

```bash
pg_dump --version
pg_restore --version
psql --version
```

---

## 3. Giving the script the connection string — without pasting it into a chat

The connection string is a secret. It must never appear in a chat message,
in a commit, or in a command line that ends up in the shell history.

**Recommended: a local file outside the repository.**

On Windows:

```powershell
notepad "$env:LOCALAPPDATA\Temp\opencode\prod-db.url"
```

Paste the Render connection string into the file, save it, close the editor.
On macOS / Linux the same file would be `~/.farmconnect/prod-db.url`.

Then:

```powershell
node backend/scripts/db-backup.mjs `
  --out "D:\farmconnect-backups" `
  --url-file "$env:LOCALAPPDATA\Temp\opencode\prod-db.url"
```

The file must contain **only** the URI on its first line:

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

**Alternative: an environment variable.**

```powershell
$env:FARMCONNECT_PROD_DB_URL = "postgresql://..."
node backend/scripts/db-backup.mjs --out "D:\farmconnect-backups" --url-env FARMCONNECT_PROD_DB_URL
```

**The script never prints the URI.** It splits it into `PGHOST`, `PGPORT`,
`PGUSER`, `PGPASSWORD` and `PGDATABASE`, and the password travels to the
PostgreSQL client through the `PGPASSWORD` environment variable — so it does
not show up in a process listing either. Only the host, the port and the
database *name* are printed.

---

## 4. Taking the backup

```bash
cd backend
node scripts/db-backup.mjs --out /path/to/backup/folder
```

Options:

| Option | Meaning |
|---|---|
| `--out <dir>` | **required** — where the dump, the manifest and the `.sha256` file are written |
| `--url-file <path>` | file whose first line is the connection URI |
| `--url-env <name>` | environment variable holding the connection URI |
| `--label <name>` | label written into the manifest (default `production`) |
| `--skip-restore-test` | skip the restore test (not recommended) |
| `--keep` | keep the temporary restore database for inspection |

The script produces three files:

```
farmconnect-production-2026-11-28T19-45-00-000Z.dump             <- the data
farmconnect-production-2026-11-28T19-45-00-000Z.dump.sha256      <- the checksum
farmconnect-production-2026-11-28T19-45-00-000Z.manifest.json    <- what was backed up
```

The manifest records the server version, the database size, the row count of
every important table, the full Prisma migration history, the `pg_dump`
version and the SHA-256 of the archive. It is what the restore test compares
against, and it is what makes the backup auditable months later.

### Where the backup has to live

**Outside the database instance.** The backup folder must be on something that
does not disappear together with the database — an external disk, a cloud
object store, or at least a second machine. A backup inside the instance it
protects against is worth nothing.

Keep at least:

- the **newest** backup,
- one backup from **every day** of the last week,
- one backup from **every week** of the last quarter,
- the backup that was taken **before every migration**.

---

## 5. Proving the backup

### 5.1 The checksum

```bash
# Windows
Get-FileHash .\farmconnect-production-*.dump -Algorithm SHA256

# Linux / macOS
sha256sum -c farmconnect-production-*.dump.sha256
```

The value must equal the one in the manifest. If it does not, the file was
changed or truncated — **do not use it**.

### 5.2 The archive

```bash
pg_restore --list farmconnect-production-*.dump
```

This reads the whole archive and prints its table of contents. A corrupt or
truncated file fails here with a non-zero exit code.

### 5.3 The restore test

```bash
node scripts/db-restore-verify.mjs --dump /path/to/backup.dump
```

The script:

1. creates a temporary database `farmconnect_restore_test_<id>` on the same
   server,
2. restores the dump into it with `pg_restore --exit-on-error`,
3. checks that the expected tables exist,
4. compares the restored Prisma migration history with the manifest,
5. compares the row count of **every** table with the manifest and prints a
   table with ✅ / ❌ per table,
6. drops the temporary database again.

The **source database is never modified**. The test runs against a separate
database with its own name.

A passing run looks like this:

```
   table                     source   restored   result
   -------------------------------------------------------
   User                            12          12   ✅ equal
   Product                          7           7   ✅ equal
   Order                            3           3   ✅ equal
   ...
```

### 5.4 Checking the restored database by hand

```bash
createdb farmconnect_manual_check
pg_restore --exit-on-error -d farmconnect_manual_check farmconnect-production-*.dump
psql -d farmconnect_manual_check -c '\dt'
psql -d farmconnect_manual_check -c 'SELECT migration_name FROM _prisma_migrations;'
psql -d farmconnect_manual_check -c 'SELECT count(*) FROM "User";'
dropdb farmconnect_manual_check
```

---

## 6. Recovery procedure

### Case A — the database is gone (expired, deleted or corrupted)

1. **Do not panic and do not create anything new yet.** The dump on the
   backup storage is the copy that matters.
2. Create a new PostgreSQL 16 (or newer) database — the same provider, the
   same region, the same PostgreSQL major version as the source if possible.
3. Install the migration history first, because the dump contains it anyway
   but an empty database makes the order obvious:

   ```bash
   cd backend
   DATABASE_URL="<new database>" npx prisma migrate deploy
   ```

   *Only if the target is empty and the dump cannot be used.* The normal path
   is step 4.

4. Restore the dump:

   ```bash
   pg_restore --exit-on-error --no-owner --no-privileges \
     --dbname farmconnect_recovery farmconnect-production-<latest>.dump
   ```

5. Check the result with the validation queries in
   `docs/DATABASE_MIGRATION_PLAN.md` §5.
6. Run the restore test against the *new* database to be sure:

   ```bash
   node scripts/db-backup.mjs --out /tmp/verify --url-file <file>
   ```

7. Point `DATABASE_URL` of `farmconnect-api` at the recovered database and
   restart the service.
8. Verify:

   ```bash
   curl -s https://farmconnect-api-sn98.onrender.com/api/health
   # {"status":"UP","database":"UP"}
   ```

9. Sign in on the website and on the Android app with a real account. The
   password hashes came across in the dump, so the existing accounts work
   with their existing passwords — **do not** run `prisma/seed.ts` (it wipes
   the database) and do not run `db:demo-accounts` unless you want the demo
   accounts refreshed.

### Case B — a migration broke the application

1. Stop the API service (so nothing writes).
2. Take a dump of the **broken** database first — the evidence matters.
3. Restore the dump that was taken **before** the migration.
4. Point `DATABASE_URL` back at the restored database.
5. Start the API and run the health check.

### Case C — a single table was damaged (an accidental `DELETE`)

If the provider supports **point-in-time recovery** (Neon: instant restore;
Render paid: PITR; Supabase Pro: PITR as a paid add-on), restoring to a point
in time just before the delete is the fastest path and keeps everything else
intact. On Render's **free** plan there is no PITR — the only option is the
dump.

---

## 7. A schedule that fits the free tier

| When | What | Why |
|---|---|---|
| Before every deploy that changes the schema | dump + restore test | the only copy of the old schema |
| Daily | dump | one day of orders is worth keeping |
| Weekly | dump, keep 4 | a month of history |
| Immediately after any suspicious event | dump | preserve the evidence |

A daily dump of a database this size takes seconds. The important part is
that the dump ends up **outside** the instance and that the restore test is
run — a dump that was never restored is not a backup.

---

## 8. Current status in this repository

- The tooling (`db-backup.mjs`, `db-restore-verify.mjs`) is **implemented and
  executed** against a local PostgreSQL 16 cluster, proving the whole chain
  works: dump → checksum → archive check → restore → row-count comparison →
  migration-history comparison.
- A dump of the **live production database** cannot be taken from this
  machine, because the Render connection string is not available here. It
  needs the owner to place it in a local file as described in section 3.
- The live API health check confirms that the database is reachable from the
  deployed application.
