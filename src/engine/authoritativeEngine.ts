/**
 * Production Authoritative Game Engine Contracts
 * Enforces that all state mutations occur through server-authoritative transitions.
 * Explicitly guards against client-side tampering of cash, ownership, dice, and victory states.
 */

import { GameState } from '../types/game';
import { ActionRequest } from '../types/request';
import { GameEvent } from '../types/gameEvent';
import { Transaction } from '../types/transaction';

export interface MutationResult {
  nextState: GameState;
  events: GameEvent[];
  transactions: Transaction[];
}

/**
 * Server-authoritative action handler contract.
 * Each specific game action (ROLL_DICE, BUY_PROPERTY, etc.) implements this boundary on the server.
 */
export interface IActionHandler<TPayload = unknown> {
  actionType: string;
  validate(state: GameState, request: ActionRequest<TPayload>): void;
  apply(state: GameState, request: ActionRequest<TPayload>): MutationResult;
}

/**
 * Authoritative Engine Contract.
 * Only the server execution context has access to an implementation of this interface.
 */
export interface IAuthoritativeGameEngine {
  processAction<TPayload>(
    currentState: GameState,
    request: ActionRequest<TPayload>
  ): Promise<MutationResult>;
}

/**
 * Security Assertion: Operations strictly forbidden on client-side state.
 * Any attempt by client code to execute these mutations directly is blocked.
 */
export const FORBIDDEN_CLIENT_MUTATIONS = [
  'SET_PLAYER_CASH',
  'TRANSFER_ASSET_OWNERSHIP',
  'GENERATE_DICE_ROLL',
  'SET_SP_BALANCE',
  'RESOLVE_AUCTION_WINNER',
  'TRIGGER_BANKRUPTCY',
  'DECLARE_VICTORY',
  'RESOLVE_MARKET_EVENT',
] as const;

export type ForbiddenClientMutation = (typeof FORBIDDEN_CLIENT_MUTATIONS)[number];
