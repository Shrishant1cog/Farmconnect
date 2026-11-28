// Reads **real** published APMC market rates from a CSV file.
//
// This module deliberately contains **no** sample data and **no** fallback
// values: a row is either a faithful transcription of a published rate or it
// is rejected with a reason. The import script (backend/import-apmc-rates.ts)
// uses it to load the market's own bulletin into the shared database, so the
// clients can finally show a *published* benchmark instead of an invented one.
//
// The CSV format is documented in docs/APMC_RATE_IMPORT.md.

/** A published market rate — one row of the market's own bulletin. */
export interface ApmcRateRow {
  state: string;
  district: string;
  marketCenter: string;
  commodity: string;
  /** ₹ per quintal — the unit the market publishes in. */
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  /** The day the market published the rate. */
  updatedAt: Date;
}

/** A row that could not be used, together with the reason why. */
export interface ApmcRateRejection {
  /** The 1-based line number in the source file. */
  line: number;
  reason: string;
  /** The raw line, so the operator can find the entry in their file. */
  raw: string;
}

export interface ApmcRateParseResult {
  rows: ApmcRateRow[];
  rejected: ApmcRateRejection[];
  /** The header names that were found in the file. */
  header: string[];
}

/** The columns a rate file has to provide. */
const REQUIRED_COLUMNS = [
  'state',
  'district',
  'marketCenter',
  'commodity',
  'modalPrice',
  'minPrice',
  'maxPrice',
  'updatedAt',
] as const;

/**
 * The accepted header spellings.
 *
 * The market publishes its bulletin with different column names over time
 * ("Market Center" / "market_center" / "marketCenter"), so the importer
 * accepts the usual variants — but the **meaning** of a column never changes.
 */
const COLUMN_ALIASES: Record<string, string> = {
  state: 'state',
  district: 'district',
  marketcenter: 'marketCenter',
  market: 'marketCenter',
  marketcentre: 'marketCenter',
  commodity: 'commodity',
  modalprice: 'modalPrice',
  price: 'modalPrice',
  modal: 'modalPrice',
  minprice: 'minPrice',
  min: 'minPrice',
  maxprice: 'maxPrice',
  max: 'maxPrice',
  updatedat: 'updatedAt',
  updated: 'updatedAt',
  date: 'updatedAt',
  publicationdate: 'updatedAt',
  publishedat: 'updatedAt',
  tradingdate: 'updatedAt',
};

/** Normalises a header cell: lower case, without spaces or separators. */
function normalizeHeader(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_\-.]+/g, '');
}

/**
 * Splits one CSV line into its cells.
 *
 * A quoted cell may contain a comma and a doubled quote (`""`) stands for a
 * literal quote. A quoted cell may also span several physical lines, so the
 * parser works on the whole text instead of on one line at a time.
 */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let inQuotes = false;
  let cellStarted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.trim() === '') {
      // A quoted cell may be preceded by spaces — the spaces are not part of
      // the value.
      cell = '';
      inQuotes = true;
      cellStarted = true;
      continue;
    }

    if (char === ',') {
      record.push(cell);
      cell = '';
      cellStarted = false;
      continue;
    }

    if (char === '\r') continue;

    if (char === '\n') {
      record.push(cell);
      records.push(record);
      record = [];
      cell = '';
      cellStarted = false;
      continue;
    }

    cell += char;
    cellStarted = true;
  }

  // The last cell of a file that does not end with a newline.
  if (cell.length > 0 || record.length > 0) {
    record.push(cell);
    records.push(record);
  }

  return records;
}

/** Removes the wrapping quotes of a cell and trims it. */
function cleanCell(value: string): string {
  return value.trim();
}

/**
 * Parses a price cell.
 *
 * A price that is not a number is **not** replaced by a default — the row is
 * rejected, because a made-up price would be a fabricated benchmark.
 */
