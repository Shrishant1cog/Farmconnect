// Restores a FarmConnect backup into a **throwaway** database and proves that
// the restored database really contains the expected tables, the Prisma
// migration history and the data.
//
//   node scripts/db-restore-verify.mjs --dump C:\backups\farmconnect\....dump
//   node scripts/db-restore-verify.mjs --dump ... --manifest ....manifest.json --keep
//
// What it does
// ------------
//   1. Creates a temporary database (`farmconnect_restore_test_<timestamp>`)
//      on the **same server**. It never touches the source database: the
//      temporary database has its own name and is dropped again at the end
//      (unless `--keep` is given).
//   2. Restores the dump with `pg_restore --exit-on-error`.
//   3. Compares the restored row counts with the counts recorded in the
//      manifest of the backup. A difference means the backup is incomplete.
//   4. Compares the restored Prisma migration history with the manifest.
//   5. Checks that the important tables really exist.
//   6. Drops the temporary database.
//
// The connection to the server is read from `--url-file`, `--url-env` or
// `DATABASE_URL` and is never printed. Only the **database name** of the
// temporary database is shown.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { uriToPgEnv, findBinary, run, query } from './db-backup.mjs';

function usage() {
  console.log(`
FarmConnect — restore verification

  node scripts/db-restore-verify.mjs --dump <file.dump> [options]

Options
  --dump <file>        The dump produced by db-backup.mjs (required)
  --manifest <file>    The manifest of that backup (default: next to the dump)
  --url-file <path>    File whose first line is the connection URI
  --url-env <name>     Environment variable holding the connection URI
  --keep               Keep the temporary database instead of dropping it
  --help               Show this text

The source database is never modified. The test runs against a separate
database that is created and dropped again.
`);
}

