// The **rules** of the administrator provisioning CLI.
//
// The CLI itself lives in `backend/provision-admin.ts` and is run with
// `ts-node` — it is deliberately outside `src/`, because it is a one-off
// operator tool and not part of the compiled API.
//
// Everything that can be decided without a database lives here, so that the
// rules can be tested without touching any data:
//   * the password is never accepted on the command line,
//   * the password policy is real,
//   * a missing `--confirm` writes nothing,
//   * an existing account is never promoted silently.

export interface AdminProvisionOptions {
  email: string;
  name: string;
  phone: string;
  confirm: boolean;
  promote: boolean;
  passwordFile?: string;
  passwordEnv?: string;
  help: boolean;
}

export const ADMIN_PROVISION_USAGE = `
FarmConnect — administrator provisioning

  npm run db:provision-admin -- --email <address> --name <name> --phone <10 digits> --confirm

Options
  --email <address>        E-mail address of the administrator (required)
  --name <name>            Display name (required)
  --phone <digits>         10-digit mobile number (required)
  --confirm                Required. Without it nothing is written.
  --promote                Allow promoting an EXISTING non-admin account.
  --password-file <path>   Read the password from a file (first line).
  --password-env <name>    Read the password from an environment variable.
  --help                   Show this text.

The password is never accepted as a command-line argument. If neither
--password-file nor --password-env is given, it is asked for interactively
with the input hidden.
`;

/**
 * Normalises a phone number to the same 10-digit form that the rest of the
 * platform uses (`sanitizePhone` in the auth controller): the digits only,
 * and — when a country code was written — the **last** ten digits.
 *
 * `+91 98765-43210` and `9876543210` therefore become the same value.
 */
export const normalizePhone = (rawPhone: string): string =>
  rawPhone.replace(/\D/g, '').slice(-10);

export function parseArgs(argv: string[]): AdminProvisionOptions {
  const opts: AdminProvisionOptions = {
    email: '',
    name: '',
    phone: '',
    confirm: false,
    promote: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return value;
    };

    switch (arg) {
      case '--email':
        opts.email = next().trim().toLowerCase();
        break;
      case '--name':
        opts.name = next().trim();
        break;
      case '--phone':
        opts.phone = normalizePhone(next());
        break;
      case '--confirm':
        opts.confirm = true;
        break;
      case '--promote':
        opts.promote = true;
        break;
      case '--password-file':
        opts.passwordFile = next();
        break;
      case '--password-env':
        opts.passwordEnv = next();
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 12) {
    return 'The password must have at least 12 characters.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'The password must contain at least one letter and one digit.';
  }
  return null;
}
