/**
 * Production Firebase Admin SDK Initialization
 * Server-only module. Uses Google Cloud Application Default Credentials (ADC) / IAM.
 * Never bundles or exposes private key material to clients.
 */

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Uses Google Cloud Application Default Credentials (ADC) / IAM automatically
  // via FIREBASE_CONFIG or GOOGLE_APPLICATION_CREDENTIALS
  adminApp = initializeApp();
  return adminApp;
}

export function getAdminFirestore(): Firestore {
  // Explicitly targets the (default) Cloud Firestore database on bigmomma-investor-wars
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

