import { latitudeSchema, longitudeSchema } from '../utils/coordinate';

/**
 * The coordinate schema has to keep three states apart:
 *
 *   * absent   — the position is left untouched,
 *   * `null`   — the position is cleared,
 *   * a number — the real position.
 *
 * The most important case is `null`: `Number(null)` is `0`, so a plain
 * `z.coerce.number()` would store the point `0 / 0` in the Gulf of Guinea
 * and every farm without a position would be plotted there.
 */
describe('coordinate schema — no fabricated position', () => {
  it('leaves an absent position untouched', () => {
    const result = latitudeSchema.parse(undefined);

    expect(result).toBeUndefined();
  });

  it('keeps a cleared position as null instead of 0', () => {
    const result = latitudeSchema.parse(null);

    expect(result).toBeNull();
    expect(result).not.toBe(0);
  });

  it('accepts a real number', () => {
    expect(latitudeSchema.parse(12.5218)).toBe(12.5218);
    expect(longitudeSchema.parse(76.8951)).toBe(76.8951);
  });

  it('accepts a numeric string', () => {
    expect(latitudeSchema.parse('12.5218')).toBe(12.5218);
  });

  it('rejects a malformed coordinate', () => {
    expect(() => latitudeSchema.parse('not-a-number')).toThrow();
    expect(() => longitudeSchema.parse('not-a-number')).toThrow();
  });

  it('rejects a coordinate outside the valid range', () => {
    expect(() => latitudeSchema.parse(91)).toThrow();
    expect(() => latitudeSchema.parse(-91)).toThrow();
    expect(() => longitudeSchema.parse(181)).toThrow();
    expect(() => longitudeSchema.parse(-181)).toThrow();
  });

  it('accepts the extreme valid values', () => {
    expect(latitudeSchema.parse(90)).toBe(90);
    expect(latitudeSchema.parse(-90)).toBe(-90);
    expect(longitudeSchema.parse(180)).toBe(180);
    expect(longitudeSchema.parse(-180)).toBe(-180);
  });

  it('never produces the point 0 / 0 from a missing position', () => {
    const latitude = latitudeSchema.parse(null);
    const longitude = longitudeSchema.parse(null);

    // The schema keeps the "cleared" state as `null` — it does not turn it
    // into the number `0`. (`Number(null)` is `0` in JavaScript, which is
    // exactly why every caller has to check for `null` before it converts.)
    expect(latitude).toBeNull();
    expect(longitude).toBeNull();
    expect(latitude).not.toBe(0);
    expect(longitude).not.toBe(0);
  });

  it('documents why a caller has to reject null before converting', () => {
    // The unsafe conversion — this is what the schema protects against.
    expect(Number(latitudeSchema.parse(null))).toBe(0);

    // The safe conversion the clients use.
    const raw = latitudeSchema.parse(null);
    const latitude = raw === null || raw === undefined ? NaN : Number(raw);
    expect(Number.isFinite(latitude)).toBe(false);
  });
});
