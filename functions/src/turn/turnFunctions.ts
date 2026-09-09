/**
 * Production Turn & Movement Callable Functions
 * Validates turn order, phases, server-authoritative dice rolling, SP actions, and turn completion.
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { getAdminFirestore } from '../config/firebaseAdmin';
import { AuthGuard } from '../system/security/auth';
import { AppCheckGuard } from '../system/security/appCheck';
import { RateLimiter } from '../system/rateLimit/rateLimiter';
import { IdempotencyService } from '../system/idempotency/idempotencyService';
import { GameEngineInternal, MatchState, PlayerState } from '../internal/gameEngine';
import { getServerSpace, TOTAL_BOARD_SPACES } from '../config/boardData';
import {
  ServerRequestEnvelope,
  ServerResponseEnvelope,
  ServerFunctionError,
  SERVER_ERROR_CODES,
} from '../types/contracts';

const db = getAdminFirestore();

/**
 * 7. requestRoll
 */
export const requestRoll = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<{ diceCount?: number }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'rollDice');

    const { matchId, requestId, expectedStateVersion } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'requestRoll',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }

        const match = snap.data() as MatchState;
        if (match.status !== 'in_progress') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match is not in progress.');
        }

        if (match.currentPlayerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'It is not your turn.');
        }

        if (match.currentPhase !== 'TURN_START') {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INVALID_PHASE,
            `Cannot roll during phase ${match.currentPhase}.`
          );
        }

        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found in match.');
        }

        const player = playerSnap.data() as PlayerState;
        if (player.status !== 'active') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_ELIMINATED, 'Player is not active.');
        }

        // Authoritative server-side roll: 1-6
        const roll = Math.floor(Math.random() * 6) + 1;
        const totalSpaces = TOTAL_BOARD_SPACES;
        const passedGo = player.currentSpaceIndex + roll >= totalSpaces;
        const newSpace = (player.currentSpaceIndex + roll) % totalSpaces;
        const targetSpace = getServerSpace(newSpace);

        if (passedGo) {
          player.cash += 200;
          player.netWorth += 200;
        }

        let nextPhase = 'LANDING_RESOLUTION';
        let actionMessage = `${player.displayName} rolled a ${roll} and moved to ${targetSpace.name}.`;
        if (passedGo) {
          actionMessage += ` Collected $200 passing START.`;
        }

        if (targetSpace.type === 'property' || targetSpace.type === 'company') {
          const playersSnap = await t.get(matchRef.collection('players'));
          const allPlayers = playersSnap.docs.map((d) => d.data() as PlayerState);
          const owner = allPlayers.find((p) => p.ownedSpaceIds?.includes(targetSpace.id));

          if (!owner) {
            nextPhase = 'AWAITING_ACTION';
            actionMessage += ` Property is unowned ($${targetSpace.baseCost}).`;
          } else if (owner.id !== player.id) {
            const rent = targetSpace.baseRent || 15;
            const actualRent = Math.min(player.cash, rent);
            player.cash -= actualRent;
            player.netWorth = Math.max(0, player.netWorth - actualRent);

            const ownerRef = matchRef.collection('players').doc(owner.id);
            t.update(ownerRef, {
              cash: owner.cash + actualRent,
              netWorth: owner.netWorth + actualRent,
            });
            actionMessage += ` Paid $${actualRent} rent to ${owner.displayName}.`;
          } else {
            actionMessage += ` Landed on own property.`;
          }
        } else if (targetSpace.type === 'sp_station') {
          player.specialPoints += 25;
          actionMessage += ` Gained +25 Strategy Points!`;
        } else if (targetSpace.type === 'penalty') {
          const fee = targetSpace.baseCost || 100;
          const actualFee = Math.min(player.cash, fee);
          player.cash -= actualFee;
          player.netWorth = Math.max(0, player.netWorth - actualFee);
          actionMessage += ` Paid $${actualFee} penalty.`;
        } else if (targetSpace.type === 'auction') {
          const auctionRef = matchRef.collection('auctions').doc();
          t.set(auctionRef, {
            id: auctionRef.id,
            matchId,
            assetId: targetSpace.id,
            assetName: `${targetSpace.name} Portfolio`,
            status: 'active',
            currentHighestBid: 50,
            currentHighestBidderId: null,
            expiresAt: Date.now() + 45000,
            passedPlayerIds: [],
          });
          nextPhase = 'AUCTION_IN_PROGRESS';
          actionMessage += ` Triggered a high-frequency auction!`;
        }

        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match, expectedStateVersion);
        match.stateVersion = newVersion;
        match.currentPhase = nextPhase;

        t.update(matchRef, { currentPhase: match.currentPhase });
        t.update(playerRef, {
          currentSpaceIndex: newSpace,
          cash: player.cash,
          netWorth: player.netWorth,
          specialPoints: player.specialPoints,
          lastActiveAt: Date.now(),
        });

        // Record log
        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
          id: logRef.id,
          turnNumber: match.turnNumber,
          roundNumber: match.roundNumber,
          type: 'DICE_ROLLED',
          sourcePlayerId: player.id,
          summary: actionMessage,
          data: { roll, previousSpace: player.currentSpaceIndex, newSpace, passedGo },
          timestamp: Date.now(),
        });

        return {
          roll,
          newSpace,
          stateVersion: newVersion,
        };
      }
    );

    const response: ServerResponseEnvelope<{ roll: number; newSpace: number }> = {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
    return response;
  }
);

