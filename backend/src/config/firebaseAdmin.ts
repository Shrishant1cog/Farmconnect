import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

const env = process.env as Record<string, string | undefined>;

let app: App;

if (!getApps().length) {
  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const keyPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        console.warn(`[Firebase Admin] Key file not found at ${keyPath}. Initializing default.`);
        app = initializeApp();
      }
    } else {
      app = initializeApp({
        projectId: env.FIREBASE_PROJECT_ID || 'farmconnect-dev',
      });
    }
  } catch (error: any) {
    console.warn('[Firebase Admin] Initialization warning:', error.message);
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const adminAuth: Auth = getAuth(app);
export const firebaseAdmin = {
  auth: () => adminAuth,
  app,
};

export default firebaseAdmin;