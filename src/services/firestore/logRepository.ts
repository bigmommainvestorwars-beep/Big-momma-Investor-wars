/**
 * Production Match Event Log Repository
 * Authoritative Firestore repository for game event logs.
 * Path: /matches/{matchId}/logs/{logId}
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
  onSnapshot,
  Firestore,
  Unsubscribe,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { GameEvent } from '../../types/gameEvent';
import { getFirebaseFirestore } from '../firebase/config';

const logConverter: FirestoreDataConverter<GameEvent> = {
  toFirestore(event: GameEvent): DocumentData {
    return { ...event };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): GameEvent {
    return snapshot.data() as GameEvent;
  },
};

export class MatchLogRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getLog(matchId: string, logId: string): Promise<GameEvent | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'logs', logId).withConverter(logConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async getRecentLogs(matchId: string, count = 50): Promise<GameEvent[]> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'logs').withConverter(logConverter);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  public async appendLog(matchId: string, event: GameEvent): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'logs', event.id).withConverter(logConverter);
    await setDoc(ref, event);
  }

  public subscribeToRecentLogs(
    matchId: string,
    count: number,
    onNext: (events: GameEvent[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'logs').withConverter(logConverter);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(count));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => d.data()));
      },
      onError
    );
  }
}

export const matchLogRepository = new MatchLogRepository();
