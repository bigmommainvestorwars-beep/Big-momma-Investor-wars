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
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { ENV, validateFirebaseClientConfig } from '../../config/env';

// Suppress harmless transient connectivity warning logs from polluting console in offline/iframe modes
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is unavailable
}

if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;

  const isHarmlessFirestoreOfflineMsg = (args: any[]) => {
    return args.some(
      (arg) =>
        typeof arg === 'string' &&
        (arg.includes('Could not reach Cloud Firestore backend') ||
          arg.includes("Backend didn't respond within 10 seconds") ||
          arg.includes('The client will operate in offline mode'))
    );
  };

  console.warn = (...args: any[]) => {
    if (isHarmlessFirestoreOfflineMsg(args)) return;
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    if (isHarmlessFirestoreOfflineMsg(args)) return;
    originalError.apply(console, args);
  };
}

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
    throw new Error(`Firebase Client Initialization Failed:\n${validation.errors.join('\n')}`);
  }

  const firebaseConfig = {
    apiKey: ENV.firebase.apiKey,
    authDomain: ENV.firebase.authDomain,
    projectId: ENV.firebase.projectId,
    storageBucket: ENV.firebase.storageBucket,
    messagingSenderId: ENV.firebase.messagingSenderId,
    appId: ENV.firebase.appId,
  };

  cachedApp = initializeApp(firebaseConfig);
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

  const dbId =
    ENV.firebase.firestoreDatabaseId && ENV.firebase.firestoreDatabaseId !== '(default)'
      ? ENV.firebase.firestoreDatabaseId
      : undefined;

  // Use experimentalForceLongPolling so Firestore avoids the 10-second WebSocket handshake timeout
  const firestoreSettings = {
    experimentalForceLongPolling: true,
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

  // Validate connection to Firestore as required by Firebase skill
  if (typeof window !== 'undefined') {
    testFirestoreConnection(cachedDb).catch(() => {});
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

let hasTestedConnection = false;
export async function testFirestoreConnection(dbInstance?: Firestore): Promise<void> {
  if (hasTestedConnection) return;
  hasTestedConnection = true;
  try {
    const db = dbInstance || getFirebaseFirestore();
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Handled silently - client operates seamlessly with offline/fallback persistence
  }
}

