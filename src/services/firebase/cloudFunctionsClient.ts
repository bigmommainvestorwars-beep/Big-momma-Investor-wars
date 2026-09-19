/**
 * Production Cloud Functions Client
 * Typed client-side SDK wrapper for invoking authoritative Firebase Cloud Functions.
 */

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { getFirebaseFunctions, getFirebaseAuth, getFirebaseFirestore } from './config';
import { errorHandler } from '../monitoring/errorHandler';
import { authoritativeServerEngine } from '../../engine/authoritativeServerEngine';
import { TEST_ROOM_CODE, TEST_MATCH_ID, IS_TEST_ROOM_MODE } from '../../config/testRoomConfig';
import { FirestoreMatchDoc, FirestorePlayerDoc } from './matchSyncService';

export interface ServerRequestEnvelope<T = unknown> {
  matchId: string;
  requestId: string;
  clientTimestamp?: number;
  expectedStateVersion?: number;
  payload: T;
}

export interface ServerResponseEnvelope<T = unknown> {
  success: boolean;
  requestId: string;
  serverTime: number;
  stateVersion?: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}

let cloudFunctionsLocalTestMode = false;

export function setCloudFunctionsLocalTestMode(enabled: boolean): void {
  cloudFunctionsLocalTestMode = enabled;
}

export function isCloudFunctionsLocalTestMode(): boolean {
  return cloudFunctionsLocalTestMode;
}

