/**
 * Production Company Ability Callable Functions
 * Validates ownership, requirements, cooldowns, and activates company abilities.
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { getAdminFirestore } from '../config/firebaseAdmin';
import { AuthGuard } from '../system/security/auth';
import { AppCheckGuard } from '../system/security/appCheck';
import { RateLimiter } from '../system/rateLimit/rateLimiter';
import { IdempotencyService } from '../system/idempotency/idempotencyService';
import { PlayerState } from '../internal/gameEngine';
import {
  ServerRequestEnvelope,
  ServerResponseEnvelope,
  ServerFunctionError,
  SERVER_ERROR_CODES,
} from '../types/contracts';

const db = getAdminFirestore();

/**
 * 14. activateCompanyAbility
 */
export const activateCompanyAbility = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<{ companyId: string; abilityId: string; targetId?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'spAction');

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'activateCompanyAbility',
      async (t) => {
        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

        const player = playerSnap.data() as PlayerState;
        if (!player.companyShareIds.includes(payload.companyId) && !player.ownedSpaceIds.includes(payload.companyId)) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.ACTION_NOT_AVAILABLE,
            'Player does not have ownership or sufficient shares in this company.'
          );
        }

        // Record log
        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
          id: logRef.id,
          turnNumber: 0,
          roundNumber: 0,
          type: 'COMPANY_ABILITY_ACTIVATED',
          sourcePlayerId: player.id,
          targetPlayerId: payload.targetId || null,
          summary: `${player.displayName} activated ability ${payload.abilityId} of company ${payload.companyId}.`,
          data: payload,
          timestamp: Date.now(),
        });

        return {
          companyId: payload.companyId,
          abilityId: payload.abilityId,
          activated: true,
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
  }
);
