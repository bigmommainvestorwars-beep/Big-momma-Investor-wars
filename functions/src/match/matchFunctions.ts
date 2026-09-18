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
  withErrorHandling(
    async (
      request: CallableRequest<
        ServerRequestEnvelope<{
          boardId?: string;
          rulesetVersion?: string;
          isPrivate?: boolean;
          accessCode?: string;
          displayName?: string;
        }>
      >
    ) => {
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
        const matchData = existing.data() as MatchState;
        return {
          success: true,
          requestId,
          serverTime: Date.now(),
          stateVersion: matchData.stateVersion,
          data: matchData,
        };
      }

      const generatedCode =
        (payload?.accessCode || '').trim().toUpperCase() ||
        `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const initialMatch: MatchState = {
        matchId,
        boardId: payload?.boardId || 'default-standard-board',
        rulesetVersion: payload?.rulesetVersion || '1.0.0',
        status: 'waiting_for_players',
        currentPhase: 'LOBBY',
        currentPlayerId: null,
        turnNumber: 0,
        roundNumber: 0,
        stateVersion: 1,
        participantUserIds: [auth.userId],
        hostUserId: auth.userId,
        winnerId: null,
        isPrivate: Boolean(payload?.isPrivate),
        accessCode: generatedCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const hostPlayer: PlayerState = {
        id: auth.userId,
        userId: auth.userId,
        displayName: payload?.displayName || auth.email?.split('@')[0] || 'Investor (Host)',
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
    }
  )
);

/**
 * 2. findOrCreateQuickMatch
 */
export const findOrCreateQuickMatch = onCall(
  withErrorHandling(
    async (
      request: CallableRequest<
        ServerRequestEnvelope<{ displayName?: string; isPrivate?: boolean; accessCode?: string }>
      >
    ) => {
      const auth = AuthGuard.assertAuthenticated(request);
      AppCheckGuard.verify(request);
      RateLimiter.check(auth.userId, 'findOrCreateQuickMatch');

      const { requestId, payload } = request.data;
      const displayName = payload?.displayName || auth.email?.split('@')[0] || 'Investor';

      // 1. Look for existing open public matches
      const openMatchesSnap = await db
        .collection('matches')
        .where('status', '==', 'waiting_for_players')
        .where('isPrivate', '==', false)
        .limit(10)
        .get();

      for (const docSnap of openMatchesSnap.docs) {
        const match = docSnap.data() as MatchState;
        if (match.participantUserIds.length < 4) {
          const matchRef = docSnap.ref;
          try {
            const joinResult = await db.runTransaction(async (t) => {
              const freshMatchSnap = await t.get(matchRef);
              if (!freshMatchSnap.exists) return null;
              const freshMatch = freshMatchSnap.data() as MatchState;
              if (freshMatch.status !== 'waiting_for_players' || freshMatch.participantUserIds.length >= 4) {
                return null;
              }

              const isAlreadyParticipant = freshMatch.participantUserIds.includes(auth.userId);
              const playerRef = matchRef.collection('players').doc(auth.userId);
              const playerSnap = await t.get(playerRef);

              let player: PlayerState;
              if (playerSnap.exists) {
                player = playerSnap.data() as PlayerState;
                t.update(playerRef, { connected: true, lastActiveAt: Date.now() });
              } else {
                player = {
                  id: auth.userId,
                  userId: auth.userId,
                  displayName,
                  currentSpaceIndex: 0,
                  status: 'active',
                  turnOrder: freshMatch.participantUserIds.length,
                  netWorth: 1500,
                  cash: 1500,
                  specialPoints: 50,
                  ownedSpaceIds: [],
                  companyShareIds: [],
                  modifierIds: [],
                  connected: true,
                  lastActiveAt: Date.now(),
                };
                t.set(playerRef, player);
              }

              if (!isAlreadyParticipant) {
                freshMatch.participantUserIds.push(auth.userId);
                const newVersion = (freshMatch.stateVersion || 1) + 1;
                t.update(matchRef, {
                  participantUserIds: freshMatch.participantUserIds,
                  stateVersion: newVersion,
                  updatedAt: Date.now(),
                });
                freshMatch.stateVersion = newVersion;
              }

              return {
                matchId: freshMatch.matchId,
                isNew: false,
                accessCode: freshMatch.accessCode || '',
                player,
              };
            });

            if (joinResult) {
              return {
                success: true,
                requestId,
                serverTime: Date.now(),
                data: joinResult,
              };
            }
          } catch (txErr) {
            console.warn('[QuickMatch] Join transaction retry:', txErr);
          }
        }
      }

      // 2. No eligible open match found, create a new public match
      const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const accessCode = `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const newMatch: MatchState = {
        matchId: newMatchId,
        boardId: 'default-standard-board',
        rulesetVersion: '1.0.0',
        status: 'waiting_for_players',
        currentPhase: 'LOBBY',
        currentPlayerId: null,
        turnNumber: 0,
        roundNumber: 0,
        stateVersion: 1,
        participantUserIds: [auth.userId],
        hostUserId: auth.userId,
        winnerId: null,
        isPrivate: false,
        accessCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const hostPlayer: PlayerState = {
        id: auth.userId,
        userId: auth.userId,
        displayName,
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

      const matchRef = db.collection('matches').doc(newMatchId);
      await db.runTransaction(async (t) => {
        t.set(matchRef, newMatch);
        t.set(matchRef.collection('players').doc(hostPlayer.id), hostPlayer);
      });

      return {
        success: true,
        requestId,
        serverTime: Date.now(),
        data: {
          matchId: newMatchId,
          isNew: true,
          accessCode,
          player: hostPlayer,
        },
      };
    }
  )
);

