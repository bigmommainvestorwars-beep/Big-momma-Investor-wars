/**
 * Production Auction Callable Functions
 * Handles competitive bidding, validation of available cash, bid subcollection persistence, and passing.
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
import { withErrorHandling } from '../system/errorWrapper';

const db = getAdminFirestore();

export interface AuctionState {
  id: string;
  matchId: string;
  assetId: string;
  assetName?: string;
  status: 'active' | 'settled' | 'cancelled';
  currentHighestBid: number;
  currentHighestBidderId: string | null;
  expiresAt: number;
  passedPlayerIds: string[];
}

/**
 * 11. createAuction
 */
export const createAuction = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ assetId: string; assetName: string; startingBid?: number }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const auctionRef = matchRef.collection('auctions').doc();

    const startingBid = payload.startingBid || 50;
    const auctionData: AuctionState = {
      id: auctionRef.id,
      matchId,
      assetId: payload.assetId,
      assetName: payload.assetName,
      status: 'active',
      currentHighestBid: startingBid,
      currentHighestBidderId: null,
      expiresAt: Date.now() + 45000,
      passedPlayerIds: [],
    };

    await db.runTransaction(async (t) => {
      const matchSnap = await t.get(matchRef);
      if (!matchSnap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
      t.set(auctionRef, auctionData);
      t.update(matchRef, { currentPhase: 'AUCTION_IN_PROGRESS' });

      const logRef = matchRef.collection('logs').doc();
      t.set(logRef, {
        id: logRef.id,
        type: 'AUCTION_STARTED',
        sourcePlayerId: auth.userId,
        summary: `Auction started for ${payload.assetName} with opening bid $${startingBid}.`,
        timestamp: Date.now(),
      });
    });

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      data: auctionData,
    };
  })
);

/**
 * 12. placeBid
 */
export const placeBid = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ auctionId: string; amount: number; actingPlayerId?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);
    RateLimiter.check(auth.userId, 'placeBid');

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const auctionRef = matchRef.collection('auctions').doc(payload.auctionId);

    const bidderId = payload.actingPlayerId || auth.userId;

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      bidderId,
      'placeBid',
      async (t) => {
        const auctionSnap = await t.get(auctionRef);
        if (!auctionSnap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_NOT_FOUND, 'Auction not found.');
        }

        const auction = auctionSnap.data() as AuctionState;
        if (auction.status !== 'active') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_NOT_ACTIVE, 'Auction is no longer active.');
        }

        if (Date.now() > auction.expiresAt) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_EXPIRED, 'Auction time has expired.');
        }

        if (payload.amount <= auction.currentHighestBid) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.BID_TOO_LOW,
            `Bid must be greater than current highest bid of $${auction.currentHighestBid}.`
          );
        }

        const playerRef = matchRef.collection('players').doc(bidderId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found in match.');
        }

        const player = playerSnap.data() as PlayerState;
        if (payload.actingPlayerId && payload.actingPlayerId !== auth.userId && !player.isBot) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Cannot act on behalf of another human player.');
        }

        if (player.cash < payload.amount) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INSUFFICIENT_CASH,
            `Insufficient cash. You have $${player.cash}, but bid requires $${payload.amount}.`
          );
        }

        // Subcollection storage for unbounded bid history
        const bidRef = auctionRef.collection('bids').doc();
        const bidRecord = {
          id: bidRef.id,
          auctionId: auction.id,
          playerId: bidderId,
          amount: payload.amount,
          timestamp: Date.now(),
        };

        // Remove from passed if previously passed
        const updatedPassed = (auction.passedPlayerIds || []).filter((id) => id !== bidderId);

        t.set(bidRef, bidRecord);
        t.update(auctionRef, {
          currentHighestBid: payload.amount,
          currentHighestBidderId: bidderId,
          passedPlayerIds: updatedPassed,
          expiresAt: Math.max(auction.expiresAt, Date.now() + 15000), // extend by 15s on new high bid
        });

        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
          id: logRef.id,
          type: 'BID_PLACED',
          sourcePlayerId: auth.userId,
          summary: `${player.displayName} bid $${payload.amount} on ${auction.assetName || 'asset'}.`,
          timestamp: Date.now(),
        });

        return {
          auctionId: auction.id,
          currentHighestBid: payload.amount,
          currentHighestBidderId: auth.userId,
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

/**
 * 13. passAuction
 */
export const passAuction = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ auctionId: string; actingPlayerId?: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const auctionRef = matchRef.collection('auctions').doc(payload.auctionId);

    const passerId = payload.actingPlayerId || auth.userId;

    const result = await IdempotencyService.executeWithIdempotency(
      matchId,
      requestId,
      passerId,
      'passAuction',
      async (t) => {
        const snap = await t.get(auctionRef);
        if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_NOT_FOUND, 'Auction not found.');
        const auction = snap.data() as AuctionState;

        if (auction.status !== 'active') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_NOT_ACTIVE, 'Auction not active.');
        }

        if (payload.actingPlayerId && payload.actingPlayerId !== auth.userId) {
          const actingPlayerRef = matchRef.collection('players').doc(payload.actingPlayerId);
          const actingPlayerSnap = await t.get(actingPlayerRef);
          if (!actingPlayerSnap.exists) {
            throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found in match.');
          }
          const actingPlayer = actingPlayerSnap.data() as PlayerState;
          if (!actingPlayer.isBot) {
            throw new ServerFunctionError(SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Cannot act on behalf of another human player.');
          }
        }

        const passed = auction.passedPlayerIds || [];
        if (!passed.includes(passerId)) {
          passed.push(passerId);
        }

        const playersSnap = await t.get(matchRef.collection('players'));
        const activePlayers = playersSnap.docs
          .map((d) => d.data() as PlayerState)
          .filter((p) => p.status === 'active');

        // Check if all players (or all except current highest bidder) have passed
        const shouldSettle =
          (auction.currentHighestBidderId && passed.length >= activePlayers.length - 1) ||
          passed.length >= activePlayers.length;

        if (shouldSettle) {
          auction.status = 'settled';
          t.update(auctionRef, { status: 'settled', passedPlayerIds: passed });

          if (auction.currentHighestBidderId) {
            const winnerRef = matchRef.collection('players').doc(auction.currentHighestBidderId);
            const winnerSnap = await t.get(winnerRef);
            if (winnerSnap.exists) {
              const winner = winnerSnap.data() as PlayerState;
              const newCash = Math.max(0, winner.cash - auction.currentHighestBid);
              const owned = winner.ownedSpaceIds || [];
              if (!owned.includes(auction.assetId)) owned.push(auction.assetId);

              t.update(winnerRef, {
                cash: newCash,
                ownedSpaceIds: owned,
                netWorth: winner.netWorth, // property value offsets cash
              });

              const logRef = matchRef.collection('logs').doc();
              t.set(logRef, {
                id: logRef.id,
                type: 'AUCTION_SETTLED',
                sourcePlayerId: winner.id,
                summary: `${winner.displayName} won auction for ${auction.assetName || 'asset'} at $${auction.currentHighestBid}!`,
                timestamp: Date.now(),
              });
            }
          }

          t.update(matchRef, { currentPhase: 'TURN_START' });
          return { passed: true, settled: true, winnerId: auction.currentHighestBidderId };
        } else {
          t.update(auctionRef, { passedPlayerIds: passed });
          return { passed: true, settled: false, passedPlayerIds: passed };
        }
      }
    );

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      data: result,
    };
  })
);

