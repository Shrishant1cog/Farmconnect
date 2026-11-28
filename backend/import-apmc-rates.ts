// Loads **real** published APMC market rates into the shared database.
//
//   npm run db:apmc-rates -- path/to/rates.csv
//   npm run db:apmc-rates -- path/to/rates.csv --dry-run
//
// The file is the market's own bulletin — see docs/APMC_RATE_IMPORT.md for
// the format. The script never invents a row: it either stores what the file
// contains or it reports why a row could not be used.
//
// The import is **repeatable**: a rate is identified by its publication key
// (state, district, market centre, commodity, publication date), so running
// the import again updates the prices of the same publication instead of
// piling up duplicates.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import process from 'process';

import { parseApmcRateCsv } from './src/utils/apmcRateCsv';
import { findCatalogueEntry } from './src/data/cropCatalog';

const prisma = new PrismaClient();

interface Options {
  /** The rate file to read. */
  file: string;
  /** When true the file is only validated — nothing is written. */
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const dryRun = argv.includes('--dry-run');
  const file =
    positional[0] ||
    process.env.APMC_RATES_CSV ||
    path.join(__dirname, 'data', 'apmc-rates.csv');

  return { file, dryRun };
}

async function main() {
  const { file, dryRun } = parseArgs(process.argv.slice(2));
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

  console.log('📈 Loading published APMC market rates into the FarmConnect DB...\n');
  console.log(`   file    : ${absolute}`);
  console.log(`   mode    : ${dryRun ? 'dry run (nothing is written)' : 'write'}\n`);

  if (!fs.existsSync(absolute)) {
    console.error(
      `❌ The rate file does not exist: ${absolute}\n` +
        '   The import only accepts a real rate file — it never generates one.\n' +
        '   See docs/APMC_RATE_IMPORT.md for the format.',
    );
    process.exitCode = 1;
    return;
  }

  const text = fs.readFileSync(absolute, 'utf8');
  const { rows, rejected, header } = parseApmcRateCsv(text);

  if (header.length === 0) {
    console.error('❌ The rate file is empty — there is no header row.');
    process.exitCode = 1;
    return;
  }

  if (rows.length === 0) {
    console.error(
      '❌ The rate file does not contain a single usable rate row. ' +
        'Nothing was written.',
    );
    for (const rejection of rejected.slice(0, 20)) {
      console.error(`   line ${rejection.line}: ${rejection.reason}`);
    }
    if (rejected.length > 20) {
      console.error(`   … and ${rejected.length - 20} more rejected row(s).`);
    }
    process.exitCode = 1;
    return;
  }

  // How many of the published commodities resolve to the shared crop
  // catalogue. Only those become a benchmark for a listing — the report says
  // so plainly, because an unmapped commodity is **not** a usable benchmark.
  const mapped = rows.filter((row) => findCatalogueEntry(row.commodity) !== null);
  const unmapped = rows.filter((row) => findCatalogueEntry(row.commodity) === null);

  console.log(`   read    : ${rows.length} usable rate row(s)`);
  console.log(`   mapped  : ${mapped.length} commodity/commodities resolve to the crop catalogue`);
  if (unmapped.length > 0) {
    const names = [...new Set(unmapped.map((row) => row.commodity))].slice(0, 15);
    console.log(
      `   unmapped: ${unmapped.length} row(s) — ${names.join(', ')}${
        unmapped.length > names.length ? ', …' : ''
      }`,
    );
    console.log('             (these rows are published, but they do not become a benchmark)');
  }

  if (rejected.length > 0) {
    console.log(`\n⚠️  ${rejected.length} row(s) were rejected:`);
    for (const rejection of rejected.slice(0, 20)) {
      console.log(`   line ${rejection.line}: ${rejection.reason}`);
      console.log(`      ${rejection.raw}`);
    }
    if (rejected.length > 20) {
      console.log(`   … and ${rejected.length - 20} more rejected row(s).`);
    }
  }

  if (dryRun) {
    console.log('\n✅ Dry run finished — nothing was written to the database.');
    return;
  }

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    // The publication key is enforced by the database
    // (`ApmcMarketRate_publication_key`), so the upsert is atomic: running
    // the import again updates the prices of the same publication instead
    // of piling up duplicate rows.
    const publicationKey = {
      state: row.state,
      district: row.district,
      marketCenter: row.marketCenter,
      commodity: row.commodity,
      updatedAt: row.updatedAt,
    };

    const existing = await prisma.apmcMarketRate.findUnique({
      where: { ApmcMarketRate_publication_key: publicationKey },
      select: { id: true },
    });

    if (existing) {
      await prisma.apmcMarketRate.update({
        where: { id: existing.id },
        data: {
          modalPrice: row.modalPrice,
          minPrice: row.minPrice,
          maxPrice: row.maxPrice,
        },
      });
      updated += 1;
    } else {
      await prisma.apmcMarketRate.create({
        data: {
          ...publicationKey,
          modalPrice: row.modalPrice,
          minPrice: row.minPrice,
          maxPrice: row.maxPrice,
        },
      });
      inserted += 1;
    }
  }

  const total = await prisma.apmcMarketRate.count();

  console.log(`\n✅ Import complete: ${inserted} row(s) inserted, ${updated} row(s) updated.`);
  console.log(`   the shared database now holds ${total} published APMC rate row(s).`);
  console.log('   Both clients read them through GET /api/apmc/rates — no client invents a benchmark.');
}

main()
  .catch((err) => {
    console.error('❌ Error importing the APMC rates:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
