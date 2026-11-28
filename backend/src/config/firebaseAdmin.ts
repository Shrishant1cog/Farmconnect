import path from 'path';
import fs from 'fs';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';

const env = process.env as Record<string, string | undefined>;

let app: App | null = null;
let adminAuth: Auth | null = null;

function ensureFirebaseAdmin(): void {
  if (app && adminAuth) return;

  // Load Firebase Admin lazily. This keeps ordinary API startup and Jest tests
  // independent from Firebase Admin's ESM-only transitive dependencies.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps, cert } = require('firebase-admin/app') as typeof import('firebase-admin/app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getAuth } = require('firebase-admin/auth') as typeof import('firebase-admin/auth');

  if (!getApps().length) {
    try {
      if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
        app = initializeApp({ credential: cert(serviceAccount) });
      } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const keyPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);

        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          app = initializeApp({ credential: cert(serviceAccount) });
        } else {
          console.warn(`[Firebase Admin] Key file not found at ${keyPath}. Using default initialization.`);
          app = initializeApp();
        }
      } else {
        app = initializeApp({
          projectId: env.FIREBASE_PROJECT_ID || 'farmconnect-dev',
        });
      }
    } catch (error: any) {
      console.warn('[Firebase Admin] Initialization warning:', error?.message || error);
      app = initializeApp();
    }
  } else {
    app = getApps()[0] as App;
  }

  adminAuth = getAuth(app);
}

export const firebaseAdmin = {
  auth: (): Auth => {
    ensureFirebaseAdmin();
    return adminAuth!;
  },
  get app(): App {
    ensureFirebaseAdmin();
    return app!;
  },
};

export default firebaseAdmin;
