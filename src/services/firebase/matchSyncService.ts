/**
 * Production Match Firestore Real-Time Synchronization Service
 * Handles live subscriptions to matches, participant players, logs, auctions, and lobby listings.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
  Firestore,
} from 'firebase/firestore';
import { getFirebaseFirestore, isFirebaseConfigured } from './config';
import { errorHandler } from '../monitoring/errorHandler';
import { PendingMarketChoiceDoc, MarketEvent } from '../../types/marketEvent';
import { isCloudFunctionsLocalTestMode } from './cloudFunctionsClient';
import { quickMatchDiagnosticStore } from '../quickMatchDiagnosticStore';

export interface FirestoreMatchDoc {
  id: string;
  hostUserId: string;
  boardId: string;
  rulesetVersion: string;
  status: 'waiting_for_players' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  currentPhase: string;
  currentPlayerId: string | null;
  turnNumber: number;
  roundNumber: number;
  stateVersion: number;
  participantUserIds: string[];
  winnerId?: string | null;
  isPrivate?: boolean;
  accessCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FirestorePlayerDoc {
  id: string;
  userId: string;
  displayName: string;
  avatarId?: string;
  colorHex?: string;
  currentSpaceIndex: number;
  status: 'active' | 'bankrupt' | 'eliminated' | 'disconnected';
  turnOrder: number;
  netWorth: number;
  cash: number;
  specialPoints: number;
  ownedSpaceIds: string[];
  mortgagedSpaceIds?: string[];
  companyShareIds: string[];
  modifierIds: string[];
  isBot?: boolean;
  connected: boolean;
  lastActiveAt: number;
}

export interface FirestoreLogDoc {
  id: string;
  type: string;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  summary: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface FirestoreAuctionDoc {
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

export class MatchSyncService {
  private matchListeners = new Map<string, Set<(match: FirestoreMatchDoc | null) => void>>();
  private playersListeners = new Map<string, Set<(players: FirestorePlayerDoc[]) => void>>();
  private logsListeners = new Map<string, Set<(logs: FirestoreLogDoc[]) => void>>();
  private auctionListeners = new Map<string, Set<(auction: FirestoreAuctionDoc | null) => void>>();
  private pendingChoiceListeners = new Map<string, Set<(choice: PendingMarketChoiceDoc | null) => void>>();
  private marketEventListeners = new Map<string, Set<(event: MarketEvent | null) => void>>();
  private openMatchesListeners = new Set<(matches: FirestoreMatchDoc[]) => void>();
  private remoteMatchUpdateHandler?: (match: FirestoreMatchDoc) => void;
  private remotePlayersUpdateHandler?: (matchId: string, players: FirestorePlayerDoc[]) => void;
  private localContainerProvider?: (matchId: string) => {
    match: FirestoreMatchDoc;
    players: FirestorePlayerDoc[];
    logs: FirestoreLogDoc[];
    activeAuction: FirestoreAuctionDoc | null;
    pendingChoice?: PendingMarketChoiceDoc | null;
    activeMarketEvent?: MarketEvent | null;
  } | undefined;
  private localOpenMatchesProvider?: () => FirestoreMatchDoc[];

  public registerLocalContainerProvider(
    provider: (matchId: string) => {
      match: FirestoreMatchDoc;
      players: FirestorePlayerDoc[];
      logs: FirestoreLogDoc[];
      activeAuction: FirestoreAuctionDoc | null;
      pendingChoice?: PendingMarketChoiceDoc | null;
      activeMarketEvent?: MarketEvent | null;
    } | undefined
  ): void {
    this.localContainerProvider = provider;
  }

  public registerLocalOpenMatchesProvider(provider: () => FirestoreMatchDoc[]): void {
    this.localOpenMatchesProvider = provider;
  }

  public registerRemoteUpdateHandlers(
    onMatchUpdate: (match: FirestoreMatchDoc) => void,
    onPlayersUpdate: (matchId: string, players: FirestorePlayerDoc[]) => void
  ): void {
    this.remoteMatchUpdateHandler = onMatchUpdate;
    this.remotePlayersUpdateHandler = onPlayersUpdate;
  }

  /**
   * Dispatches local authoritative updates to registered subscribers
   */
  public dispatchLocalUpdate(
    matchId: string,
    match: FirestoreMatchDoc,
    players: FirestorePlayerDoc[],
    logs: FirestoreLogDoc[],
    activeAuction: FirestoreAuctionDoc | null,
    pendingChoice?: PendingMarketChoiceDoc | null,
    activeMarketEvent?: MarketEvent | null
  ): void {
    const matchCopy = { ...match };
    const playersCopy = [...players];
    const logsCopy = [...logs];
    const auctionCopy = activeAuction ? { ...activeAuction } : null;
    const choiceCopy = pendingChoice ? { ...pendingChoice } : null;
    const eventCopy = activeMarketEvent ? { ...activeMarketEvent } : null;

    const mListeners = this.matchListeners.get(matchId);
    if (mListeners) {
      for (const listener of mListeners) {
        try {
          listener(matchCopy);
        } catch {
          // ignore subscriber error
        }
      }
    }

    const pListeners = this.playersListeners.get(matchId);
    if (pListeners) {
      for (const listener of pListeners) {
        try {
          listener(playersCopy);
        } catch {
          // ignore subscriber error
        }
      }
    }

    const lListeners = this.logsListeners.get(matchId);
    if (lListeners) {
      for (const listener of lListeners) {
        try {
          listener(logsCopy);
        } catch {
          // ignore subscriber error
        }
      }
    }

    const aListeners = this.auctionListeners.get(matchId);
    if (aListeners) {
      for (const listener of aListeners) {
        try {
          listener(auctionCopy);
        } catch {
          // ignore subscriber error
        }
      }
    }

    const cListeners = this.pendingChoiceListeners.get(matchId);
    if (cListeners) {
      for (const listener of cListeners) {
        try {
          listener(choiceCopy);
        } catch {
          // ignore subscriber error
        }
      }
    }

    const eListeners = this.marketEventListeners.get(matchId);
    if (eListeners) {
      for (const listener of eListeners) {
        try {
          listener(eventCopy);
        } catch {
          // ignore subscriber error
        }
      }
    }

    if (match.status === 'waiting_for_players') {
      for (const listener of this.openMatchesListeners) {
        try {
          listener([matchCopy]);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Persists match container to Firestore in background for cross-player multiplayer sync
   */
  public async syncContainerToFirestore(
    matchId: string,
    match: FirestoreMatchDoc,
    players: FirestorePlayerDoc[],
    logs: FirestoreLogDoc[],
    activeAuction: FirestoreAuctionDoc | null,
    pendingChoice?: PendingMarketChoiceDoc | null,
    activeMarketEvent?: MarketEvent | null
  ): Promise<void> {
    const db = this.getSafeDb();
    if (!db) return;

    try {
      // 1. Sync Match document
      const matchRef = doc(db, 'matches', matchId);
      await setDoc(
        matchRef,
        {
          ...match,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // 2. Sync Player documents
      for (const p of players) {
        const pRef = doc(db, 'matches', matchId, 'players', p.id);
        await setDoc(pRef, p, { merge: true });
      }

      // 3. Sync recent logs
      const recentLogs = logs.slice(0, 5);
      for (const log of recentLogs) {
        const logRef = doc(db, 'matches', matchId, 'logs', log.id);
        await setDoc(logRef, log, { merge: true });
      }

      // 4. Sync active auction if exists
      if (activeAuction) {
        const aRef = doc(db, 'matches', matchId, 'auctions', activeAuction.id);
        await setDoc(aRef, activeAuction, { merge: true });
      }

      // 5. Sync choice / market events
      if (pendingChoice) {
        const cRef = doc(db, 'matches', matchId, 'marketChoices', 'current');
        await setDoc(cRef, pendingChoice, { merge: true });
      }
      if (activeMarketEvent) {
        const eRef = doc(db, 'matches', matchId, 'marketEvents', 'active');
        await setDoc(eRef, activeMarketEvent, { merge: true });
      }
    } catch (err) {
      console.warn('[MatchSyncService] Firestore sync warning:', err);
    }
  }

  private getSafeDb(): Firestore | null {
    if (isCloudFunctionsLocalTestMode()) return null;
    if (!isFirebaseConfigured()) return null;
    try {
      return getFirebaseFirestore();
    } catch {
      return null;
    }
  }

  /**
   * Subscribe to match document
   */
   public subscribeToMatch(
    matchId: string,
    onData: (match: FirestoreMatchDoc | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    quickMatchDiagnosticStore.recordStage('firestore_match_subscription_begins', matchId);
    quickMatchDiagnosticStore.update({ firestoreMatchListener: 'OK' });

    if (!this.matchListeners.has(matchId)) {
      this.matchListeners.set(matchId, new Set());
    }
    this.matchListeners.get(matchId)!.add(onData);

    // Initial local dispatch if available
    if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
      const local = this.localContainerProvider(matchId);
      if (local) {
        onData({ ...local.match });
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};

    if (db) {
      const matchRef = doc(db, 'matches', matchId);
      fsUnsub = onSnapshot(
        matchRef,
        (snap) => {
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() } as FirestoreMatchDoc;
            quickMatchDiagnosticStore.recordStage('firestore_match_snapshot_received', data.status);
            quickMatchDiagnosticStore.recordStage('lobby_state_updated', data.status);
            if (data.status === 'in_progress') {
              quickMatchDiagnosticStore.recordStage('match_start_propagated', data.status);
            }
            if (this.remoteMatchUpdateHandler) {
              try {
                this.remoteMatchUpdateHandler(data);
              } catch {}
            }
            onData(data);
          } else if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
            const local = this.localContainerProvider(matchId);
            if (local) {
              onData({ ...local.match });
            }
          }
        },
        (err) => {
          quickMatchDiagnosticStore.update({ firestoreMatchListener: 'FAIL' });
          quickMatchDiagnosticStore.recordError(err.name || 'firestore-match-error', err.message);
          if (onError) onError(err);
          else console.warn('Match sync warning:', err.message);
        }
      );
    }

    return () => {
      this.matchListeners.get(matchId)?.delete(onData);
      fsUnsub();
    };
  }

  /**
   * Subscribe to players subcollection
   */
  public subscribeToPlayers(
    matchId: string,
    onData: (players: FirestorePlayerDoc[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    quickMatchDiagnosticStore.recordStage('firestore_player_subscription_begins', matchId);
    quickMatchDiagnosticStore.update({ firestorePlayerListener: 'OK' });

    if (!this.playersListeners.has(matchId)) {
      this.playersListeners.set(matchId, new Set());
    }
    this.playersListeners.get(matchId)!.add(onData);

    // Initial local dispatch if available
    if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
      const local = this.localContainerProvider(matchId);
      if (local && local.players.length > 0) {
        onData([...local.players]);
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};

    if (db) {
      const playersRef = collection(db, 'matches', matchId, 'players');
      fsUnsub = onSnapshot(
        playersRef,
        (snap) => {
          const players = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePlayerDoc));
          players.sort((a, b) => a.turnOrder - b.turnOrder);

          quickMatchDiagnosticStore.recordStage('firestore_player_snapshot_received', `count=${players.length}`);
          const playerNames = players.map(p => p.displayName || p.id);
          quickMatchDiagnosticStore.update({ lobbyPlayers: playerNames });

          if (players.length >= 2) {
            quickMatchDiagnosticStore.recordStage('second_player_joined', `total=${players.length}`);
          }

          // If snapshot is empty but local container has players, preserve local players
          if (players.length === 0 && isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
            const local = this.localContainerProvider(matchId);
            if (local && local.players.length > 0) {
              onData([...local.players]);
              return;
            }
          }

          if (players.length > 0 && this.remotePlayersUpdateHandler) {
            try {
              this.remotePlayersUpdateHandler(matchId, players);
            } catch {}
          }
          onData(players);
        },
        (err) => {
          quickMatchDiagnosticStore.update({ firestorePlayerListener: 'FAIL' });
          quickMatchDiagnosticStore.recordError(err.name || 'firestore-player-error', err.message);
          if (onError) onError(err);
          else console.warn('Players sync warning:', err.message);
        }
      );
    }

    return () => {
      this.playersListeners.get(matchId)?.delete(onData);
      fsUnsub();
    };
  }

  /**
   * Subscribe to match logs (most recent 30 events)
   */
  public subscribeToLogs(
    matchId: string,
    onData: (logs: FirestoreLogDoc[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!this.logsListeners.has(matchId)) {
      this.logsListeners.set(matchId, new Set());
    }
    this.logsListeners.get(matchId)!.add(onData);

    // Initial local dispatch if available
    if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
      const local = this.localContainerProvider(matchId);
      if (local) {
        onData([...local.logs]);
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};
    let fallbackUnsub: Unsubscribe = () => {};

    if (db) {
      const logsRef = collection(db, 'matches', matchId, 'logs');
      const logsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(30));

      fsUnsub = onSnapshot(
        logsQuery,
        (snap) => {
          const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLogDoc));
          onData(logs);
        },
        (err) => {
          const isIndexMissing = (err as any)?.code === 'failed-precondition' || err?.message?.includes('index');
          if (isIndexMissing) {
            // Fallback if index is missing
            const fallbackRef = collection(db, 'matches', matchId, 'logs');
            fallbackUnsub = onSnapshot(
              fallbackRef,
              (fallbackSnap) => {
                const fallbackLogs = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLogDoc));
                fallbackLogs.sort((a, b) => b.timestamp - a.timestamp);
                onData(fallbackLogs.slice(0, 30));
              },
              (fallbackErr) => {
                if (onError) onError(fallbackErr);
                else console.warn('Fallback logs sync warning:', fallbackErr.message);
              }
            );
          } else {
            if (onError) onError(err);
            else console.warn('Logs sync warning:', err.message);
          }
        }
      );
    }

    return () => {
      this.logsListeners.get(matchId)?.delete(onData);
      fsUnsub();
      fallbackUnsub();
    };
  }

  /**
   * Subscribe to active auctions in match
   */
  public subscribeToAuctions(
    matchId: string,
    onData: (auction: FirestoreAuctionDoc | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!this.auctionListeners.has(matchId)) {
      this.auctionListeners.set(matchId, new Set());
    }
    this.auctionListeners.get(matchId)!.add(onData);

    // Initial local dispatch if available
    if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
      const local = this.localContainerProvider(matchId);
      if (local) {
        onData(local.activeAuction ? { ...local.activeAuction } : null);
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};

    if (db) {
      const auctionsRef = collection(db, 'matches', matchId, 'auctions');
      const activeQuery = query(auctionsRef, where('status', '==', 'active'), limit(1));

      fsUnsub = onSnapshot(
        activeQuery,
        (snap) => {
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            onData({ id: docSnap.id, ...docSnap.data() } as FirestoreAuctionDoc);
          } else {
            onData(null);
          }
        },
        (err) => {
          if (onError) onError(err);
          else console.warn('Auctions sync warning:', err.message);
        }
      );
    }

    return () => {
      this.auctionListeners.get(matchId)?.delete(onData);
      fsUnsub();
    };
  }

  /**
   * Subscribe to public open lobbies
   */
  public subscribeToOpenMatches(
    onData: (matches: FirestoreMatchDoc[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    this.openMatchesListeners.add(onData);

    if (isCloudFunctionsLocalTestMode() && this.localOpenMatchesProvider) {
      try {
        const localMatches = this.localOpenMatchesProvider();
        if (localMatches.length > 0) {
          onData(localMatches);
        }
      } catch {
        // ignore
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};

    if (db) {
      const matchesRef = collection(db, 'matches');
      const lobbyQuery = query(matchesRef, where('status', '==', 'waiting_for_players'), limit(20));

      fsUnsub = onSnapshot(
        lobbyQuery,
        (snap) => {
          const remoteMatches = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FirestoreMatchDoc))
            .filter((m) => !m.isPrivate);
          const localMatches = isCloudFunctionsLocalTestMode() && this.localOpenMatchesProvider ? this.localOpenMatchesProvider() : [];
          // Combine unique matches
          const matchMap = new Map<string, FirestoreMatchDoc>();
          for (const m of localMatches) matchMap.set(m.id, m);
          for (const m of remoteMatches) matchMap.set(m.id, m);
          onData(Array.from(matchMap.values()));
        },
        (err) => {
          // Gracefully default to local open matches if unauthenticated or security rules active
          const localMatches = isCloudFunctionsLocalTestMode() && this.localOpenMatchesProvider ? this.localOpenMatchesProvider() : [];
          onData(localMatches);
          if (onError) onError(err);
          else console.warn('Lobby sync warning:', err.message);
        }
      );
    } else {
      const localMatches = isCloudFunctionsLocalTestMode() && this.localOpenMatchesProvider ? this.localOpenMatchesProvider() : [];
      onData(localMatches);
    }

    return () => {
      this.openMatchesListeners.delete(onData);
      fsUnsub();
    };
  }

  /**
   * Subscribe to pending market choice
   */
  public subscribeToPendingChoice(
    matchId: string,
    onData: (choice: PendingMarketChoiceDoc | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!this.pendingChoiceListeners.has(matchId)) {
      this.pendingChoiceListeners.set(matchId, new Set());
    }
    this.pendingChoiceListeners.get(matchId)!.add(onData);

    // Initial local dispatch if available
    if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
      const local = this.localContainerProvider(matchId);
      if (local) {
        onData(local.pendingChoice ? { ...local.pendingChoice } : null);
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};

    if (db) {
      const docRef = doc(db, 'matches', matchId, 'marketChoices', 'current');
      fsUnsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            onData(snap.data() as PendingMarketChoiceDoc);
          } else {
            onData(null);
          }
        },
        (err) => {
          if (onError) onError(err);
          else console.warn('Pending choice sync warning:', err.message);
        }
      );
    }

    return () => {
      this.pendingChoiceListeners.get(matchId)?.delete(onData);
      fsUnsub();
    };
  }

  /**
   * Subscribe to active market event
   */
  public subscribeToActiveMarketEvent(
    matchId: string,
    onData: (event: MarketEvent | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!this.marketEventListeners.has(matchId)) {
      this.marketEventListeners.set(matchId, new Set());
    }
    this.marketEventListeners.get(matchId)!.add(onData);

    // Initial local dispatch if available
    if (isCloudFunctionsLocalTestMode() && this.localContainerProvider) {
      const local = this.localContainerProvider(matchId);
      if (local) {
        onData(local.activeMarketEvent ? { ...local.activeMarketEvent } : null);
      }
    }

    const db = this.getSafeDb();
    let fsUnsub: Unsubscribe = () => {};

    if (db) {
      const docRef = doc(db, 'matches', matchId, 'marketEvents', 'active');
      fsUnsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            onData(snap.data() as MarketEvent);
          } else {
            onData(null);
          }
        },
        (err) => {
          if (onError) onError(err);
          else console.warn('Active event sync warning:', err.message);
        }
      );
    }

    return () => {
      this.marketEventListeners.get(matchId)?.delete(onData);
      fsUnsub();
    };
  }
}

export const matchSyncService = new MatchSyncService();

