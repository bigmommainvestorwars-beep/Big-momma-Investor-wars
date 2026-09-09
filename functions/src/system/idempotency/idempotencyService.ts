/**
 * Production Idempotency Engine
 * Atomic Firestore-based transaction idempotency guard.
 * Path: matches/{matchId}/idempotency/{requestId}
 */

import { Transaction } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../../config/firebaseAdmin';
import { ServerFunctionError, SERVER_ERROR_CODES } from '../../types/contracts';

export interface IdempotencyRecord {
  requestId: string;
  gameId: string;
  playerId: string;
  actionType: string;
  status: 'in_flight' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  responsePayload?: unknown;
  errorMessage?: string;
}

export class IdempotencyService {
  /**
   * Executes a mutation within an atomic idempotency lock.
   * If the request is already completed, returns the cached response.
   * If in-flight, rejects concurrent duplicate execution.
   */
  public static async executeWithIdempotency<T>(
    matchId: string,
    requestId: string,
    playerId: string,
    actionType: string,
    mutationFn: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    if (!requestId || requestId.trim() === '') {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.INVALID_TIMING,
        'A valid requestId is required for all state mutations.'
      );
    }

    const db = getAdminFirestore();
    const idempotencyRef = db
      .collection('matches')
      .doc(matchId)
      .collection('idempotency')
      .doc(requestId);

    // 1. First transaction: check or claim the idempotency lock
    let cachedResult: T | undefined;

    await db.runTransaction(async (t) => {
      const docSnap = await t.get(idempotencyRef);
      if (docSnap.exists) {
        const data = docSnap.data() as IdempotencyRecord;
        if (data.status === 'completed') {
          cachedResult = data.responsePayload as T;
          return;
        }
        if (data.status === 'in_flight') {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.DUPLICATE_REQUEST,
            `Request ${requestId} is currently being processed. Please await response.`,
            true
          );
        }
      }

      // Claim lock
      t.set(idempotencyRef, {
        requestId,
        gameId: matchId,
        playerId,
        actionType,
        status: 'in_flight',
        createdAt: Date.now(),
      });
    });

    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // 2. Execute mutation in transaction
    try {
      const result = await db.runTransaction(async (t) => {
        return await mutationFn(t);
      });

      // 3. Mark completed
      await idempotencyRef.update({
        status: 'completed',
        completedAt: Date.now(),
        responsePayload: result !== undefined ? result : null,
      });

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await idempotencyRef.update({
          status: 'failed',
          completedAt: Date.now(),
          errorMessage: message,
        });
      } catch {
        // Ignore failure update errors
      }
      throw err;
    }
  }
}
