/**
 * Production Security Repository
 * Authoritative Firestore repository for security audits and anti-cheat telemetry.
 * Path: /securityEvents/{eventId}
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Firestore,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/config';

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventDocument {
  eventId: string;
  eventType: string;
  severity: SecurityEventSeverity;
  userId?: string;
  matchId?: string;
  requestId?: string;
  ipAddress?: string;
  details: Record<string, unknown>;
  timestamp: number;
}

const securityEventConverter: FirestoreDataConverter<SecurityEventDocument> = {
  toFirestore(event: SecurityEventDocument): DocumentData {
    return { ...event };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): SecurityEventDocument {
    return snapshot.data() as SecurityEventDocument;
  },
};

export class SecurityRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getSecurityEvent(eventId: string): Promise<SecurityEventDocument | null> {
    const ref = doc(this.getDb(), 'securityEvents', eventId).withConverter(securityEventConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async recordSecurityEvent(event: SecurityEventDocument): Promise<void> {
    const ref = doc(this.getDb(), 'securityEvents', event.eventId).withConverter(securityEventConverter);
    await setDoc(ref, event);
  }

  public async getRecentSecurityEvents(count = 50): Promise<SecurityEventDocument[]> {
    const colRef = collection(this.getDb(), 'securityEvents').withConverter(securityEventConverter);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }
}

export const securityRepository = new SecurityRepository();
