/**
 * Production Idempotency Repository
 * Manages atomic idempotency records stored at /matches/{matchId}/idempotency/{requestId}.
 * Prevents replay attacks and duplicate mutations.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Firestore,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { IdempotencyRecord, IdempotencyStatus } from '../../types/request';
import { getFirebaseFirestore } from '../firebase/config';

const idempotencyConverter: FirestoreDataConverter<IdempotencyRecord> = {
  toFirestore(record: IdempotencyRecord): DocumentData {
    return { ...record };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): IdempotencyRecord {
    return snapshot.data() as IdempotencyRecord;
  },
};

export class IdempotencyRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getRecord(matchId: string, requestId: string): Promise<IdempotencyRecord | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'idempotency', requestId).withConverter(idempotencyConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async createLock(
    matchId: string,
    requestId: string,
    playerId: string,
    actionType: string
  ): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'idempotency', requestId).withConverter(idempotencyConverter);
    const now = Date.now();
    const record: IdempotencyRecord = {
      requestId,
      gameId: matchId,
      playerId,
      actionType,
      status: 'processing',
      processedAt: now,
      expiresAt: now + 5 * 60 * 1000,
    };
    await setDoc(ref, record);
  }

  public async markCompleted(
    matchId: string,
    requestId: string,
    responsePayload?: unknown
  ): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'idempotency', requestId);
    await updateDoc(ref, {
      status: 'completed' as IdempotencyStatus,
      result: responsePayload !== undefined ? responsePayload : null,
    });
  }

  public async markFailed(
    matchId: string,
    requestId: string,
    errorMessage: string
  ): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'idempotency', requestId);
    await updateDoc(ref, {
      status: 'failed' as IdempotencyStatus,
      error: errorMessage,
    });
  }
}

export const idempotencyRepository = new IdempotencyRepository();
