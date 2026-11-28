// Resolves the **published** APMC benchmark of a crop.
//
// The shared database holds exactly those benchmark rows that were really
// published by the market. Nothing is ever invented here: a crop without a
// published row simply has **no** benchmark, and the clients show an honest
// "not published yet" state instead of a made-up price.
//
// The market publishes the modal price in ₹ per **quintal** (100 kg), while a
// listing is priced per kg — so the benchmark is converted to a per-kg value
// before it is compared with the farmer's own price.

import { db } from '../config/db';
import { findCatalogueEntry } from '../data/cropCatalog';

/** The market publishes ₹ per quintal. */
export const KG_PER_QUINTAL = 100;

export interface ApmcBenchmarkRow {
  commodity: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  state: string;
  district: string;
  marketCenter: string;
  updatedAt?: Date | string | null;
}

/** The benchmark fields that are attached to a listing. */
export interface ApmcBenchmark {
  /** ₹ per kg — `null` when the crop has no published benchmark. */
  mandiBenchmark: number | null;
  mandiBenchmarkUnit: 'PER_KG';
  mandiBenchmarkCommodity: string | null;
  mandiBenchmarkMarketCenter: string | null;
  mandiBenchmarkState: string | null;
  mandiBenchmarkUpdatedAt: string | null;
}

export type ApmcBenchmarkIndex = Map<string, ApmcBenchmarkRow[]>;

/**
 * The canonical catalogue name of a published commodity.
 *
 * The market publishes the commodity with its own wording ("Tomato",
 * "Green Chilli", "Tomato (Hybrid)"), so the lookup is tolerant — but a
 * commodity that cannot be mapped to the shared crop catalogue is **not** a
 * benchmark for any listing.
 */
export function canonicalCropKey(commodity: string | null | undefined): string | null {
  const entry = findCatalogueEntry(commodity);
  return entry ? entry.name : null;
}

/** Groups the published rows by the canonical crop name. */
export function buildApmcBenchmarkIndex(rows: ApmcBenchmarkRow[]): ApmcBenchmarkIndex {
  const index: ApmcBenchmarkIndex = new Map();

  for (const row of rows) {
    const key = canonicalCropKey(row?.commodity);
    if (!key) continue;

    const list = index.get(key) ?? [];
    list.push(row);
    index.set(key, list);
  }

  return index;
}

/**
 * Picks the benchmark that is most useful for a listing.
 *
 * A row from the listing's own state wins, then the one from its district,
 * and the most recently published row breaks the remaining tie. `null` when
 * the crop has no published benchmark at all.
 */
export function selectApmcBenchmark(
  index: ApmcBenchmarkIndex,
  cropName: string | null | undefined,
  location?: string | null,
): ApmcBenchmarkRow | null {
  const key = canonicalCropKey(cropName);
  if (!key) return null;

  const rows = index.get(key);
  if (!rows || rows.length === 0) return null;

  const loc = (location || '').trim().toLowerCase();

  const localityScore = (row: ApmcBenchmarkRow): number => {
    const state = (row.state || '').trim().toLowerCase();
    const district = (row.district || '').trim().toLowerCase();
    let score = 0;
    if (state && loc.includes(state)) score += 2;
    if (district && loc.includes(district)) score += 1;
    return score;
  };

  const publishedAt = (row: ApmcBenchmarkRow): number => {
    if (!row.updatedAt) return 0;
    const parsed = new Date(row.updatedAt).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [...rows].sort((a, b) => {
    const byLocality = localityScore(b) - localityScore(a);
    if (byLocality !== 0) return byLocality;
    return publishedAt(b) - publishedAt(a);
  })[0];
}

/** ₹ per kg — the unit a listing is priced in. */
export function benchmarkPerKg(row: ApmcBenchmarkRow | null): number | null {
  if (!row || !Number.isFinite(row.modalPrice)) return null;
  return row.modalPrice / KG_PER_QUINTAL;
}

/** The benchmark that is attached to a listing. */
export function describeApmcBenchmark(
  index: ApmcBenchmarkIndex,
  cropName: string | null | undefined,
  location?: string | null,
): ApmcBenchmark {
  const row = selectApmcBenchmark(index, cropName, location);

  if (!row) {
    return {
      mandiBenchmark: null,
      mandiBenchmarkUnit: 'PER_KG',
      mandiBenchmarkCommodity: null,
      mandiBenchmarkMarketCenter: null,
      mandiBenchmarkState: null,
      mandiBenchmarkUpdatedAt: null,
    };
  }

  return {
    mandiBenchmark: benchmarkPerKg(row),
    mandiBenchmarkUnit: 'PER_KG',
    mandiBenchmarkCommodity: row.commodity,
    mandiBenchmarkMarketCenter: row.marketCenter,
    mandiBenchmarkState: row.state,
    mandiBenchmarkUpdatedAt: row.updatedAt
      ? new Date(row.updatedAt).toISOString()
      : null,
  };
}

/**
 * Loads every published benchmark row of the shared database.
 *
 * The table is small (one row per market yard and commodity), so a single
 * read is enough. A missing table or a failing query yields an **empty**
 * index — the clients then show their honest "not published yet" state
 * instead of an invented price.
 */
export async function loadApmcBenchmarkIndex(): Promise<ApmcBenchmarkIndex> {
  try {
    const model = (db as any).apmcMarketRate;
    if (!model) return new Map();

    const rows = (await model.findMany({ take: 500 })) as ApmcBenchmarkRow[];
    return buildApmcBenchmarkIndex(Array.isArray(rows) ? rows : []);
  } catch {
    return new Map();
  }
}
