/**
 * Production Bot Runner Service
 * Automatically orchestrates bot turns, auction bidding, and phase transitions.
 * Guarantees that:
 * 1. Bots act naturally like realtime players with responsive decision timers.
 * 2. Client triggers bot turns reliably whether host or in quick-match mode.
 * 3. Duplicate actions are prevented via versioned state locking.
 * 4. Decisions are resolved authoritatively via the cloud functions client.
 * 5. State transitions advance smoothly to the next player without dropping phases.
 * 6. Includes an active fail-safe watchdog that prevents gameplay stalls.
 */

import {
  FirestoreMatchDoc,
  FirestorePlayerDoc,
  FirestoreAuctionDoc,
  matchSyncService,
} from '../services/firebase/matchSyncService';
import { cloudFunctionsClient } from '../services/firebase/cloudFunctionsClient';
import { BotDecisionService } from './botDecisionService';
import { errorHandler } from '../services/monitoring/errorHandler';

export interface BotRunnerConfig {
  decisionDelayMs: number; // Delay between phases for human-like pacing (default 650ms)
  enabled: boolean;
}

export class BotRunnerService {
  private static instance: BotRunnerService;
  private config: BotRunnerConfig = {
    decisionDelayMs: 650,
    enabled: true,
  };

  private activeTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private processedLocks = new Set<string>();
  private isExecuting = false;
  private lastActionTimestamp = Date.now();
  private latestState: {
    match: FirestoreMatchDoc | null;
    players: FirestorePlayerDoc[];
    activeAuction: FirestoreAuctionDoc | null;
    isHost?: boolean;
  } | null = null;

  public static getInstance(): BotRunnerService {
    if (!BotRunnerService.instance) {
      BotRunnerService.instance = new BotRunnerService();
    }
    return BotRunnerService.instance;
  }

  public constructor() {
    this.startWatchdog();
  }

  public setConfig(config: Partial<BotRunnerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public setMasterPause(paused: boolean): void {
    this.setConfig({ enabled: !paused });
  }

  public setExecutionDelay(delayMs: number): void {
    this.setConfig({ decisionDelayMs: delayMs });
  }

  public getConfig(): BotRunnerConfig {
    return { ...this.config };
  }

  public reset(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
    this.processedLocks.clear();
    this.isExecuting = false;
    this.latestState = null;
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
    }
    this.watchdogTimer = setInterval(() => {
      this.checkWatchdog();
    }, 2800);
  }

  /**
   * Watchdog verifies that if a bot is the active player in an ongoing match,
   * gameplay does not stay stuck on a single phase for more than 3 seconds.
   */
  private checkWatchdog(): void {
    if (!this.config.enabled || this.isExecuting) return;
    if (!this.latestState || !this.latestState.match) return;

    const { match, players } = this.latestState;
    if (match.status !== 'in_progress') return;

    const currentPlayer = players.find((p) => p.id === match.currentPlayerId);
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.status !== 'active') return;

