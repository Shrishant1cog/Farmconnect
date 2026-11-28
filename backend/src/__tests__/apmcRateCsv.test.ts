import {
  parseApmcRateCsv,
  parseCsvRecords,
} from '../utils/apmcRateCsv';

/**
 * The importer is the way **real** benchmark rows reach the shared database,
 * so it has to be strict:
 *
 *   * a row that cannot be read is rejected with a reason — it is never
 *     silently dropped,
 *   * a missing or malformed value is never replaced by a default, because a
 *     default price would be a fabricated benchmark,
 *   * an empty or broken file yields **no** rows at all.
 */
describe('APMC rate CSV — the importer never invents a row', () => {
  const HEADER =
    'state,district,marketCenter,commodity,modalPrice,minPrice,maxPrice,updatedAt';

  it('reads a published rate', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,Tomato,2257.5,1800,2800,2026-11-27\n`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      state: 'Karnataka',
      district: 'Mandya',
      marketCenter: 'Mandya APMC',
      commodity: 'Tomato',
      modalPrice: 2257.5,
      minPrice: 1800,
      maxPrice: 2800,
    });
    expect(result.rows[0].updatedAt.toISOString().slice(0, 10)).toBe('2026-11-27');
    expect(result.rejected).toHaveLength(0);
  });

  it('accepts the usual header spellings of the market bulletin', () => {
    const result = parseApmcRateCsv(
      'State,District,Market Center,Commodity,Modal Price,Min Price,Max Price,Date\n' +
        'Karnataka,Mandya,Mandya APMC,Ragi,2385,2100,2600,2026-11-27\n',
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].commodity).toBe('Ragi');
    expect(result.rows[0].marketCenter).toBe('Mandya APMC');
  });

  it('returns no row for an empty file', () => {
    const result = parseApmcRateCsv('');

    expect(result.rows).toHaveLength(0);
    expect(result.header).toHaveLength(0);
  });

  it('returns no row for a file that only carries the header', () => {
    const result = parseApmcRateCsv(`${HEADER}\n`);

    expect(result.rows).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects a file that misses a required column', () => {
    const result = parseApmcRateCsv(
      'state,district,commodity,modalPrice,minPrice,maxPrice,updatedAt\n' +
        'Karnataka,Mandya,Tomato,2257.5,1800,2800,2026-11-27\n',
    );

    expect(result.rows).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('marketCenter');
  });

  it('rejects a row whose price is not a number instead of defaulting it', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,Tomato,n/a,1800,2800,2026-11-27\n`,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.rejected[0].reason).toContain('modalPrice');
    expect(result.rejected[0].reason).toContain('not a number');
  });

  it('rejects a row whose prices contradict each other', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,Tomato,1000,1800,2800,2026-11-27\n`,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.rejected[0].reason).toContain('inconsistent');
  });

  it('rejects a row whose publication date is missing', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,Tomato,2257.5,1800,2800,\n`,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.rejected[0].reason).toContain('publication date');
  });

  it('rejects a row with an empty commodity', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,,2257.5,1800,2800,2026-11-27\n`,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.rejected[0].reason).toContain('commodity');
  });

  it('keeps the good rows and reports every bad one', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\n` +
        'Karnataka,Mandya,Mandya APMC,Tomato,2257.5,1800,2800,2026-11-27\n' +
        'Karnataka,Mandya,Mandya APMC,Ragi,n/a,2100,2600,2026-11-27\n' +
        'Karnataka,Mandya,Mandya APMC,Chilli,9000,8000,10000,2026-11-27\n',
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].line).toBe(3);
  });

  it('reads a quoted cell that contains a comma', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,"Mandya APMC, Yard 2",Tomato,2257.5,1800,2800,2026-11-27\n`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].marketCenter).toBe('Mandya APMC, Yard 2');
  });

  it('reads a cell that contains an escaped quote', () => {
    const records = parseCsvRecords('a,"b""c",d\n');

    expect(records).toEqual([['a', 'b"c', 'd']]);
  });

  it('reads a file with CRLF line endings', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\r\nKarnataka,Mandya,Mandya APMC,Tomato,2257.5,1800,2800,2026-11-27\r\n`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].commodity).toBe('Tomato');
  });

  it('reads a quoted cell that is preceded by a space', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya, "Mandya APMC",Tomato,2257.5,1800,2800,2026-11-27\n`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].marketCenter).toBe('Mandya APMC');
  });

  it('reads an unambiguous day-first date', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,Tomato,2257.5,1800,2800,27/11/2026\n`,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].updatedAt.toISOString().slice(0, 10)).toBe('2026-11-27');
  });

  it('rejects an ambiguous date instead of guessing it', () => {
    const result = parseApmcRateCsv(
      `${HEADER}\nKarnataka,Mandya,Mandya APMC,Tomato,2257.5,1800,2800,05/11/2026\n`,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.rejected[0].reason).toContain('publication date');
  });
});
