import { z } from 'zod';

/**
 * A geographic coordinate that an account really shares.
 *
 * Three states have to stay distinguishable:
 *
 *   * **absent** (`undefined`) — the client did not mention the position, so
 *     the stored value is left untouched.
 *   * **`null`** — the client explicitly clears the position. The farm or
 *     the delivery address then simply has no coordinates.
 *   * **a number** — the real position.
 *
 * `z.coerce.number()` cannot express this: `Number(null)` is `0`, so a
 * cleared position would be stored as the point `0 / 0` in the Gulf of
 * Guinea, and every farmer without a position would be plotted there.
 *
 * @param label   The name of the coordinate, used in the error message.
 * @param limit   The largest absolute value the coordinate may have.
 */
export const coordinateSchema = (label: string, limit: number) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .superRefine((value, ctx) => {
      if (value === null || value === undefined || value === '') return;

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a number`,
        });
        return;
      }

      if (parsed < -limit || parsed > limit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be between ${-limit} and ${limit}`,
        });
      }
    })
    .transform((value) => {
      // "Not mentioned" stays "not mentioned" — an unrelated profile update
      // (for example a language change) must never clear the position.
      if (value === undefined) return undefined;
      // An explicit `null` clears the position.
      if (value === null || value === '') return null;
      return Number(value);
    });

/** The latitude of a farm or of a delivery address. */
export const latitudeSchema = coordinateSchema('Latitude', 90);

/** The longitude of a farm or of a delivery address. */
export const longitudeSchema = coordinateSchema('Longitude', 180);
