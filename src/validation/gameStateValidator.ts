/**
 * Production GameState Invariant Validation Layer
 * Enforces structural integrity and invariants on authoritative GameState objects.
 */

import { GameState } from '../types/game';
import { GameError } from '../types/error';

export function validateGameStateInvariants(state: unknown): asserts state is GameState {
  if (!state || typeof state !== 'object') {
    throw new GameError({
      errorCode: 'INVALID_GAME_STATE',
      message: 'GameState must be a non-null object.',
    });
  }

  const s = state as Partial<GameState>;

  if (!s.gameId || typeof s.gameId !== 'string') {
    throw new GameError({
      errorCode: 'STATE_MISSING_GAME_ID',
      message: 'GameState must have a valid gameId.',
    });
  }

  if (!s.boardId || typeof s.boardId !== 'string') {
    throw new GameError({
      errorCode: 'STATE_MISSING_BOARD_ID',
      message: 'GameState must have a valid boardId.',
      gameId: s.gameId,
    });
  }

  if (!s.rulesetVersion || typeof s.rulesetVersion !== 'string') {
    throw new GameError({
      errorCode: 'STATE_MISSING_RULESET_VERSION',
      message: 'GameState must specify a rulesetVersion.',
      gameId: s.gameId,
    });
  }

  if (typeof s.stateVersion !== 'number' || s.stateVersion < 0) {
    throw new GameError({
      errorCode: 'STATE_INVALID_VERSION',
      message: 'GameState stateVersion must be a non-negative integer.',
      gameId: s.gameId,
    });
  }

  if (!s.players || typeof s.players !== 'object') {
    throw new GameError({
      errorCode: 'STATE_INVALID_PLAYERS_MAP',
      message: 'GameState must contain a valid players dictionary.',
      gameId: s.gameId,
    });
  }

  if (!Array.isArray(s.activeMarketEvents)) {
    throw new GameError({
      errorCode: 'STATE_INVALID_MARKET_EVENTS',
      message: 'GameState activeMarketEvents must be an array.',
      gameId: s.gameId,
    });
  }

  if (!Array.isArray(s.activeModifiers)) {
    throw new GameError({
      errorCode: 'STATE_INVALID_MODIFIERS',
      message: 'GameState activeModifiers must be an array.',
      gameId: s.gameId,
    });
  }

  if (!Array.isArray(s.pendingChoices)) {
    throw new GameError({
      errorCode: 'STATE_INVALID_PENDING_CHOICES',
      message: 'GameState pendingChoices must be an array.',
      gameId: s.gameId,
    });
  }
}
