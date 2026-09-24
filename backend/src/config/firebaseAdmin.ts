import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';

let app: App;

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const keyPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        console.warn(`[Firebase Admin] Key file not found at ${keyPath}. Initializing with default credentials.`);
        app = initializeApp();
      }
    } else {
      app = initializeApp();
    }
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
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