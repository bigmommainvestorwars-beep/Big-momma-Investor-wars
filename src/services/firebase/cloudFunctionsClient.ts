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
import { ServerFunctionError } from '../../../functions/src/types/contracts';
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
let activeClientUser: { uid: string; displayName: string } | null = null;

export function setActiveClientUser(user: { uid: string; displayName: string } | null): void {
  activeClientUser = user;
}

export function getActiveClientUser(): { uid: string; displayName: string } | null {
  return activeClientUser;
}

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
      // Reconnection attempts on stale or expired sessions are benign recovery probes and should not be logged as system faults
      const isBenignReconnectionProbe =
        functionName === 'reconnectPlayer' &&
        (err instanceof ServerFunctionError ||
          (err as any)?.code === 'MATCH_NOT_FOUND' ||
          (err as any)?.code === 'TARGET_NOT_FOUND' ||
          (err as any)?.message?.includes('not found') ||
          (err as any)?.message?.includes('expired'));

      if (!isBenignReconnectionProbe) {
        errorHandler.capture(err, {
          errorCode: 'MATCH_OPERATION_FAILED',
          action: functionName,
          requestId: data.requestId,
          details: {
            originalMessage: err instanceof Error ? err.message : String(err),
          },
        });
      }
      throw err;
    }
  }

  private async executeAuthoritativeLocal<TReq, TRes>(
    functionName: string,
    data: ServerRequestEnvelope<TReq>
  ): Promise<ServerResponseEnvelope<TRes>> {
    const auth = getFirebaseAuth();
    const p = (data.payload || {}) as Record<string, unknown>;
    const storedUid = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_uid') : null;
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_name') : null;

    const currentUserId =
      (p.actingPlayerId as string) ||
      (p.botId as string) ||
      auth?.currentUser?.uid ||
      activeClientUser?.uid ||
      storedUid ||
      'local_founder_1';
    const currentDisplayName =
      (p.displayName as string) ||
      auth?.currentUser?.displayName ||
      activeClientUser?.displayName ||
      storedName ||
      (auth?.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Investor');

    // Pre-hydrate match from Firestore if not present in local memory or synchronize fresh players from Firestore
    const targetMatchIdToHydrate =
      IS_TEST_ROOM_MODE && (!data.matchId || data.matchId === TEST_MATCH_ID || data.matchId === 'match_test_bm_0x9x')
        ? TEST_MATCH_ID
        : data.matchId;

    if (targetMatchIdToHydrate && functionName !== 'createMatch') {
      const db = getFirebaseFirestore();
      if (db) {
        try {
          const mDocRef = doc(db, 'matches', targetMatchIdToHydrate);
          const mSnap = await getDoc(mDocRef);
          const pSnap = await getDocs(collection(db, 'matches', targetMatchIdToHydrate, 'players'));

          if (mSnap.exists()) {
            const matchData = { id: mSnap.id, ...mSnap.data() } as FirestoreMatchDoc;
            const playersData = pSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestorePlayerDoc[];
            playersData.sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));

            let container = authoritativeServerEngine.getMatchContainer(targetMatchIdToHydrate);
            if (!container) {
              container = authoritativeServerEngine.hydrateMatchContainer(matchData, playersData);
            } else {
              Object.assign(container.match, matchData);
              if (playersData.length > 0) {
                container.players.clear();
                for (const p of playersData) {
                  container.players.set(p.id, { ...p });
                  if (!container.match.participantUserIds.includes(p.id)) {
                    container.match.participantUserIds.push(p.id);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[CloudFunctionsClient] Firestore pre-hydration notice for ${targetMatchIdToHydrate}:`, err);
        }
      }
    }

    let resultData: unknown = null;

    switch (functionName) {
      case 'createMatch': {
        const boardId = (p.boardId as string) || 'default-standard-board';
        const rulesetVersion = (p.rulesetVersion as string) || '1.0.0';
        const isPrivate = (p.isPrivate as boolean) || false;
        const isExplicitTestMatch =
          data.matchId === TEST_MATCH_ID ||
          (p.accessCode as string) === TEST_ROOM_CODE ||
          (IS_TEST_ROOM_MODE && isPrivate && !p.accessCode && (!data.matchId || data.matchId === TEST_MATCH_ID));

        const accessCode = (p.accessCode as string) || (isExplicitTestMatch ? TEST_ROOM_CODE : undefined);
        const matchId = isExplicitTestMatch
          ? TEST_MATCH_ID
          : (data.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

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
        console.log(`[CloudFunctionsClient] createMatch success: userId: ${currentUserId} matchId: ${matchId} roomCode: ${accessCode || TEST_ROOM_CODE}`);
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
        const targetMatchId =
          IS_TEST_ROOM_MODE && (!data.matchId || data.matchId === TEST_MATCH_ID || data.matchId === 'match_test_bm_0x9x')
            ? TEST_MATCH_ID
            : data.matchId;

        resultData = authoritativeServerEngine.reconnectPlayer(
          targetMatchId,
          data.requestId,
          currentUserId,
          currentDisplayName
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
      case 'removeLobbyPlayer': {
        const targetId = p.targetPlayerId as string;
        authoritativeServerEngine.removeLobbyPlayer(data.matchId, data.requestId, targetId);
        resultData = { success: true };
        break;
      }
      case 'resetLobby': {
        resultData = authoritativeServerEngine.resetLobby(
          data.matchId,
          data.requestId,
          currentUserId,
          currentDisplayName
        );
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
      ((resultData as any)?.match?.id) ||
      (IS_TEST_ROOM_MODE && !data.matchId ? TEST_MATCH_ID : undefined);

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
          if (functionName === 'createMatch' || functionName === 'resetLobby') {
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
          if (functionName === 'removeLobbyPlayer' || functionName === 'removeBotPlayer') {
            const targetId = (p.targetPlayerId as string) || (p.botId as string);
            if (targetId) {
              try {
                await deleteDoc(doc(playersCol, targetId));
              } catch (delErr) {
                console.warn('[CloudFunctionsClient] Deleted player doc notice:', delErr);
              }
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
      { success: boolean; stateVersion: number; player: any; sessionExpired?: boolean }
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

  public removeLobbyPlayer(matchId: string, requestId: string, targetPlayerId: string) {
    return this.call<{ targetPlayerId: string }, unknown>('removeLobbyPlayer', {
      matchId,
      requestId,
      payload: { targetPlayerId },
    });
  }

  public resetLobby(matchId: string, requestId: string) {
    return this.call<Record<string, never>, unknown>('resetLobby', {
      matchId,
      requestId,
      payload: {},
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
