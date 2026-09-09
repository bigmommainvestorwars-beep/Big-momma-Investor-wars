/**
 * Production Security Architecture & Boundary Declarations
 *
 * CLIENT BOUNDARY:
 * - Presentation
 * - User interaction
 * - Local UI state (e.g. camera, inspector tab, audio toggles)
 * - Realtime state display via Firestore subscriptions
 *
 * SERVER BOUNDARY:
 * - Authoritative game state mutation
 * - True random dice result generation
 * - Economic calculations (rent, salary, dividends, interest)
 * - Ownership changes (property buying, asset trading, share issuance)
 * - Auction settlement & bidding resolution
 * - Market Event resolution & modifier triggers
 * - Invariant validation & anti-cheat enforcement
 */

import { ActionRequest } from '../types/request';
import { GameError } from '../types/error';

export const SERVER_AUTHORITATIVE_OPERATIONS = [
  'MUTATE_CASH',
  'TRANSFER_ASSET',
  'ROLL_DICE',
  'MUTATE_SP',
  'RESOLVE_AUCTION',
  'RESOLVE_MARKET_EVENT',
  'DECLARE_BANKRUPTCY',
  'DECLARE_VICTORY',
] as const;

export class SecurityGuard {
  /**
   * Asserts that a client request does NOT attempt to pass arbitrary state updates.
   * Clients must only send intention verbs (ActionRequests), not calculated states.
   */
  public static assertClientPayloadSanity(request: ActionRequest): void {
    const rawPayload = request.payload as Record<string, unknown>;
    if (!rawPayload || typeof rawPayload !== 'object') return;

    // Check for illegal client-supplied state injection
    const forbiddenKeys = [
      'newCash',
      'cash',
      'reservedCash',
      'strategyPoints',
      'sp',
      'position',
      'currentSpaceIndex',
      'ownership',
      'ownerId',
      'overrideOwnership',
      'dice',
      'diceResult',
      'forcedDiceRoll',
      'auctionWinner',
      'declaredWinner',
      'winnerId',
      'modifiers',
      'activeModifiers',
      'eventActivation',
      'activeMarketEvents',
      'isBankrupt',
      'bankruptcy',
      'turnTransitions',
      'nextPhase',
      'currentPhase',
      'turnNumber',
      'roundNumber',
      'netWorth',
      'nextState',
      'stateVersion',
    ];

    for (const key of forbiddenKeys) {
      if (key in rawPayload) {
        throw new GameError({
          errorCode: 'SECURITY_INTEGRITY_VIOLATION',
          message: `Client attempted to pass forbidden authoritative field: ${key}`,
          requestId: request.requestId,
          gameId: request.gameId,
          severity: 'fatal',
        });
      }
    }
  }
}
