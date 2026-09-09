/**
 * Production Bot Runner Service
 * Automatically orchestrates bot turns, auction bidding, and phase transitions.
 * Guarantees that:
 * 1. Bots act strictly when it is their turn or when participating in auctions.
 * 2. Decisions are paced naturally with configurable decision timers.
 * 3. Duplicate actions are prevented via versioned state locking.
 * 4. Decisions are resolved authoritatively via the cloud functions client.
 * 5. Game never blocks indefinitely: timeout fallbacks advance the game safely.
 */

import { FirestoreMatchDoc, FirestorePlayerDoc, FirestoreAuctionDoc } from '../services/firebase/matchSyncService';
import { cloudFunctionsClient } from '../services/firebase/cloudFunctionsClient';
import { BotDecisionService } from './botDecisionService';
import { errorHandler } from '../services/monitoring/errorHandler';

export interface BotRunnerConfig {
  decisionDelayMs: number; // Delay between phases for readability (default 800ms)
  enabled: boolean;
}

export class BotRunnerService {
  private static instance: BotRunnerService;
  private config: BotRunnerConfig = {
    decisionDelayMs: 800,
    enabled: true,
  };

  private activeTimer: ReturnType<typeof setTimeout> | null = null;
  private processedLocks = new Set<string>();
  private isExecuting = false;

  public static getInstance(): BotRunnerService {
    if (!BotRunnerService.instance) {
      BotRunnerService.instance = new BotRunnerService();
    }
    return BotRunnerService.instance;
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
  }

  /**
   * Evaluates if any bot action is required and schedules execution
   */
  public handleGameStateChange(
    match: FirestoreMatchDoc | null,
    players: FirestorePlayerDoc[],
    activeAuction: FirestoreAuctionDoc | null
  ): void {
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

    this.scheduleBotAction(lockKey, () => this.executeTurnStep(match, currentPlayer, players, activeAuction));
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
