import { computeLogisticsAndProfit } from '../services/logisticsService';

const baseInput = {
  cropQuantityKg: 100,
  farmerPricePerKg: 20,
  originLat: 12.5218,
  originLon: 76.8951,
  destLat: 12.9716,
  destLon: 77.5946,
  containerType: 'STANDARD_CRATE',
};

describe('logistics quote — no fabricated numbers', () => {
  it('reports an unknown profit when no APMC benchmark was published', () => {
    const quote = computeLogisticsAndProfit({ ...baseInput });

    expect(quote.profitAssessment.hasApmcBenchmark).toBe(false);
    expect(quote.profitAssessment.apmcBenchmarkRatePerKg).toBeNull();
    expect(quote.profitAssessment.expectedApmcValue).toBeNull();
    expect(quote.profitAssessment.approxNetProfit).toBeNull();
    expect(quote.profitAssessment.profitMarginPercent).toBeNull();
    expect(quote.profitAssessment.isProfitable).toBeNull();
  });

  it('never derives the benchmark from the farmer’s own price', () => {
    const quote = computeLogisticsAndProfit({ ...baseInput });

    // The old implementation used `farmerPricePerKg * 1.25` (= 25 here).
    expect(quote.profitAssessment.apmcBenchmarkRatePerKg).not.toBe(25);
    expect(quote.profitAssessment.expectedApmcValue).toBeNull();
  });

  it('uses the published benchmark when one is supplied', () => {
    const quote = computeLogisticsAndProfit({
      ...baseInput,
      apmcModalPricePerQuintal: 3000,
    });

    expect(quote.profitAssessment.hasApmcBenchmark).toBe(true);
    expect(quote.profitAssessment.apmcBenchmarkRatePerKg).toBe(30);
    expect(quote.profitAssessment.expectedApmcValue).toBe(3000);
    // The profit is the market value minus the landed cost.
    expect(quote.profitAssessment.approxNetProfit).toBe(
      parseFloat(
        (
          3000 -
          quote.breakdown.totalLandedCost
        ).toFixed(2),
      ),
    );
    expect(quote.profitAssessment.isProfitable).toBe(
      quote.profitAssessment.approxNetProfit! > 0,
    );
  });

  it('uses the coordinates that were supplied', () => {
    const near = computeLogisticsAndProfit({
      ...baseInput,
      originLat: 12.5218,
      originLon: 76.8951,
      destLat: 12.55,
      destLon: 76.92,
    });
    const far = computeLogisticsAndProfit({ ...baseInput });

    // A different destination must produce a different distance — the
    // service may not fall back to a fixed city.
    expect(near.distanceKm).not.toBe(far.distanceKm);
    expect(near.distanceKm).toBeLessThan(far.distanceKm);
  });

  it('always reports the real landed cost', () => {
    const quote = computeLogisticsAndProfit({ ...baseInput });

    expect(quote.breakdown.farmerProduceCost).toBe(2000);
    expect(quote.breakdown.totalLandedCost).toBe(
      parseFloat(
        (
          quote.breakdown.farmerProduceCost +
          quote.breakdown.totalTransportAndLogistics
        ).toFixed(2),
      ),
    );
    expect(quote.breakdown.specialContainerCost).toBe(50);
  });
});
