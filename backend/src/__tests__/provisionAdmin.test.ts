// Tests for the administrator provisioning CLI.
//
// The CLI is the **only** way to create an administrator, so the rules that
// protect the production database have to be enforced by the code and
// verified here:
//
//   * the password is never accepted on the command line,
//   * the password policy is real,
//   * a missing `--confirm` writes nothing,
//   * an existing account is never promoted silently.

import { parseArgs, validatePassword, normalizePhone } from '../cli/provisionAdminCore';

describe('provision-admin CLI', () => {
  describe('normalizePhone', () => {
    it('keeps a plain 10-digit number', () => {
      expect(normalizePhone('9876543210')).toBe('9876543210');
    });

    it('drops the country code, exactly like the auth controller does', () => {
      expect(normalizePhone('+91 98765-43210')).toBe('9876543210');
      expect(normalizePhone('919876543210')).toBe('9876543210');
    });

    it('removes every non-digit character', () => {
      expect(normalizePhone('(987) 654-3210')).toBe('9876543210');
    });
  });

  describe('parseArgs', () => {
    it('reads the required values', () => {
      const opts = parseArgs([
        '--email',
        'Admin@FarmConnect.com',
        '--name',
        'Platform Administrator',
        '--phone',
        '+91 98765-43210',
        '--confirm',
      ]);

      expect(opts.email).toBe('admin@farmconnect.com');
      expect(opts.name).toBe('Platform Administrator');
      // The phone number is reduced to its digits, so the database always
      // holds the same format.
      expect(opts.phone).toBe('9876543210');
      expect(opts.confirm).toBe(true);
      expect(opts.promote).toBe(false);
    });

    it('rejects a password that was passed on the command line', () => {
      expect(() =>
        parseArgs([
          '--email',
          'admin@farmconnect.com',
          '--name',
          'Admin',
          '--phone',
          '9876543210',
          '--password',
          'SuperSecret123',
        ])
      ).toThrow(/Unknown argument: --password/);
    });

    it('rejects a positional argument', () => {
      expect(() => parseArgs(['SuperSecret123'])).toThrow(/Unknown argument/);
    });

    it('rejects a flag without its value', () => {
      expect(() => parseArgs(['--email', '--name'])).toThrow(/Missing value for --email/);
    });

    it('reads the password source flags', () => {
      const opts = parseArgs([
        '--email',
        'admin@farmconnect.com',
        '--name',
        'Admin',
        '--phone',
        '9876543210',
        '--password-file',
        'C:\\secret.txt',
        '--password-env',
        'MY_PASSWORD',
        '--promote',
        '--confirm',
      ]);

      expect(opts.passwordFile).toBe('C:\\secret.txt');
      expect(opts.passwordEnv).toBe('MY_PASSWORD');
      expect(opts.promote).toBe(true);
      expect(opts.confirm).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('accepts a long password with letters and digits', () => {
      expect(validatePassword('FarmConnect2026')).toBeNull();
    });

    it('rejects an empty password', () => {
      expect(validatePassword('')).toMatch(/at least 12 characters/);
    });

    it('rejects a short password', () => {
      expect(validatePassword('Abc123')).toMatch(/at least 12 characters/);
    });

    it('rejects a password without a digit', () => {
      expect(validatePassword('abcdefghijkl')).toMatch(/one letter and one digit/);
    });

    it('rejects a password without a letter', () => {
      expect(validatePassword('123456789012')).toMatch(/one letter and one digit/);
    });
  });

  describe('the safety rules of the script', () => {
    // The rules are read out of the source, because they are the reason the
    // script is allowed to touch the production database at all.

    it('never deletes or deactivates an account', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const source = require('fs').readFileSync(
        require('path').join(__dirname, '..', '..', 'provision-admin.ts'),
        'utf8'
      );

      expect(source).not.toMatch(/prisma\.\w+\.delete\s*\(/);
      expect(source).not.toMatch(/prisma\.\w+\.deleteMany\s*\(/);
      expect(source).not.toMatch(/isActive:\s*false/);
    });

    it('never prints the password value', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const source = require('fs').readFileSync(
        require('path').join(__dirname, '..', '..', 'provision-admin.ts'),
        'utf8'
      );

      // The password may only be read, compared and hashed. It must never
      // reach a console call.
      const consoleCalls = source
        .split('\n')
        .filter((line: string) => /console\.(log|warn|error)/.test(line))
        .join('\n');

      expect(consoleCalls).not.toMatch(/\$\{\s*password\s*\}/);
      expect(consoleCalls).not.toMatch(/\(\s*password\s*\)/);
      expect(consoleCalls).not.toMatch(/,\s*password\s*\)/);
    });

    it('requires the confirmation flag before it writes anything', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const source = require('fs').readFileSync(
        require('path').join(__dirname, '..', '..', 'provision-admin.ts'),
        'utf8'
      );

      // The write is guarded by the confirmation check.
      const guardIndex = source.indexOf('if (!opts.confirm)');
      const writeIndex = source.indexOf('await prisma.user.update');
      const createIndex = source.indexOf('await prisma.user.create');

      expect(guardIndex).toBeGreaterThan(-1);
      expect(writeIndex).toBeGreaterThan(guardIndex);
      expect(createIndex).toBeGreaterThan(guardIndex);
    });

    it('refuses to promote an existing account without the explicit promote flag', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const source = require('fs').readFileSync(
        require('path').join(__dirname, '..', '..', 'provision-admin.ts'),
        'utf8'
      );

      const guardIndex = source.indexOf('if (existing && !opts.promote)');
      const writeIndex = source.indexOf('await prisma.user.update');

      expect(guardIndex).toBeGreaterThan(-1);
      expect(writeIndex).toBeGreaterThan(guardIndex);
    });
  });
});
