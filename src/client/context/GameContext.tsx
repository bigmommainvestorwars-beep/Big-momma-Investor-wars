/**
 * Production Client Game State Context
 * Manages read-only synchronization of authoritative GameState from Firestore,
 * instant zero-network Local AI Training Simulation,
 * robust connection lifecycle, and timeout-protected action dispatchers.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../../services/firebase/config';
import { GameState } from '../../types/game';
import { ActionRequest } from '../../types/request';
import { firestoreService } from '../../services/firebase/firestoreService';
import { functionsService, ActionResponse } from '../../services/firebase/functionsService';
import { validateActionRequest } from '../../validation/requestValidator';
import {
  matchSyncService,
  FirestoreMatchDoc,
  FirestorePlayerDoc,
  FirestoreLogDoc,
  FirestoreAuctionDoc,
} from '../../services/firebase/matchSyncService';
import { cloudFunctionsClient } from '../../services/firebase/cloudFunctionsClient';
import { useAuth } from './AuthContext';
import { BotRunnerService } from '../../bot/botRunnerService';
import { PRESET_BOT_PROFILES } from '../../bot/botTypes';
import { PendingMarketChoiceDoc, MarketEvent } from '../../types/marketEvent';
import { TEST_ROOM_CODE, TEST_MATCH_ID, IS_TEST_ROOM_MODE } from '../../config/testRoomConfig';

export interface GameContextValue {
  // Matches state
  activeMatchId: string | null;
  match: FirestoreMatchDoc | null;
  players: FirestorePlayerDoc[];
  logs: FirestoreLogDoc[];
  activeAuction: FirestoreAuctionDoc | null;
  pendingMarketChoice: PendingMarketChoiceDoc | null;
  activeMarketEvent: MarketEvent | null;
  openMatches: FirestoreMatchDoc[];
  matchError: string | null;
  isActionPending: boolean;
  clearMatchError: () => void;

  // Network Resilience & Reconnection Handshake
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  isOnline: boolean;
  lastReconnectedAt: number | null;
  reconnectHandshake: () => Promise<void>;

  // Local device role: 'host' | 'guest' | 'unknown'
  localRole: 'host' | 'guest' | 'unknown';
  setLocalRole: (role: 'host' | 'guest' | 'unknown') => void;

  // Matchmaking Quick-Match Queue
  matchmakingQueueState: 'idle' | 'searching' | 'matched' | 'joining';
  queueTimeSeconds: number;
  startQuickMatchQueue: () => Promise<string>;
  cancelQuickMatchQueue: () => void;
  fillRemainingWithBots: () => Promise<void>;
  joinByRoomCode: (code: string) => Promise<void>;
  createPrivateMatch: () => Promise<string>;

  // Match control actions
  setActiveMatchId: (matchId: string | null) => void;
  createMatch: (boardId?: string, rulesetVersion?: string) => Promise<string>;
  createSoloBotMatch: () => Promise<string>;
  createCustomBotMatch: (botCount?: number) => Promise<string>;
  startOfflineSimulation: (botCount?: number) => Promise<string>;
  joinMatch: (matchId: string, displayName?: string) => Promise<void>;
  leaveMatch: () => Promise<void>;
  addBotPlayer: (botName?: string) => Promise<void>;
  removeBotPlayer: (botId: string) => Promise<void>;
  removeLobbyPlayer: (playerId: string) => Promise<void>;
  resetLobby: () => Promise<void>;
  startMatch: () => Promise<void>;

  // Gameplay actions
  requestRoll: (predeterminedRoll?: number) => Promise<{ roll: number; newSpace: number }>;
  buyProperty: () => Promise<void>;
  startSpaceAuction: () => Promise<void>;
  executeBotTurn: (botId?: string) => Promise<void>;
  placeBid: (auctionId: string, amount: number) => Promise<void>;
  passAuction: (auctionId: string) => Promise<void>;
  resolveAuction: (auctionId: string) => Promise<void>;
  executeSPAction: (actionId: string, spCost: number, targetPlayerId?: string) => Promise<void>;
  submitMarketChoice: (eventId: string, choiceId: string) => Promise<void>;
  mortgageProperty: (spaceId: string) => Promise<void>;
  unmortgageProperty: (spaceId: string) => Promise<void>;
  liquidateProperty: (spaceId: string) => Promise<void>;
  completeTurn: () => Promise<void>;

  // Legacy compatibility fields
  activeGameId: string | null;
  gameState: GameState | null;
  isLoading: boolean;
  syncError: Error | null;
  setActiveGameId: (gameId: string | null) => void;
  dispatchAction: <TPayload, TResult>(
    actionType: string,
    playerId: string,
    payload: TPayload
  ) => Promise<ActionResponse<TResult>>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

function formatUserFacingMatchError(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';
  const anyErr = err as {
    code?: string;
    serverCode?: string;
    message?: string;
    details?: { code?: string; message?: string };
  };

  const code = anyErr.code || anyErr.serverCode || '';
  const message = anyErr.message ? String(anyErr.message) : String(err);

  if (
    code === 'resource-exhausted' ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Quota exceeded')
  ) {
    return 'Firebase Firestore quota exceeded (RESOURCE_EXHAUSTED). The free-tier Spark quota has reached its daily limit. Please upgrade Firebase plan or try Offline AI mode.';
  }

  if (
    code === 'permission-denied' ||
    message.includes('permission-denied') ||
    message.includes('Missing or insufficient permissions')
  ) {
    return 'Database permission denied (permission-denied). Please verify Firestore security rules and authentication.';
  }

  if (code === 'unauthenticated' || message.includes('unauthenticated')) {
    return 'User authentication failed (unauthenticated). Please sign in or reconnect to Firebase.';
  }

  if (code === 'unavailable' || message.includes('unavailable')) {
    return 'Firebase servers are temporarily unavailable (unavailable). Please check network connection.';
  }

  if (code === 'deadline-exceeded' || message.includes('timed out')) {
    return 'Multiplayer request timed out (deadline-exceeded). Connection to Firestore took longer than expected.';
  }

  return message;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading, ensureAuthenticatedUser } = useAuth();
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<FirestoreMatchDoc | null>(null);
  const [players, setPlayers] = useState<FirestorePlayerDoc[]>([]);
  const [logs, setLogs] = useState<FirestoreLogDoc[]>([]);
  const [activeAuction, setActiveAuction] = useState<FirestoreAuctionDoc | null>(null);
  const [pendingMarketChoice, setPendingMarketChoice] = useState<PendingMarketChoiceDoc | null>(null);
  const [activeMarketEvent, setActiveMarketEvent] = useState<MarketEvent | null>(null);
  const [openMatches, setOpenMatches] = useState<FirestoreMatchDoc[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  // Network Resilience & Connection Handshake state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastReconnectedAt, setLastReconnectedAt] = useState<number | null>(null);

  // Local device role: 'host' | 'guest' | 'unknown'
  const [localRole, setLocalRoleState] = useState<'host' | 'guest' | 'unknown'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('investor_wars_local_role');
      if (saved === 'host' || saved === 'guest') return saved;
    }
    return 'unknown';
  });

  const setLocalRole = useCallback((role: 'host' | 'guest' | 'unknown') => {
    setLocalRoleState(role);
    if (typeof window !== 'undefined') {
      if (role === 'unknown') {
        sessionStorage.removeItem('investor_wars_local_role');
      } else {
        sessionStorage.setItem('investor_wars_local_role', role);
      }
    }
  }, []);

  // Matchmaking Quick-Match Queue state
  const [matchmakingQueueState, setMatchmakingQueueState] = useState<'idle' | 'searching' | 'matched' | 'joining'>('idle');
  const [queueTimeSeconds, setQueueTimeSeconds] = useState<number>(0);

  // Active Match Session Recovery from LocalStorage
  useEffect(() => {
    let isCancelled = false;

    const validateAndRestore = async () => {
      try {
        const storedMatchId = typeof window !== 'undefined' ? localStorage.getItem('bigmomma_active_match_id') : null;
        if (!storedMatchId || isAuthLoading || !isAuthenticated) return;
        if (storedMatchId === 'local-simulation' || storedMatchId.startsWith('local-')) return;

        const db = getFirebaseFirestore();
        if (db) {
          const matchSnap = await getDoc(doc(db, 'matches', storedMatchId));
          if (isCancelled) return;

          if (!matchSnap.exists()) {
            try { localStorage.removeItem('bigmomma_active_match_id'); } catch {}
            return;
          }

          const matchData = matchSnap.data() as FirestoreMatchDoc;
          const isStale = (Date.now() - (matchData.updatedAt || matchData.createdAt || 0)) > 2 * 60 * 60 * 1000;
          if (matchData.status === 'completed' || matchData.status === 'abandoned' || (matchData as any).isDeleted || isStale) {
            try { localStorage.removeItem('bigmomma_active_match_id'); } catch {}
            return;
          }

          if (!activeMatchId) {
            setActiveMatchId(storedMatchId);
          }
        }
      } catch (err) {
        try { localStorage.removeItem('bigmomma_active_match_id'); } catch {}
      }
    };

    validateAndRestore();

    return () => {
      isCancelled = true;
    };
  }, [isAuthLoading, isAuthenticated, activeMatchId]);

  // Active Match Session Persistence
  useEffect(() => {
    try {
      if (activeMatchId && activeMatchId !== 'local-simulation') {
        localStorage.setItem('bigmomma_active_match_id', activeMatchId);
      } else {
        localStorage.removeItem('bigmomma_active_match_id');
      }
    } catch {}
  }, [activeMatchId]);

  // Reconnection handshake
  const reconnectHandshake = useCallback(async (): Promise<void> => {
    if (activeMatchId === 'local-simulation') {
      setConnectionStatus('connected');
      setIsOnline(true);
      return;
    }
    setConnectionStatus('reconnecting');
    try {
      if (activeMatchId) {
        const reqId = `reconnect_${Date.now()}`;
        const res = await cloudFunctionsClient.reconnectPlayer(activeMatchId, reqId);
        if (res.data?.sessionExpired || !res.data?.success) {
          setActiveMatchId(null);
          try { localStorage.removeItem('bigmomma_active_match_id'); } catch {}
          setConnectionStatus('connected');
          return;
        }
      }
      setConnectionStatus('connected');
      setIsOnline(true);
      setLastReconnectedAt(Date.now());
      setMatchError(null);
    } catch {
      setConnectionStatus('connected');
    }
  }, [activeMatchId]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (activeMatchId && activeMatchId !== 'local-simulation') {
        reconnectHandshake();
      } else {
        setConnectionStatus('connected');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (activeMatchId !== 'local-simulation') {
        setConnectionStatus('offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeMatchId, reconnectHandshake]);

  // Matchmaking Queue Seconds Counter
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (matchmakingQueueState === 'searching') {
      interval = setInterval(() => {
        setQueueTimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setQueueTimeSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [matchmakingQueueState]);

  const clearMatchError = useCallback(() => {
    setMatchError(null);
  }, []);

  // Legacy state
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Subscribe to public open lobbies once authenticated
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading) {
      setOpenMatches([]);
      return;
    }

    const unsub = matchSyncService.subscribeToOpenMatches(
      (matches) => setOpenMatches(matches),
      () => setOpenMatches([])
    );

    return () => unsub();
  }, [isAuthenticated, isAuthLoading]);

  // Subscribe to active match and subcollections in Firestore (Only for online matches)
  useEffect(() => {
    if (!activeMatchId || activeMatchId === 'local-simulation' || activeMatchId.startsWith('local-')) {
      if (activeMatchId === 'local-simulation') return;
      setMatch(null);
      setPlayers([]);
      setLogs([]);
      setActiveAuction(null);
      return;
    }

    if (!isAuthenticated) return;

    const unsubMatch = matchSyncService.subscribeToMatch(
      activeMatchId,
      (data) => {
        setMatch(data);
        setMatchError(null);
      },
      (err: any) => {
        console.warn('Match subscribe error:', err);
      }
    );

    const unsubPlayers = matchSyncService.subscribeToPlayers(
      activeMatchId,
      (data) => setPlayers(data),
      (err) => console.warn('Players sync note:', err)
    );

    const unsubLogs = matchSyncService.subscribeToLogs(
      activeMatchId,
      (data) => setLogs(data),
      (err) => console.warn('Logs sync note:', err)
    );

    const unsubAuctions = matchSyncService.subscribeToAuctions(
      activeMatchId,
      (data) => setActiveAuction(data),
      (err) => console.warn('Auctions sync note:', err)
    );

    const unsubPendingChoice = matchSyncService.subscribeToPendingChoice(
      activeMatchId,
      (data) => setPendingMarketChoice(data),
      (err) => console.warn('Market choice sync note:', err)
    );

    const unsubMarketEvent = matchSyncService.subscribeToActiveMarketEvent(
      activeMatchId,
      (data) => setActiveMarketEvent(data),
      (err) => console.warn('Market event sync note:', err)
    );

    return () => {
      unsubMatch();
      unsubPlayers();
      unsubLogs();
      unsubAuctions();
      unsubPendingChoice();
      unsubMarketEvent();
    };
  }, [activeMatchId, isAuthenticated]);

  // Bot Runner orchestration
  useEffect(() => {
    if (!match || !players || players.length === 0) return;
    if (match.status !== 'in_progress' && match.status !== 'active') return;

    const botRunner = BotRunnerService.getInstance();
    botRunner.handleGameStateChange(match, players, activeAuction);
  }, [match, players, activeAuction]);

  // ==========================================
  // ZERO NETWORK LOCAL AI TRAINING SIMULATION
  // ==========================================
  const startOfflineSimulation = useCallback(
    async (botCount: number = 3): Promise<string> => {
      setIsActionPending(true);
      setMatchError(null);

      const humanUid = user?.uid || `local_human_${Date.now()}`;
      const humanName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Investor (You)');
      const clampedBots = Math.min(3, Math.max(1, botCount));

      const localPlayers: FirestorePlayerDoc[] = [
        {
          id: humanUid,
          userId: humanUid,
          displayName: humanName,
          avatarId: 'avatar_1',
          colorHex: '#10b981',
          currentSpaceIndex: 0,
          status: 'active',
          turnOrder: 0,
          netWorth: 1500,
          cash: 1500,
          specialPoints: 50,
          ownedSpaceIds: [],
          mortgagedSpaceIds: [],
          companyShareIds: [],
          modifierIds: [],
          isBot: false,
          connected: true,
          lastActiveAt: Date.now(),
        },
      ];

      for (let i = 0; i < clampedBots; i++) {
        const botProfile = PRESET_BOT_PROFILES[i % PRESET_BOT_PROFILES.length];
        localPlayers.push({
          id: `bot_local_${i + 1}`,
          userId: `bot_local_${i + 1}`,
          displayName: `${botProfile.displayName} (AI)`,
          avatarId: botProfile.avatarId || `avatar_bot_${i + 1}`,
          colorHex: i === 0 ? '#38bdf8' : i === 1 ? '#a855f7' : '#f59e0b',
          currentSpaceIndex: 0,
          status: 'active',
          turnOrder: i + 1,
          netWorth: 1500,
          cash: 1500,
          specialPoints: 50,
          ownedSpaceIds: [],
          mortgagedSpaceIds: [],
          companyShareIds: [],
          modifierIds: [],
          isBot: true,
          connected: true,
          lastActiveAt: Date.now(),
        });
      }

      const localMatch: FirestoreMatchDoc = {
        id: 'local-simulation',
        hostUserId: humanUid,
        boardId: 'default-standard-board',
        rulesetVersion: '1.0.0',
        status: 'in_progress',
        currentPhase: 'ROLL_OR_ACTION',
        currentPlayerId: humanUid,
        turnNumber: 1,
        roundNumber: 1,
        stateVersion: 1,
        participantUserIds: localPlayers.map((p) => p.id),
        isPrivate: true,
        accessCode: 'LOCAL',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const initialLogs: FirestoreLogDoc[] = [
        {
          id: `log_init_${Date.now()}`,
          type: 'MATCH_STARTED',
          summary: `AI Training Simulation started with ${clampedBots} bots.`,
          sourcePlayerId: humanUid,
          timestamp: Date.now(),
        },
      ];

      setMatch(localMatch);
      setPlayers(localPlayers);
      setLogs(initialLogs);
      setActiveAuction(null);
      setPendingMarketChoice(null);
      setActiveMarketEvent(null);
      setLocalRole('host');
      setActiveMatchId('local-simulation');
      setIsActionPending(false);

      return 'local-simulation';
    },
    [user, setLocalRole]
  );

  const createCustomBotMatch = useCallback(
    async (botCount: number = 3): Promise<string> => {
      return startOfflineSimulation(botCount);
    },
    [startOfflineSimulation]
  );

  const createSoloBotMatch = useCallback(async (): Promise<string> => {
    return startOfflineSimulation(3);
  }, [startOfflineSimulation]);

  // Quick Match Queue with Timeout Protection & Local Fallback
  const startQuickMatchQueue = useCallback(async (): Promise<string> => {
    await ensureAuthenticatedUser();
    setMatchError(null);
    setMatchmakingQueueState('searching');
    setQueueTimeSeconds(0);
    setIsActionPending(true);

    try {
      const reqId = `qm_${Date.now()}`;
      const res = await cloudFunctionsClient.findOrCreateQuickMatch(reqId);

      if (!res.success || !res.data?.matchId) {
        throw new Error(
          res.error?.message ||
            'Connection failed. Please check Firebase credentials or try Offline AI mode.'
        );
      }

      setMatchmakingQueueState('matched');
      const matchId = res.data.matchId;
      const isHost = Boolean(res.data.isNew);
      setLocalRole(isHost ? 'host' : 'guest');
      setActiveMatchId(matchId);
      setMatchmakingQueueState('idle');
      return matchId;
    } catch (err) {
      setMatchmakingQueueState('idle');
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [ensureAuthenticatedUser, setLocalRole]);

  const cancelQuickMatchQueue = useCallback(() => {
    setMatchmakingQueueState('idle');
    setQueueTimeSeconds(0);
    setIsActionPending(false);
  }, []);

  const fillRemainingWithBots = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (activeMatchId === 'local-simulation') return;
    setIsActionPending(true);
    try {
      const currentCount = players.length;
      const needed = Math.max(0, 4 - currentCount);
      const botProfiles = PRESET_BOT_PROFILES;
      for (let i = 0; i < needed; i++) {
        const botName = botProfiles[(currentCount + i) % botProfiles.length].displayName;
        await cloudFunctionsClient.addBotPlayer(activeMatchId, `fill_bot_${Date.now()}_${i}`, botName);
      }
    } catch (err) {
      console.warn('Fill remaining bots notice:', err);
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, players.length]);

  const joinByRoomCode = useCallback(
    async (code: string): Promise<void> => {
      await ensureAuthenticatedUser();
      setIsActionPending(true);
      setMatchError(null);
      try {
        const cleanCode = code.trim().toUpperCase();
        const targetCode =
          IS_TEST_ROOM_MODE &&
          (cleanCode === TEST_ROOM_CODE || cleanCode === '0X9X' || cleanCode.includes('0X9X'))
            ? TEST_ROOM_CODE
            : cleanCode;

        const reqId = `join_code_${Date.now()}`;
        const res = await cloudFunctionsClient.joinMatchByAccessCode(targetCode, reqId);
        if (!res.success || !res.data?.matchId) {
          throw new Error(
            res.error?.message || `No lobby found for code "${code}".`
          );
        }
        setLocalRole('guest');
        setActiveMatchId(res.data.matchId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [ensureAuthenticatedUser, setLocalRole]
  );

  const createPrivateMatch = useCallback(async (): Promise<string> => {
    await ensureAuthenticatedUser();
    setIsActionPending(true);
    setMatchError(null);
    try {
      const newMatchId = IS_TEST_ROOM_MODE
        ? TEST_MATCH_ID
        : `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reqId = `create_priv_${Date.now()}`;
      const accessCode = IS_TEST_ROOM_MODE
        ? TEST_ROOM_CODE
        : `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await cloudFunctionsClient.createMatch(
        newMatchId,
        reqId,
        'default-standard-board',
        '1.0.0',
        true,
        accessCode
      );

      if (!res.success) {
        throw new Error(
          res.error?.message ||
            'Connection failed. Please check Firebase credentials or try Offline AI mode.'
        );
      }

      setLocalRole('host');
      setActiveMatchId(newMatchId);
      return newMatchId;
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [ensureAuthenticatedUser, setLocalRole]);

  // Create Match
  const createMatch = useCallback(
    async (boardId = 'default-standard-board', rulesetVersion = 'v1.0.0'): Promise<string> => {
      await ensureAuthenticatedUser();
      setIsActionPending(true);
      setMatchError(null);
      try {
        const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const reqId = `create_${Date.now()}`;
        const res = await cloudFunctionsClient.createMatch(newMatchId, reqId, boardId, rulesetVersion);
        if (!res.success) {
          throw new Error(
            res.error?.message ||
              'Connection failed. Please check Firebase credentials or try Offline AI mode.'
          );
        }
        setLocalRole('host');
        setActiveMatchId(newMatchId);
        return newMatchId;
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [ensureAuthenticatedUser, setLocalRole]
  );

  // Join Match
  const joinMatch = useCallback(
    async (matchId: string, displayName?: string): Promise<void> => {
      await ensureAuthenticatedUser();
      setIsActionPending(true);
      setMatchError(null);
      try {
        const reqId = `join_${Date.now()}`;
        const res = await cloudFunctionsClient.joinMatch(matchId, reqId, displayName);
        if (!res.success) {
          throw new Error(
            res.error?.message ||
              'Connection failed. Please check Firebase credentials or try Offline AI mode.'
          );
        }
        setLocalRole('guest');
        setActiveMatchId(matchId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [ensureAuthenticatedUser, setLocalRole]
  );

  // Leave Match
  const leaveMatch = useCallback(async (): Promise<void> => {
    const matchToLeave = activeMatchId;
    setIsActionPending(true);
    try {
      if (matchToLeave && matchToLeave !== 'local-simulation') {
        const reqId = `leave_${Date.now()}`;
        await cloudFunctionsClient.leaveMatch(matchToLeave, reqId);
      }
    } catch (err) {
      console.warn('[GameContext] leaveMatch note:', err);
    } finally {
      setLocalRole('unknown');
      setActiveMatchId(null);
      setMatch(null);
      setPlayers([]);
      setLogs([]);
      setActiveAuction(null);
      setPendingMarketChoice(null);
      setActiveMarketEvent(null);
      setMatchError(null);
      setIsActionPending(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bigmomma_active_match_id');
        sessionStorage.removeItem('investor_wars_local_role');
      }
    }
  }, [activeMatchId, setLocalRole]);

  // Add Bot Player
  const addBotPlayer = useCallback(
    async (botName?: string): Promise<void> => {
      if (!activeMatchId) return;
      if (activeMatchId === 'local-simulation') {
        const botId = `bot_local_${players.length + 1}`;
        const newBot: FirestorePlayerDoc = {
          id: botId,
          userId: botId,
          displayName: botName || `Bot ${players.length + 1}`,
          currentSpaceIndex: 0,
          status: 'active',
          turnOrder: players.length,
          netWorth: 1500,
          cash: 1500,
          specialPoints: 50,
          ownedSpaceIds: [],
          mortgagedSpaceIds: [],
          companyShareIds: [],
          modifierIds: [],
          isBot: true,
          connected: true,
          lastActiveAt: Date.now(),
        };
        setPlayers((prev) => [...prev, newBot]);
        return;
      }

      setIsActionPending(true);
      try {
        const reqId = `addbot_${Date.now()}`;
        await cloudFunctionsClient.addBotPlayer(activeMatchId, reqId, botName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId, players.length]
  );

  // Remove Bot Player
  const removeBotPlayer = useCallback(
    async (botId: string): Promise<void> => {
      if (!activeMatchId) return;
      if (activeMatchId === 'local-simulation') {
        setPlayers((prev) => prev.filter((p) => p.id !== botId));
        return;
      }
      setIsActionPending(true);
      try {
        const reqId = `removebot_${Date.now()}`;
        await cloudFunctionsClient.removeBotPlayer(activeMatchId, reqId, botId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Remove Player from Lobby
  const removeLobbyPlayer = useCallback(
    async (playerId: string): Promise<void> => {
      if (!activeMatchId) return;
      if (activeMatchId === 'local-simulation') {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
        return;
      }
      setIsActionPending(true);
      try {
        const reqId = `removelobby_${Date.now()}`;
        await cloudFunctionsClient.removeLobbyPlayer(activeMatchId, reqId, playerId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Reset Lobby
  const resetLobby = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (activeMatchId === 'local-simulation') {
      setMatch((prev) => (prev ? { ...prev, status: 'waiting_for_players', currentPhase: 'LOBBY' } : null));
      return;
    }
    setIsActionPending(true);
    try {
      const reqId = `resetlobby_${Date.now()}`;
      await cloudFunctionsClient.resetLobby(activeMatchId, reqId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId]);

  // Start Match
  const startMatch = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (activeMatchId === 'local-simulation') {
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              status: 'in_progress',
              currentPhase: 'ROLL_OR_ACTION',
              currentPlayerId: players[0]?.id || prev.hostUserId,
              turnNumber: 1,
              roundNumber: 1,
              updatedAt: Date.now(),
            }
          : null
      );
      return;
    }
    setIsActionPending(true);
    try {
      const reqId = `start_${Date.now()}`;
      await cloudFunctionsClient.startMatch(activeMatchId, reqId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, players]);

  // Request Roll (Zero Network Local or Timeout-Protected Cloud)
  const requestRoll = useCallback(
    async (predeterminedRoll?: number): Promise<{ roll: number; newSpace: number }> => {
      if (!activeMatchId) throw new Error('No active match');

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = predeterminedRoll || (d1 + d2);

      if (activeMatchId === 'local-simulation' || activeMatchId.startsWith('local-')) {
        let newSpace = total;
        setPlayers((prev) => {
          const currentP = prev.find((p) => p.id === match?.currentPlayerId) || prev[0];
          if (!currentP) return prev;
          newSpace = ((currentP.currentSpaceIndex || 0) + total) % 52;
          return prev.map((p) =>
            p.id === currentP.id ? { ...p, currentSpaceIndex: newSpace, lastActiveAt: Date.now() } : p
          );
        });

        setMatch((prev) =>
          prev
            ? {
                ...prev,
                lastRoll: [d1, d2],
                lastRollPlayerId: prev.currentPlayerId || undefined,
                currentPhase: 'LANDED_SPACE',
                stateVersion: (prev.stateVersion || 1) + 1,
                updatedAt: Date.now(),
              }
            : null
        );

        const curP = players.find((p) => p.id === match?.currentPlayerId) || players[0];
        setLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            type: 'DICE_ROLLED',
            sourcePlayerId: curP?.id,
            summary: `${curP?.displayName || 'Player'} rolled ${total} (${d1}+${d2}) and advanced to space #${newSpace}.`,
            timestamp: Date.now(),
          },
          ...prev,
        ]);

        return { roll: total, newSpace };
      }

      setIsActionPending(true);
      try {
        const reqId = `roll_${Date.now()}`;
        const res = await cloudFunctionsClient.requestRoll(activeMatchId, reqId, undefined, predeterminedRoll);
        if (!res.success || !res.data) {
          throw new Error(res.error?.message || 'Roll failed');
        }
        return res.data;
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId, match, players]
  );

  // Buy Property
  const buyProperty = useCallback(async (): Promise<void> => {
    if (!activeMatchId) throw new Error('No active match');

    if (activeMatchId === 'local-simulation' || activeMatchId.startsWith('local-')) {
      const curP = players.find((p) => p.id === match?.currentPlayerId);
      if (curP) {
        const spaceId = `space_${curP.currentSpaceIndex}`;
        const owned = curP.ownedSpaceIds || [];
        if (!owned.includes(spaceId)) {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === curP.id
                ? {
                    ...p,
                    ownedSpaceIds: [...owned, spaceId],
                    cash: Math.max(0, p.cash - 200),
                  }
                : p
            )
          );
          setLogs((prev) => [
            {
              id: `log_${Date.now()}`,
              type: 'PROPERTY_BOUGHT',
              sourcePlayerId: curP.id,
              summary: `${curP.displayName} acquired asset #${curP.currentSpaceIndex}.`,
              timestamp: Date.now(),
            },
            ...prev,
          ]);
        }
      }
      return;
    }

    setIsActionPending(true);
    try {
      const reqId = `buy_${Date.now()}`;
      await cloudFunctionsClient.buyProperty(activeMatchId, reqId);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, match, players]);

  // Start Space Auction
  const startSpaceAuction = useCallback(async (): Promise<void> => {
    if (!activeMatchId) throw new Error('No active match');
    if (activeMatchId === 'local-simulation') return;
    setIsActionPending(true);
    try {
      const reqId = `auction_${Date.now()}`;
      await cloudFunctionsClient.startSpaceAuction(activeMatchId, reqId);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId]);

  // Execute Bot Turn
  const executeBotTurn = useCallback(
    async (botId?: string): Promise<void> => {
      if (!activeMatchId) return;

      if (activeMatchId === 'local-simulation' || activeMatchId.startsWith('local-')) {
        const targetId = botId || match?.currentPlayerId;
        const curBot = players.find((p) => p.id === targetId);
        if (!curBot || !curBot.isBot) return;

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const total = d1 + d2;
        const newSpace = ((curBot.currentSpaceIndex || 0) + total) % 52;
        const spaceId = `space_${newSpace}`;

        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id !== curBot.id) return p;
            const willBuy = p.cash >= 350 && !p.ownedSpaceIds.includes(spaceId);
            return {
              ...p,
              currentSpaceIndex: newSpace,
              cash: willBuy ? p.cash - 200 : p.cash,
              ownedSpaceIds: willBuy ? [...p.ownedSpaceIds, spaceId] : p.ownedSpaceIds,
              lastActiveAt: Date.now(),
            };
          })
        );

        setLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            type: 'DICE_ROLLED',
            sourcePlayerId: curBot.id,
            summary: `${curBot.displayName} rolled ${total} (${d1}+${d2}) and moved to #${newSpace}.`,
            timestamp: Date.now(),
          },
          ...prev,
        ]);

        // Automatically pass turn to next player
        setTimeout(() => {
          setPlayers((currentPlayers) => {
            const curIdx = currentPlayers.findIndex((p) => p.id === curBot.id);
            const nextIdx = (curIdx + 1) % currentPlayers.length;
            const nextP = currentPlayers[nextIdx];

            setMatch((prevM) =>
              prevM
                ? {
                    ...prevM,
                    currentPlayerId: nextP.id,
                    turnNumber: (prevM.turnNumber || 1) + 1,
                    roundNumber: Math.floor(((prevM.turnNumber || 1) + 1) / currentPlayers.length) + 1,
                    currentPhase: 'ROLL_OR_ACTION',
                    lastRoll: null,
                    lastRollPlayerId: null,
                    updatedAt: Date.now(),
                  }
                : null
            );
            return currentPlayers;
          });
        }, 1000);
        return;
      }

      try {
        const targetBotId = botId || match?.currentPlayerId || undefined;
        if (!targetBotId) return;
        const reqId = `botturn_${Date.now()}`;
        await cloudFunctionsClient.executeBotTurn(activeMatchId, reqId, targetBotId);
      } catch (err) {
        console.warn('Bot turn execution notice:', err);
      }
    },
    [activeMatchId, match, players]
  );

  // Place Bid
  const placeBid = useCallback(
    async (auctionId: string, amount: number): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') return;
      setIsActionPending(true);
      try {
        const reqId = `bid_${Date.now()}`;
        await cloudFunctionsClient.placeBid(activeMatchId, reqId, auctionId, amount);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Pass Auction
  const passAuction = useCallback(
    async (auctionId: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') return;
      setIsActionPending(true);
      try {
        const reqId = `pass_${Date.now()}`;
        await cloudFunctionsClient.passAuction(activeMatchId, reqId, auctionId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Resolve Auction
  const resolveAuction = useCallback(
    async (auctionId: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') return;
      setIsActionPending(true);
      try {
        const reqId = `resauc_${Date.now()}`;
        await cloudFunctionsClient.resolveAuction(activeMatchId, reqId, auctionId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Execute SP Action
  const executeSPAction = useCallback(
    async (actionId: string, spCost: number, targetPlayerId?: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') {
        const curP = players.find((p) => p.id === match?.currentPlayerId);
        if (curP && curP.specialPoints >= spCost) {
          setPlayers((prev) =>
            prev.map((p) => (p.id === curP.id ? { ...p, specialPoints: p.specialPoints - spCost } : p))
          );
        }
        return;
      }
      setIsActionPending(true);
      try {
        const reqId = `spact_${Date.now()}`;
        await cloudFunctionsClient.executeSPAction(activeMatchId, reqId, actionId, spCost, targetPlayerId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId, match, players]
  );

  // Submit Market Choice
  const submitMarketChoice = useCallback(
    async (eventId: string, choiceId: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') {
        setPendingMarketChoice(null);
        setActiveMarketEvent(null);
        return;
      }
      setIsActionPending(true);
      try {
        const reqId = `mktchoice_${Date.now()}`;
        await cloudFunctionsClient.submitMarketChoice(activeMatchId, reqId, eventId, choiceId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Mortgage Property
  const mortgageProperty = useCallback(
    async (spaceId: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') return;
      setIsActionPending(true);
      try {
        const reqId = `mort_${Date.now()}`;
        await cloudFunctionsClient.mortgageProperty(activeMatchId, reqId, spaceId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Unmortgage Property
  const unmortgageProperty = useCallback(
    async (spaceId: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') return;
      setIsActionPending(true);
      try {
        const reqId = `unmort_${Date.now()}`;
        await cloudFunctionsClient.unmortgageProperty(activeMatchId, reqId, spaceId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Liquidate Property
  const liquidateProperty = useCallback(
    async (spaceId: string): Promise<void> => {
      if (!activeMatchId) throw new Error('No active match');
      if (activeMatchId === 'local-simulation') return;
      setIsActionPending(true);
      try {
        const reqId = `liq_${Date.now()}`;
        await cloudFunctionsClient.liquidateProperty(activeMatchId, reqId, spaceId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId]
  );

  // Complete Turn
  const completeTurn = useCallback(async (): Promise<void> => {
    if (!activeMatchId) throw new Error('No active match');

    if (activeMatchId === 'local-simulation' || activeMatchId.startsWith('local-')) {
      const activeP = players.filter((p) => p.status === 'active');
      const curIdx = activeP.findIndex((p) => p.id === match?.currentPlayerId);
      const nextIdx = curIdx >= 0 ? (curIdx + 1) % activeP.length : 0;
      const nextPlayer = activeP[nextIdx] || activeP[0];

      const newTurn = (match?.turnNumber || 0) + 1;
      const newRound = Math.floor(newTurn / Math.max(1, activeP.length)) + 1;

      setMatch((prev) =>
        prev
          ? {
              ...prev,
              currentPlayerId: nextPlayer.id,
              turnNumber: newTurn,
              roundNumber: newRound,
              currentPhase: 'ROLL_OR_ACTION',
              lastRoll: null,
              lastRollPlayerId: null,
              stateVersion: (prev.stateVersion || 1) + 1,
              updatedAt: Date.now(),
            }
          : null
      );

      setLogs((prev) => [
        {
          id: `log_${Date.now()}`,
          type: 'TURN_CHANGED',
          sourcePlayerId: nextPlayer.id,
          summary: `Turn passed to ${nextPlayer.displayName} (Round ${newRound}).`,
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      return;
    }

    setIsActionPending(true);
    try {
      const reqId = `turn_${Date.now()}`;
      await cloudFunctionsClient.completeTurn(activeMatchId, reqId);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, match, players]);

  // Legacy dispatchAction method
  const dispatchAction = useCallback(
    async <TPayload, TResult>(
      actionType: string,
      playerId: string,
      payload: TPayload
    ): Promise<ActionResponse<TResult>> => {
      if (!activeGameId) {
        throw new Error('No active game selected');
      }

      const request: ActionRequest<TPayload> = {
        requestId: crypto.randomUUID(),
        gameId: activeGameId,
        playerId,
        actionType,
        payload,
        clientTimestamp: Date.now(),
      };

      validateActionRequest(request);
      return functionsService.dispatchAction<TPayload, TResult>(request);
    },
    [activeGameId]
  );

  return (
    <GameContext.Provider
      value={{
        activeMatchId,
        match,
        players,
        logs,
        activeAuction,
        pendingMarketChoice,
        activeMarketEvent,
        openMatches,
        matchError,
        isActionPending,
        clearMatchError,
        connectionStatus,
        isOnline,
        lastReconnectedAt,
        reconnectHandshake,
        localRole,
        setLocalRole,
        matchmakingQueueState,
        queueTimeSeconds,
        startQuickMatchQueue,
        cancelQuickMatchQueue,
        fillRemainingWithBots,
        joinByRoomCode,
        createPrivateMatch,
        setActiveMatchId,
        createMatch,
        createSoloBotMatch,
        createCustomBotMatch,
        startOfflineSimulation,
        joinMatch,
        leaveMatch,
        addBotPlayer,
        removeBotPlayer,
        removeLobbyPlayer,
        resetLobby,
        startMatch,
        requestRoll,
        buyProperty,
        startSpaceAuction,
        executeBotTurn,
        placeBid,
        passAuction,
        resolveAuction,
        executeSPAction,
        submitMarketChoice,
        mortgageProperty,
        unmortgageProperty,
        liquidateProperty,
        completeTurn,
        activeGameId,
        gameState,
        isLoading,
        syncError,
        setActiveGameId,
        dispatchAction,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