function parsePrice(value: string): number | null {
  const normalized = value.replace(/[\s,]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

/**
 * Parses the publication date.
 *
 * The market publishes the day of the rate, so the date is required: without
 * it the row could not be told apart from a later publication of the same
 * commodity, and the import would not be repeatable.
 *
 * `YYYY-MM-DD` is the recommended format. A `DD/MM/YYYY` date is accepted
 * only when it is **unambiguous** — the day part is above 12. A date that
 * could be read in two ways is rejected rather than guessed, because a
 * guessed publication date would misplace the rate.
 */
function parsePublishedAt(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // A plain `YYYY-MM-DD` is read as UTC midnight, so the date does not shift
  // when it is stored in a different time zone.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const parsed = new Date(
      Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // `DD/MM/YYYY` — only when the day cannot be a month.
  const dayFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    if (day > 12) {
      const parsed = new Date(Date.UTC(Number(dayFirst[3]), month - 1, day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Reads the rates of a CSV file.
 *
 * The result contains the usable rows and, for every unusable row, the reason
 * why it was rejected. A row is never silently dropped and no value is ever
 * invented — an empty or broken file simply yields no rows.
 */
export function parseApmcRateCsv(text: string): ApmcRateParseResult {
  const records = parseCsvRecords(text);
  const rows: ApmcRateRow[] = [];
  const rejected: ApmcRateRejection[] = [];

  // The first non-empty record is the header.
  let headerIndex = -1;
  for (let i = 0; i < records.length; i += 1) {
    if (records[i].some((cell) => cleanCell(cell).length > 0)) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return { rows, rejected, header: [] };
  }

  const headerCells = records[headerIndex].map((cell) => cleanCell(cell));
  const header = headerCells.map(normalizeHeader);

  // Map every header cell to the column it provides.
  const columnOf: Record<string, number> = {};
  header.forEach((name, index) => {
    const column = COLUMN_ALIASES[name];
    if (column && columnOf[column] === undefined) {
      columnOf[column] = index;
    }
  });

  const missing = REQUIRED_COLUMNS.filter((column) => columnOf[column] === undefined);
  if (missing.length > 0) {
    // Without the required columns the file cannot be read at all. The
    // rejection is reported against the header line.
    rejected.push({
      line: headerIndex + 1,
      reason: `the file is missing the column(s): ${missing.join(', ')}`,
      raw: headerCells.join(','),
    });
    return { rows, rejected, header: headerCells };
  }

  const cellAt = (record: string[], column: string): string =>
    cleanCell(record[columnOf[column]] ?? '');

  for (let i = headerIndex + 1; i < records.length; i += 1) {
    const record = records[i];
    const line = i + 1;

    // Skip a completely empty line.
    if (record.every((cell) => cleanCell(cell).length === 0)) continue;

    const raw = record.join(',');

    const state = cellAt(record, 'state');
    const district = cellAt(record, 'district');
    const marketCenter = cellAt(record, 'marketCenter');
    const commodity = cellAt(record, 'commodity');

    const missingText = [
      !state && 'state',
      !district && 'district',
      !marketCenter && 'marketCenter',
      !commodity && 'commodity',
    ].filter(Boolean);

    if (missingText.length > 0) {
      rejected.push({
        line,
        reason: `the value(s) ${missingText.join(', ')} are empty`,
        raw,
      });
      continue;
    }

    const modalPrice = parsePrice(cellAt(record, 'modalPrice'));
    const minPrice = parsePrice(cellAt(record, 'minPrice'));
    const maxPrice = parsePrice(cellAt(record, 'maxPrice'));

    if (modalPrice === null || minPrice === null || maxPrice === null) {
      const unparsable = [
        modalPrice === null && 'modalPrice',
        minPrice === null && 'minPrice',
        maxPrice === null && 'maxPrice',
      ].filter(Boolean);
      rejected.push({
        line,
        reason: `the price(s) ${unparsable.join(', ')} are not a number`,
        raw,
      });
      continue;
    }

    if (modalPrice <= 0 || minPrice <= 0 || maxPrice <= 0) {
      rejected.push({ line, reason: 'a price is not greater than zero', raw });
      continue;
    }

    if (minPrice > modalPrice || modalPrice > maxPrice) {
      rejected.push({
        line,
        reason: `the prices are inconsistent (min ${minPrice}, modal ${modalPrice}, max ${maxPrice})`,
        raw,
      });
      continue;
    }

    const updatedAt = parsePublishedAt(cellAt(record, 'updatedAt'));
    if (!updatedAt) {
      rejected.push({
        line,
        reason: 'the publication date is missing or cannot be read',
        raw,
      });
      continue;
    }

    rows.push({
      state,
      district,
      marketCenter,
      commodity,
      modalPrice,
      minPrice,
      maxPrice,
      updatedAt,
    });
  }

  return { rows, rejected, header: headerCells };
}
