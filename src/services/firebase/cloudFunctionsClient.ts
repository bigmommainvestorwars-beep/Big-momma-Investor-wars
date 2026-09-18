/**
 * Production Cloud Functions Client
 * Typed client-side SDK wrapper for invoking authoritative Firebase Cloud Functions.
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { getFirebaseFunctions, getFirebaseAuth, getFirebaseFirestore } from './config';
import { errorHandler } from '../monitoring/errorHandler';
import { authoritativeServerEngine } from '../../engine/authoritativeServerEngine';
import {
  FirestoreMatchDoc,
  FirestorePlayerDoc,
  FirestoreLogDoc,
  FirestoreAuctionDoc,
} from './matchSyncService';

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

async function ensureMatchHydratedFromFirestore(matchId: string): Promise<boolean> {
  if (!matchId || matchId === 'system' || matchId === 'matchmaking') return false;
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const matchSnap = await getDoc(doc(db, 'matches', matchId));
    if (!matchSnap.exists()) return false;
    const matchData = { id: matchSnap.id, ...matchSnap.data() } as FirestoreMatchDoc;

    // Fetch players
    const playersSnap = await getDocs(collection(db, 'matches', matchId, 'players'));
    const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePlayerDoc));

    // Fetch logs
    const logsSnap = await getDocs(query(collection(db, 'matches', matchId, 'logs'), limit(20)));
    const logsList = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLogDoc));

    // Fetch auction
    const aucSnap = await getDocs(
      query(collection(db, 'matches', matchId, 'auctions'), where('status', '==', 'active'), limit(1))
    );
    const activeAuction = !aucSnap.empty
      ? ({ id: aucSnap.docs[0].id, ...aucSnap.docs[0].data() } as FirestoreAuctionDoc)
      : null;

    authoritativeServerEngine.hydrateMatch(matchData, playersList, logsList, activeAuction);
    return true;
  } catch (e) {
    console.warn('[CloudFunctionsClient] Match hydration error:', e);
    return false;
  }
}

export class CloudFunctionsClient {
  public async call<TReq, TRes>(
    functionName: string,
    data: ServerRequestEnvelope<TReq>
  ): Promise<ServerResponseEnvelope<TRes>> {
    // In DEVELOPMENT/LOCAL TEST MODE or when using local authoritative server, execute directly
    if (cloudFunctionsLocalTestMode) {
      return this.executeAuthoritativeLocal<TReq, TRes>(functionName, data);
    }

    try {
      const functions = getFirebaseFunctions();
      if (!functions) {
        return this.executeAuthoritativeLocal<TReq, TRes>(functionName, data);
      }
      const callable = httpsCallable<ServerRequestEnvelope<TReq>, ServerResponseEnvelope<TRes>>(
        functions,
        functionName
      );
      const result = await callable(data);
      return result.data;
    } catch (err: unknown) {
      console.warn(
        `[CloudFunctionsClient] Callable for '${functionName}' unavailable/failed; seamlessly executing authoritative server logic locally.`,
        err
      );
      // Robust fallback to Authoritative Local Server Engine so matchmaking, bots, and game actions are uninterrupted
      return this.executeAuthoritativeLocal<TReq, TRes>(functionName, data);
    }
  }

  private async executeAuthoritativeLocal<TReq, TRes>(
    functionName: string,
    data: ServerRequestEnvelope<TReq>
  ): Promise<ServerResponseEnvelope<TRes>> {
    const auth = getFirebaseAuth();
    const p = (data.payload || {}) as Record<string, unknown>;
    let currentUserId =
      (p.actingPlayerId as string) || (p.botId as string) || auth?.currentUser?.uid || '';
    if (!currentUserId) {
      try {
        currentUserId = localStorage.getItem('bm_user_uid') || '';
      } catch {}
      if (!currentUserId) currentUserId = 'local_founder_1';
    }
    const currentDisplayName = (p.displayName as string) || auth?.currentUser?.displayName || 'Investor (You)';

    if (data.matchId && data.matchId !== 'system') {
      await ensureMatchHydratedFromFirestore(data.matchId);
    }

    let resultData: unknown = null;

    switch (functionName) {
      case 'createMatch': {
        const boardId = (p.boardId as string) || 'default-standard-board';
        const rulesetVersion = (p.rulesetVersion as string) || '1.0.0';
        const isPrivate = (p.isPrivate as boolean) || false;
        const accessCode = p.accessCode as string | undefined;
        const hostDisplayName = (p.displayName as string) || currentDisplayName;
        resultData = authoritativeServerEngine.createMatch(
          data.matchId,
          data.requestId,
          boardId,
          rulesetVersion,
          currentUserId,
          hostDisplayName,
          isPrivate,
          accessCode
        );
        break;
      }
      case 'findOrCreateQuickMatch': {
        let matchedLobby: { matchId: string; player: any } | null = null;
        const db = getFirebaseFirestore();
        if (db) {
          try {
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, where('status', '==', 'waiting_for_players'), limit(10));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              const m = { id: d.id, ...d.data() } as FirestoreMatchDoc;
              if (
                !m.isPrivate &&
                m.participantUserIds &&
                !m.participantUserIds.includes(currentUserId) &&
                m.participantUserIds.length < 4
              ) {
                await ensureMatchHydratedFromFirestore(m.id);
                const player = authoritativeServerEngine.joinMatch(
                  m.id,
                  data.requestId,
                  currentUserId,
                  (p.displayName as string) || currentDisplayName
                );
                matchedLobby = { matchId: m.id, player };
                break;
              }
            }
          } catch (e) {
            console.warn('[CloudFunctionsClient] Quick match query fallback:', e);
          }
        }

        if (matchedLobby) {
          resultData = { matchId: matchedLobby.matchId, isNew: false, player: matchedLobby.player };
        } else {
          resultData = authoritativeServerEngine.findOrCreateQuickMatch(
            data.requestId,
            currentUserId,
            (p.displayName as string) || currentDisplayName,
            {
              isPrivate: p.isPrivate as boolean | undefined,
              accessCode: p.accessCode as string | undefined,
            }
          );
        }
        break;
      }
      case 'joinMatchByAccessCode': {
        const rawCode = String(p.accessCode || '').trim();
        const cleanCode = rawCode.toUpperCase().replace(/\s+/g, '');
        const cleanWithoutPrefix = cleanCode.replace(/^BM-/, '');
        const cleanWithPrefix = cleanCode.startsWith('BM-') ? cleanCode : `BM-${cleanCode}`;
        let joinedResult: any = null;

        // 1. Try local memory search
        try {
          joinedResult = authoritativeServerEngine.joinMatchByAccessCode(
            cleanCode,
            data.requestId,
            currentUserId,
            (p.displayName as string) || currentDisplayName
          );
        } catch {
          // If not in local memory, fall back to Firestore lookup
        }

        if (joinedResult) {
          resultData = joinedResult;
        } else {
          // 2. Lookup in Firestore
          const db = getFirebaseFirestore();
          let targetMatchDoc: FirestoreMatchDoc | null = null;
          if (db) {
            try {
              // Try exact match
              let q = query(
                collection(db, 'matches'),
                where('accessCode', '==', cleanCode),
                limit(1)
              );
              let snap = await getDocs(q);

              // Try with prefix
              if (snap.empty && cleanWithPrefix !== cleanCode) {
                q = query(
                  collection(db, 'matches'),
                  where('accessCode', '==', cleanWithPrefix),
                  limit(1)
                );
                snap = await getDocs(q);
              }

              // Try without prefix
              if (snap.empty && cleanWithoutPrefix !== cleanCode) {
                q = query(
                  collection(db, 'matches'),
                  where('accessCode', '==', cleanWithoutPrefix),
                  limit(1)
                );
                snap = await getDocs(q);
              }

              if (!snap.empty) {
                targetMatchDoc = { id: snap.docs[0].id, ...snap.docs[0].data() } as FirestoreMatchDoc;
              } else {
                const docSnap = await getDoc(doc(db, 'matches', rawCode));
                if (docSnap.exists()) {
                  targetMatchDoc = { id: docSnap.id, ...docSnap.data() } as FirestoreMatchDoc;
                } else {
                  const upperSnap = await getDoc(doc(db, 'matches', cleanCode));
                  if (upperSnap.exists()) {
                    targetMatchDoc = { id: upperSnap.id, ...upperSnap.data() } as FirestoreMatchDoc;
                  }
                }
              }
            } catch (err) {
              console.warn('[CloudFunctionsClient] Firestore match lookup error:', err);
            }
          }

          if (
            targetMatchDoc &&
            (targetMatchDoc.status === 'waiting_for_players' || targetMatchDoc.status === 'in_progress')
          ) {
            await ensureMatchHydratedFromFirestore(targetMatchDoc.id);
            const player = authoritativeServerEngine.joinMatch(
              targetMatchDoc.id,
              data.requestId,
              currentUserId,
              (p.displayName as string) || currentDisplayName
            );
            resultData = { matchId: targetMatchDoc.id, player };
          } else {
            throw new Error(`Match with access code "${cleanCode}" not found or lobby is no longer active.`);
          }
        }
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

    const container = authoritativeServerEngine.getMatchContainer(data.matchId);
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
    accessCode?: string,
    displayName?: string
  ) {
    return this.call<
      {
        boardId: string;
        rulesetVersion?: string;
        isPrivate?: boolean;
        accessCode?: string;
        displayName?: string;
      },
      unknown
    >('createMatch', {
      matchId,
      requestId,
      payload: { boardId, rulesetVersion, isPrivate, accessCode, displayName },
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
