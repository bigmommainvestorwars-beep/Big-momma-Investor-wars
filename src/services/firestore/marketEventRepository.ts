/**
 * Production Market Event Repository
 * Authoritative Firestore repository for match market events.
 * Path: /matches/{matchId}/marketEvents/{eventId}
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { MarketEvent } from '../../types/marketEvent';
import { getFirebaseFirestore } from '../firebase/config';

const marketEventConverter: FirestoreDataConverter<MarketEvent> = {
  toFirestore(event: MarketEvent): DocumentData {
    return { ...event };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): MarketEvent {
    return snapshot.data() as MarketEvent;
  },
};

export class MarketEventRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getMarketEvent(matchId: string, eventId: string): Promise<MarketEvent | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'marketEvents', eventId).withConverter(marketEventConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async getActiveMarketEvents(matchId: string): Promise<MarketEvent[]> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'marketEvents').withConverter(marketEventConverter);
    const q = query(colRef, where('isActive', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  public async setMarketEvent(matchId: string, event: MarketEvent): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'marketEvents', event.id).withConverter(marketEventConverter);
    await setDoc(ref, event, { merge: true });
  }

  public subscribeToActiveMarketEvents(
    matchId: string,
    onNext: (events: MarketEvent[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'marketEvents').withConverter(marketEventConverter);
    const q = query(colRef, where('isActive', '==', true));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => d.data()));
      },
      onError
    );
  }
}

export const marketEventRepository = new MarketEventRepository();
