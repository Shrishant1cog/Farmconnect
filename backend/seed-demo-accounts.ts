// Loads the **real** demo accounts of the FarmConnect login screen.
//
//   npm run db:demo-accounts
//
// The login screen offers a quick sign-in for a farmer and for a consumer.
// That feature must not be a backdoor: a session may only be issued for an
// account that really exists in the shared database and whose password is
// really checked against its stored hash.
//
// This script therefore creates those two accounts as ordinary database rows.
//
// The script is **idempotent and non-destructive**:
//
//   * it never deletes a row — not a user, not a listing, not an order,
//   * it never touches the data of an account that already exists (only the
//     password hash is refreshed, so the published demo password keeps
//     working after a deploy),
//   * it creates **no** listings and **no** coordinates. A demo farm without
//     a shared position simply stays off the map, and the demo dashboard
//     shows the real, empty state instead of invented harvest records.
//
// The destructive development seed lives in `prisma/seed.ts` and is **not**
// run by the deployment — it wipes the whole database.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** The credentials the login screen offers for the quick sign-in. */
const DEMO_PASSWORD = 'password123';

interface DemoAccount {
  email: string;
  phone: string;
  name: string;
  role: 'FARMER' | 'CONSUMER';
  farmName?: string;
  district: string;
  deliveryAddress?: string;
}

const ACCOUNTS: DemoAccount[] = [
  {
    email: 'farmer@farmconnect.com',
    phone: '9876543210',
    name: 'Ramesh Kumar (Demo Cultivator)',
    role: 'FARMER',
    farmName: 'Mandya Agro Farm',
    district: 'Mandya',
  },
  {
    email: 'consumer@farmconnect.com',
    phone: '9876543211',
    name: 'Priya Narayanan (Demo Buyer)',
    role: 'CONSUMER',
    district: 'Bengaluru Urban',
    deliveryAddress: 'Karnataka',
  },
];

async function main() {
  console.log('🌱 Loading the demo accounts of the login screen...\n');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const account of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      // Only the password hash is refreshed — the account itself and
      // everything that belongs to it stays untouched.
      update: { passwordHash, isActive: true },
      create: {
        email: account.email,
        phone: account.phone,
        name: account.name,
        passwordHash,
        role: account.role,
        isActive: true,
      },
    });

    if (account.role === 'FARMER') {
      await prisma.farmerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          farmName: account.farmName || `${account.name}'s Farm`,
          district: account.district,
          state: 'Karnataka',
          // No invented position: a demo farm without a shared GPS position
          // stays off the map, exactly like every other farm that did not
          // share one.
          latitude: null,
          longitude: null,
          isVerified: true,
        },
      });
    } else {
      await prisma.consumerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          district: account.district,
          deliveryAddress: account.deliveryAddress || 'Karnataka',
          latitude: null,
          longitude: null,
        },
      });
    }

    console.log(`   ${account.role.padEnd(8)} ${account.email}  (id ${user.id})`);
  }

  console.log('\n✅ The demo accounts are real database rows.');
  console.log('   The login screen now signs in against them — the password is');
  console.log('   checked against the stored hash, there is no shortcut.');
  console.log('   The accounts carry no listings and no coordinates, so every');
  console.log('   screen shows the real state of the shared database.');
}

main()
  .catch((err) => {
    console.error('❌ Error loading the demo accounts:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