/**
 * 14. resolveAuction
 */
export const resolveAuction = onCall(
  withErrorHandling(async (request: CallableRequest<ServerRequestEnvelope<{ auctionId: string }>>) => {
    const auth = AuthGuard.assertAuthenticated(request);
    AppCheckGuard.verify(request);

    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const auctionRef = matchRef.collection('auctions').doc(payload.auctionId);

    const result = await db.runTransaction(async (t) => {
      const snap = await t.get(auctionRef);
      if (!snap.exists) throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_NOT_FOUND, 'Auction not found.');
      const auction = snap.data() as AuctionState;

      if (auction.status !== 'active') {
        return { settled: true, status: auction.status, winnerId: auction.currentHighestBidderId };
      }

      t.update(auctionRef, { status: 'settled' });

      if (auction.currentHighestBidderId) {
        const winnerRef = matchRef.collection('players').doc(auction.currentHighestBidderId);
        const winnerSnap = await t.get(winnerRef);
        if (winnerSnap.exists) {
          const winner = winnerSnap.data() as PlayerState;
          const newCash = Math.max(0, winner.cash - auction.currentHighestBid);
          const owned = winner.ownedSpaceIds || [];
          if (!owned.includes(auction.assetId)) owned.push(auction.assetId);

          t.update(winnerRef, {
            cash: newCash,
            ownedSpaceIds: owned,
          });

          const logRef = matchRef.collection('logs').doc();
          t.set(logRef, {
            id: logRef.id,
            type: 'AUCTION_SETTLED',
            sourcePlayerId: winner.id,
            summary: `${winner.displayName} won auction for ${auction.assetName || 'asset'} at $${auction.currentHighestBid}!`,
            timestamp: Date.now(),
          });
        }
      }

      t.update(matchRef, { currentPhase: 'TURN_START' });
      return { settled: true, winnerId: auction.currentHighestBidderId };
    });

    return {
      success: true,
      requestId,
      serverTime: Date.now(),
      data: result,
    };
  })
);
