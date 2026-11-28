import {
  isValidCoordinate,
  calculateDistanceKm,
  getBoundingBox,
} from '../utils/geo';

/**
 * A farm that did not share a position has **no** coordinates.
 *
 * `Number(null)` is `0`, so an unknown position used to be treated as the
 * point `0 / 0` in the Gulf of Guinea. Every distance to such a farm was a
 * fabricated number — 8 663 km away from Bengaluru — and a radius filter
 * hid or showed the farm according to that made-up distance.
 */
describe('geo — an unknown position is never the point 0 / 0', () => {
  it('does not accept null as a coordinate', () => {
    expect(isValidCoordinate(null, null)).toBe(false);
    expect(isValidCoordinate(null, 76.8951)).toBe(false);
    expect(isValidCoordinate(12.5218, null)).toBe(false);
    expect(isValidCoordinate(undefined, undefined)).toBe(false);
  });

  it('does not accept an empty string as a coordinate', () => {
    expect(isValidCoordinate('', '')).toBe(false);
    expect(isValidCoordinate('   ', 76.8951)).toBe(false);
    expect(isValidCoordinate(12.5218, '')).toBe(false);
  });

  it('still accepts a real position', () => {
    expect(isValidCoordinate(12.5218, 76.8951)).toBe(true);
    expect(isValidCoordinate('12.5218', '76.8951')).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true);
  });

  it('rejects a position that is out of range', () => {
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate('not-a-number', 0)).toBe(false);
  });

  it('reports an unknown distance as null, not as zero kilometres', () => {
    expect(calculateDistanceKm(12.9716, 77.5946, null, null)).toBeNull();
    expect(calculateDistanceKm(12.9716, 77.5946, undefined, undefined)).toBeNull();
    expect(calculateDistanceKm(null, 77.5946, 12.5218, 76.8951)).toBeNull();
    expect(calculateDistanceKm(12.9716, 77.5946, '', '')).toBeNull();
  });

  it('never reports zero kilometres between two different real places', () => {
    const distance = calculateDistanceKm(12.9716, 77.5946, 12.5218, 76.8951);
    expect(distance).not.toBeNull();
    expect(distance!).toBeGreaterThan(50);
    expect(distance!).toBeLessThan(150);
  });

  it('reports zero kilometres only between the very same point', () => {
    expect(calculateDistanceKm(12.5218, 76.8951, 12.5218, 76.8951)).toBe(0);
  });

  it('refuses a bounding box for an unknown position', () => {
    const box = getBoundingBox(null, null, 25);
    expect(box).toEqual({ minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 });
  });

  it('builds a real bounding box for a real position', () => {
    const box = getBoundingBox(12.5218, 76.8951, 25);
    expect(box.minLat).toBeLessThan(12.5218);
    expect(box.maxLat).toBeGreaterThan(12.5218);
    expect(box.minLon).toBeLessThan(76.8951);
    expect(box.maxLon).toBeGreaterThan(76.8951);
  });
});
