/**
 * Production Client Game State Context
 * Manages read-only synchronization of authoritative GameState from Firestore
 * and dispatches ActionRequests to Cloud Functions.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GameState } from '../../types/game';
import { ActionRequest } from '../../types/request';
import { firestoreService } from '../../services/firebase/firestoreService';
import { functionsService, ActionResponse } from '../../services/firebase/functionsService';
import { validateActionRequest } from '../../validation/requestValidator';
import { SecurityGuard } from '../../backend/securityBoundaries';
import {
  matchSyncService,
  FirestoreMatchDoc,
  FirestorePlayerDoc,
  FirestoreLogDoc,
  FirestoreAuctionDoc,
} from '../../services/firebase/matchSyncService';
import { cloudFunctionsClient } from '../../services/firebase/cloudFunctionsClient';
import { useAuth } from './AuthContext';
import { botRunnerService } from '../../bot/botRunnerService';
import { PRESET_BOT_PROFILES } from '../../bot/botTypes';

export interface GameContextValue {
  // Matches state
  activeMatchId: string | null;
  match: FirestoreMatchDoc | null;
  players: FirestorePlayerDoc[];
  logs: FirestoreLogDoc[];
  activeAuction: FirestoreAuctionDoc | null;
  openMatches: FirestoreMatchDoc[];
  matchError: string | null;
  isActionPending: boolean;
  clearMatchError: () => void;

  // Match control actions
  setActiveMatchId: (matchId: string | null) => void;
  createMatch: (boardId?: string, rulesetVersion?: string) => Promise<string>;
  createSoloBotMatch: () => Promise<string>;
  createCustomBotMatch: (botCount?: number) => Promise<string>;
  joinMatch: (matchId: string, displayName?: string) => Promise<void>;
  leaveMatch: () => Promise<void>;
  addBotPlayer: (botName?: string) => Promise<void>;
  removeBotPlayer: (botId: string) => Promise<void>;
  startMatch: () => Promise<void>;

  // Gameplay actions
  requestRoll: () => Promise<{ roll: number; newSpace: number }>;
  buyProperty: () => Promise<void>;
  startSpaceAuction: () => Promise<void>;
  executeBotTurn: (botId?: string) => Promise<void>;
  placeBid: (auctionId: string, amount: number) => Promise<void>;
  passAuction: (auctionId: string) => Promise<void>;
  resolveAuction: (auctionId: string) => Promise<void>;
  executeSPAction: (actionId: string, spCost: number, targetPlayerId?: string) => Promise<void>;
  submitMarketChoice: (eventId: string, choiceId: string) => Promise<void>;
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

  const code = String(anyErr.code || anyErr.serverCode || anyErr.details?.code || '');
  const detailsCode = String(anyErr.details?.code || '');
  const message = anyErr.message ? String(anyErr.message) : String(err);

  // Expired session
  if (code === 'auth/id-token-expired' || code === 'auth/user-token-expired') {
    return '[SESSION_EXPIRED] Your session has expired. Please sign in again.';
  }

  // Missing authentication
  if (
    code === 'unauthenticated' ||
    code === 'functions/unauthenticated' ||
    code === 'AUTH_REQUIRED' ||
    detailsCode === 'AUTH_REQUIRED' ||
    message.includes('AUTH_REQUIRED') ||
    message.includes('Authentication required') ||
    message.includes('Unauthenticated requests are forbidden')
  ) {
    return '[AUTH_REQUIRED] Sign in with Google or Email/Password to perform game actions.';
  }

  // Forbidden / not permitted
  if (code === 'AUTH_FORBIDDEN' || detailsCode === 'AUTH_FORBIDDEN' || code === 'permission-denied') {
    return '[AUTH_FORBIDDEN] You do not have permission to perform this action.';
  }

  // Match not found
  if (code === 'MATCH_NOT_FOUND' || detailsCode === 'MATCH_NOT_FOUND') {
    return '[MATCH_NOT_FOUND] The requested match could not be found.';
  }

  // Not your turn
  if (code === 'NOT_YOUR_TURN' || detailsCode === 'NOT_YOUR_TURN') {
    return '[NOT_YOUR_TURN] It is not your turn.';
  }

  // Invalid phase
  if (code === 'INVALID_PHASE' || detailsCode === 'INVALID_PHASE') {
    return `[INVALID_PHASE] ${message || 'This action cannot be performed during the current game phase.'}`;
  }

  // Insufficient cash
  if (code === 'INSUFFICIENT_CASH' || detailsCode === 'INSUFFICIENT_CASH') {
    return `[INSUFFICIENT_CASH] ${message || 'Insufficient funds to complete this action.'}`;
  }

  // Action limit reached
  if (code === 'ACTION_LIMIT_REACHED' || detailsCode === 'ACTION_LIMIT_REACHED') {
    return '[ACTION_LIMIT_REACHED] Action limit reached for this turn.';
  }

  // Auction not eligible
  if (code === 'AUCTION_NOT_ELIGIBLE' || detailsCode === 'AUCTION_NOT_ELIGIBLE') {
    return '[AUCTION_NOT_ELIGIBLE] You are not eligible to participate in this auction.';
  }

  // Internal server error
  if (
    code === 'internal' ||
    code === 'functions/internal' ||
    message === 'internal' ||
    message.includes('internal [0]')
  ) {
    return '[INTERNAL_SERVER_ERROR] An internal server error occurred. Please try again.';
  }

  return message;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<FirestoreMatchDoc | null>(null);
  const [players, setPlayers] = useState<FirestorePlayerDoc[]>([]);
  const [logs, setLogs] = useState<FirestoreLogDoc[]>([]);
  const [activeAuction, setActiveAuction] = useState<FirestoreAuctionDoc | null>(null);
  const [openMatches, setOpenMatches] = useState<FirestoreMatchDoc[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  const clearMatchError = useCallback(() => {
    setMatchError(null);
  }, []);

  // Clear auth/session errors when user successfully logs in
  useEffect(() => {
    if (isAuthenticated) {
      setMatchError((prev) =>
        prev?.includes('sign in') || prev?.includes('expired') ? null : prev
      );
    }
  }, [isAuthenticated]);

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
      (err) => {
        console.warn('Lobby sync notice:', err.message);
        setOpenMatches([]);
      }
    );
    return () => unsub();
  }, [isAuthenticated, isAuthLoading]);

  // Subscribe to active match and subcollections
  useEffect(() => {
    if (!activeMatchId || !isAuthenticated) {
      setMatch(null);
      setPlayers([]);
      setLogs([]);
      setActiveAuction(null);
      return;
    }

    const unsubMatch = matchSyncService.subscribeToMatch(
      activeMatchId,
      (data) => {
        setMatch(data);
        setMatchError(null);
      },
      (err) => setMatchError(err.message)
    );

    const unsubPlayers = matchSyncService.subscribeToPlayers(
      activeMatchId,
      (data) => setPlayers(data),
      (err) => console.warn('Players sync notice:', err.message)
    );

    const unsubLogs = matchSyncService.subscribeToLogs(
      activeMatchId,
      (data) => setLogs(data),
      (err) => console.warn('Logs sync notice:', err.message)
    );

    const unsubAuctions = matchSyncService.subscribeToAuctions(
      activeMatchId,
      (data) => setActiveAuction(data),
      (err) => console.warn('Auctions sync notice:', err.message)
    );

    return () => {
      unsubMatch();
      unsubPlayers();
      unsubLogs();
      unsubAuctions();
    };
  }, [activeMatchId, isAuthenticated]);

  // Automated Bot Turn Coordinator: orchestrates bot turns, auctions, and phase transitions
  useEffect(() => {
    botRunnerService.handleGameStateChange(match, players, activeAuction);
  }, [match, players, activeAuction]);

  // Legacy subscription
  useEffect(() => {
    if (!activeGameId || !firestoreService.isConfigured()) {
      setGameState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = firestoreService.subscribeToGameState(
      activeGameId,
      (state) => {
        setGameState(state);
        setIsLoading(false);
        setSyncError(null);
      },
      (err) => {
        setSyncError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeGameId]);

  // Create Match
  const createMatch = useCallback(
    async (boardId = 'default-standard-board', rulesetVersion = 'v1.0.0'): Promise<string> => {
      if (!isAuthenticated) {
        const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to start a match.';
        setMatchError(errorMsg);
        const err = new Error(errorMsg);
        (err as any).code = 'AUTH_REQUIRED';
        throw err;
      }
      setIsActionPending(true);
      setMatchError(null);
      try {
        const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const reqId = `create_${Date.now()}`;
        await cloudFunctionsClient.createMatch(newMatchId, reqId, boardId, rulesetVersion);
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
    [isAuthenticated]
  );

  // Quick Solo vs AI match
  const createSoloBotMatch = useCallback(async (): Promise<string> => {
    if (!isAuthenticated) {
      const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to start a match.';
      setMatchError(errorMsg);
      const err = new Error(errorMsg);
      (err as any).code = 'AUTH_REQUIRED';
      throw err;
    }
    setIsActionPending(true);
    setMatchError(null);
    try {
      const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reqId = `create_${Date.now()}`;
      await cloudFunctionsClient.createMatch(newMatchId, reqId, 'default-standard-board', 'v1.0.0');

      // Add 3 bots
      await cloudFunctionsClient.addBotPlayer(newMatchId, `bot_1_${Date.now()}`, 'Apex Capital (AI)');
      await cloudFunctionsClient.addBotPlayer(newMatchId, `bot_2_${Date.now()}`, 'Venture Bot (AI)');
      await cloudFunctionsClient.addBotPlayer(newMatchId, `bot_3_${Date.now()}`, 'Bullish Quant (AI)');

      // Start match
      await cloudFunctionsClient.startMatch(newMatchId, `start_${Date.now()}`);

      setActiveMatchId(newMatchId);
      return newMatchId;
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [isAuthenticated]);

  // Custom Bot Match: allows configurable bot counts (1 to 3 bots)
  const createCustomBotMatch = useCallback(
    async (botCount: number = 3): Promise<string> => {
      if (!isAuthenticated) {
        const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to start a match.';
        setMatchError(errorMsg);
        const err = new Error(errorMsg);
        (err as any).code = 'AUTH_REQUIRED';
        throw err;
      }
      setIsActionPending(true);
      setMatchError(null);
      try {
        const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const reqId = `create_${Date.now()}`;
        await cloudFunctionsClient.createMatch(newMatchId, reqId, 'default-standard-board', 'v1.0.0');

        const clampedBots = Math.min(3, Math.max(1, botCount));
        for (let i = 0; i < clampedBots; i++) {
          const profile = PRESET_BOT_PROFILES[i % PRESET_BOT_PROFILES.length];
          await cloudFunctionsClient.addBotPlayer(newMatchId, `bot_join_${i}_${Date.now()}`, profile.displayName);
        }

        await cloudFunctionsClient.startMatch(newMatchId, `start_${Date.now()}`);
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
    [isAuthenticated]
  );

  // Join Match
  const joinMatch = useCallback(
    async (matchId: string, displayName?: string): Promise<void> => {
      if (!isAuthenticated) {
        const errorMsg = 'Sign in with Google or Email/Password to start a match.';
        setMatchError(errorMsg);
        const err = new Error(errorMsg);
        (err as any).code = 'AUTH_REQUIRED';
        throw err;
      }
      setIsActionPending(true);
      setMatchError(null);
      try {
        const reqId = `join_${Date.now()}`;
        await cloudFunctionsClient.joinMatch(matchId, reqId, displayName);
        setActiveMatchId(matchId);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [isAuthenticated]
  );

  // Leave Match
  const leaveMatch = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    setIsActionPending(true);
    try {
      const reqId = `leave_${Date.now()}`;
      await cloudFunctionsClient.leaveMatch(activeMatchId, reqId);
      setActiveMatchId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMatchError(msg);
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId]);

  // Add Bot Player
  const addBotPlayer = useCallback(
    async (botName?: string): Promise<void> => {
      if (!activeMatchId) return;
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
    [activeMatchId]
  );

  // Remove Bot Player
  const removeBotPlayer = useCallback(
    async (botId: string): Promise<void> => {
      if (!activeMatchId) return;
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

  // Start Match
  const startMatch = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (!isAuthenticated) {
      const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to start the match.';
      setMatchError(errorMsg);
      return;
    }
    setIsActionPending(true);
    setMatchError(null);
    try {
      const reqId = `start_${Date.now()}`;
      await cloudFunctionsClient.startMatch(activeMatchId, reqId);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, isAuthenticated]);

  // Request Roll
  const requestRoll = useCallback(async (): Promise<{ roll: number; newSpace: number }> => {
    if (!activeMatchId) throw new Error('No active match');
    if (!isAuthenticated) {
      const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to roll dice.';
      setMatchError(errorMsg);
      const err = new Error(errorMsg);
      (err as any).code = 'AUTH_REQUIRED';
      throw err;
    }
    setIsActionPending(true);
    try {
      const reqId = `roll_${Date.now()}`;
      const res = await cloudFunctionsClient.requestRoll(activeMatchId, reqId, match?.stateVersion);
      return res.data || { roll: 1, newSpace: 0 };
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, match?.stateVersion, isAuthenticated]);

  // Buy Property
  const buyProperty = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (!isAuthenticated) {
      const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to acquire assets.';
      setMatchError(errorMsg);
      return;
    }
    setIsActionPending(true);
    try {
      const reqId = `buy_${Date.now()}`;
      await cloudFunctionsClient.buyProperty(activeMatchId, reqId, match?.stateVersion);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, match?.stateVersion, isAuthenticated]);

  // Start Space Auction
  const startSpaceAuction = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (!isAuthenticated) {
      const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to start an auction.';
      setMatchError(errorMsg);
      return;
    }
    setIsActionPending(true);
    try {
      const reqId = `auction_${Date.now()}`;
      await cloudFunctionsClient.startSpaceAuction(activeMatchId, reqId, match?.stateVersion);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, match?.stateVersion, isAuthenticated]);

  // Execute Bot Turn
  const executeBotTurn = useCallback(
    async (botId?: string): Promise<void> => {
      if (!activeMatchId) return;
      try {
        const reqId = `botturn_${Date.now()}`;
        await cloudFunctionsClient.executeBotTurn(activeMatchId, reqId, botId);
      } catch (err) {
        console.warn('Bot turn warning:', err);
      }
    },
    [activeMatchId]
  );

  // Place Bid
  const placeBid = useCallback(
    async (auctionId: string, amount: number): Promise<void> => {
      if (!activeMatchId) return;
      if (!isAuthenticated) {
        const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to place bids.';
        setMatchError(errorMsg);
        return;
      }
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
    [activeMatchId, isAuthenticated]
  );

  // Pass Auction
  const passAuction = useCallback(
    async (auctionId: string): Promise<void> => {
      if (!activeMatchId) return;
      if (!isAuthenticated) {
        const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to participate in auctions.';
        setMatchError(errorMsg);
        return;
      }
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
    [activeMatchId, isAuthenticated]
  );

  // Resolve Auction
  const resolveAuction = useCallback(
    async (auctionId: string): Promise<void> => {
      if (!activeMatchId) return;
      try {
        const reqId = `resolve_${Date.now()}`;
        await cloudFunctionsClient.resolveAuction(activeMatchId, reqId, auctionId);
      } catch (err) {
        console.warn('Resolve auction warning:', err);
      }
    },
    [activeMatchId]
  );

  // Execute SP Action
  const executeSPAction = useCallback(
    async (actionId: string, spCost: number, targetPlayerId?: string): Promise<void> => {
      if (!activeMatchId) return;
      if (!isAuthenticated) {
        const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to use SP actions.';
        setMatchError(errorMsg);
        return;
      }
      setIsActionPending(true);
      try {
        const reqId = `sp_${Date.now()}`;
        await cloudFunctionsClient.executeSPAction(
          activeMatchId,
          reqId,
          actionId,
          spCost,
          targetPlayerId,
          match?.stateVersion
        );
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId, match?.stateVersion, isAuthenticated]
  );

  // Submit Market Choice
  const submitMarketChoice = useCallback(
    async (eventId: string, choiceId: string): Promise<void> => {
      if (!activeMatchId) return;
      if (!isAuthenticated) {
        const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to submit market choices.';
        setMatchError(errorMsg);
        return;
      }
      setIsActionPending(true);
      try {
        const reqId = `choice_${Date.now()}`;
        await cloudFunctionsClient.submitMarketChoice(activeMatchId, reqId, eventId, choiceId, match?.stateVersion);
      } catch (err) {
        const msg = formatUserFacingMatchError(err);
        setMatchError(msg);
        throw err;
      } finally {
        setIsActionPending(false);
      }
    },
    [activeMatchId, match?.stateVersion, isAuthenticated]
  );

  // Complete Turn
  const completeTurn = useCallback(async (): Promise<void> => {
    if (!activeMatchId) return;
    if (!isAuthenticated) {
      const errorMsg = '[AUTH_REQUIRED] Sign in with Google or Email/Password to complete turn.';
      setMatchError(errorMsg);
      return;
    }
    setIsActionPending(true);
    try {
      const reqId = `end_${Date.now()}`;
      await cloudFunctionsClient.completeTurn(activeMatchId, reqId, match?.stateVersion);
    } catch (err) {
      const msg = formatUserFacingMatchError(err);
      setMatchError(msg);
      throw err;
    } finally {
      setIsActionPending(false);
    }
  }, [activeMatchId, match?.stateVersion, isAuthenticated]);

  // Legacy dispatchAction
  const dispatchAction = useCallback(
    async <TPayload, TResult>(
      actionType: string,
      playerId: string,
      payload: TPayload
    ): Promise<ActionResponse<TResult>> => {
      if (!activeGameId) {
        throw new Error('Cannot dispatch action: no activeGameId selected.');
      }

      const request: ActionRequest<TPayload> = {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        gameId: activeGameId,
        playerId,
        actionType,
        payload,
        clientTimestamp: Date.now(),
        expectedStateVersion: gameState?.stateVersion,
      };

      validateActionRequest(request);
      SecurityGuard.assertClientPayloadSanity(request);

      return functionsService.dispatchAction<TPayload, TResult>(request);
    },
    [activeGameId, gameState?.stateVersion]
  );

  return (
    <GameContext.Provider
      value={{
        activeMatchId,
        match,
        players,
        logs,
        activeAuction,
        openMatches,
        matchError,
        isActionPending,
        clearMatchError,
        setActiveMatchId,
        createMatch,
        createSoloBotMatch,
        createCustomBotMatch,
        joinMatch,
        leaveMatch,
        addBotPlayer,
        removeBotPlayer,
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
        completeTurn,
        // Legacy fields
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
