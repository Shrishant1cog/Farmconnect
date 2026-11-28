import jwt from 'jsonwebtoken';
import { env } from './env';

/**
 * The **one** secret that may sign and verify a session token.
 *
 * The backend used to keep a *list* of accepted secrets:
 *
 *   ```ts
 *   const JWT_SECRETS = [
 *     process.env.JWT_SECRET,
 *     'farmconnect-secret-key',
 *     'farmconnect-secret-key-development',
 *   ];
 *   ```
 *
 * Verification tried every entry, so the two hard-coded values — which are
 * published in this public repository — stayed valid **even when a real
 * `JWT_SECRET` was configured**. Anyone who cloned the repository could
 * sign their own token, claim the role `ADMIN` and read the administrator
 * endpoints of the deployed platform. That was a complete authorisation
 * bypass and it is closed here: a token is only ever verified against the
 * secret that also signed it.
 */
export const JWT_SECRET: string = env.JWT_SECRET;

// The shared development value must never be silent — a deployment that
// forgot its own secret would otherwise run with a published one.
if (JWT_SECRET === 'farmconnect-secret-key-development') {
  console.warn(
    '⚠️  JWT_SECRET is not configured — the shared development secret is used. ' +
      'Set a private JWT_SECRET before exposing this service.'
  );
}

/**
 * A list with exactly **one** entry.
 *
 * It exists so that the existing `for (const secret of JWT_SECRETS)` loops
 * keep working — but the loop now has a single candidate: the real secret.
 */
export const JWT_SECRETS: string[] = [JWT_SECRET];

/** Signs a session token with the effective secret. */
export const signJwt = (
  payload: string | object | Buffer,
  options?: jwt.SignOptions
): string => jwt.sign(payload, JWT_SECRET, options);

/**
 * Verifies a session token against the effective secret.
 *
 * A token that was signed with any other key — including the values that
 * used to be hard-coded in this repository — is rejected.
 */
export const verifyJwt = (token: string): { [key: string]: any } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { [key: string]: any };
  } catch {
    return null;
  }
};
