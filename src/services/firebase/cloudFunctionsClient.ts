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
import { ServerFunctionError, SERVER_ERROR_CODES } from '../../../functions/src/types/contracts';
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
        const db = getFirebaseFirestore();
        let matchedMatchId: string | null = null;
        let matchedMatchDoc: FirestoreMatchDoc | null = null;
        let matchedPlayers: FirestorePlayerDoc[] = [];

        console.log(`[CloudFunctionsClient:findOrCreateQuickMatch] Initiating search for user: ${currentUserId} (${currentDisplayName})`);

        if (db && !p.isPrivate) {
          try {
            const matchesCol = collection(db, 'matches');
            const q = query(
              matchesCol,
              where('status', '==', 'waiting_for_players'),
              limit(15)
            );

            // Execute query with a 2.5-second timeout protection so matchmaking never hangs
            const snap = await Promise.race([
              getDocs(q),
              new Promise<null>((res) => setTimeout(() => res(null), 2500)),
            ]);

            if (snap && 'docs' in snap) {
              const now = Date.now();
              const cutoff = now - 5 * 60 * 1000; // 5-minute inactivity threshold

              console.log(`[CloudFunctionsClient:findOrCreateQuickMatch] Firestore returned ${snap.size} candidates with status='waiting_for_players'`);

              for (const docSnap of snap.docs) {
                const mData = { id: docSnap.id, ...docSnap.data() } as FirestoreMatchDoc;
                const lastActive = mData.updatedAt || mData.createdAt || 0;
                const isStale = lastActive < cutoff || (mData as any).isDeleted || mData.status === 'abandoned';
                if (isStale) {
                  continue;
                }
                if (mData.isPrivate) {
                  continue;
                }

                // If user is already the host of this match, re-enter it
                if (mData.hostUserId === currentUserId) {
                  matchedMatchId = docSnap.id;
                  matchedMatchDoc = mData;
                  break;
                }

                // Fast check using participantUserIds if present
                const participantList = Array.isArray(mData.participantUserIds) ? mData.participantUserIds : [];
                if (participantList.length > 0 && participantList.length < 2) {
                  matchedMatchId = docSnap.id;
                  matchedMatchDoc = mData;
                  break;
                }

                // Check players subcollection if participantUserIds is missing or empty
                try {
                  const pSnap = await getDocs(collection(db, 'matches', docSnap.id, 'players'));
                  const pDocs = pSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestorePlayerDoc[];
                  const activeCount = pDocs.filter((pl) => pl.status === 'active' || pl.status === 'disconnected').length;

                  if (activeCount > 0 && activeCount < 2) {
                    matchedMatchId = docSnap.id;
                    matchedMatchDoc = mData;
                    matchedPlayers = pDocs;
                    break;
                  }
                } catch {}
              }
            }
          } catch (fsErr) {
            console.warn('[CloudFunctionsClient:findOrCreateQuickMatch] Firestore query notice:', fsErr);
          }
        }

        // Also check in-memory matches as local fallback
        if (!matchedMatchId) {
          for (const container of authoritativeServerEngine.getAllMatches()) {
            if (
              container.match.status === 'waiting_for_players' &&
              !container.match.isPrivate &&
              container.players.size < 2
            ) {
              matchedMatchId = container.match.id;
              matchedMatchDoc = container.match;
              matchedPlayers = Array.from(container.players.values());
              break;
            }
          }
        }

        if (matchedMatchId && matchedMatchDoc) {
          // Join the existing match found
          let container = authoritativeServerEngine.getMatchContainer(matchedMatchId);
          if (!container) {
            if (matchedPlayers.length === 0 && db) {
              try {
                const pSnap = await getDocs(collection(db, 'matches', matchedMatchId, 'players'));
                matchedPlayers = pSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestorePlayerDoc[];
              } catch {}
            }
            container = authoritativeServerEngine.hydrateMatchContainer(matchedMatchDoc, matchedPlayers);
          } else {
            Object.assign(container.match, matchedMatchDoc);
            if (matchedPlayers.length > 0) {
              container.players.clear();
              for (const pl of matchedPlayers) {
                container.players.set(pl.id, { ...pl });
              }
            }
          }

          const joinedPlayer = authoritativeServerEngine.joinMatch(
            matchedMatchId,
            data.requestId,
            currentUserId,
            (p.displayName as string) || currentDisplayName
          );

          resultData = {
            matchId: matchedMatchId,
            isNew: container.match.hostUserId === currentUserId,
            accessCode: matchedMatchDoc.accessCode || `BM-${matchedMatchId.slice(-4).toUpperCase()}`,
            player: joinedPlayer,
          };

          console.log(`[CloudFunctionsClient:findOrCreateQuickMatch] JOINED MATCH: userId: ${currentUserId} matchId: ${matchedMatchId} roomCode: ${(resultData as any).accessCode}`);
        } else {
          // No open match found, create new match
          const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const accessCode =
            (p.accessCode as string) || `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          const createdMatch = authoritativeServerEngine.createMatch(
            newMatchId,
            data.requestId,
            'default-standard-board',
            '1.0.0',
            currentUserId,
            (p.displayName as string) || currentDisplayName,
            (p.isPrivate as boolean) ?? false,
            accessCode
          );

          const container = authoritativeServerEngine.getMatchContainer(newMatchId)!;
          const hostPlayer = container.players.get(currentUserId)!;

          resultData = {
            matchId: newMatchId,
            isNew: true,
            accessCode,
            player: hostPlayer,
          };

          console.log(`[CloudFunctionsClient:findOrCreateQuickMatch] CREATED MATCH: userId: ${currentUserId} matchId: ${newMatchId} roomCode: ${accessCode}`);
        }
        break;
      }
      case 'joinMatchByAccessCode': {
        const rawCodeInput = (p.accessCode as string) || '';
        const cleanCode = rawCodeInput.trim().toUpperCase();
        if (!cleanCode) {
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INVALID_CHOICE,
            'Please enter a valid match room code.'
          );
        }
        const rawCode = cleanCode.replace(/^BM-/, '');
        const bmCode = `BM-${rawCode}`;
        const isTestCode =
          cleanCode === TEST_ROOM_CODE ||
          rawCode === '0X9X' ||
          cleanCode.includes('0X9X') ||
          cleanCode === TEST_MATCH_ID.toUpperCase() ||
          (IS_TEST_ROOM_MODE && (!cleanCode || cleanCode === 'BM-0X9X'));

        let targetMatchId = isTestCode ? TEST_MATCH_ID : authoritativeServerEngine.findMatchIdByAccessCode(cleanCode);

        // Check in-memory engine first
        let container = targetMatchId ? authoritativeServerEngine.getMatchContainer(targetMatchId) : undefined;

        // If not found in local memory, query Cloud Firestore with multiple fallback strategies
        const db = getFirebaseFirestore();
        if (db && !container) {
          if (!targetMatchId) {
            try {
              // 1. Direct fast lookup in dedicated room_codes collection
              try {
                const codeRef1 = doc(db, 'room_codes', cleanCode);
                const codeSnap1 = await getDoc(codeRef1);
                if (codeSnap1.exists() && codeSnap1.data()?.matchId) {
                  targetMatchId = codeSnap1.data().matchId;
                }
              } catch (rcErr) {
                console.warn('[CloudFunctionsClient] room_codes cleanCode check note:', rcErr);
              }

              if (!targetMatchId && bmCode) {
                try {
                  const codeRef2 = doc(db, 'room_codes', bmCode);
                  const codeSnap2 = await getDoc(codeRef2);
                  if (codeSnap2.exists() && codeSnap2.data()?.matchId) {
                    targetMatchId = codeSnap2.data().matchId;
                  }
                } catch {}
              }

              if (!targetMatchId && rawCode && rawCode !== cleanCode) {
                try {
                  const codeRef3 = doc(db, 'room_codes', rawCode);
                  const codeSnap3 = await getDoc(codeRef3);
                  if (codeSnap3.exists() && codeSnap3.data()?.matchId) {
                    targetMatchId = codeSnap3.data().matchId;
                  }
                } catch {}
              }

              // 2. Direct document lookup if user entered a raw matchId
              if (!targetMatchId && rawCodeInput.trim()) {
                const directDoc = await getDoc(doc(db, 'matches', rawCodeInput.trim()));
                if (directDoc.exists()) {
                  targetMatchId = directDoc.id;
                }
              }

              const matchesCol = collection(db, 'matches');

              // 3. Query accessCode matching cleanCode
              if (!targetMatchId && cleanCode) {
                const q1 = query(matchesCol, where('accessCode', '==', cleanCode), limit(1));
                const s1 = await getDocs(q1);
                if (!s1.empty) {
                  targetMatchId = s1.docs[0].id;
                }
              }

              // 4. Query accessCode matching bmCode (e.g. BM-XXXX)
              if (!targetMatchId && bmCode) {
                const q2 = query(matchesCol, where('accessCode', '==', bmCode), limit(1));
                const s2 = await getDocs(q2);
                if (!s2.empty) {
                  targetMatchId = s2.docs[0].id;
                }
              }

              // 5. Query accessCode matching rawCode without prefix
              if (!targetMatchId && rawCode && rawCode !== cleanCode) {
                const q3 = query(matchesCol, where('accessCode', '==', rawCode), limit(1));
                const s3 = await getDocs(q3);
                if (!s3.empty) {
                  targetMatchId = s3.docs[0].id;
                }
              }

              // 6. Broad scan of active waiting lobbies (resilient fallback for any subtle code formatting differences)
              if (!targetMatchId) {
                try {
                  const qOpen = query(matchesCol, where('status', '==', 'waiting_for_players'), limit(25));
                  const sOpen = await getDocs(qOpen);
                  for (const d of sOpen.docs) {
                    const data = d.data() as FirestoreMatchDoc;
                    const docCode = (data.accessCode || '').trim().toUpperCase();
                    const docRaw = docCode.replace(/^BM-/, '');
                    if (
                      docCode === cleanCode ||
                      docCode === bmCode ||
                      docRaw === rawCode ||
                      d.id.toUpperCase().endsWith(rawCode)
                    ) {
                      targetMatchId = d.id;
                      break;
                    }
                  }
                } catch (openErr) {
                  console.warn('[CloudFunctionsClient] Open matches fallback scan notice:', openErr);
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

                const now = Date.now();
                const lastActive = matchData.updatedAt || matchData.createdAt || 0;
                // Generous 60-minute inactivity threshold for active lobbies to tolerate clock skew across devices
                const isStale = (now - lastActive > 60 * 60 * 1000);
                if ((matchData as any).isDeleted || matchData.status === 'abandoned' || isStale) {
                  throw new ServerFunctionError(
                    SERVER_ERROR_CODES.MATCH_NOT_FOUND,
                    `Lobby "${cleanCode}" was closed or abandoned due to inactivity.`
                  );
                }

                if (matchData.status === 'active' || matchData.status === 'in_progress') {
                  throw new ServerFunctionError(
                    SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
                    `Match "${cleanCode}" is already in progress and can no longer be joined.`
                  );
                }

                if (matchData.status === 'completed') {
                  throw new ServerFunctionError(
                    SERVER_ERROR_CODES.INVALID_STATE_TRANSITION,
                    `Match "${cleanCode}" has already ended.`
                  );
                }

                const pSnap = await getDocs(collection(db, 'matches', targetMatchId, 'players'));
                const playersData = pSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestorePlayerDoc[];
                const activePlayerCount = playersData.filter((pl) => pl.status === 'active' || pl.status === 'disconnected').length;

                if (activePlayerCount >= 4) {
                  throw new ServerFunctionError(
                    SERVER_ERROR_CODES.ACTION_LIMIT_REACHED,
                    `Lobby "${cleanCode}" is full (maximum 4 players).`
                  );
                }

                container = authoritativeServerEngine.hydrateMatchContainer(matchData, playersData);
              }
            } catch (err) {
              if (err instanceof ServerFunctionError) throw err;
              console.warn('[CloudFunctionsClient] Firestore hydration notice:', err);
            }
          }
        }

        if (targetMatchId && container) {
          const pDoc = authoritativeServerEngine.joinMatch(
            targetMatchId,
            data.requestId,
            currentUserId,
            (p.displayName as string) || currentDisplayName
          );
          resultData = { matchId: targetMatchId, player: pDoc };
        } else {
          resultData = authoritativeServerEngine.joinMatchByAccessCode(
            p.accessCode as string,
            data.requestId,
            currentUserId,
            (p.displayName as string) || currentDisplayName
          );
        }

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
        const leaveRes = authoritativeServerEngine.leaveMatch(data.matchId, data.requestId, currentUserId);
        resultData = leaveRes;
        const db = getFirebaseFirestore();
        if (db && data.matchId) {
          try {
            const playerRef = doc(db, 'matches', data.matchId, 'players', currentUserId);
            await setDoc(
              playerRef,
              { status: 'left', connected: false, removed: true, lastActiveAt: Date.now() },
              { merge: true }
            );

            if (leaveRes?.isMatchAbandoned) {
              const matchRef = doc(db, 'matches', data.matchId);
              await setDoc(
                matchRef,
                {
                  status: 'abandoned',
                  accessCode: '',
                  isDeleted: true,
                  participantUserIds: [],
                  updatedAt: Date.now(),
                },
                { merge: true }
              );
            }
          } catch (e) {
            console.warn('[CloudFunctionsClient] leaveMatch Firestore sync notice:', e);
          }
        }
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
      (resultData as any)?.matchId ||
      ((resultData as any)?.match?.id) ||
      (resultData as any)?.id ||
      (data.matchId && data.matchId !== 'matchmaking' && data.matchId !== 'system' ? data.matchId : undefined) ||
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

          // Synchronize room code directory for instant O(1) cross-device discovery
          if (container.match.accessCode) {
            const codeRaw = container.match.accessCode.trim().toUpperCase();
            const cleanRaw = codeRaw.replace(/^BM-/, '');
            const bmFormatted = `BM-${cleanRaw}`;

            if (container.match.status === 'abandoned' || (container.match as any).isDeleted) {
              try {
                await deleteDoc(doc(db, 'room_codes', codeRaw));
                if (cleanRaw) await deleteDoc(doc(db, 'room_codes', cleanRaw));
                if (bmFormatted) await deleteDoc(doc(db, 'room_codes', bmFormatted));
              } catch {}
            } else {
              const codeDocData = {
                matchId: container.match.id,
                accessCode: codeRaw,
                hostUserId: container.match.hostUserId,
                status: container.match.status,
                isPrivate: container.match.isPrivate ?? true,
                createdAt: container.match.createdAt,
                updatedAt: Date.now(),
              };
              try {
                await setDoc(doc(db, 'room_codes', codeRaw), codeDocData, { merge: true });
                if (cleanRaw) {
                  await setDoc(doc(db, 'room_codes', cleanRaw), codeDocData, { merge: true });
                }
                if (bmFormatted && bmFormatted !== codeRaw) {
                  await setDoc(doc(db, 'room_codes', bmFormatted), codeDocData, { merge: true });
                }
              } catch (codeSaveErr) {
                console.warn('[CloudFunctionsClient] Room code directory sync notice:', codeSaveErr);
              }
            }
          }

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

  /**
   * Cleans up open lobbies in Firestore that have been inactive for more than 5 minutes
   */
  public async cleanExpiredLobbiesFromFirestore(maxAgeMs = 5 * 60 * 1000): Promise<number> {
    const db = getFirebaseFirestore();
    if (!db) return 0;
    try {
      const cutoff = Date.now() - maxAgeMs;
      const matchesCol = collection(db, 'matches');
      const q = query(matchesCol, where('status', '==', 'waiting_for_players'), limit(25));
      const snap = await getDocs(q);
      let cleaned = 0;
      for (const d of snap.docs) {
        const data = d.data();
        const lastActive = data.updatedAt || data.createdAt || 0;
        const participantCount = Array.isArray(data.participantUserIds) ? data.participantUserIds.length : 0;
        if (lastActive < cutoff || participantCount === 0) {
          await setDoc(
            d.ref,
            {
              status: 'abandoned',
              accessCode: '',
              isDeleted: true,
              participantUserIds: [],
              updatedAt: Date.now(),
            },
            { merge: true }
          );
          cleaned++;
        }
      }
      return cleaned;
    } catch (err) {
      console.warn('[CloudFunctionsClient] cleanExpiredLobbies notice:', err);
      return 0;
    }
  }

  /**
   * Immediately terminates and deletes all open unstarted lobbies
   */
  public async deleteAllOpenLobbies(): Promise<number> {
    authoritativeServerEngine.deleteAllOpenLobbies();
    return this.cleanExpiredLobbiesFromFirestore(0);
  }
}

export const cloudFunctionsClient = new CloudFunctionsClient();
