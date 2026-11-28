import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_SECRETS, signJwt, verifyJwt } from '../config/jwt';

/**
 * The published secrets of this repository must never verify a session.
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
 * Verification tried every entry, so both hard-coded values stayed valid
 * **even when a real `JWT_SECRET` was configured**. Anyone who cloned the
 * repository could sign a token with the role `ADMIN` and read the
 * administrator endpoints of the deployed platform.
 */
describe('the session secret', () => {
  it('accepts exactly one secret', () => {
    expect(Array.isArray(JWT_SECRETS)).toBe(true);
    expect(JWT_SECRETS.length).toBe(1);
    expect(JWT_SECRETS[0]).toBe(JWT_SECRET);
  });

  it('is the configured secret, never a published one', () => {
    // The test environment always provides its own secret.
    expect(JWT_SECRET).toBeTruthy();
    expect(JWT_SECRET.length).toBeGreaterThanOrEqual(16);
    expect(JWT_SECRET).not.toBe('farmconnect-secret-key');
    expect(JWT_SECRET).not.toBe('farmconnect-secret-key-development');
  });

  it('rejects a token that was signed with a published secret', () => {
    const forged = jwt.sign(
      { id: 'some-account-id', role: 'ADMIN' },
      'farmconnect-secret-key',
      { expiresIn: '1h' }
    );

    expect(verifyJwt(forged)).toBeNull();
    expect(() => jwt.verify(forged, JWT_SECRET)).toThrow();
  });

  it('rejects a token that was signed with the published development secret', () => {
    const forged = jwt.sign(
      { id: 'some-account-id', role: 'ADMIN' },
      'farmconnect-secret-key-development',
      { expiresIn: '1h' }
    );

    expect(verifyJwt(forged)).toBeNull();
  });

  it('accepts a token that was signed with the effective secret', () => {
    const signed = signJwt({ id: 'some-account-id', role: 'FARMER' }, { expiresIn: '1h' });
    const decoded = verifyJwt(signed);

    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe('some-account-id');
  });

  it('rejects a token that was signed with a random key', () => {
    const forged = jwt.sign({ id: 'some-account-id', role: 'ADMIN' }, 'some-other-key', {
      expiresIn: '1h',
    });

    expect(verifyJwt(forged)).toBeNull();
  });
});
