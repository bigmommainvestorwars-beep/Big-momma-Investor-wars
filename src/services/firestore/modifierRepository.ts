/**
 * Production Modifier Repository
 * Authoritative Firestore repository for match active modifiers.
 * Path: /matches/{matchId}/modifiers/{modifierId}
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Modifier } from '../../types/modifier';
import { getFirebaseFirestore } from '../firebase/config';

const modifierConverter: FirestoreDataConverter<Modifier> = {
  toFirestore(mod: Modifier): DocumentData {
    return { ...mod };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Modifier {
    return snapshot.data() as Modifier;
  },
};

export class ModifierRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getModifier(matchId: string, modifierId: string): Promise<Modifier | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'modifiers', modifierId).withConverter(modifierConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async getModifiersForMatch(matchId: string): Promise<Modifier[]> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'modifiers').withConverter(modifierConverter);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data());
  }

  public async setModifier(matchId: string, modifier: Modifier): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'modifiers', modifier.id).withConverter(modifierConverter);
    await setDoc(ref, modifier, { merge: true });
  }

  public async removeModifier(matchId: string, modifierId: string): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'modifiers', modifierId);
    await deleteDoc(ref);
  }

  public subscribeToModifiers(
    matchId: string,
    onNext: (modifiers: Modifier[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'modifiers').withConverter(modifierConverter);
    return onSnapshot(
      colRef,
      (snap) => {
        onNext(snap.docs.map((d) => d.data()));
      },
      onError
    );
  }
}

export const modifierRepository = new ModifierRepository();
