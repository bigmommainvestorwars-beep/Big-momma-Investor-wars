/**
 * Schema Validation for Incoming WebSocket Messages
 * Fast, self-contained TypeScript validators without runtime weight.
 */

import { ClientMessage, ClientMessageType, CURRENT_PROTOCOL_VERSION } from './messages';
import { WsErrorCode, WsErrorPayload } from './errors';

export interface ValidationResult<T = ClientMessage> {
  success: boolean;
  data?: T;
  error?: WsErrorPayload;
}

const VALID_CLIENT_MESSAGE_TYPES: Set<string> = new Set<ClientMessageType>([
  'CONNECT',
  'JOIN_MATCH',
  'LEAVE_MATCH',
  'PING',
  'GAME_COMMAND',
  'RECONNECT',
]);

export function validateIncomingMessage(raw: unknown): ValidationResult {
  // 1. Must be a valid non-null object
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      error: {
        code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
        message: 'Message payload must be a JSON object.',
      },
    };
  }

  const obj = raw as Record<string, unknown>;

  // 2. Validate envelope basics: protocolVersion, messageId, timestamp, type
  if (typeof obj.protocolVersion !== 'string' || !obj.protocolVersion.trim()) {
    return {
      success: false,
      error: {
        code: WsErrorCode.INVALID_PROTOCOL_VERSION,
        message: `Missing or invalid 'protocolVersion'. Expected string like '${CURRENT_PROTOCOL_VERSION}'.`,
      },
    };
  }

  if (typeof obj.messageId !== 'string' || !obj.messageId.trim()) {
    return {
      success: false,
      error: {
        code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
        message: "Missing or invalid 'messageId'.",
      },
    };
  }

  if (typeof obj.timestamp !== 'number' || isNaN(obj.timestamp) || obj.timestamp <= 0) {
    return {
      success: false,
      error: {
        code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
        message: "Missing or invalid 'timestamp'. Must be a positive epoch timestamp in milliseconds.",
      },
    };
  }

  if (typeof obj.type !== 'string' || !VALID_CLIENT_MESSAGE_TYPES.has(obj.type)) {
    return {
      success: false,
      error: {
        code: WsErrorCode.UNKNOWN_MESSAGE_TYPE,
        message: `Unknown or unsupported message type: '${String(obj.type)}'. Allowed types: ${Array.from(VALID_CLIENT_MESSAGE_TYPES).join(', ')}`,
      },
    };
  }

  const payload = obj.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      success: false,
      error: {
        code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
        message: `Missing or invalid 'payload' object for message type '${obj.type}'.`,
      },
    };
  }

  const p = payload as Record<string, unknown>;

  // 3. Type-specific payload validation
  switch (obj.type) {
    case 'CONNECT': {
      if (typeof p.clientVersion !== 'string' || !p.clientVersion.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
            message: "CONNECT payload requires a non-empty 'clientVersion' string.",
          },
        };
      }
      break;
    }

    case 'JOIN_MATCH': {
      if (typeof p.matchId !== 'string' || !p.matchId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.INVALID_MATCH_ID,
            message: "JOIN_MATCH payload requires a non-empty 'matchId' string.",
          },
        };
      }
      break;
    }

    case 'LEAVE_MATCH': {
      if (typeof p.matchId !== 'string' || !p.matchId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.INVALID_MATCH_ID,
            message: "LEAVE_MATCH payload requires a non-empty 'matchId' string.",
          },
        };
      }
      break;
    }

    case 'PING': {
      if (typeof p.clientTime !== 'number' || isNaN(p.clientTime)) {
        return {
          success: false,
          error: {
            code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
            message: "PING payload requires a numeric 'clientTime'.",
          },
        };
      }
      break;
    }

    case 'GAME_COMMAND': {
      if (typeof p.requestId !== 'string' || !p.requestId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
            message: "GAME_COMMAND payload requires a non-empty 'requestId' string.",
          },
        };
      }
      if (typeof p.matchId !== 'string' || !p.matchId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.INVALID_MATCH_ID,
            message: "GAME_COMMAND payload requires a non-empty 'matchId' string.",
          },
        };
      }
      if (typeof p.playerId !== 'string' || !p.playerId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
            message: "GAME_COMMAND payload requires a non-empty 'playerId' string.",
          },
        };
      }
      if (typeof p.command !== 'string' || !p.command.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
            message: "GAME_COMMAND payload requires a non-empty 'command' string.",
          },
        };
      }
      break;
    }

    case 'RECONNECT': {
      if (typeof p.matchId !== 'string' || !p.matchId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.INVALID_MATCH_ID,
            message: "RECONNECT payload requires a non-empty 'matchId' string.",
          },
        };
      }
      if (typeof p.playerId !== 'string' || !p.playerId.trim()) {
        return {
          success: false,
          error: {
            code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
            message: "RECONNECT payload requires a non-empty 'playerId' string.",
          },
        };
      }
      break;
    }
  }

  return {
    success: true,
    data: obj as unknown as ClientMessage,
  };
}

export function parseAndValidateRawMessage(rawText: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return {
      success: false,
      error: {
        code: WsErrorCode.MALFORMED_JSON,
        message: `Failed to parse WebSocket text frame as JSON: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  return validateIncomingMessage(parsed);
}
