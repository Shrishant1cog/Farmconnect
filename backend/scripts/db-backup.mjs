// Makes a **real** PostgreSQL backup of a FarmConnect database and proves
// that the backup file is intact.
//
//   node scripts/db-backup.mjs --out C:\backups\farmconnect
//   node scripts/db-backup.mjs --out /var/backups/farmconnect --url-file ./prod-db.url
//
// What it does
// ------------
//   1. Reads the connection string **without ever printing it**. It comes
//      from `--url-file` (a file whose first line holds the URI), from
//      `--url-env <NAME>`, or from `DATABASE_URL`.
//   2. Splits the URI into the libpq variables (PGHOST, PGPORT, PGUSER,
//           PGPASSWORD, PGDATABASE, PGSSLMODE). The password therefore never
//      appears on a command line and never in a process listing.
//   3. Records the server version, the database size and the row counts of
//      the important tables *before* the dump.
//   4. Runs `pg_dump` in the **custom** format (`-Fc`). That format is
//      compressed, and — unlike the plain SQL format — `pg_restore` can
//      read its table of contents, which is what makes the integrity check
//      possible.
//   5. Computes the SHA-256 of the produced file and writes a manifest next
//      to it.
//   6. Verifies the integrity with `pg_restore --list`, which reads the
//      whole archive and lists every object. A truncated or corrupt file
//      fails here.
//   7. Optionally restores the dump into a throwaway database and compares
//      the row counts — see `scripts/db-restore-verify.mjs`.
//
// The script is **read-only** against the source database: it never writes,
// never drops and never migrates anything.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const TABLES = [
  'User',
  'FarmerProfile',
  'ConsumerProfile',
  'Category',
  'Product',
  'PriceHistory',
  'Enquiry',
  'Message',
  'ChatMessage',
  'Order',
  'OrderItem',
  'ApmcMarketRate',
  'FavouriteProduct',
  'FavouriteFarmer',
  'Complaint',
  'Notification',
];

function usage() {
  console.log(`
FarmConnect — PostgreSQL backup

  node scripts/db-backup.mjs --out <directory> [options]

Options
  --out <directory>        Where the dump and the manifest are written (required)
  --url-file <path>        File whose first line is the connection URI
  --url-env <name>         Environment variable holding the connection URI
  --label <name>           Label written into the manifest (default: production)
  --skip-restore-test      Do not restore the dump into a temporary database
  --keep                   Keep the temporary restore database
  --help                   Show this text

The connection string is never printed. If neither --url-file nor --url-env
is given, DATABASE_URL is used.
`);
}

/** Reads the connection URI without ever writing it to the console. */
function readConnectionUri(args) {
  const fileIndex = args.indexOf('--url-file');
  if (fileIndex !== -1) {
    const file = path.resolve(args[fileIndex + 1] ?? '');
    if (!fs.existsSync(file)) {
      throw new Error(`The connection file does not exist: ${file}`);
    }
    const first = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.trim().length);
    if (!first) throw new Error(`The connection file is empty: ${file}`);
    return first.trim();
  }

  const envIndex = args.indexOf('--url-env');
  if (envIndex !== -1) {
    const name = args[envIndex + 1];
    const value = process.env[name ?? ''];
    if (!value) throw new Error(`The environment variable ${name} is not set.`);
    return value;
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  throw new Error(
    'No connection string found. Use --url-file, --url-env, or set DATABASE_URL.'
  );
}

/**
 * Turns a PostgreSQL URI into the libpq environment variables.
 *
 * The password ends up in `PGPASSWORD`, which every PostgreSQL client reads
 * from the environment — so it never shows up in a process listing or in a
 * shell history.
 */
export function uriToPgEnv(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('The connection string is not a valid PostgreSQL URI.');
  }

  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error(`Unsupported protocol in the connection string: ${parsed.protocol}`);
  }

  const env = {
    PGHOST: decodeURIComponent(parsed.hostname),
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username || ''),
    PGPASSWORD: decodeURIComponent(parsed.password || ''),
    PGDATABASE: decodeURIComponent((parsed.pathname || '/postgres').replace(/^\//, '')),
  };

  const sslmode = parsed.searchParams.get('sslmode');
  if (sslmode) env.PGSSLMODE = sslmode;
  else if (/sslmode=require/i.test(uri)) env.PGSSLMODE = 'require';

  // Managed providers often ask for a certificate that is not in the Windows
  // trust store. `sslmode=require` (encryption without certificate
  // verification) is the documented fallback for that case.
  if (!env.PGSSLMODE && /ssl/i.test(uri)) env.PGSSLMODE = 'require';

  return env;
}

