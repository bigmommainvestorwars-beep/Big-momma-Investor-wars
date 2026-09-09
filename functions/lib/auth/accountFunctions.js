"use strict";
/**
 * Production Account Management Callable Functions
 * Implements account state inspection, deletion requests with grace period, and recovery.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverAccount = exports.requestAccountDeletion = exports.getAccountState = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const auth_1 = require("../system/security/auth");
const appCheck_1 = require("../system/security/appCheck");
const rateLimiter_1 = require("../system/rateLimit/rateLimiter");
const auditLogger_1 = require("../system/audit/auditLogger");
const contracts_1 = require("../types/contracts");
const db = (0, firebaseAdmin_1.getAdminFirestore)();
// 30 days deletion grace period
const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * 15. getAccountState
 */
exports.getAccountState = (0, https_1.onCall)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const userRef = db.collection('users').doc(auth.userId);
    const snap = await userRef.get();
    const userData = snap.exists ? snap.data() : null;
    const accountStatus = userData?.accountStatus || 'active';
    const scheduledDeletionAt = userData?.scheduledDeletionAt || null;
    let gracePeriodDaysRemaining;
    if (scheduledDeletionAt) {
        gracePeriodDaysRemaining = Math.max(0, Math.ceil((scheduledDeletionAt - Date.now()) / (24 * 60 * 60 * 1000)));
    }
    const authUser = await (0, firebaseAdmin_1.getAdminAuth)().getUser(auth.userId);
    const result = {
        userId: auth.userId,
        email: auth.email,
        accountStatus,
        scheduledDeletionAt,
        gracePeriodDaysRemaining,
        customClaims: authUser.customClaims,
    };
    const response = {
        success: true,
        requestId: `account_state_${Date.now()}`,
        serverTime: Date.now(),
        data: result,
    };
    return response;
});
/**
 * 16. requestAccountDeletion
 */
exports.requestAccountDeletion = (0, https_1.onCall)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'accountDeletion');
    const scheduledDeletionAt = Date.now() + DELETION_GRACE_PERIOD_MS;
    const userRef = db.collection('users').doc(auth.userId);
    await userRef.set({
        accountStatus: 'pending_deletion',
        scheduledDeletionAt,
        deletionRequestedAt: Date.now(),
        deletionReason: request.data?.reason || 'User initiated',
        updatedAt: Date.now(),
    }, { merge: true });
    // Audit log
    await auditLogger_1.AuditLogger.logSecurityEvent({
        eventType: 'ACCOUNT_DELETION_REQUESTED',
        severity: 'medium',
        userId: auth.userId,
        details: { scheduledDeletionAt, reason: request.data?.reason },
    });
    const response = {
        success: true,
        requestId: `del_req_${Date.now()}`,
        serverTime: Date.now(),
        data: { scheduledDeletionAt, gracePeriodDays: 30 },
    };
    return response;
});
/**
 * 17. recoverAccount
 */
exports.recoverAccount = (0, https_1.onCall)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const userRef = db.collection('users').doc(auth.userId);
    const snap = await userRef.get();
    if (!snap.exists) {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'User profile record not found.');
    }
    const data = snap.data();
    if (data?.accountStatus !== 'pending_deletion') {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Account is not currently scheduled for deletion.');
    }
    await userRef.update({
        accountStatus: 'active',
        scheduledDeletionAt: null,
        recoveredAt: Date.now(),
        updatedAt: Date.now(),
    });
    // Audit log
    await auditLogger_1.AuditLogger.logSecurityEvent({
        eventType: 'ACCOUNT_DELETION_CANCELLED',
        severity: 'low',
        userId: auth.userId,
        details: { recoveredAt: Date.now() },
    });
    const response = {
        success: true,
        requestId: `recover_${Date.now()}`,
        serverTime: Date.now(),
        data: { recovered: true },
    };
    return response;
});
//# sourceMappingURL=accountFunctions.js.map