/**
 * Production Match Callable Functions
 * Handles lifecycle of matches with strict server-side validation and state versioning.
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { getAdminFirestore } from '../config/firebaseAdmin';
import { AuthGuard } from '../system/security/auth';
import { AppCheckGuard } from '../system/security/appCheck';
import { RateLimiter } from '../system/rateLimit/rateLimiter';
import { IdempotencyService } from '../system/idempotency/idempotencyService';
import { GameEngineInternal, MatchState, PlayerState } from '../internal/gameEngine';
import { withErrorHandling } from '../system/errorWrapper';
import {
  ServerRequestEnvelope,
  ServerResponseEnvelope,
  ServerFunctionError,
  SERVER_ERROR_CODES,
} from '../types/contracts';

const db = getAdminFirestore();

/**
 * 1. createMatch
 */
export const createMatch = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ boardId: string; rulesetVersion?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'createMatch');

    const { matchId, requestId, payload } = request.data;
    if (!matchId) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TIMING, 'matchId is required.');
    }

    const matchRef = db.collection('matches').doc(matchId);
    const existing = await matchRef.get();
    if (existing.exists) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match already exists.');
    }

    const initialMatch: MatchState = {
      matchId,
      boardId: payload.boardId || 'default-standard-board',
      rulesetVersion: payload.rulesetVersion || '1.0.0',
      status: 'waiting_for_players',
      currentPhase: 'LOBBY',
      currentPlayerId: null,
      turnNumber: 0,
      roundNumber: 0,
      stateVersion: 1,
      participantUserIds: [auth.userId],
      hostUserId: auth.userId,
      winnerId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const hostPlayer: PlayerState = {
      id: auth.userId,
      userId: auth.userId,
      displayName: auth.email ? auth.email.split('@')[0] : 'Host',
      currentSpaceIndex: 0,
      status: 'active',
      turnOrder: 0,
      netWorth: 1500,
      cash: 1500,
      specialPoints: 50,
      ownedSpaceIds: [],
      companyShareIds: [],
      modifierIds: [],
      connected: true,
      lastActiveAt: Date.now(),
    };

    await db.runTransaction(async (t) => {
      t.set(matchRef, initialMatch);
      t.set(matchRef.collection('players').doc(hostPlayer.id), hostPlayer);
    });

    const response: ServerResponseEnvelope<MatchState> = {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: 1,
      data: initialMatch,
    };
    return response;
  })
);

/**
 * 2. joinMatch
 */
export const joinMatch = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ displayName?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'joinMatch');

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'joinMatch',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }

        const match = snap.data() as MatchState;
        if (match.status !== 'waiting_for_players') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match has already started.');
        }

        if (match.participantUserIds.includes(auth.userId)) {
          return match;
        }

        const playersSnap = await t.get(matchRef.collection('players'));
        if (playersSnap.size >= 4) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match is at maximum player capacity.');
        }

        const newPlayer: PlayerState = {
          id: auth.userId,
          userId: auth.userId,
          displayName: payload?.displayName || auth.email?.split('@')[0] || `Player ${playersSnap.size + 1}`,
          currentSpaceIndex: 0,
          status: 'active',
          turnOrder: playersSnap.size,
          netWorth: 1500,
          cash: 1500,
          specialPoints: 50,
          ownedSpaceIds: [],
          companyShareIds: [],
          modifierIds: [],
          connected: true,
          lastActiveAt: Date.now(),
        };

        match.participantUserIds.push(auth.userId);
        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;

        t.update(matchRef, {
          participantUserIds: match.participantUserIds,
        });
        t.set(matchRef.collection('players').doc(newPlayer.id), newPlayer);

        return match;
      }
    );

    const response: ServerResponseEnvelope<MatchState> = {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
    return response;
  })
);

/**
 * 3. leaveMatch
 */
export const leaveMatch = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<Record<string, never>>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'leaveMatch',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }
        const match = snap.data() as MatchState;
        if (match.status !== 'waiting_for_players') {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
            'Cannot voluntarily leave a match that has already commenced.'
          );
        }

        match.participantUserIds = match.participantUserIds.filter((id) => id !== auth.userId);
        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;

        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.delete(matchRef.collection('players').doc(auth.userId));
        return match;
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  })
);

