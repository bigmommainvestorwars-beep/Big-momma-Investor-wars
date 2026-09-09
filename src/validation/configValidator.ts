/**
 * Production Configuration Validation Layer
 * Verifies ruleset and board configurations prior to game initialization.
 */

import { GameRulesConfig } from '../config/rulesets';
import { BoardConfig } from '../config/boardConfig';
import { GameError } from '../types/error';

export function validateGameRulesConfig(config: GameRulesConfig): void {
  if (!config.rulesetVersion || config.rulesetVersion.trim().length === 0) {
    throw new GameError({
      errorCode: 'INVALID_RULESET_VERSION',
      message: 'GameRulesConfig must have a non-empty rulesetVersion.',
    });
  }

  if (config.minPlayers < 2) {
    throw new GameError({
      errorCode: 'INVALID_MIN_PLAYERS',
      message: 'minPlayers must be at least 2.',
    });
  }

  if (config.maxPlayers < config.minPlayers) {
    throw new GameError({
      errorCode: 'INVALID_MAX_PLAYERS',
      message: 'maxPlayers cannot be less than minPlayers.',
    });
  }

  if (config.startingCash <= 0) {
    throw new GameError({
      errorCode: 'INVALID_STARTING_CASH',
      message: 'startingCash must be greater than 0.',
    });
  }
}

export function validateBoardConfig(config: BoardConfig): void {
  if (!config.boardId || config.boardId.trim().length === 0) {
    throw new GameError({
      errorCode: 'INVALID_BOARD_ID',
      message: 'BoardConfig must have a non-empty boardId.',
    });
  }

  if (!Array.isArray(config.spaces) || config.spaces.length < 4) {
    throw new GameError({
      errorCode: 'INVALID_BOARD_SPACES',
      message: 'BoardConfig spaces must be an array with at least 4 spaces.',
    });
  }
}
