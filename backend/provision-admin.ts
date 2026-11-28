// Provisions a **legitimate** FarmConnect administrator account.
//
//   npm run db:provision-admin -- --email admin@farmconnect.com \
//        --name "Platform Administrator" --phone 9876543210 --confirm
//
// Why this script exists
// ----------------------
// The API has no "create an administrator" route, and it must not have one:
// an HTTP endpoint that could raise a role would be a production backdoor.
// The role check itself (`requireRole` in `src/middleware/auth.middleware.ts`)
// reads the role from the live database row, so an administrator is simply an
// ordinary user row whose `role` is `ADMIN`.
//
// This CLI is that manual, auditable step. It is deliberately **not** part of
// the Render build command, so a deploy can never create or promote an
// account on its own.
//
// Safety rules enforced here
// --------------------------
//   * The database connection must be supplied through `DATABASE_URL`
//     (environment variable or `backend/.env`). Nothing about it is printed.
//   * The password is **never** accepted on the command line (command lines
//     end up in shell history and in process listings). It is read from a
//     hidden interactive prompt, from a file, or from an environment
//     variable.
//   * The password is never echoed, never logged and never printed.
//   * An **existing** account is never promoted silently. Promoting requires
//     the explicit `--promote` flag *and* `--confirm`, and the old role is
//     reported so the change is visible in the terminal.
//   * `--confirm` is mandatory. Without it the script only reports what it
//     *would* do and changes nothing.
//   * No account is ever deleted or deactivated by this script.
//
// The script is idempotent: running it again for an account that already is
// an administrator changes nothing and reports success.
//
// The rules that can be checked without a database live in
// `src/cli/provisionAdminCore.ts`, where they are covered by tests.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import {
  ADMIN_PROVISION_USAGE,
  parseArgs,
  validatePassword,
  type AdminProvisionOptions,
} from './src/cli/provisionAdminCore';

const prisma = new PrismaClient();

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const BACKSPACE = '\u007f';

/**
 * Asks for the password without echoing it.
 *
 * The terminal is switched to raw mode so that every key press is hidden.
 * If the terminal cannot do that (a CI runner, a piped stdin) the question
 * is still asked, but the operator is warned that the input was visible.
 */
async function askHiddenPassword(question: string): Promise<string> {
  const stdin = process.stdin as any;
  const isTTY = Boolean(stdin.isTTY);

  return new Promise<string>((resolve) => {
    if (!isTTY) {
      console.warn(
        '\n⚠️  The standard input is not a terminal — the password would be visible.'
      );
    }

    let buffer = '';

    const finish = (value: string) => {
      stdin.removeListener('data', onData);
      if (stdin.setRawMode) stdin.setRawMode(false);
      if (stdin.pause) stdin.pause();
      process.stdout.write('\n');
      resolve(value);
    };

    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString('utf8');

      for (const char of text) {
        // Ctrl+C — the operator changed their mind.
        if (char === CTRL_C) {
          finish('');
          return;
        }
        // Ctrl+D — end of input.
        if (char === CTRL_D) {
          finish(buffer);
          return;
        }
        // Enter — the password is complete.
        if (char === '\n' || char === '\r') {
          finish(buffer);
          return;
        }
        // Backspace / delete.
        if (char === BACKSPACE) {
          buffer = buffer.slice(0, -1);
          continue;
        }
        // Ignore the remaining control characters.
        if (char < ' ') continue;
        buffer += char;
      }
    };

    process.stdout.write(question);
    if (isTTY && stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

export async function main() {
  const opts: AdminProvisionOptions = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(ADMIN_PROVISION_USAGE);
    return;
  }

  const problems: string[] = [];
  if (!opts.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(opts.email)) {
    problems.push('--email must be a valid address.');
  }
  if (!opts.name || opts.name.length < 2) {
    problems.push('--name must be given (at least 2 characters).');
  }
  if (!opts.phone || opts.phone.length !== 10) {
    problems.push('--phone must be a 10-digit number.');
  }

  if (problems.length) {
    console.error('❌ The request is incomplete:\n');
    problems.forEach((p) => console.error(`   • ${p}`));
    console.error(`\n${ADMIN_PROVISION_USAGE}`);
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      '❌ DATABASE_URL is not set.\n' +
        '   Put the production connection string into `backend/.env` (or the\n' +
        '   environment) before running this script. It is never printed.'
    );
    process.exitCode = 1;
    return;
  }

  // ---- The password ------------------------------------------------------
  let password = '';
  if (opts.passwordFile) {
    const file = path.resolve(opts.passwordFile);
    if (!fs.existsSync(file)) {
      console.error(`❌ The password file does not exist: ${file}`);
      process.exitCode = 1;
      return;
    }
    password = fs.readFileSync(file, 'utf8').split(/\r?\n/)[0] ?? '';
  } else if (opts.passwordEnv) {
    password = process.env[opts.passwordEnv] ?? '';
  } else {
    password = await askHiddenPassword('   Administrator password (hidden): ');
  }

  const passwordProblem = validatePassword(password);
  if (passwordProblem) {
    console.error(`❌ ${passwordProblem}`);
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: opts.email } });

  // ---- Report first, write second ---------------------------------------
  if (existing && existing.role === 'ADMIN') {
    console.log(`✅ ${opts.email} is already an administrator — nothing was changed.`);
    console.log(`   Account id: ${existing.id}`);
    return;
  }

  if (existing && !opts.promote) {
    console.error(
      `❌ ${opts.email} already exists with the role ${existing.role}.\n` +
        '   An existing account is never promoted silently.\n' +
        '   If this really has to become an administrator, re-run with\n' +
        '   `--promote --confirm`.'
    );
    process.exitCode = 1;
    return;
  }

  if (!opts.confirm) {
    console.log('🟡 Nothing was written — the confirmation flag `--confirm` is missing.');
    if (existing) {
      console.log(`   It would promote ${opts.email} from ${existing.role} to ADMIN.`);
    } else {
      console.log(`   It would create the administrator ${opts.email}.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN', isActive: true, passwordHash },
    });
    console.log(`✅ ${opts.email} was promoted from ${existing.role} to ADMIN.`);
    console.log(`   Account id: ${existing.id}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email: opts.email,
        name: opts.name,
        phone: opts.phone,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    // Every non-farmer account carries a consumer profile in this schema;
    // an administrator without one would break the places that read it.
    await prisma.consumerProfile.upsert({
      where: { userId: created.id },
      update: {},
      create: {
        userId: created.id,
        district: 'Mandya',
        deliveryAddress: 'Karnataka',
        latitude: null,
        longitude: null,
      },
    });
    console.log(`✅ The administrator ${opts.email} was created.`);
    console.log(`   Account id: ${created.id}`);
  }

  console.log('   Sign in on the website with this address and the password you chose.');
}

/**
 * Only run the provisioning when the file is called as a command.
 *
 * The helpers above are exported so that the rules of this script can be
 * tested without touching a database.
 */
const invokedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]).endsWith(path.join('backend', 'provision-admin.ts')) ||
    path.resolve(process.argv[1]).endsWith('provision-admin.ts')
  : false;

if (invokedDirectly) {
  main()
    .catch((err) => {
      console.error('❌ Error provisioning the administrator:', err?.message || err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
