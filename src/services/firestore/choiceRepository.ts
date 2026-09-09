/**
 * Production Pending Choice Repository
 * Authoritative Firestore repository for pending player choices.
 * Path: /matches/{matchId}/choices/{choiceId}
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
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
import { PendingChoice } from '../../types/game';
import { getFirebaseFirestore } from '../firebase/config';

const choiceConverter: FirestoreDataConverter<PendingChoice> = {
  toFirestore(choice: PendingChoice): DocumentData {
    return { ...choice };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): PendingChoice {
    return snapshot.data() as PendingChoice;
  },
};

export class ChoiceRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getChoice(matchId: string, choiceId: string): Promise<PendingChoice | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'choices', choiceId).withConverter(choiceConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async getPendingChoicesForPlayer(matchId: string, playerId: string): Promise<PendingChoice[]> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'choices').withConverter(choiceConverter);
    const q = query(colRef, where('playerId', '==', playerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  public async setChoice(matchId: string, choice: PendingChoice): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'choices', choice.choiceId).withConverter(choiceConverter);
    await setDoc(ref, choice, { merge: true });
  }

  public async deleteChoice(matchId: string, choiceId: string): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'choices', choiceId);
    await deleteDoc(ref);
  }

  public subscribeToPlayerChoices(
    matchId: string,
    playerId: string,
    onNext: (choices: PendingChoice[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'choices').withConverter(choiceConverter);
    const q = query(colRef, where('playerId', '==', playerId));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => d.data()));
      },
      onError
    );
  }
}

export const choiceRepository = new ChoiceRepository();
