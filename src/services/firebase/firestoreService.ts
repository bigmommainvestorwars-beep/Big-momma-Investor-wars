/**
 * Production Firestore Service Layer
 * Provides real-time synchronization hooks and document readers.
 * Follows strict error isolation and structured error reporting.
 */

import {
  doc,
  getDoc,
  onSnapshot,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseFirestore, isFirebaseConfigured } from './config';
import { GameState } from '../../types/game';
import { errorHandler } from '../monitoring/errorHandler';
import { logger } from '../monitoring/logger';

export interface IFirestoreService {
  isConfigured(): boolean;
  subscribeToGameState(
    gameId: string,
    onState: (state: GameState | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe;
  getGameState(gameId: string): Promise<GameState | null>;
}

class ProductionFirestoreService implements IFirestoreService {
  public isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  public subscribeToGameState(
    gameId: string,
    onState: (state: GameState | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const db = getFirebaseFirestore();
    if (!db) {
      onState(null);
      if (onError) onError(new Error('Firestore is not configured.'));
      return () => {};
    }

    const docRef = doc(db, 'games', gameId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameState;
          onState(data);
        } else {
          onState(null);
        }
      },
      (error) => {
        errorHandler.capture(error, {
          errorCode: 'FIRESTORE_SYNC_ERROR',
          gameId,
          action: 'subscribeToGameState',
        });
        if (onError) onError(error);
      }
    );
  }

  public async getGameState(gameId: string): Promise<GameState | null> {
    const db = getFirebaseFirestore();
    if (!db) return null;

    try {
      const docRef = doc(db, 'games', gameId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return snapshot.data() as GameState;
    } catch (error) {
      errorHandler.capture(error, {
        errorCode: 'FIRESTORE_GET_GAME_ERROR',
        gameId,
        action: 'getGameState',
      });
      throw error;
    }
  }
}

export const firestoreService = new ProductionFirestoreService();
