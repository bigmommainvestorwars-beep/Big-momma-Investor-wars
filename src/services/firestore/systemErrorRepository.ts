/**
 * Production System Error Repository
 * Authoritative Firestore repository for tracking system errors.
 * Path: /systemErrors/{errorId}
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Firestore,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/config';

export type SystemErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SystemErrorDocument {
  errorId: string;
  severity: SystemErrorSeverity;
  function: string;
  matchId?: string;
  userId?: string;
  requestId?: string;
  errorCode: string;
  message: string;
  timestamp: number;
  stackTrace?: string;
  stateVersion?: number;
  resolved: boolean;
  resolvedAt?: number;
  resolutionNotes?: string;
}

const systemErrorConverter: FirestoreDataConverter<SystemErrorDocument> = {
  toFirestore(record: SystemErrorDocument): DocumentData {
    return { ...record };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): SystemErrorDocument {
    return snapshot.data() as SystemErrorDocument;
  },
};

export class SystemErrorRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getError(errorId: string): Promise<SystemErrorDocument | null> {
    const ref = doc(this.getDb(), 'systemErrors', errorId).withConverter(systemErrorConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async recordError(record: SystemErrorDocument): Promise<void> {
    const ref = doc(this.getDb(), 'systemErrors', record.errorId).withConverter(systemErrorConverter);
    await setDoc(ref, record);
  }

  public async getUnresolvedErrors(maxCount = 50): Promise<SystemErrorDocument[]> {
    const colRef = collection(this.getDb(), 'systemErrors').withConverter(systemErrorConverter);
    const q = query(
      colRef,
      where('resolved', '==', false),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  public async markResolved(errorId: string, resolutionNotes?: string): Promise<void> {
    const ref = doc(this.getDb(), 'systemErrors', errorId);
    await updateDoc(ref, {
      resolved: true,
      resolvedAt: Date.now(),
      resolutionNotes: resolutionNotes || 'Resolved by administrator.',
    });
  }
}

export const systemErrorRepository = new SystemErrorRepository();
