/**
 * Production Administrator & System Diagnostics Callable Functions
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { getAdminFirestore, getAdminAuth } from '../config/firebaseAdmin';
import { AuthGuard } from '../system/security/auth';
import { AppCheckGuard } from '../system/security/appCheck';
import { AuditLogger } from '../system/audit/auditLogger';
import {
  ServerResponseEnvelope,
} from '../types/contracts';

const db = getAdminFirestore();

/**
 * Assigns admin custom claim
 */
export const setAdminClaim = onCall(
  async (request: CallableRequest<{ targetUserId: string; isAdmin: boolean }>) => {
    const auth = AuthGuard.assertAdmin(request);
    AppCheckGuard.verify(request);

    const { targetUserId, isAdmin } = request.data;
    await getAdminAuth().setCustomUserClaims(targetUserId, { admin: isAdmin });

    await AuditLogger.logSecurityEvent({
      eventType: 'ADMIN_CLAIM_MODIFIED',
      severity: 'high',
      userId: auth.userId,
      details: { targetUserId, grantedAdmin: isAdmin },
    });

    const response: ServerResponseEnvelope<{ targetUserId: string; isAdmin: boolean }> = {
      success: true,
      requestId: `admin_claim_${Date.now()}`,
      serverTime: Date.now(),
      data: { targetUserId, isAdmin },
    };
    return response;
  }
);

/**
 * Health Check callable function
 */
export const getSystemHealth = onCall(
  async (request: CallableRequest<Record<string, never>>) => {
    // Health check can be called by authenticated users or monitors
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    let firestoreConnected = false;
    let authConnected = false;

    try {
      const snap = await db.collection('configurations').doc('ruleset_standard').get();
      firestoreConnected = true;
    } catch {
      firestoreConnected = false;
    }

    try {
      await getAdminAuth().getUser(auth.userId);
      authConnected = true;
    } catch {
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

    const response: ServerResponseEnvelope<typeof healthData> = {
      success: healthData.status === 'healthy',
      requestId: `health_${Date.now()}`,
      serverTime: Date.now(),
      data: healthData,
    };
    return response;
  }
);
