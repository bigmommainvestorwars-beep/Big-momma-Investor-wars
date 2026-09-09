"use strict";
/**
 * Production Administrator & System Diagnostics Callable Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemHealth = exports.setAdminClaim = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const auth_1 = require("../system/security/auth");
const appCheck_1 = require("../system/security/appCheck");
const auditLogger_1 = require("../system/audit/auditLogger");
const db = (0, firebaseAdmin_1.getAdminFirestore)();
/**
 * Assigns admin custom claim
 */
exports.setAdminClaim = (0, https_1.onCall)(async (request) => {
    const auth = auth_1.AuthGuard.assertAdmin(request);
    appCheck_1.AppCheckGuard.verify(request);
    const { targetUserId, isAdmin } = request.data;
    await (0, firebaseAdmin_1.getAdminAuth)().setCustomUserClaims(targetUserId, { admin: isAdmin });
    await auditLogger_1.AuditLogger.logSecurityEvent({
        eventType: 'ADMIN_CLAIM_MODIFIED',
        severity: 'high',
        userId: auth.userId,
        details: { targetUserId, grantedAdmin: isAdmin },
    });
    const response = {
        success: true,
        requestId: `admin_claim_${Date.now()}`,
        serverTime: Date.now(),
        data: { targetUserId, isAdmin },
    };
    return response;
});
/**
 * Health Check callable function
 */
exports.getSystemHealth = (0, https_1.onCall)(async (request) => {
    // Health check can be called by authenticated users or monitors
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    let firestoreConnected = false;
    let authConnected = false;
    try {
        const snap = await db.collection('configurations').doc('ruleset_standard').get();
        firestoreConnected = true;
    }
    catch {
        firestoreConnected = false;
    }
    try {
        await (0, firebaseAdmin_1.getAdminAuth)().getUser(auth.userId);
        authConnected = true;
    }
    catch {
        authConnected = false;
    }
    const healthData = {
        status: firestoreConnected && authConnected ? 'healthy' : 'degraded',
        services: {
            firestore: firestoreConnected ? 'connected' : 'error',
            auth: authConnected ? 'connected' : 'error',
            functions: 'connected',
        },
        environment: process.env.NODE_ENV || 'production',
        schemaVersion: '1.0.0',
        serverTime: Date.now(),
    };
    const response = {
        success: healthData.status === 'healthy',
        requestId: `health_${Date.now()}`,
        serverTime: Date.now(),
        data: healthData,
    };
    return response;
});
//# sourceMappingURL=adminFunctions.js.map