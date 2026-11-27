// Fallback Haversine formula calculation if geo utility is unavailable
const haversineFallback = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Safe resolution of calculateDistanceKm from utils/geo
let calculateDistanceKm: (lat1: number, lon1: number, lat2: number, lon2: number) => number = haversineFallback;
try {
  const geoUtils = require('../utils/geo');
  if (typeof geoUtils.calculateDistanceKm === 'function') {
    calculateDistanceKm = geoUtils.calculateDistanceKm;
  }
} catch {
  // Use haversineFallback
}

export const CONTAINER_COST_MATRIX = {
  STANDARD_CRATE: {
    label: 'Standard Plastic Crates / Sacks',
    costPerKg: 0.5,
    tempControlled: false,
  },
  COLD_CHAIN_REFRIGERATED: {
    label: 'Active Cold Storage Refrigerated Carrier (0°C - 4°C)',
    costPerKg: 3.5,
    tempControlled: true,
  },
  MOISTURE_CONTROLLED: {
    label: 'Moisture-Shielded Dry Container',
    costPerKg: 1.8,
    tempControlled: false,
  },
  VENTILATED_JUTE: {
    label: 'Open-Mesh Ventilated Jute Packs',
    costPerKg: 0.3,
    tempControlled: false,
  },
} as const;

export type ContainerTypeKey = keyof typeof CONTAINER_COST_MATRIX;

export interface LogisticsQuoteInput {
  cropQuantityKg: number;
  farmerPricePerKg: number;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  containerType?: ContainerTypeKey | string;
  apmcModalPricePerQuintal?: number;
}

export interface LogisticsBreakdown {
  baseFreightCost: number;
  specialContainerCost: number;
  totalTransportAndLogistics: number;
  farmerProduceCost: number;
  totalLandedCost: number;
}

export interface ProfitAssessment {
  /**
   * The **published** APMC benchmark in ₹ per kg, or `null` when no benchmark
   * was supplied. It is never derived from the farmer's own price — an
   * invented benchmark would be a fake number.
   */
  apmcBenchmarkRatePerKg: number | null;
  expectedApmcValue: number | null;
  approxNetProfit: number | null;
  profitMarginPercent: string | null;
  isProfitable: boolean | null;
  /** True when a real APMC benchmark was part of the calculation. */
  hasApmcBenchmark: boolean;
}

export interface LogisticsQuoteResult {
  distanceKm: number;
  containerTypeSelected: string;
  breakdown: LogisticsBreakdown;
  profitAssessment: ProfitAssessment;
}

const MINIMUM_BASE_DISPATCH_FEE = 150.0; // Flat minimum flag-drop fee (₹)
const BASE_RATE_PER_KM = 14.0; // ₹14/km standard rural transport tempo rate

/**
 * Computes the freight and the APMC parity of a load.
 *
 * Every input has to be a **real** value: the quantity, the farmer's price
 * and the four coordinates are mandatory, and the APMC benchmark is optional.
 * When no benchmark was published the profit assessment is reported as
 * "unknown" (`null`) instead of being derived from the farmer's own price.
 */
export function computeLogisticsAndProfit(params: LogisticsQuoteInput): LogisticsQuoteResult {
  const cropQuantityKg = Math.max(0, parseFloat(String(params?.cropQuantityKg)) || 0);
  const farmerPricePerKg = Math.max(0, parseFloat(String(params?.farmerPricePerKg)) || 0);

  // The coordinates are mandatory — a fabricated position would produce a
  // fabricated distance and a fabricated freight cost.
  const originLat = parseFloat(String(params?.originLat));
  const originLon = parseFloat(String(params?.originLon));
  const destLat = parseFloat(String(params?.destLat));
  const destLon = parseFloat(String(params?.destLon));

  const apmcModalPricePerQuintal = Math.max(0, parseFloat(String(params?.apmcModalPricePerQuintal)) || 0);

  // 1. Calculate Great-Circle Distance
  let rawDistance = calculateDistanceKm(originLat, originLon, destLat, destLon);
  if (isNaN(rawDistance) || rawDistance < 0) {
    rawDistance = haversineFallback(originLat, originLon, destLat, destLon);
  }
  const distanceKm = Math.max(0.5, rawDistance);

  // 2. Freight Pricing (Distance * Rate with minimum dispatch tariff guarantee)
  const calculatedMileageCost = distanceKm * BASE_RATE_PER_KM;
  const baseFreightCost = Math.max(MINIMUM_BASE_DISPATCH_FEE, calculatedMileageCost);

  // 3. Packaging & Container Calculation
  const requestedKey = String(params?.containerType || 'STANDARD_CRATE').toUpperCase().trim();
  const selectedKey: ContainerTypeKey = requestedKey in CONTAINER_COST_MATRIX
    ? (requestedKey as ContainerTypeKey)
    : 'STANDARD_CRATE';

  const containerRule = CONTAINER_COST_MATRIX[selectedKey];
  const specialContainerCost = cropQuantityKg * containerRule.costPerKg;
  const totalTransportCost = baseFreightCost + specialContainerCost;

  // 4. Farm Produce & Total Landed Cost
  const farmerProduceCost = cropQuantityKg * farmerPricePerKg;
  const totalLandedCost = farmerProduceCost + totalTransportCost;

  // 5. APMC Market Parity & Profitability (1 Quintal = 100 KG)
  //
  //    Without a published benchmark there is no honest profit statement:
  //    the assessment stays unknown instead of borrowing the farmer's price.
  const hasApmcBenchmark = apmcModalPricePerQuintal > 0;
  const apmcRatePerKg = hasApmcBenchmark ? apmcModalPricePerQuintal / 100 : null;
  const expectedApmcMarketValue = apmcRatePerKg === null ? null : cropQuantityKg * apmcRatePerKg;
  const approxNetProfit =
    expectedApmcMarketValue === null ? null : expectedApmcMarketValue - totalLandedCost;

  const rawMargin =
    approxNetProfit === null || totalLandedCost <= 0 ? null : (approxNetProfit / totalLandedCost) * 100;

  return {
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    containerTypeSelected: containerRule.label,
    breakdown: {
      baseFreightCost: parseFloat(baseFreightCost.toFixed(2)),
      specialContainerCost: parseFloat(specialContainerCost.toFixed(2)),
      totalTransportAndLogistics: parseFloat(totalTransportCost.toFixed(2)),
      farmerProduceCost: parseFloat(farmerProduceCost.toFixed(2)),
      totalLandedCost: parseFloat(totalLandedCost.toFixed(2)),
    },
    profitAssessment: {
      apmcBenchmarkRatePerKg: apmcRatePerKg === null ? null : parseFloat(apmcRatePerKg.toFixed(2)),
      expectedApmcValue:
        expectedApmcMarketValue === null ? null : parseFloat(expectedApmcMarketValue.toFixed(2)),
      approxNetProfit: approxNetProfit === null ? null : parseFloat(approxNetProfit.toFixed(2)),
      profitMarginPercent: rawMargin === null ? null : `${rawMargin.toFixed(1)}%`,
      isProfitable: approxNetProfit === null ? null : approxNetProfit > 0,
      hasApmcBenchmark,
    },
  };
}

export const calculateFreightQuote = computeLogisticsAndProfit;

export default {
  CONTAINER_COST_MATRIX,
  computeLogisticsAndProfit,
  calculateFreightQuote,
};