function readConnectionUri(args) {
  const fileIndex = args.indexOf('--url-file');
  if (fileIndex !== -1) {
    const file = path.resolve(args[fileIndex + 1] ?? '');
    if (!fs.existsSync(file)) throw new Error(`The connection file does not exist: ${file}`);
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

const REQUIRED_TABLES = ['User', 'Product', 'Order', 'ApmcMarketRate', 'Category'];

export async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const dumpIndex = args.indexOf('--dump');
  const dumpPath = dumpIndex !== -1 ? path.resolve(args[dumpIndex + 1] ?? '') : '';
  if (!dumpPath || !fs.existsSync(dumpPath)) {
    usage();
    throw new Error('--dump must point to an existing dump file.');
  }

  const manifestIndex = args.indexOf('--manifest');
  const manifestPath =
    manifestIndex !== -1
      ? path.resolve(args[manifestIndex + 1] ?? '')
      : dumpPath.replace(/\.dump$/, '.manifest.json');

  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  const uri = readConnectionUri(args);
  const pgEnv = uriToPgEnv(uri);

  const createdb = findBinary('createdb');
  const dropdb = findBinary('dropdb');
  const pgRestore = findBinary('pg_restore');

  const stamp = Date.now().toString(36);
  const testDb = `farmconnect_restore_test_${stamp}`;

  console.log('🧪 FarmConnect — restore verification\n');
  console.log(`   Dump file       : ${dumpPath}`);
  console.log(`   Temporary database: ${testDb}`);
  console.log(`   Source database : ${pgEnv.PGDATABASE} (never modified)\n`);

  // ---- 1. The temporary database ----------------------------------------
  run(createdb, ['--host', pgEnv.PGHOST, '--port', pgEnv.PGPORT, '--username', pgEnv.PGUSER, testDb], pgEnv);
  console.log('   Temporary database created.');

  let keep = false;
  const failures = [];

  try {
    // ---- 2. The restore -------------------------------------------------
    console.log('\n   Restoring the dump...');
    const restore = run(
      pgRestore,
      [
        '--exit-on-error',
        '--verbose',
        '--no-owner',
        '--no-privileges',
        '--dbname',
        testDb,
        '--host',
        pgEnv.PGHOST,
        '--port',
        pgEnv.PGPORT,
        '--username',
        pgEnv.PGUSER,
        dumpPath,
      ],
      pgEnv
    );
    // `pg_restore --verbose` writes its progress to stderr when the output
    // is not a terminal, so both streams are counted.
    const restoreLines = `${restore.stdout}\n${restore.stderr}`
      .split(/\r?\n/)
      .filter((l) => l.trim().length).length;
    console.log(`   Restore finished (${restoreLines} entries restored).`);

    const testEnv = { ...pgEnv, PGDATABASE: testDb };

    // ---- 3. The tables --------------------------------------------------
    console.log('\n   Checking the restored tables...');
    const tableRows = query(
      testEnv,
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`
    );
    const tables = tableRows.map((r) => r[0]);
    console.log(`   Tables in the restored database: ${tables.length}`);

    for (const required of REQUIRED_TABLES) {
      if (!tables.includes(required)) {
        failures.push(`The table "${required}" is missing in the restored database.`);
      }
    }

    // ---- 4. The migration history ---------------------------------------
    console.log('\n   Checking the Prisma migration history...');
    let restoredMigrations = [];
    try {
      restoredMigrations = query(
        testEnv,
        'SELECT migration_name, finished_at IS NOT NULL FROM _prisma_migrations ORDER BY started_at;'
      ).map(([name, finished]) => ({ name, applied: finished === 't' }));
    } catch {
      failures.push('The table "_prisma_migrations" is missing in the restored database.');
    }

    console.log(`   Migrations in the restored database: ${restoredMigrations.length}`);
    restoredMigrations.forEach((m) => {
      console.log(`      • ${m.name}${m.applied ? '' : '  (NOT finished)'}`);
      if (!m.applied) {
        failures.push(`The migration "${m.name}" was not finished in the source database.`);
      }
    });

    if (manifest?.migrations?.length) {
      const sourceNames = manifest.migrations.map((m) => m.name);
      const restoredNames = restoredMigrations.map((m) => m.name);
      const missing = sourceNames.filter((n) => !restoredNames.includes(n));
      if (missing.length) {
        failures.push(`These migrations are missing after the restore: ${missing.join(', ')}`);
      } else {
        console.log('   ✅ The migration history matches the manifest of the backup.');
      }
    }

    // ---- 5. The data ----------------------------------------------------
    console.log('\n   Comparing the row counts with the backup manifest...');
    const counts = {};
    for (const table of Object.keys(manifest?.tableCounts ?? {})) {
      try {
        const rows = query(testEnv, `SELECT count(*) FROM "${table}";`);
        counts[table] = rows.length ? Number(rows[0][0]) : 0;
      } catch {
        counts[table] = null;
      }
    }

    console.log('');
    console.log('   table                     source   restored   result');
    console.log('   -------------------------------------------------------');
    for (const [table, sourceCount] of Object.entries(manifest?.tableCounts ?? {})) {
      const restoredCount = counts[table];
      let result;
      if (restoredCount === null) {
        result = 'MISSING';
        failures.push(`The table "${table}" could not be read in the restored database.`);
      } else if (sourceCount === null) {
        result = 'n/a (not in source)';
      } else if (sourceCount === restoredCount) {
        result = '✅ equal';
      } else {
        result = '❌ DIFFERENT';
        failures.push(
          `The row count of "${table}" is ${restoredCount} after the restore, but the backup recorded ${sourceCount}.`
        );
      }
      console.log(
        `   ${table.padEnd(24)} ${String(sourceCount).padStart(7)} ${String(restoredCount).padStart(10)}   ${result}`
      );
    }

    // ---- 6. A real query on the restored data ---------------------------
    try {
      const users = query(testEnv, 'SELECT count(*) FROM "User";');
      const admins = query(testEnv, `SELECT count(*) FROM "User" WHERE role='ADMIN';`);
      console.log(`\n   The restored database holds ${users[0][0]} users (${admins[0][0]} administrators).`);
    } catch {
      /* reported through the table checks above */
    }
  } finally {
    if (!keep) {
      console.log('\n   Dropping the temporary database...');
      run(dropdb, ['--if-exists', '--host', pgEnv.PGHOST, '--port', pgEnv.PGPORT, '--username', pgEnv.PGUSER, testDb], pgEnv);
      console.log('   Temporary database dropped.');
    } else {
      keep = true;
      console.log(`\n   The temporary database "${testDb}" was kept (--keep).`);
    }
  }

  if (failures.length) {
    console.error('\n❌ The restore test FAILED:\n');
    failures.forEach((f) => console.error(`   • ${f}`));
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ The restore test PASSED — the backup restores into a usable database.');
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('db-restore-verify.mjs');
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`\n❌ ${err?.message || err}`);
    process.exitCode = 1;
  });
}
