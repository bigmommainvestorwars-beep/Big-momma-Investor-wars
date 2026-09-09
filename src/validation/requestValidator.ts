/**
 * Production Request Validation Layer
 * Enforces structural integrity of incoming ActionRequests.
 */

import { ActionRequest } from '../types/request';
import { GameError } from '../types/error';

const MAX_TIMESTAMP_SKEW_MS = 60 * 1000; // 1 minute max allowable client clock skew

export function validateActionRequest(request: unknown): asserts request is ActionRequest {
  if (!request || typeof request !== 'object') {
    throw new GameError({
      errorCode: 'INVALID_REQUEST_ENVELOPE',
      message: 'ActionRequest must be a non-null object.',
    });
  }

  const req = request as Partial<ActionRequest>;

  if (!req.requestId || typeof req.requestId !== 'string' || req.requestId.trim().length === 0) {
    throw new GameError({
      errorCode: 'MISSING_REQUEST_ID',
      message: 'ActionRequest must contain a non-empty requestId.',
    });
  }

  if (!req.gameId || typeof req.gameId !== 'string' || req.gameId.trim().length === 0) {
    throw new GameError({
      errorCode: 'MISSING_GAME_ID',
      message: 'ActionRequest must contain a non-empty gameId.',
      requestId: req.requestId,
    });
  }

  if (!req.playerId || typeof req.playerId !== 'string' || req.playerId.trim().length === 0) {
    throw new GameError({
      errorCode: 'MISSING_PLAYER_ID',
      message: 'ActionRequest must contain a non-empty playerId.',
      requestId: req.requestId,
      gameId: req.gameId,
    });
  }

  if (!req.actionType || typeof req.actionType !== 'string' || req.actionType.trim().length === 0) {
    throw new GameError({
      errorCode: 'MISSING_ACTION_TYPE',
      message: 'ActionRequest must contain a valid actionType string.',
      requestId: req.requestId,
      gameId: req.gameId,
    });
  }

  if (typeof req.clientTimestamp !== 'number' || isNaN(req.clientTimestamp)) {
    throw new GameError({
      errorCode: 'INVALID_CLIENT_TIMESTAMP',
      message: 'ActionRequest must contain a numeric clientTimestamp.',
      requestId: req.requestId,
      gameId: req.gameId,
    });
  }

  // Clock skew detection
  const now = Date.now();
  if (Math.abs(now - req.clientTimestamp) > MAX_TIMESTAMP_SKEW_MS) {
    throw new GameError({
      errorCode: 'TIMESTAMP_SKEW_EXCEEDED',
      message: `Request timestamp is out of acceptable bounds (${req.clientTimestamp} vs server ${now}).`,
      requestId: req.requestId,
      gameId: req.gameId,
    });
  }
}