/**
 * 4. startMatch
 */
export const startMatch = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<Record<string, never>>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'startMatch',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }
        const match = snap.data() as MatchState;
        if (match.hostUserId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Only the host may start the match.');
        }
        if (match.status !== 'waiting_for_players') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
        }

        const playersSnap = await t.get(matchRef.collection('players'));
        if (playersSnap.size < 2) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
            'At least 2 players are required to start the match.'
          );
        }

        const players = playersSnap.docs.map((d) => d.data() as PlayerState);
        match.status = 'in_progress';
        match.currentPhase = 'TURN_START';
        match.currentPlayerId = players[0].id;
        match.turnNumber = 1;
        match.roundNumber = 1;

        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;

        t.update(matchRef, {
          status: match.status,
          currentPhase: match.currentPhase,
          currentPlayerId: match.currentPlayerId,
          turnNumber: match.turnNumber,
          roundNumber: match.roundNumber,
        });

        return match;
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  })
);

/**
 * 5. getMatchState
 */
export const getMatchState = onCall(
  withErrorHandling(async (request: CallableRequest<{ matchId: string }>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const matchRef = db.collection('matches').doc(request.data.matchId);
    const snap = await matchRef.get();
    if (!snap.exists) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    }

    const match = snap.data() as MatchState;
    if (!match.participantUserIds.includes(auth.userId) && !auth.isAdmin && match.status !== 'waiting_for_players') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Not authorized to view private match state.');
    }

    const playersSnap = await matchRef.collection('players').get();
    const players = playersSnap.docs.map((d) => d.data() as PlayerState);

    return {
      success: true,
      requestId: `get_state_${Date.now()}`,
      serverTime: Date.now(),
      stateVersion: match.stateVersion,
      data: { match, players },
    };
  })
);

/**
 * 6. reconnectMatch
 */
export const reconnectMatch = onCall(
  withErrorHandling(async (request: CallableRequest<{ matchId: string }>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const matchRef = db.collection('matches').doc(request.data.matchId);
    const playerRef = matchRef.collection('players').doc(auth.userId);

    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player is not registered in this match.');
    }

    await playerRef.update({
      connected: true,
      lastActiveAt: Date.now(),
    });

    return {
      success: true,
      requestId: `reconnect_${Date.now()}`,
      serverTime: Date.now(),
      data: { connected: true },
    };
  })
);

/**
 * 7. addBotPlayer
 */
export const addBotPlayer = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ botName?: string; personality?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'addBotPlayer',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.hostUserId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Only host can add AI competitors.');
        }

        if (match.status !== 'waiting_for_players') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
        }

        if (match.participantUserIds.length >= 4) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Lobby is full (max 4 players).');
        }

        const botNames = ['Apex Capital (AI)', 'Venture Bot (AI)', 'Bullish Quant (AI)', 'Silicon Syndicate (AI)'];
        const existingCount = match.participantUserIds.filter((id) => id.startsWith('bot_')).length;
        const defaultName = botNames[existingCount % botNames.length];
        const botName = payload?.botName || defaultName;

        const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const botPlayer: PlayerState = {
          id: botId,
          userId: botId,
          displayName: botName,
          currentSpaceIndex: 0,
          status: 'active',
          turnOrder: match.participantUserIds.length,
          netWorth: 1500,
          cash: 1500,
          specialPoints: 50,
          ownedSpaceIds: [],
          companyShareIds: [],
          modifierIds: [],
          isBot: true,
          connected: true,
          lastActiveAt: Date.now(),
        };

        match.participantUserIds.push(botId);
        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;

        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.set(matchRef.collection('players').doc(botId), botPlayer);

        return { botPlayer, match };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.match.stateVersion,
      data: result,
    };
  })
);

/**
 * 8. removeBotPlayer
 */
export const removeBotPlayer = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ botId: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'removeBotPlayer',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.hostUserId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Only host can remove players.');
        }

        if (match.status !== 'waiting_for_players') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
        }

        match.participantUserIds = match.participantUserIds.filter((id) => id !== payload.botId);
        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;

        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.delete(matchRef.collection('players').doc(payload.botId));

        return { removedBotId: payload.botId, match };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.match.stateVersion,
      data: result,
    };
  })
);

