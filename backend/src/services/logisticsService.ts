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
  apmcBenchmarkRatePerKg: number;
  expectedApmcValue: number;
  approxNetProfit: number;
  profitMarginPercent: string;
  isProfitable: boolean;
}

export interface LogisticsQuoteResult {
  distanceKm: number;
  containerTypeSelected: string;
  breakdown: LogisticsBreakdown;
  profitAssessment: ProfitAssessment;
}

const MINIMUM_BASE_DISPATCH_FEE = 150.0; // Flat minimum flag-drop fee (₹)
const BASE_RATE_PER_KM = 14.0; // ₹14/km standard rural transport tempo rate

export function computeLogisticsAndProfit(params: LogisticsQuoteInput): LogisticsQuoteResult {
  const cropQuantityKg = Math.max(0, parseFloat(String(params?.cropQuantityKg)) || 0);
  const farmerPricePerKg = Math.max(0, parseFloat(String(params?.farmerPricePerKg)) || 0);
  const originLat = parseFloat(String(params?.originLat)) || 12.5218;
  const originLon = parseFloat(String(params?.originLon)) || 76.8951;
  const destLat = parseFloat(String(params?.destLat)) || 12.9716;
  const destLon = parseFloat(String(params?.destLon)) || 77.5946;
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
  const apmcRatePerKg = apmcModalPricePerQuintal > 0 ? apmcModalPricePerQuintal / 100 : farmerPricePerKg * 1.25;
  const expectedApmcMarketValue = cropQuantityKg * apmcRatePerKg;
  const approxNetProfit = expectedApmcMarketValue - totalLandedCost;

  const rawMargin = totalLandedCost > 0
    ? (approxNetProfit / totalLandedCost) * 100
    : 0.0;

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
      apmcBenchmarkRatePerKg: parseFloat(apmcRatePerKg.toFixed(2)),
      expectedApmcValue: parseFloat(expectedApmcMarketValue.toFixed(2)),
      approxNetProfit: parseFloat(approxNetProfit.toFixed(2)),
      profitMarginPercent: `${rawMargin.toFixed(1)}%`,
      isProfitable: approxNetProfit > 0,
    },
  };
}

export const calculateFreightQuote = computeLogisticsAndProfit;

export default {
  CONTAINER_COST_MATRIX,
  computeLogisticsAndProfit,
  calculateFreightQuote,
};