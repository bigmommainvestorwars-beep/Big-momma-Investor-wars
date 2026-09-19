/**
 * Cloudflare WebSocket Infrastructure Error Codes & Response Builders
 */

export enum WsErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_UPGRADE = 'INVALID_UPGRADE',
  INVALID_MATCH_ID = 'INVALID_MATCH_ID',
  MALFORMED_JSON = 'MALFORMED_JSON',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  UNKNOWN_MESSAGE_TYPE = 'UNKNOWN_MESSAGE_TYPE',
  INVALID_PROTOCOL_VERSION = 'INVALID_PROTOCOL_VERSION',
  ROOM_FULL = 'ROOM_FULL',
  PLAYER_NOT_IN_MATCH = 'PLAYER_NOT_IN_MATCH',
  RATE_LIMITED = 'RATE_LIMITED',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface WsErrorPayload {
  code: WsErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export function createErrorResponse(
  protocolVersion: string,
  errorPayload: WsErrorPayload,
  correlationMessageId?: string
) {
  return {
    protocolVersion,
    messageId: crypto.randomUUID(),
    correlationMessageId,
    timestamp: Date.now(),
    type: 'ERROR' as const,
    payload: errorPayload,
  };
}
