import {
  buildApmcBenchmarkIndex,
  canonicalCropKey,
  benchmarkPerKg,
  describeApmcBenchmark,
  selectApmcBenchmark,
  ApmcBenchmarkRow,
} from '../utils/apmcBenchmark';

const row = (overrides: Partial<ApmcBenchmarkRow> = {}): ApmcBenchmarkRow => ({
  commodity: 'Tomato',
  modalPrice: 2257.5,
  minPrice: 2100,
  maxPrice: 2400,
  state: 'Karnataka',
  district: 'Mandya',
  marketCenter: 'Mandya APMC',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('APMC benchmark resolution', () => {
  it('maps a published commodity onto the canonical crop name', () => {
    expect(canonicalCropKey('Tomato')).toBe('Tomato');
    expect(canonicalCropKey('Green Chilli')).toBe('Chilli');
    expect(canonicalCropKey('Tomato (Hybrid)')).toBe('Tomato');
    expect(canonicalCropKey('Not A Real Crop')).toBeNull();
    expect(canonicalCropKey('')).toBeNull();
    expect(canonicalCropKey(null)).toBeNull();
  });

  it('indexes the published rows by their canonical crop name', () => {
    const index = buildApmcBenchmarkIndex([
      row(),
      row({ commodity: 'Green Chilli', marketCenter: 'Chilli Yard' }),
      row({ commodity: 'Not A Real Crop' }),
    ]);

    expect(index.get('Tomato')).toHaveLength(1);
    expect(index.get('Chilli')).toHaveLength(1);
    // A commodity that cannot be mapped is not a benchmark for any listing.
    expect(index.has('Not A Real Crop')).toBe(false);
    expect(index.size).toBe(2);
  });

  it('has no benchmark for a crop that was never published', () => {
    const index = buildApmcBenchmarkIndex([row()]);

    expect(selectApmcBenchmark(index, 'Ragi')).toBeNull();
    expect(selectApmcBenchmark(index, null)).toBeNull();
    expect(selectApmcBenchmark(index, 'Not A Real Crop')).toBeNull();
  });

  it('prefers the benchmark of the listing\'s own state', () => {
    const index = buildApmcBenchmarkIndex([
      row({ state: 'Maharashtra', district: 'Pune', marketCenter: 'Pune APMC' }),
      row({ state: 'Karnataka', district: 'Mandya', marketCenter: 'Mandya APMC' }),
    ]);

    const selected = selectApmcBenchmark(index, 'Tomato', 'Mandya, Karnataka');
    expect(selected?.marketCenter).toBe('Mandya APMC');
  });

  it('falls back to the most recently published row', () => {
    const index = buildApmcBenchmarkIndex([
      row({ marketCenter: 'Old Yard', updatedAt: '2026-01-01T00:00:00.000Z' }),
      row({ marketCenter: 'New Yard', updatedAt: '2026-06-01T00:00:00.000Z' }),
    ]);

    const selected = selectApmcBenchmark(index, 'Tomato', 'Kerala');
    expect(selected?.marketCenter).toBe('New Yard');
  });

  it('converts the published quintal price into a per-kg price', () => {
    expect(benchmarkPerKg(row({ modalPrice: 2257.5 }))).toBe(22.575);
    expect(benchmarkPerKg(null)).toBeNull();
  });

  it('describes a published benchmark', () => {
    const index = buildApmcBenchmarkIndex([row()]);
    const described = describeApmcBenchmark(index, 'Tomato', 'Mandya, Karnataka');

    expect(described.mandiBenchmark).toBe(22.575);
    expect(described.mandiBenchmarkUnit).toBe('PER_KG');
    expect(described.mandiBenchmarkCommodity).toBe('Tomato');
    expect(described.mandiBenchmarkMarketCenter).toBe('Mandya APMC');
    expect(described.mandiBenchmarkState).toBe('Karnataka');
  });

  it('never invents a benchmark when nothing was published', () => {
    const index = buildApmcBenchmarkIndex([]);
    const described = describeApmcBenchmark(index, 'Tomato', 'Karnataka');

    // The value must be `null` — the clients show "not published yet"
    // instead of deriving a price from the farmer's own rate.
    expect(described.mandiBenchmark).toBeNull();
    expect(described.mandiBenchmarkCommodity).toBeNull();
    expect(described.mandiBenchmarkMarketCenter).toBeNull();
    expect(described.mandiBenchmarkState).toBeNull();
    expect(described.mandiBenchmarkUpdatedAt).toBeNull();
  });
});
