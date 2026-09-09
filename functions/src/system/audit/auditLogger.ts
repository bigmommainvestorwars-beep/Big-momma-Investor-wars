/**
 * Production Security Audit Logger
 * Authoritatively records security events in securityEvents/{eventId}.
 */

import { getAdminFirestore } from '../../config/firebaseAdmin';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventData {
  eventType: string;
  severity: SecuritySeverity;
  userId?: string;
  matchId?: string;
  requestId?: string;
  ipAddress?: string;
  details: Record<string, unknown>;
}

export class AuditLogger {
  public static async logSecurityEvent(event: SecurityEventData): Promise<string> {
    const db = getAdminFirestore();
    const eventRef = db.collection('securityEvents').doc();
    const timestamp = Date.now();

    const record = {
      eventId: eventRef.id,
      ...event,
      timestamp,
    };

    console.warn(`[SECURITY AUDIT - ${event.severity.toUpperCase()}] ${event.eventType}`, JSON.stringify(record));

    try {
      await eventRef.set(record);
    } catch (err) {
      console.error('Failed to persist security event to Firestore:', err);
    }

    return eventRef.id;
  }
}
