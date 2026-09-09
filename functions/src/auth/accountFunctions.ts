/**
 * Production Account Management Callable Functions
 * Implements account state inspection, deletion requests with grace period, and recovery.
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { getAdminFirestore, getAdminAuth } from '../config/firebaseAdmin';
import { AuthGuard } from '../system/security/auth';
import { AppCheckGuard } from '../system/security/appCheck';
import { RateLimiter } from '../system/rateLimit/rateLimiter';
import { AuditLogger } from '../system/audit/auditLogger';
import {
  ServerResponseEnvelope,
  ServerFunctionError,
  SERVER_ERROR_CODES,
} from '../types/contracts';

const db = getAdminFirestore();

// 30 days deletion grace period
const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccountStateResult {
  userId: string;
  email: string | null;
  accountStatus: 'active' | 'suspended' | 'pending_deletion';
  scheduledDeletionAt?: number | null;
  gracePeriodDaysRemaining?: number;
  customClaims?: Record<string, unknown>;
}

/**
 * 15. getAccountState
 */
export const getAccountState = onCall(
  async (request: CallableRequest<Record<string, never>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const userRef = db.collection('users').doc(auth.userId);
    const snap = await userRef.get();

    const userData = snap.exists ? snap.data() : null;
    const accountStatus = userData?.accountStatus || 'active';
    const scheduledDeletionAt = userData?.scheduledDeletionAt || null;

    let gracePeriodDaysRemaining: number | undefined;
    if (scheduledDeletionAt) {
      gracePeriodDaysRemaining = Math.max(0, Math.ceil((scheduledDeletionAt - Date.now()) / (24 * 60 * 60 * 1000)));
    }

    const authUser = await getAdminAuth().getUser(auth.userId);

    const result: AccountStateResult = {
      userId: auth.userId,
      email: auth.email,
      accountStatus,
      scheduledDeletionAt,
      gracePeriodDaysRemaining,
      customClaims: authUser.customClaims,
    };

    const response: ServerResponseEnvelope<AccountStateResult> = {
      success: true,
      requestId: `account_state_${Date.now()}`,
      serverTime: Date.now(),
      data: result,
    };
    return response;
  }
);

/**
 * 16. requestAccountDeletion
 */
export const requestAccountDeletion = onCall(
  async (request: CallableRequest<{ reason?: string }>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'accountDeletion');

    const scheduledDeletionAt = Date.now() + DELETION_GRACE_PERIOD_MS;
    const userRef = db.collection('users').doc(auth.userId);

    await userRef.set(
      {
        accountStatus: 'pending_deletion',
        scheduledDeletionAt,
        deletionRequestedAt: Date.now(),
        deletionReason: request.data?.reason || 'User initiated',
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    // Audit log
    await AuditLogger.logSecurityEvent({
      eventType: 'ACCOUNT_DELETION_REQUESTED',
      severity: 'medium',
      userId: auth.userId,
      details: { scheduledDeletionAt, reason: request.data?.reason },
    });

    const response: ServerResponseEnvelope<{ scheduledDeletionAt: number; gracePeriodDays: number }> = {
      success: true,
      requestId: `del_req_${Date.now()}`,
      serverTime: Date.now(),
      data: { scheduledDeletionAt, gracePeriodDays: 30 },
    };
    return response;
  }
);

/**
 * 17. recoverAccount
 */
export const recoverAccount = onCall(
  async (request: CallableRequest<Record<string, never>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const userRef = db.collection('users').doc(auth.userId);
    const snap = await userRef.get();
    if (!snap.exists) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'User profile record not found.');
    }

    const data = snap.data();
    if (data?.accountStatus !== 'pending_deletion') {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
        'Account is not currently scheduled for deletion.'
      );
    }

    await userRef.update({
      accountStatus: 'active',
      scheduledDeletionAt: null,
      recoveredAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log
    await AuditLogger.logSecurityEvent({
      eventType: 'ACCOUNT_DELETION_CANCELLED',
      severity: 'low',
      userId: auth.userId,
      details: { recoveredAt: Date.now() },
    });

    const response: ServerResponseEnvelope<{ recovered: boolean }> = {
      success: true,
      requestId: `recover_${Date.now()}`,
      serverTime: Date.now(),
      data: { recovered: true },
    };
    return response;
  }
);