/**
 * 8. submitMovementDecision
 */
export const submitMovementDecision = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<{ chosenTargetSpace: number }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload, expectedStateVersion } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'submitMovementDecision',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.currentPlayerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
        }

        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match, expectedStateVersion);
        t.update(playerRef, { currentSpaceIndex: payload.chosenTargetSpace, lastActiveAt: Date.now() });

        return { newSpace: payload.chosenTargetSpace, stateVersion: newVersion };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  }
);

/**
 * 9. executeSPAction
 */
export const executeSPAction = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<{ actionId: string; spCost: number; targetPlayerId?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'spAction');

    const { matchId, requestId, payload, expectedStateVersion } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'executeSPAction',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.currentPlayerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
        }

        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

        const player = playerSnap.data() as PlayerState;
        if (player.specialPoints < payload.spCost) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INSUFFICIENT_SP,
            `Insufficient SP. Requires ${payload.spCost}, available ${player.specialPoints}.`
          );
        }

        const newSP = player.specialPoints - payload.spCost;
        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match, expectedStateVersion);

        t.update(playerRef, { specialPoints: newSP, lastActiveAt: Date.now() });

        // Record log
        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
          id: logRef.id,
          turnNumber: match.turnNumber,
          roundNumber: match.roundNumber,
          type: 'SP_ACTION_EXECUTED',
          sourcePlayerId: player.id,
          targetPlayerId: payload.targetPlayerId || null,
          summary: `${player.displayName} used SP Action ${payload.actionId} for ${payload.spCost} SP.`,
          data: { actionId: payload.actionId, spCost: payload.spCost },
          timestamp: Date.now(),
        });

        return { actionId: payload.actionId, remainingSP: newSP, stateVersion: newVersion };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  }
);

/**
 * 10. completeTurn
 */
export const completeTurn = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<Record<string, never>>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, expectedStateVersion } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'completeTurn',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.currentPlayerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
        }

        const playersSnap = await t.get(matchRef.collection('players'));
        const players = playersSnap.docs.map((d) => d.data() as PlayerState);

        const { nextPlayerId, nextTurnNumber, nextRoundNumber } = GameEngineInternal.advanceTurn(match, players);

        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match, expectedStateVersion);

        match.currentPlayerId = nextPlayerId;
        match.turnNumber = nextTurnNumber;
        match.roundNumber = nextRoundNumber;
        match.currentPhase = 'TURN_START';

        // Check if game is completed
        const activePlayers = players.filter((p) => p.status === 'active');
        if (activePlayers.length <= 1) {
          match.status = 'completed';
          match.winnerId = activePlayers[0]?.id || null;
        }

        t.update(matchRef, {
          currentPlayerId: nextPlayerId,
          turnNumber: nextTurnNumber,
          roundNumber: nextRoundNumber,
          currentPhase: 'TURN_START',
          status: match.status,
          winnerId: match.winnerId || null,
        });

        return {
          nextPlayerId,
          turnNumber: nextTurnNumber,
          roundNumber: nextRoundNumber,
          stateVersion: newVersion,
        };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  }
);