/**
 * 3. joinMatchByAccessCode
 */
export const joinMatchByAccessCode = onCall(
  withErrorHandling(
    async (
      request: CallableRequest<
        ServerRequestEnvelope<{ accessCode: string; displayName?: string }>
      >
    ) => {
      const auth = AuthGuard.assertAuthenticated(request);
      AppCheckGuard.verify(request);
      RateLimiter.check(auth.userId, 'joinMatchByAccessCode');

      const { requestId, payload } = request.data;
      const rawCode = (payload?.accessCode || '').trim();
      if (!rawCode) {
        throw new ServerFunctionError(SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'Room code cannot be blank.');
      }

      const cleanCode = rawCode.toUpperCase();
      const cleanWithoutPrefix = cleanCode.replace(/^BM-?/, '');
      const displayName = payload?.displayName || auth.email?.split('@')[0] || 'Investor';

      let targetDocSnap: FirebaseFirestore.DocumentSnapshot | null = null;

      const q1 = await db.collection('matches').where('accessCode', '==', cleanCode).limit(1).get();
      if (!q1.empty) {
        targetDocSnap = q1.docs[0];
      } else {
        const q2 = await db.collection('matches').where('accessCode', '==', `BM-${cleanWithoutPrefix}`).limit(1).get();
        if (!q2.empty) {
          targetDocSnap = q2.docs[0];
        } else {
          const q3 = await db.collection('matches').where('accessCode', '==', cleanWithoutPrefix).limit(1).get();
          if (!q3.empty) {
            targetDocSnap = q3.docs[0];
          } else {
            const directSnap = await db.collection('matches').doc(rawCode).get();
            if (directSnap.exists) {
              targetDocSnap = directSnap;
            }
          }
        }
      }

      if (!targetDocSnap || !targetDocSnap.exists) {
        throw new ServerFunctionError(
          SERVER_ERROR_CODES.MATCH_NOT_FOUND,
          `No room found for code "${rawCode}". Please verify the code and try again.`
        );
      }

      const matchRef = targetDocSnap.ref;
      const targetMatchId = targetDocSnap.id;

      const result = await db.runTransaction(async (t) => {
        const freshSnap = await t.get(matchRef);
        if (!freshSnap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match was deleted or closed.');
        }
        const match = freshSnap.data() as MatchState;

        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);

        if (match.participantUserIds.includes(auth.userId) && playerSnap.exists) {
          const existingPlayer = playerSnap.data() as PlayerState;
          t.update(playerRef, { connected: true, lastActiveAt: Date.now() });
          return { matchId: targetMatchId, player: existingPlayer };
        }

        if (match.status !== 'waiting_for_players') {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.MATCH_NOT_ACTIVE,
            'This game has already started and cannot accept new players.'
          );
        }

        if (match.participantUserIds.length >= 4) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
            'This lobby is full (max 4 players).'
          );
        }

        const playersSnap = await t.get(matchRef.collection('players'));
        const newPlayer: PlayerState = {
          id: auth.userId,
          userId: auth.userId,
          displayName,
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
        const newVersion = (match.stateVersion || 1) + 1;

        t.update(matchRef, {
          participantUserIds: match.participantUserIds,
          stateVersion: newVersion,
          updatedAt: Date.now(),
        });
        t.set(playerRef, newPlayer);

        return { matchId: targetMatchId, player: newPlayer };
      });

      return {
        success: true,
        requestId,
        serverTime: Date.now(),
        data: result,
      };
    }
  )
);

/**
 * 4. joinMatch
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
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
            'Match is at maximum player capacity.'
          );
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
 * 5. leaveMatch
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
 * 6. startMatch
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
 * 7. getMatchState
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
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH,
        'Not authorized to view private match state.'
      );
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
 * 8. reconnectPlayer / reconnectMatch
 */
export const reconnectPlayer = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<Record<string, never>>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const playerRef = matchRef.collection('players').doc(auth.userId);

    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player is not registered in this match.');
    }

    await playerRef.update({
      connected: true,
      lastActiveAt: Date.now(),
    });

    const matchSnap = await matchRef.get();
    const match = matchSnap.data() as MatchState;

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: match?.stateVersion || 1,
      data: { success: true, stateVersion: match?.stateVersion || 1, player: playerSnap.data() },
    };
  })
);

export const reconnectMatch = reconnectPlayer;

/**
 * 9. markPlayerDisconnected
 */
export const markPlayerDisconnected = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<Record<string, never>>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const playerRef = matchRef.collection('players').doc(auth.userId);

    const playerSnap = await playerRef.get();
    if (playerSnap.exists) {
      await playerRef.update({
        connected: false,
        lastActiveAt: Date.now(),
      });
    }

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      data: { success: true },
    };
  })
);

/**
 * 10. addBotPlayer
 */
export const addBotPlayer = onCall(
  withErrorHandling(
    async (request: CallableRequest<ServerRequestEnvelope<{ botName?: string; personality?: string }>>) => {
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
    }
  )
);

/**
 * 11. removeBotPlayer
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
