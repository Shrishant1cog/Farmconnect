import { calculateDistanceKm } from '../utils/geo';

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
  apmcModalPricePerQuintal: number;
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
  const {
    cropQuantityKg = 0,
    farmerPricePerKg = 0,
    originLat,
    originLon,
    destLat,
    destLon,
    containerType = 'STANDARD_CRATE',
    apmcModalPricePerQuintal = 0,
  } = params;

  // 1. Calculate Great-Circle Distance via shared geo utility
  const distanceKm = calculateDistanceKm(originLat, originLon, destLat, destLon);

  // 2. Freight Pricing (Distance * Rate with minimum dispatch tariff guarantee)
  const calculatedMileageCost = distanceKm * BASE_RATE_PER_KM;
  const baseFreightCost = Math.max(MINIMUM_BASE_DISPATCH_FEE, calculatedMileageCost);

  // 3. Packaging & Container Calculation
  const selectedKey = (containerType as ContainerTypeKey) in CONTAINER_COST_MATRIX
    ? (containerType as ContainerTypeKey)
    : 'STANDARD_CRATE';

  const containerRule = CONTAINER_COST_MATRIX[selectedKey];
  const specialContainerCost = Math.max(0, cropQuantityKg) * containerRule.costPerKg;
  const totalTransportCost = baseFreightCost + specialContainerCost;

  // 4. Farm Produce & Total Landed Cost
  const farmerProduceCost = Math.max(0, cropQuantityKg) * Math.max(0, farmerPricePerKg);
  const totalLandedCost = farmerProduceCost + totalTransportCost;

  // 5. APMC Market Parity & Profitability (1 Quintal = 100 KG)
  const apmcRatePerKg = Math.max(0, apmcModalPricePerQuintal) / 100;
  const expectedApmcMarketValue = Math.max(0, cropQuantityKg) * apmcRatePerKg;
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