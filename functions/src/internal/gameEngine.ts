/**
 * Production Authoritative Internal Game Functions (Non-Callable)
 * Executed solely inside secure server transactions.
 */

import { Transaction, DocumentReference } from 'firebase-admin/firestore';
import { ServerFunctionError, SERVER_ERROR_CODES } from '../types/contracts';

export interface PlayerState {
  id: string;
  userId: string;
  displayName: string;
  currentSpaceIndex: number;
  status: 'active' | 'bankrupt' | 'eliminated';
  turnOrder: number;
  netWorth: number;
  cash: number;
  specialPoints: number;
  ownedSpaceIds: string[];
  companyShareIds: string[];
  modifierIds: string[];
  isBot?: boolean;
  connected: boolean;
  lastActiveAt: number;
}

export interface MatchState {
  matchId: string;
  boardId: string;
  rulesetVersion: string;
  status: 'waiting_for_players' | 'in_progress' | 'completed' | 'cancelled';
  currentPhase: string;
  currentPlayerId: string | null;
  turnNumber: number;
  roundNumber: number;
  stateVersion: number;
  participantUserIds: string[];
  hostUserId: string;
  winnerId: string | null;
  createdAt: number;
  updatedAt: number;
}

export class GameEngineInternal {
  /**
   * Asserts and advances match state version inside a transaction
   */
  public static incrementStateVersion(
    transaction: Transaction,
    matchRef: DocumentReference,
    currentMatch: MatchState,
    expectedVersion?: number
  ): number {
    if (expectedVersion !== undefined && currentMatch.stateVersion !== expectedVersion) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.STALE_STATE,
        `Match state is stale. Expected version ${expectedVersion}, but current version is ${currentMatch.stateVersion}.`,
        true,
        { currentVersion: currentMatch.stateVersion, expectedVersion }
      );
    }
    const newVersion = currentMatch.stateVersion + 1;
    transaction.update(matchRef, {
      stateVersion: newVersion,
      updatedAt: Date.now(),
    });
    return newVersion;
  }

  /**
   * Internal: advanceTurn
   */
  public static advanceTurn(
    currentMatch: MatchState,
    players: PlayerState[]
  ): { nextPlayerId: string; nextTurnNumber: number; nextRoundNumber: number } {
    const activePlayers = players
      .filter((p) => p.status === 'active')
      .sort((a, b) => a.turnOrder - b.turnOrder);

    if (activePlayers.length === 0) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'No active players remaining in match.');
    }

    const currentIndex = activePlayers.findIndex((p) => p.id === currentMatch.currentPlayerId);
    let nextIndex = currentIndex + 1;
    let nextRoundNumber = currentMatch.roundNumber;

    if (nextIndex >= activePlayers.length) {
      nextIndex = 0;
      nextRoundNumber += 1;
    }

    return {
      nextPlayerId: activePlayers[nextIndex].id,
      nextTurnNumber: currentMatch.turnNumber + 1,
      nextRoundNumber,
    };
  }

  /**
   * Internal: calculateNetWorth
   */
  public static calculateNetWorth(player: PlayerState, assetValues: Record<string, number> = {}): number {
    let assetsTotal = 0;
    for (const spaceId of player.ownedSpaceIds) {
      assetsTotal += assetValues[spaceId] || 0;
    }
    return player.cash + assetsTotal;
  }

  /**
   * Internal: transferOwnership
   */
  public static transferOwnership(
    fromPlayer: PlayerState,
    toPlayer: PlayerState,
    assetId: string
  ): void {
    fromPlayer.ownedSpaceIds = fromPlayer.ownedSpaceIds.filter((id) => id !== assetId);
    if (!toPlayer.ownedSpaceIds.includes(assetId)) {
      toPlayer.ownedSpaceIds.push(assetId);
    }
  }

  /**
   * Internal: handleBankruptcy
   */
  public static handleBankruptcy(
    player: PlayerState,
    creditor?: PlayerState
  ): void {
    player.status = 'bankrupt';
    player.cash = 0;
    player.specialPoints = 0;

    if (creditor) {
      // Transfer assets to creditor
      creditor.ownedSpaceIds.push(...player.ownedSpaceIds);
    }
    player.ownedSpaceIds = [];
  }

  /**
   * Internal: completeMatch
   */
  public static completeMatch(
    match: MatchState,
    winnerPlayerId: string
  ): void {
    match.status = 'completed';
    match.winnerId = winnerPlayerId;
    match.updatedAt = Date.now();
  }
}