    const timeSinceLastAction = Date.now() - this.lastActionTimestamp;
    if (timeSinceLastAction > 2800) {
      console.log(`[BotRunner] Watchdog nudging active bot turn for: ${currentPlayer.displayName} (phase: ${match.currentPhase})`);
      this.lastActionTimestamp = Date.now();
      const reqId = `wd_${Date.now()}`;
      cloudFunctionsClient
        .executeFullBotTurn(match.id, reqId, currentPlayer.id)
        .catch((err) => {
          console.warn('[BotRunner] Watchdog full turn notice:', err);
        });
    }
  }

  /**
   * Evaluates if any bot action is required and schedules execution.
   */
  public handleGameStateChange(
    match: FirestoreMatchDoc | null,
    players: FirestorePlayerDoc[],
    activeAuction: FirestoreAuctionDoc | null,
    isHost?: boolean
  ): void {
    this.latestState = { match, players, activeAuction, isHost };

    if (!this.config.enabled || !match || match.status !== 'in_progress') {
      return;
    }

    // 1. Check if an active auction requires a bot decision
    if (match.currentPhase === 'AUCTION_IN_PROGRESS' && activeAuction) {
      const activeBidders = players.filter(
        (p) =>
          p.isBot &&
          p.status === 'active' &&
          !activeAuction.passedPlayerIds?.includes(p.id) &&
          activeAuction.currentHighestBidderId !== p.id
      );

      if (activeBidders.length > 0) {
        const nextBot = activeBidders[0];
        const lockKey = `auc_${match.id}_${activeAuction.id}_${match.stateVersion}_${nextBot.id}_${activeAuction.currentHighestBid}`;
        if (!this.processedLocks.has(lockKey) && !this.isExecuting) {
          this.scheduleBotAction(lockKey, () =>
            this.executeAuctionStep(match, nextBot, players, activeAuction)
          );
        }
        return;
      }
    }

    // 2. Check if current turn player is a bot
    const currentPlayer = players.find((p) => p.id === match.currentPlayerId);
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.status !== 'active') {
      return;
    }

    const lockKey = `turn_${match.id}_${match.turnNumber}_${match.currentPhase}_${match.stateVersion}_${currentPlayer.id}`;
    if (this.processedLocks.has(lockKey) || this.isExecuting) {
      return;
    }

    this.scheduleBotAction(lockKey, () =>
      this.executeTurnStep(match, currentPlayer, players, activeAuction)
    );
  }

  private scheduleBotAction(lockKey: string, action: () => Promise<void>): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }

    this.processedLocks.add(lockKey);
    // Keep max 100 locks in memory
    if (this.processedLocks.size > 100) {
      const firstKey = this.processedLocks.values().next().value;
      if (firstKey) this.processedLocks.delete(firstKey);
    }

    this.activeTimer = setTimeout(async () => {
      this.isExecuting = true;
      this.lastActionTimestamp = Date.now();
      try {
        await action();
      } catch (err) {
        errorHandler.capture(err, {
          action: 'executeBotAction',
          details: { lockKey },
          severity: 'warn',
        });
      } finally {
        this.isExecuting = false;
        this.lastActionTimestamp = Date.now();

        // Query freshest state container after action
        if (this.latestState?.match?.id) {
          const fresh = matchSyncService.getLocalState(this.latestState.match.id);
          const nextMatch = fresh?.match || this.latestState.match;
          const nextPlayers = fresh?.players || this.latestState.players;
          const nextAuction = fresh?.activeAuction ?? this.latestState.activeAuction;

          if (nextMatch && nextMatch.status === 'in_progress') {
            setTimeout(() => {
              this.handleGameStateChange(nextMatch, nextPlayers, nextAuction, true);
            }, 120);
          }
        }
      }
    }, this.config.decisionDelayMs);
  }

  private async executeTurnStep(
    match: FirestoreMatchDoc,
    botPlayer: FirestorePlayerDoc,
    allPlayers: FirestorePlayerDoc[],
    activeAuction: FirestoreAuctionDoc | null
  ): Promise<void> {
    const requestId = `req_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await cloudFunctionsClient.executeBotTurn(match.id, requestId, botPlayer.id);
  }

  private async executeAuctionStep(
    match: FirestoreMatchDoc,
    botPlayer: FirestorePlayerDoc,
    allPlayers: FirestorePlayerDoc[],
    activeAuction: FirestoreAuctionDoc
  ): Promise<void> {
    const decision = BotDecisionService.evaluateDecision(match, botPlayer, allPlayers, activeAuction);
    const requestId = `req_bot_auc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (decision.actionType === 'PLACE_BID') {
      const amount = (decision.payload?.amount as number) || activeAuction.currentHighestBid + 10;
      await cloudFunctionsClient.placeBid(match.id, requestId, activeAuction.id, amount, botPlayer.id);
    } else {
      await cloudFunctionsClient.passAuction(match.id, requestId, activeAuction.id, botPlayer.id);
    }
  }
}

export const botRunnerService = BotRunnerService.getInstance();
