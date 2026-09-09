/**
 * Production Match Repository
 * Authoritative Firestore repository for matches (/matches/{matchId}).
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
import { GamePhase, GameStatus } from '../../types/game';
import { getFirebaseFirestore } from '../firebase/config';

export interface MatchDocument {
  matchId: string;
  boardId: string;
  rulesetVersion: string;
  status: GameStatus;
  currentPhase: GamePhase;
  currentPlayerId: string | null;
  turnNumber: number;
  roundNumber: number;
  stateVersion: number;
  participantUserIds: string[];
  hostUserId: string;
  winnerId: string | null;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  endedAt?: number;
}

const matchConverter: FirestoreDataConverter<MatchDocument> = {
  toFirestore(match: MatchDocument): DocumentData {
    return { ...match };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): MatchDocument {
    return snapshot.data() as MatchDocument;
  },
};

export class MatchRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getMatch(matchId: string): Promise<MatchDocument | null> {
    const matchRef = doc(this.getDb(), 'matches', matchId).withConverter(matchConverter);
    const snap = await getDoc(matchRef);
    return snap.exists() ? snap.data() : null;
  }

  public async createMatch(match: MatchDocument): Promise<void> {
    const matchRef = doc(this.getDb(), 'matches', match.matchId).withConverter(matchConverter);
    await setDoc(matchRef, match);
  }

  public async updateMatch(matchId: string, updates: Partial<MatchDocument>): Promise<void> {
    const matchRef = doc(this.getDb(), 'matches', matchId);
    await updateDoc(matchRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  }

  public async getActiveMatchesForUser(userId: string): Promise<MatchDocument[]> {
    const matchesCol = collection(this.getDb(), 'matches').withConverter(matchConverter);
    const q = query(
      matchesCol,
      where('participantUserIds', 'array-contains', userId),
      where('status', 'in', ['waiting_for_players', 'in_progress'])
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  public subscribeToMatch(
    matchId: string,
    onNext: (match: MatchDocument | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const matchRef = doc(this.getDb(), 'matches', matchId).withConverter(matchConverter);
    return onSnapshot(
      matchRef,
      (snap) => {
        onNext(snap.exists() ? snap.data() : null);
      },
      onError
    );
  }
}

export const matchRepository = new MatchRepository();
