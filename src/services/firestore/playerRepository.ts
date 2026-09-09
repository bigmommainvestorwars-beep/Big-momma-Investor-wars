/**
 * Production Player Repository
 * Authoritative Firestore repository for players (/matches/{matchId}/players/{playerId}).
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Player } from '../../types/player';
import { getFirebaseFirestore } from '../firebase/config';

const playerConverter: FirestoreDataConverter<Player> = {
  toFirestore(player: Player): DocumentData {
    return { ...player };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Player {
    return snapshot.data() as Player;
  },
};

export class PlayerRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getPlayer(matchId: string, playerId: string): Promise<Player | null> {
    const playerRef = doc(this.getDb(), 'matches', matchId, 'players', playerId).withConverter(playerConverter);
    const snap = await getDoc(playerRef);
    return snap.exists() ? snap.data() : null;
  }

  public async getAllPlayers(matchId: string): Promise<Player[]> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'players').withConverter(playerConverter);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data());
  }

  public async setPlayer(matchId: string, player: Player): Promise<void> {
    const playerRef = doc(this.getDb(), 'matches', matchId, 'players', player.id).withConverter(playerConverter);
    await setDoc(playerRef, player, { merge: true });
  }

  public subscribeToPlayers(
    matchId: string,
    onNext: (players: Player[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'players').withConverter(playerConverter);
    return onSnapshot(
      colRef,
      (snap) => {
        onNext(snap.docs.map((d) => d.data()));
      },
      onError
    );
  }
}

export const playerRepository = new PlayerRepository();
