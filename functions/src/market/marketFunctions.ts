/**
 * Production Market Choice Callable Functions
 * Validates and applies player market decisions with idempotency.
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { getAdminFirestore } from '../config/firebaseAdmin';
import { AuthGuard } from '../system/security/auth';
import { AppCheckGuard } from '../system/security/appCheck';
import { RateLimiter } from '../system/rateLimit/rateLimiter';
import { IdempotencyService } from '../system/idempotency/idempotencyService';
import {
  ServerRequestEnvelope,
  ServerResponseEnvelope,
  ServerFunctionError,
  SERVER_ERROR_CODES,
} from '../types/contracts';
import { withErrorHandling } from '../system/errorWrapper';

const db = getAdminFirestore();

export interface PendingChoiceData {
  id: string;
  playerId: string;
  type: string;
  options: Array<{ id: string; label: string; action: unknown }>;
  expiresAt: number;
}

/**
 * 13. submitMarketChoice
 */
export const submitMarketChoice = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ choiceId: string; selectedOptionId: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'marketChoice');

    const { matchId, requestId, payload } = request.data;
    const choiceRef = db.collection('matches').doc(matchId).collection('choices').doc(payload.choiceId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'submitMarketChoice',
      async (t) => {
        const choiceSnap = await t.get(choiceRef);
        if (!choiceSnap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.CHOICE_NOT_FOUND, 'Choice not found.');
        }

        const choice = choiceSnap.data() as PendingChoiceData;
        if (choice.playerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Choice belongs to another player.');
        }

        if (Date.now() > choice.expiresAt) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.CHOICE_EXPIRED, 'Choice decision period has expired.');
        }

        const validOption = choice.options.find((opt) => opt.id === payload.selectedOptionId);
        if (!validOption) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_CHOICE, 'Invalid option selected.');
        }

        // Remove resolved choice
        t.delete(choiceRef);

        return {
          choiceId: choice.id,
          selectedOptionId: payload.selectedOptionId,
        };
      }
    );

    const response: ServerResponseEnvelope<typeof result> = {
      success: true,
      requestId,
      serverTime: Date.now(),
      data: result,
    };
    return response;
  })
);