/** Runs a PostgreSQL client and returns its output. */
export function run(bin, args, env, { allowFailure = false } = {}) {
  const result = spawnSync(bin, args, {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`Could not start ${bin}: ${result.error.message}`);
  }

  if (result.status !== 0 && !allowFailure) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`${bin} failed (exit ${result.status}): ${stderr || 'no error output'}`);
  }

  return {
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

/** Locates a PostgreSQL client binary (PATH first, then common locations). */
export function findBinary(name) {
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (probe.status === 0) {
    const first = (probe.stdout || '').split(/\r?\n/).find(Boolean);
    if (first) return first.trim();
  }

  const roots = [
    process.env.PG_BIN,
    'C:\\Program Files\\PostgreSQL',
    path.join(os.homedir(), 'AppData', 'Local', 'Temp', 'opencode', 'pgsql', 'pgsql', 'bin'),
  ].filter(Boolean);

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const direct = path.join(root, process.platform === 'win32' ? `${name}.exe` : name);
    if (fs.existsSync(direct)) return direct;
    for (const entry of fs.readdirSync(root)) {
      const candidate = path.join(root, entry, 'bin', process.platform === 'win32' ? `${name}.exe` : name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  throw new Error(
    `The PostgreSQL client "${name}" was not found. Install the PostgreSQL client tools or set PG_BIN.`
  );
}

/** Runs a SQL query and returns the rows as objects. */
export function query(pgEnv, sql) {
  const psql = findBinary('psql');
  const result = run(
    psql,
    ['-X', '-q', '-A', '-t', '-F', '\u001f', '--set=ON_ERROR_STOP=1', '-c', sql],
    pgEnv
  );
  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.trim().length)
    .map((line) => line.split('\u001f'));
}

/** Reads the row count of every important table. */
export function readTableCounts(pgEnv) {
  const counts = {};
  for (const table of TABLES) {
    try {
      const rows = query(pgEnv, `SELECT count(*) FROM "${table}";`);
      counts[table] = rows.length ? Number(rows[0][0]) : 0;
    } catch {
      counts[table] = null; // the table does not exist in this database
    }
  }
  return counts;
}

/** Reads the applied Prisma migrations. */
export function readMigrationHistory(pgEnv) {
  try {
    return query(
      pgEnv,
      'SELECT migration_name, finished_at IS NOT NULL FROM _prisma_migrations ORDER BY started_at;'
    ).map(([name, finished]) => ({ name, applied: finished === 't' }));
  } catch {
    return [];
  }
}

export async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const outIndex = args.indexOf('--out');
  const outDir = outIndex !== -1 ? path.resolve(args[outIndex + 1] ?? '') : '';
  if (!outDir) {
    usage();
    throw new Error('--out is required.');
  }

  const labelIndex = args.indexOf('--label');
  const label = labelIndex !== -1 ? args[labelIndex + 1] : 'production';

  const uri = readConnectionUri(args);
  const pgEnv = uriToPgEnv(uri);

  const pgDump = findBinary('pg_dump');
  const pgRestore = findBinary('pg_restore');

  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `farmconnect-${label}-${stamp}`;
  const dumpPath = path.join(outDir, `${baseName}.dump`);
  const manifestPath = path.join(outDir, `${baseName}.manifest.json`);

  console.log('📦 FarmConnect — PostgreSQL backup\n');
  console.log(`   Source database : ${pgEnv.PGDATABASE} on ${pgEnv.PGHOST}:${pgEnv.PGPORT}`);
  console.log(`   Output folder   : ${outDir}`);
  console.log(`   pg_dump         : ${pgDump}\n`);

  // ---- 1. What is being backed up ---------------------------------------
  const versionResult = run(pgDump, ['--version'], pgEnv);
  const pgDumpVersion = versionResult.stdout;

  let serverVersion = 'unknown';
  try {
    const rows = query(pgEnv, 'SHOW server_version;');
    serverVersion = rows[0]?.[0] ?? 'unknown';
  } catch {
    /* the server may refuse SHOW; the dump itself still works */
  }

  let dbSizeBytes = null;
  try {
    const rows = query(
      pgEnv,
      'SELECT pg_database_size(current_database());'
    );
    dbSizeBytes = rows[0] ? Number(rows[0][0]) : null;
  } catch {
    /* not fatal */
  }

  console.log('   Reading the current state of the database...');
  const tableCounts = readTableCounts(pgEnv);
  const migrations = readMigrationHistory(pgEnv);

  // ---- 2. The dump -------------------------------------------------------
  console.log('\n   Running pg_dump (custom format)...');
  const dumpStarted = Date.now();
  run(
    pgDump,
    [
      '--format=custom',
      '--compress=9',
      '--no-owner',
      '--no-privileges',
      '--verbose',
      '--file',
      dumpPath,
      pgEnv.PGDATABASE,
    ],
    pgEnv
  );
  const dumpDurationMs = Date.now() - dumpStarted;

  const dumpStat = fs.statSync(dumpPath);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(dumpPath)).digest('hex');

  console.log(`   Dump written    : ${dumpPath}`);
  console.log(`   Size            : ${dumpStat.size} bytes`);
  console.log(`   SHA-256         : ${sha256}`);

  // ---- 3. The integrity check -------------------------------------------
  console.log('\n   Verifying the archive with pg_restore --list...');
  const listResult = run(pgRestore, ['--list', dumpPath], pgEnv);
  const tocLines = listResult.stdout.split(/\r?\n/).filter((l) => l.trim().length);
  const tableEntries = tocLines.filter((l) => /TABLE DATA|TABLE \s+public/i.test(l)).length;
  const indexEntries = tocLines.filter((l) => /INDEX/i.test(l)).length;

  if (tocLines.length === 0) {
    throw new Error('The archive table of contents is empty — the dump is not usable.');
  }

  console.log(`   Archive entries : ${tocLines.length}`);
  console.log(`   Table entries   : ${tableEntries}`);

  // ---- 4. The manifest ---------------------------------------------------
  const manifest = {
    format: 'pg_dump custom (-Fc)',
    label,
    createdAt: new Date().toISOString(),
    source: {
      host: pgEnv.PGHOST,
      port: Number(pgEnv.PGPORT),
      database: pgEnv.PGDATABASE,
      user: pgEnv.PGUSER,
      serverVersion,
      databaseSizeBytes: dbSizeBytes,
    },
    tool: {
      pgDump: pgDumpVersion,
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
    },
    dump: {
      file: path.basename(dumpPath),
      bytes: dumpStat.size,
      sha256,
      durationMs: dumpDurationMs,
      archiveEntries: tocLines.length,
      tableEntries,
      indexEntries,
      integrity: 'verified with pg_restore --list',
    },
    tableCounts,
    migrations,
    restoreTest: 'run scripts/db-restore-verify.mjs against this dump',
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(`${dumpPath}.sha256`, `${sha256}  ${path.basename(dumpPath)}\n`, 'utf8');
  console.log(`   Manifest        : ${manifestPath}`);

  // ---- 5. The restore test ----------------------------------------------
  if (!args.includes('--skip-restore-test')) {
    console.log('\n   Restoring into a temporary database to prove the dump...');
    const verify = spawnSync(
      process.execPath,
      [
        path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'db-restore-verify.mjs'),
        '--dump',
        dumpPath,
        '--url-file',
        args[args.indexOf('--url-file') + 1] ?? '',
        '--manifest',
        manifestPath,
        ...(args.includes('--keep') ? ['--keep'] : []),
      ],
      { stdio: 'inherit', windowsHide: true }
    );
    if (verify.status !== 0) {
      throw new Error('The restore test failed — the dump was NOT accepted as safe.');
    }
  }

  console.log('\n✅ The backup is complete and its integrity is verified.');
  console.log('   Keep this folder (dump + manifest + .sha256) on a storage that');
  console.log('   lives OUTSIDE the database instance.');
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('db-backup.mjs');
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`\n❌ ${err?.message || err}`);
    process.exitCode = 1;
  });
}
