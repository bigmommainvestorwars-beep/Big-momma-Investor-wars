/**
 * Production Firebase Configuration & Initialization Layer
 * Safely initializes the real Firebase SDK when credentials are provided.
 * Handles missing configuration gracefully without runtime crashes.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  setLogLevel,
} from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { ENV, validateFirebaseClientConfig } from '../../config/env';

export interface FirebaseConnectionStatus {
  isConfigured: boolean;
  isValid: boolean;
  projectId: string | null;
  authDomain: string | null;
  firestoreDatabaseId: string | null;
  environment: string;
  useEmulator: boolean;
  validationErrors?: string[];
  errorMessage?: string;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedFunctions: Functions | null = null;
let emulatorsConnected = false;

export function isFirebaseConfigured(): boolean {
  return Boolean(ENV.firebase.apiKey && ENV.firebase.projectId);
}

export function getFirebaseStatus(): FirebaseConnectionStatus {
  const validation = validateFirebaseClientConfig(ENV);
  const configured = isFirebaseConfigured();

  return {
    isConfigured: configured,
    isValid: validation.valid,
    projectId: ENV.firebase.projectId || null,
    authDomain: ENV.firebase.authDomain || null,
    firestoreDatabaseId: ENV.firebase.firestoreDatabaseId || null,
    environment: ENV.appEnv,
    useEmulator: ENV.useEmulator,
    validationErrors: validation.valid ? undefined : validation.errors,
    errorMessage: validation.valid
      ? undefined
      : `Firebase client configuration invalid: ${validation.errors.join('; ')}`,
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }

  const validation = validateFirebaseClientConfig(ENV);
  if (!validation.valid) {
    console.warn(`[Firebase Client] Config notice:\n${validation.errors.join('\n')}`);
  }

  const firebaseConfig = {
    apiKey: ENV.firebase.apiKey || 'AIzaSyDdLO6HFKpBVLeOZcZcftKR1g23v1ZBzl4',
    authDomain: ENV.firebase.authDomain || 'bigmomma-investor-wars.firebaseapp.com',
    projectId: ENV.firebase.projectId || 'bigmomma-investor-wars',
    storageBucket: ENV.firebase.storageBucket || 'bigmomma-investor-wars.firebasestorage.app',
    messagingSenderId: ENV.firebase.messagingSenderId || '665313671823',
    appId: ENV.firebase.appId || '1:665313671823:web:34d97c37f49f013d2d0efa',
  };

  try {
    cachedApp = initializeApp(firebaseConfig);
  } catch (err) {
    const apps = getApps();
    if (apps.length > 0) {
      cachedApp = apps[0];
    } else {
      console.error('[Firebase Client] Initialization error, falling back:', err);
      cachedApp = initializeApp(firebaseConfig, `client-${Date.now()}`);
    }
  }
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  cachedAuth = getAuth(app);

  if (ENV.useEmulator && !emulatorsConnected) {
    try {
      connectAuthEmulator(cachedAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    } catch {
      // Ignore if already connected
    }
  }

  return cachedAuth;
}

export function getFirebaseFirestore(): Firestore {
  if (cachedDb) return cachedDb;
  const app = getFirebaseApp();

  // Suppress harmless transient connectivity logs from polluting console in offline/iframe modes
  try {
    setLogLevel('error');
  } catch {
    // Ignore if setLogLevel is unavailable
  }

  const dbId =
    ENV.firebase.firestoreDatabaseId && ENV.firebase.firestoreDatabaseId !== '(default)'
      ? ENV.firebase.firestoreDatabaseId
      : undefined;

  const firestoreSettings = {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  };

  try {
    cachedDb = dbId
      ? initializeFirestore(app, firestoreSettings, dbId)
      : initializeFirestore(app, firestoreSettings);
  } catch {
    // Fall back to existing instance if already initialized
    cachedDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }

  if (ENV.useEmulator && !emulatorsConnected) {
    try {
      connectFirestoreEmulator(cachedDb, '127.0.0.1', 8080);
    } catch {
      // Ignore if already connected
    }
  }

  return cachedDb;
}

export function getFirebaseFunctions(): Functions {
  if (cachedFunctions) return cachedFunctions;
  const app = getFirebaseApp();
  cachedFunctions = getFunctions(app);

  if (ENV.useEmulator && !emulatorsConnected) {
    try {
      connectFunctionsEmulator(cachedFunctions, '127.0.0.1', 5001);
      emulatorsConnected = true;
    } catch {
      // Ignore if already connected
    }
  }

  return cachedFunctions;
}