/**
 * 11. buyProperty
 */
export const buyProperty = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<{ spaceId?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, expectedStateVersion } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'buyProperty',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.currentPlayerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
        }

        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not in match.');
        const player = playerSnap.data() as PlayerState;

        const targetSpace = getServerSpace(player.currentSpaceIndex);
        if (targetSpace.type !== 'property' && targetSpace.type !== 'company') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Current space cannot be purchased.');
        }

        const cost = targetSpace.baseCost || 100;
        if (player.cash < cost) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INSUFFICIENT_CASH,
            `Insufficient cash. Cost is $${cost}, you have $${player.cash}.`
          );
        }

        const playersSnap = await t.get(matchRef.collection('players'));
        const allPlayers = playersSnap.docs.map((d) => d.data() as PlayerState);
        const existingOwner = allPlayers.find((p) => p.ownedSpaceIds?.includes(targetSpace.id));
        if (existingOwner) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.ACTION_NOT_AVAILABLE, 'Property is already owned.');
        }

        const owned = player.ownedSpaceIds || [];
        if (!owned.includes(targetSpace.id)) {
          owned.push(targetSpace.id);
        }
        const newCash = player.cash - cost;

        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match, expectedStateVersion);
        match.stateVersion = newVersion;
        match.currentPhase = 'LANDING_RESOLUTION';

        t.update(playerRef, {
          cash: newCash,
          ownedSpaceIds: owned,
          lastActiveAt: Date.now(),
        });
        t.update(matchRef, { currentPhase: match.currentPhase });

        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
          id: logRef.id,
          turnNumber: match.turnNumber,
          roundNumber: match.roundNumber,
          type: 'PROPERTY_ACQUIRED',
          sourcePlayerId: player.id,
          summary: `${player.displayName} acquired ${targetSpace.name} for $${cost}!`,
          timestamp: Date.now(),
        });

        return {
          spaceId: targetSpace.id,
          cost,
          cash: newCash,
          ownedSpaceIds: owned,
          stateVersion: newVersion,
        };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  }
);

/**
 * 12. startSpaceAuction
 */
export const startSpaceAuction = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<Record<string, never>>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, expectedStateVersion } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      auth.userId,
      'startSpaceAuction',
      async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data() as MatchState;

        if (match.currentPlayerId !== auth.userId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
        }

        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');
        const player = playerSnap.data() as PlayerState;

        const targetSpace = getServerSpace(player.currentSpaceIndex);
        const startingBid = Math.max(10, Math.floor((targetSpace.baseCost || 100) / 2));

        const auctionRef = matchRef.collection('auctions').doc();
        t.set(auctionRef, {
          id: auctionRef.id,
          matchId,
          assetId: targetSpace.id,
          assetName: targetSpace.name,
          status: 'active',
          currentHighestBid: startingBid,
          currentHighestBidderId: null,
          expiresAt: Date.now() + 45000,
          passedPlayerIds: [],
        });

        const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match, expectedStateVersion);
        match.stateVersion = newVersion;
        match.currentPhase = 'AUCTION_IN_PROGRESS';

        t.update(matchRef, { currentPhase: 'AUCTION_IN_PROGRESS' });

        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
          id: logRef.id,
          turnNumber: match.turnNumber,
          roundNumber: match.roundNumber,
          type: 'AUCTION_STARTED',
          sourcePlayerId: player.id,
          summary: `${player.displayName} declined ${targetSpace.name} - sent to public auction!`,
          timestamp: Date.now(),
        });

        return { auctionId: auctionRef.id, stateVersion: newVersion };
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      stateVersion: result.stateVersion,
      data: result,
    };
  }
);

/**
 * 13. executeBotTurn
 */
