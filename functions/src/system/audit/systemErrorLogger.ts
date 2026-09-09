/**
 * Production System Error Logger
 * Records server errors to systemErrors/{errorId}.
 * Keeps internal stack traces on the server while returning sanitized errors to clients.
 */

import { getAdminFirestore } from '../../config/firebaseAdmin';

export type SystemErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SystemErrorParams {
  functionName: string;
  errorCode: string;
  message: string;
  severity?: SystemErrorSeverity;
  matchId?: string;
  userId?: string;
  requestId?: string;
  stateVersion?: number;
  stackTrace?: string;
}

export class SystemErrorLogger {
  public static async logError(params: SystemErrorParams): Promise<string> {
    const db = getAdminFirestore();
    const errorRef = db.collection('systemErrors').doc();
    const timestamp = Date.now();

    const record = {
      errorId: errorRef.id,
      severity: params.severity || 'MEDIUM',
      function: params.functionName,
      errorCode: params.errorCode,
      message: params.message,
      matchId: params.matchId || null,
      userId: params.userId || null,
      requestId: params.requestId || null,
      stateVersion: params.stateVersion || null,
      stackTrace: params.stackTrace || null,
      resolved: false,
      timestamp,
    };

    console.error(`[SYSTEM ERROR - ${record.severity}] ${params.functionName}: ${params.message}`, JSON.stringify(record));

    try {
      await errorRef.set(record);
    } catch (err) {
      console.error('Failed to persist system error to Firestore:', err);
    }

    return errorRef.id;
  }
}