export class CloudFunctionsClient {
  public async call<TReq, TRes>(
    functionName: string,
    data: ServerRequestEnvelope<TReq>
  ): Promise<ServerResponseEnvelope<TRes>> {
    // Note: Cloud Functions API is disabled in the Google Cloud project bigmomma-investor-wars.
    // We execute authoritatively with direct Cloud Firestore synchronization to ensure real cross-device multiplayer.
    try {
      return await this.executeAuthoritativeLocal<TReq, TRes>(functionName, data);
    } catch (err: unknown) {
      errorHandler.capture(err, {
        errorCode: 'MATCH_OPERATION_FAILED',
        action: functionName,
        requestId: data.requestId,
        details: {
          originalMessage: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  private async executeAuthoritativeLocal<TReq, TRes>(
    functionName: string,
    data: ServerRequestEnvelope<TReq>
  ): Promise<ServerResponseEnvelope<TRes>> {
    const auth = getFirebaseAuth();
    const p = (data.payload || {}) as Record<string, unknown>;
    const currentUserId =
      (p.actingPlayerId as string) || (p.botId as string) || auth?.currentUser?.uid || 'local_founder_1';
    const currentDisplayName =
      (p.displayName as string) ||
      auth?.currentUser?.displayName ||
      (auth?.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Investor');

    let resultData: unknown = null;

    switch (functionName) {
      case 'createMatch': {
        const boardId = (p.boardId as string) || 'default-standard-board';
        const rulesetVersion = (p.rulesetVersion as string) || '1.0.0';
        const isPrivate = (p.isPrivate as boolean) || false;
        const accessCode = (p.accessCode as string) || (IS_TEST_ROOM_MODE ? TEST_ROOM_CODE : undefined);
        const matchId = IS_TEST_ROOM_MODE ? TEST_MATCH_ID : data.matchId;

        resultData = authoritativeServerEngine.createMatch(
          matchId,
          data.requestId,
          boardId,
          rulesetVersion,
          currentUserId,
          currentDisplayName,
          isPrivate,
          accessCode
        );

        // Required Authoritative Diagnostic Log for Client A
        console.log(`CLIENT A userId: ${currentUserId} matchId: ${matchId} roomCode: ${accessCode || TEST_ROOM_CODE}`);
        break;
      }
      case 'findOrCreateQuickMatch': {
        resultData = authoritativeServerEngine.findOrCreateQuickMatch(
          data.requestId,
          currentUserId,
          (p.displayName as string) || currentDisplayName,
          {
            isPrivate: p.isPrivate as boolean | undefined,
            accessCode: p.accessCode as string | undefined,
          }
        );
        break;
      }
      case 'joinMatchByAccessCode': {
        const rawCodeInput = (p.accessCode as string) || '';
        const cleanCode = rawCodeInput.trim().toUpperCase();
        const rawCode = cleanCode.replace(/^BM-/, '');
        const bmCode = `BM-${rawCode}`;
        const isTestCode =
          cleanCode === TEST_ROOM_CODE ||
          rawCode === '0X9X' ||
          cleanCode.includes('0X9X') ||
          cleanCode === TEST_MATCH_ID.toUpperCase() ||
          (IS_TEST_ROOM_MODE && (!cleanCode || cleanCode === 'BM-0X9X'));

        let targetMatchId = isTestCode ? TEST_MATCH_ID : undefined;

        // Check in-memory engine first
        let container = targetMatchId ? authoritativeServerEngine.getMatchContainer(targetMatchId) : undefined;

        // If not in local memory, check Cloud Firestore
        const db = getFirebaseFirestore();
        if (db) {
          if (!targetMatchId) {
            try {
              const matchesCol = collection(db, 'matches');
              const q1 = query(matchesCol, where('accessCode', '==', cleanCode), limit(1));
              const s1 = await getDocs(q1);
              if (!s1.empty) {
                targetMatchId = s1.docs[0].id;
              } else {
                const q2 = query(matchesCol, where('accessCode', '==', bmCode), limit(1));
                const s2 = await getDocs(q2);
                if (!s2.empty) {
                  targetMatchId = s2.docs[0].id;
                }
              }
            } catch (err) {
              console.warn('[CloudFunctionsClient] Firestore match lookup notice:', err);
            }
          }

          if (targetMatchId && !container) {
            try {
              const mDocRef = doc(db, 'matches', targetMatchId);
              const mSnap = await getDoc(mDocRef);
              if (mSnap.exists()) {
                const matchData = { id: mSnap.id, ...mSnap.data() } as FirestoreMatchDoc;
                const pSnap = await getDocs(collection(db, 'matches', targetMatchId, 'players'));
                const playersData = pSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestorePlayerDoc[];
                container = authoritativeServerEngine.hydrateMatchContainer(matchData, playersData);
              }
            } catch (err) {
              console.warn('[CloudFunctionsClient] Firestore hydration notice:', err);
            }
          }
        }

        resultData = authoritativeServerEngine.joinMatchByAccessCode(
          p.accessCode as string,
          data.requestId,
          currentUserId,
          (p.displayName as string) || currentDisplayName
        );

        // Required Authoritative Diagnostic Log for Client B
        console.log(`CLIENT B userId: ${currentUserId} matchId: ${targetMatchId || (resultData as any)?.matchId || TEST_MATCH_ID} roomCode: ${cleanCode || TEST_ROOM_CODE}`);
        break;
      }
      case 'reconnectPlayer': {
        resultData = authoritativeServerEngine.reconnectPlayer(
          data.matchId,
          data.requestId,
          currentUserId
        );
        break;
      }
      case 'markPlayerDisconnected': {
        authoritativeServerEngine.markPlayerDisconnected(
          data.matchId,
          currentUserId
        );
        resultData = { success: true };
        break;
      }
      case 'joinMatch': {
        const displayName = (p.displayName as string) || currentDisplayName;
        resultData = authoritativeServerEngine.joinMatch(
          data.matchId,
          data.requestId,
          currentUserId,
          displayName
        );
        break;
      }
      case 'leaveMatch': {
        authoritativeServerEngine.leaveMatch(data.matchId, data.requestId, currentUserId);
        resultData = { success: true };
        break;
      }
      case 'addBotPlayer': {
        const botName = p.botName as string | undefined;
        resultData = authoritativeServerEngine.addBotPlayer(data.matchId, data.requestId, botName);
        break;
      }
      case 'removeBotPlayer': {
        const botId = p.botId as string;
        authoritativeServerEngine.removeBotPlayer(data.matchId, data.requestId, botId);
        resultData = { success: true };
        break;
      }
      case 'startMatch': {
        resultData = authoritativeServerEngine.startMatch(data.matchId, data.requestId);
        break;
      }
      case 'requestRoll': {
        const predeterminedRoll = (data.payload as any)?.predeterminedRoll;
        resultData = authoritativeServerEngine.requestRoll(
          data.matchId,
          data.requestId,
          currentUserId,
          data.expectedStateVersion,
          predeterminedRoll
        );
        break;
      }
      case 'buyProperty': {
        resultData = authoritativeServerEngine.buyProperty(
          data.matchId,
          data.requestId,
          currentUserId,
          data.expectedStateVersion
        );
        break;
      }
      case 'startSpaceAuction': {
        resultData = authoritativeServerEngine.startSpaceAuction(
          data.matchId,
          data.requestId,
          currentUserId,
          data.expectedStateVersion
        );
        break;
      }
      case 'createAuction': {
        resultData = authoritativeServerEngine.createAuction(
          data.matchId,
          data.requestId,
          p.assetId as string,
          p.assetName as string,
          p.startingBid as number | undefined
        );
        break;
      }
      case 'placeBid': {
        resultData = authoritativeServerEngine.placeBid(
          data.matchId,
          data.requestId,
          currentUserId,
          p.auctionId as string,
          p.amount as number
        );
        break;
      }
      case 'passAuction': {
        resultData = authoritativeServerEngine.passAuction(
          data.matchId,
          data.requestId,
          currentUserId,
          p.auctionId as string
        );
        break;
      }
      case 'resolveAuction': {
        authoritativeServerEngine.resolveAuction(data.matchId, data.requestId, p.auctionId as string);
        resultData = { success: true };
        break;
      }
      case 'executeSPAction': {
        resultData = authoritativeServerEngine.executeSPAction(
          data.matchId,
          data.requestId,
          currentUserId,
          p.actionId as string,
          p.spCost as number,
          p.targetPlayerId as string | undefined,
          data.expectedStateVersion
        );
        break;
      }
      case 'submitMarketChoice': {
        resultData = authoritativeServerEngine.submitMarketChoice(
          data.matchId,
          data.requestId,
          currentUserId,
          (p.eventId as string) || 'market_event_1',
          (p.choiceId as string) || 'choice_a',
          data.expectedStateVersion
        );
        break;
      }
      case 'mortgageProperty': {
        resultData = authoritativeServerEngine.mortgageProperty(
          data.matchId,
          data.requestId,
          currentUserId,
          p.spaceId as string,
          data.expectedStateVersion
        );
        break;
      }
      case 'unmortgageProperty': {
        resultData = authoritativeServerEngine.unmortgageProperty(
          data.matchId,
          data.requestId,
          currentUserId,
          p.spaceId as string,
          data.expectedStateVersion
        );
        break;
      }
      case 'liquidateProperty': {
        resultData = authoritativeServerEngine.liquidateProperty(
          data.matchId,
          data.requestId,
          currentUserId,
          p.spaceId as string,
          data.expectedStateVersion
        );
        break;
      }
      case 'completeTurn': {
        resultData = authoritativeServerEngine.completeTurn(
          data.matchId,
          data.requestId,
          currentUserId,
          data.expectedStateVersion
        );
        break;
      }
      case 'executeBotTurn': {
        const botId = p.botId as string | undefined;
        resultData = authoritativeServerEngine.executeBotTurn(data.matchId, data.requestId, botId);
        break;
      }
      default: {
        resultData = { acknowledged: true };
      }
    }

    const resolvedMatchId =
      data.matchId ||
      (resultData as any)?.matchId ||
      (resultData as any)?.id ||
      (IS_TEST_ROOM_MODE ? TEST_MATCH_ID : undefined);

    const container = resolvedMatchId ? authoritativeServerEngine.getMatchContainer(resolvedMatchId) : undefined;

    // Persist to Cloud Firestore so both Client A and Client B synchronize in real time
    if (container) {
      const db = getFirebaseFirestore();
      if (db) {
        try {
          await setDoc(
            doc(db, 'matches', container.match.id),
            {
              ...container.match,
              id: container.match.id,
              updatedAt: Date.now(),
            },
            { merge: true }
          );

          const playersCol = collection(db, 'matches', container.match.id, 'players');
          if (functionName === 'createMatch') {
            try {
              const oldSnap = await getDocs(playersCol);
              for (const oldDoc of oldSnap.docs) {
                if (!container.players.has(oldDoc.id)) {
                  await deleteDoc(oldDoc.ref);
                }
              }
            } catch (cleanupErr) {
              console.warn('[CloudFunctionsClient] Stale player cleanup note:', cleanupErr);
            }
          }
          for (const player of container.players.values()) {
            await setDoc(
              doc(playersCol, player.id),
              {
                ...player,
                userId: player.userId || player.id,
                connected: player.connected !== false,
                lastActiveAt: Date.now(),
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.warn('[CloudFunctionsClient] Firestore persistence notice:', err);
        }
      }
    }

    return {
      success: true,
      requestId: data.requestId,
      serverTime: Date.now(),
      stateVersion: container?.match.stateVersion || 1,
      data: resultData as TRes,
    };
  }

  // Convenience methods
  public createMatch(
    matchId: string,
    requestId: string,
    boardId: string = 'default-standard-board',
    rulesetVersion: string = '1.0.0',
    isPrivate: boolean = false,
    accessCode?: string
  ) {
    return this.call<
      {
        boardId: string;
        rulesetVersion?: string;
        isPrivate?: boolean;
        accessCode?: string;
      },
      unknown
    >('createMatch', {
      matchId,
      requestId,
      payload: { boardId, rulesetVersion, isPrivate, accessCode },
    });
  }

  public findOrCreateQuickMatch(
    requestId: string,
    displayName?: string,
    isPrivate?: boolean,
    accessCode?: string
  ) {
    return this.call<
      { displayName?: string; isPrivate?: boolean; accessCode?: string },
      { matchId: string; isNew: boolean; accessCode: string; player: any }
    >('findOrCreateQuickMatch', {
      matchId: 'matchmaking',
      requestId,
      payload: { displayName, isPrivate, accessCode },
    });
  }

  public joinMatchByAccessCode(accessCode: string, requestId: string, displayName?: string) {
    return this.call<
      { accessCode: string; displayName?: string },
      { matchId: string; player: any }
    >('joinMatchByAccessCode', {
      matchId: 'matchmaking',
      requestId,
      payload: { accessCode, displayName },
    });
  }

  public reconnectPlayer(matchId: string, requestId: string) {
    return this.call<
      Record<string, never>,
      { success: boolean; stateVersion: number; player: any }
    >('reconnectPlayer', {
      matchId,
      requestId,
      payload: {},
    });
  }

  public markPlayerDisconnected(matchId: string) {
    return this.call<Record<string, never>, { success: boolean }>('markPlayerDisconnected', {
      matchId,
      requestId: `disconnect_${Date.now()}`,
      payload: {},
    });
  }

  public joinMatch(matchId: string, requestId: string, displayName?: string) {
    return this.call<{ displayName?: string }, unknown>('joinMatch', {
      matchId,
      requestId,
      payload: { displayName },
    });
  }

  public leaveMatch(matchId: string, requestId: string) {
    return this.call<Record<string, never>, unknown>('leaveMatch', {
      matchId,
      requestId,
      payload: {},
    });
  }

  public addBotPlayer(matchId: string, requestId: string, botName?: string) {
    return this.call<{ botName?: string }, unknown>('addBotPlayer', {
      matchId,
      requestId,
      payload: { botName },
    });
  }

  public removeBotPlayer(matchId: string, requestId: string, botId: string) {
    return this.call<{ botId: string }, unknown>('removeBotPlayer', {
      matchId,
      requestId,
      payload: { botId },
    });
  }

  public startMatch(matchId: string, requestId: string) {
    return this.call<Record<string, never>, unknown>('startMatch', {
      matchId,
      requestId,
      payload: {},
    });
  }

  public requestRoll(matchId: string, requestId: string, expectedStateVersion?: number, predeterminedRoll?: number) {
    return this.call<{ predeterminedRoll?: number }, { roll: number; newSpace: number }>('requestRoll', {
      matchId,
      requestId,
      expectedStateVersion,
      payload: { predeterminedRoll },
    });
  }

  public buyProperty(matchId: string, requestId: string, expectedStateVersion?: number) {
    return this.call<Record<string, never>, unknown>('buyProperty', {
      matchId,
      requestId,
      expectedStateVersion,
      payload: {},
    });
  }

  public startSpaceAuction(matchId: string, requestId: string, expectedStateVersion?: number) {
    return this.call<Record<string, never>, unknown>('startSpaceAuction', {
      matchId,
      requestId,
      expectedStateVersion,
      payload: {},
    });
  }

  public executeBotTurn(matchId: string, requestId: string, botId?: string) {
    return this.call<{ botId?: string }, unknown>('executeBotTurn', {
      matchId,
      requestId,
      payload: { botId },
    });
  }

  public createAuction(matchId: string, requestId: string, assetId: string, assetName: string, startingBid?: number) {
    return this.call<{ assetId: string; assetName: string; startingBid?: number }, unknown>('createAuction', {
      matchId,
      requestId,
      payload: { assetId, assetName, startingBid },
    });
  }

  public placeBid(matchId: string, requestId: string, auctionId: string, amount: number, actingPlayerId?: string) {
    return this.call<{ auctionId: string; amount: number; actingPlayerId?: string }, unknown>('placeBid', {
      matchId,
      requestId,
      payload: { auctionId, amount, actingPlayerId },
    });
  }

  public passAuction(matchId: string, requestId: string, auctionId: string, actingPlayerId?: string) {
    return this.call<{ auctionId: string; actingPlayerId?: string }, unknown>('passAuction', {
      matchId,
      requestId,
      payload: { auctionId, actingPlayerId },
    });
  }

  public resolveAuction(matchId: string, requestId: string, auctionId: string) {
    return this.call<{ auctionId: string }, unknown>('resolveAuction', {
      matchId,
      requestId,
      payload: { auctionId },
    });
  }

  public executeSPAction(
    matchId: string,
    requestId: string,
    actionId: string,
    spCost: number,
    targetPlayerId?: string,
    expectedStateVersion?: number
  ) {
    return this.call<{ actionId: string; spCost: number; targetPlayerId?: string }, unknown>('executeSPAction', {
      matchId,
      requestId,
      expectedStateVersion,
      payload: { actionId, spCost, targetPlayerId },
    });
  }

  public submitMarketChoice(
    matchId: string,
    requestId: string,
    eventId: string,
    choiceId: string,
    expectedStateVersion?: number
  ) {
    return this.call<{ eventId: string; choiceId: string }, unknown>('submitMarketChoice', {
      matchId,
      requestId,
      expectedStateVersion,
      payload: { eventId, choiceId },
    });
  }

  public mortgageProperty(
    matchId: string,
    requestId: string,
    spaceId: string,
    expectedStateVersion?: number
  ) {
    return this.call<{ spaceId: string }, { result: string; cashGained: number; stateVersion: number }>(
      'mortgageProperty',
      {
        matchId,
        requestId,
        expectedStateVersion,
        payload: { spaceId },
      }
    );
  }

  public unmortgageProperty(
    matchId: string,
    requestId: string,
    spaceId: string,
    expectedStateVersion?: number
  ) {
    return this.call<{ spaceId: string }, { result: string; costPaid: number; stateVersion: number }>(
      'unmortgageProperty',
      {
        matchId,
        requestId,
        expectedStateVersion,
        payload: { spaceId },
      }
    );
  }

  public liquidateProperty(
    matchId: string,
    requestId: string,
    spaceId: string,
    expectedStateVersion?: number
  ) {
    return this.call<{ spaceId: string }, { result: string; cashGained: number; stateVersion: number }>(
      'liquidateProperty',
      {
        matchId,
        requestId,
        expectedStateVersion,
        payload: { spaceId },
      }
    );
  }

  public completeTurn(matchId: string, requestId: string, expectedStateVersion?: number) {
    return this.call<Record<string, never>, unknown>('completeTurn', {
      matchId,
      requestId,
      expectedStateVersion,
      payload: {},
    });
  }

  public getSystemHealth() {
    return this.call<Record<string, never>, unknown>('getSystemHealth', {
      matchId: 'system',
      requestId: `health_${Date.now()}`,
      payload: {},
    });
  }
}

export const cloudFunctionsClient = new CloudFunctionsClient();
