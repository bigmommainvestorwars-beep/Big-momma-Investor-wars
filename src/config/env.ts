/**
 * Production Environment Configuration Boundary
 * Enforces strict environment separation (development | staging | production)
 * and prevents leaking server-side credentials to the client.
 */

import firebaseAppletConfig from '../../firebase-applet-config.json';

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export interface ClientEnvConfig {
  appEnv: AppEnvironment;
  appUrl: string;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  useEmulator: boolean;
  firebase: FirebaseClientConfig;
}

function getEnvVar(key: string, fallback = ''): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
      return String(import.meta.env[key]);
    }
  } catch {
    // Ignore in non-Vite execution contexts
  }
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return String(process.env[key]);
  }
  return fallback;
}

function resolveEnvironment(): AppEnvironment {
  const envMode = (getEnvVar('VITE_APP_ENV') || getEnvVar('NODE_ENV') || getEnvVar('MODE')).toLowerCase();
  if (envMode === 'production' || envMode === 'prod') return 'production';
  if (envMode === 'staging' || envMode === 'stage') return 'staging';
  return 'development';
}

const currentEnv = resolveEnvironment();

export const ENV: ClientEnvConfig = {
  appEnv: currentEnv,
  appUrl: getEnvVar('APP_URL') || (typeof window !== 'undefined' ? window.location.origin : ''),
  isProduction: currentEnv === 'production',
  isStaging: currentEnv === 'staging',
  isDevelopment: currentEnv === 'development',
  useEmulator: getEnvVar('VITE_USE_FIREBASE_EMULATOR') === 'true',
  firebase: {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || firebaseAppletConfig.apiKey || '',
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || firebaseAppletConfig.authDomain || '',
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || firebaseAppletConfig.projectId || '',
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || firebaseAppletConfig.storageBucket || '',
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppletConfig.messagingSenderId || '',
    appId: getEnvVar('VITE_FIREBASE_APP_ID') || firebaseAppletConfig.appId || '',
    firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || '(default)',
  },
};

/**
 * Validates required Firebase client configuration.
 * Fails clearly with exact missing key if missing.
 * Prevents silent fallback to fake values or unintended projects.
 */
export function validateFirebaseClientConfig(config: ClientEnvConfig = ENV): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Security check: Assert that no private keys or service accounts are in VITE_* variables
  const sensitivePatterns = ['-----BEGIN PRIVATE KEY-----', 'private_key', 'service_account'];
  for (const [key, val] of Object.entries(config.firebase)) {
    if (typeof val === 'string') {
      for (const pattern of sensitivePatterns) {
        if (val.includes(pattern)) {
          throw new Error(
            `CRITICAL SECURITY VIOLATION: Private key material detected in client configuration field '${key}'! Service account private keys must never be exposed to the client.`
          );
        }
      }
    }
  }

  const requiredFields: Array<{ key: keyof FirebaseClientConfig; envName: string }> = [
    { key: 'apiKey', envName: 'VITE_FIREBASE_API_KEY' },
    { key: 'authDomain', envName: 'VITE_FIREBASE_AUTH_DOMAIN' },
    { key: 'projectId', envName: 'VITE_FIREBASE_PROJECT_ID' },
    { key: 'storageBucket', envName: 'VITE_FIREBASE_STORAGE_BUCKET' },
    { key: 'messagingSenderId', envName: 'VITE_FIREBASE_MESSAGING_SENDER_ID' },
    { key: 'appId', envName: 'VITE_FIREBASE_APP_ID' },
  ];

  for (const { key, envName } of requiredFields) {
    const val = config.firebase[key];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      errors.push(`Missing required Firebase client environment variable: ${envName}`);
    }
  }

  // Reject Realtime Database URLs as Firestore database identifiers
  if (config.firebase.firestoreDatabaseId) {
    const dbId = config.firebase.firestoreDatabaseId;
    if (dbId.startsWith('http://') || dbId.startsWith('https://') || dbId.includes('firebaseio.com')) {
      errors.push(
        `Invalid Firestore database ID "${dbId}". Cloud Firestore targets the "(default)" database identifier, not a Realtime Database URL.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Safely summarizes the active environment for telemetry and health checks
 * without leaking credentials, tokens, or private keys.
 */
export function getSafeEnvironmentSummary(): {
  environment: AppEnvironment;
  projectId: string;
  hasApiKey: boolean;
  hasAppId: boolean;
  useEmulator: boolean;
} {
  return {
    environment: ENV.appEnv,
    projectId: ENV.firebase.projectId || 'unconfigured',
    hasApiKey: Boolean(ENV.firebase.apiKey),
    hasAppId: Boolean(ENV.firebase.appId),
    useEmulator: ENV.useEmulator,
  };
}