export const executeBotTurn = onCall(
  async (request: CallableRequest<ServerRequestEnvelope<{ botId?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);

    const result = await db.runTransaction(async (t) => {
      const snap = await t.get(matchRef);
      if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
      const match = snap.data() as MatchState;

      if (match.status !== 'in_progress') {
        throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match is not in progress.');
      }

      const botId = payload?.botId || match.currentPlayerId;
      if (!botId || match.currentPlayerId !== botId) {
        throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not bot turn.');
      }

      const botRef = matchRef.collection('players').doc(botId);
      const botSnap = await t.get(botRef);
      if (!botSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Bot not found.');
      const bot = botSnap.data() as PlayerState;
      if (!bot.isBot) throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target is not a bot.');

      // 1. Roll
      const roll = Math.floor(Math.random() * 6) + 1;
      const totalSpaces = TOTAL_BOARD_SPACES;
      const passedGo = bot.currentSpaceIndex + roll >= totalSpaces;
      const newSpace = (bot.currentSpaceIndex + roll) % totalSpaces;
      const targetSpace = getServerSpace(newSpace);

      if (passedGo) {
        bot.cash += 200;
        bot.netWorth += 200;
      }

      let actionMessage = `${bot.displayName} rolled a ${roll} and moved to ${targetSpace.name}.`;
      if (passedGo) actionMessage += ` Collected $200 passing START.`;

      // 2. Resolve space
      if (targetSpace.type === 'property' || targetSpace.type === 'company') {
        const playersSnap = await t.get(matchRef.collection('players'));
        const allPlayers = playersSnap.docs.map((d) => d.data() as PlayerState);
        const owner = allPlayers.find((p) => p.ownedSpaceIds?.includes(targetSpace.id));

        if (!owner) {
          const cost = targetSpace.baseCost || 100;
          if (bot.cash >= cost + 150) {
            bot.cash -= cost;
            bot.ownedSpaceIds = bot.ownedSpaceIds || [];
            bot.ownedSpaceIds.push(targetSpace.id);
            actionMessage += ` Acquired ${targetSpace.name} for $${cost}!`;
          } else {
            actionMessage += ` Passed on purchasing ${targetSpace.name}.`;
          }
        } else if (owner.id !== bot.id) {
          const rent = targetSpace.baseRent || 15;
          const actualRent = Math.min(bot.cash, rent);
          bot.cash -= actualRent;
          bot.netWorth = Math.max(0, bot.netWorth - actualRent);
          const ownerRef = matchRef.collection('players').doc(owner.id);
          t.update(ownerRef, { cash: owner.cash + actualRent, netWorth: owner.netWorth + actualRent });
          actionMessage += ` Paid $${actualRent} rent to ${owner.displayName}.`;
        }
      } else if (targetSpace.type === 'sp_station') {
        bot.specialPoints += 25;
        actionMessage += ` Gained +25 SP.`;
      } else if (targetSpace.type === 'penalty') {
        const fee = targetSpace.baseCost || 100;
        bot.cash = Math.max(0, bot.cash - fee);
        actionMessage += ` Paid $${fee} penalty.`;
      }

      // 3. Advance turn to next player
      const playersSnap = await t.get(matchRef.collection('players'));
      const players = playersSnap.docs.map((d) => d.data() as PlayerState);
      const { nextPlayerId, nextTurnNumber, nextRoundNumber } = GameEngineInternal.advanceTurn(match, players);

      match.currentPlayerId = nextPlayerId;
      match.turnNumber = nextTurnNumber;
      match.roundNumber = nextRoundNumber;
      match.currentPhase = 'TURN_START';

      const newVersion = GameEngineInternal.incrementStateVersion(t, matchRef, match);
      match.stateVersion = newVersion;

      t.update(botRef, {
        currentSpaceIndex: newSpace,
        cash: bot.cash,
        netWorth: bot.netWorth,
        specialPoints: bot.specialPoints,
        ownedSpaceIds: bot.ownedSpaceIds || [],
        lastActiveAt: Date.now(),
      });

      t.update(matchRef, {
        currentPlayerId: nextPlayerId,
        turnNumber: nextTurnNumber,
        roundNumber: nextRoundNumber,
        currentPhase: 'TURN_START',
      });

      const logRef = matchRef.collection('logs').doc();
      t.set(logRef, {
        id: logRef.id,
        turnNumber: match.turnNumber,
        roundNumber: match.roundNumber,
        type: 'BOT_TURN_COMPLETED',
        sourcePlayerId: bot.id,
        summary: actionMessage,
        data: { roll, newSpace, nextPlayerId },
        timestamp: Date.now(),
      });

      return {
        botId: bot.id,
        roll,
        newSpace,
        nextPlayerId,
        stateVersion: newVersion,
      };
    });

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      data: result,
    };
  }
);

