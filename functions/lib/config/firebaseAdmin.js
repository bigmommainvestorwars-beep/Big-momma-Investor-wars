"use strict";
/**
 * Production Firebase Admin SDK Initialization
 * Server-only module. Uses Google Cloud Application Default Credentials (ADC) / IAM.
 * Never bundles or exposes private key material to clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminApp = getAdminApp;
exports.getAdminFirestore = getAdminFirestore;
exports.getAdminAuth = getAdminAuth;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
let adminApp = null;
function getAdminApp() {
    if (adminApp)
        return adminApp;
    const existingApps = (0, app_1.getApps)();
    if (existingApps.length > 0 && existingApps[0]) {
        adminApp = existingApps[0];
        return adminApp;
    }
    // Uses Google Cloud Application Default Credentials (ADC) / IAM automatically
    // via FIREBASE_CONFIG or GOOGLE_APPLICATION_CREDENTIALS
    const projectId = process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG ? undefined : 'bigmomma-investor-wars');
    adminApp = projectId ? (0, app_1.initializeApp)({ projectId }) : (0, app_1.initializeApp)();
    return adminApp;
}
function getAdminFirestore() {
    // Explicitly targets the (default) Cloud Firestore database on bigmomma-investor-wars
    return (0, firestore_1.getFirestore)(getAdminApp());
}
function getAdminAuth() {
    return (0, auth_1.getAuth)(getAdminApp());
}
//# sourceMappingURL=firebaseAdmin.js.map