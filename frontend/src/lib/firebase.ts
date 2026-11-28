import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyMockKeyForDevelopmentOnly12345',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'farmconnect-dev.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'farmconnect-dev',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'farmconnect-dev.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

/**
 * Is the SMS (phone) sign-in service really configured?
 *
 * The Firebase SDK can always be *initialised* — it accepts any string as
 * an API key — so the existence of the `auth` object says nothing about
 * whether a verification code can actually be sent. The placeholders above
 * are **not** a configuration: with them the SDK reports
 * `auth/invalid-api-key` at runtime.
 *
 * The interface therefore asks this flag before it offers the OTP tab, so
 * that an unconfigured deployment reports the truth instead of pretending
 * that a code was sent.
 */
export const isFirebasePhoneAuthConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

/**
 * The Firebase error codes that mean: **the message service is not
 * available**.
 *
 * They are all reported with one honest message instead of a made-up
 * "test code", because a code that was never sent cannot be verified.
 */
export const SMS_UNAVAILABLE_CODES = [
  'auth/operation-not-allowed',
  'auth/configuration-not-found',
  'auth/invalid-app-credential',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
  'auth/app-not-authorized',
  'auth/project-not-found',
  'auth/unauthorized-domain',
];

// Initialize Firebase safely for both Next.js SSR and client hydration
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA can only be initialized in the browser.');
  }

  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // Ignore cleanup error
    }
    (window as any).recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired. Resetting verifier.');
    },
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
};