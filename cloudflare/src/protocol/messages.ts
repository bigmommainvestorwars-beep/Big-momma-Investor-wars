/**
 * Versioned WebSocket Message Protocol for Bigmomma Investor Wars
 * Defines typed message envelopes for Client -> Server and Server -> Client communications.
 */

import { WsErrorPayload } from './errors';

export const CURRENT_PROTOCOL_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Base Envelopes
// ---------------------------------------------------------------------------

export interface BaseWsMessage {
  protocolVersion: string;
  messageId: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Client -> Server Messages
// ---------------------------------------------------------------------------

export type ClientMessageType =
  | 'CONNECT'
  | 'JOIN_MATCH'
  | 'LEAVE_MATCH'
  | 'PING'
  | 'GAME_COMMAND'
  | 'RECONNECT';

export interface ConnectMessage extends BaseWsMessage {
  type: 'CONNECT';
  payload: {
    clientVersion: string;
    token?: string;
  };
}

export interface JoinMatchMessage extends BaseWsMessage {
  type: 'JOIN_MATCH';
  payload: {
    matchId: string;
    displayName?: string;
    avatarId?: string;
    colorHex?: string;
  };
}

export interface LeaveMatchMessage extends BaseWsMessage {
  type: 'LEAVE_MATCH';
  payload: {
    matchId: string;
    reason?: string;
  };
}

export interface PingMessage extends BaseWsMessage {
  type: 'PING';
  payload: {
    clientTime: number;
  };
}

export interface GameCommandMessage extends BaseWsMessage {
  type: 'GAME_COMMAND';
  payload: {
    requestId: string;
    matchId: string;
    playerId: string;
    command: string;
    expectedStateVersion?: number;
    args?: Record<string, unknown>;
  };
}

export interface ReconnectMessage extends BaseWsMessage {
  type: 'RECONNECT';
  payload: {
    matchId: string;
    playerId: string;
    lastKnownStateVersion?: number;
    reconnectToken?: string;
  };
}

export type ClientMessage =
  | ConnectMessage
  | JoinMatchMessage
  | LeaveMatchMessage
  | PingMessage
  | GameCommandMessage
  | ReconnectMessage;

// ---------------------------------------------------------------------------
// Server -> Client Messages
// ---------------------------------------------------------------------------

export type ServerMessageType =
  | 'CONNECTED'
  | 'MATCH_JOINED'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'GAME_EVENT'
  | 'STATE_SYNC'
  | 'ERROR'
  | 'PONG';

export interface ConnectedMessage extends BaseWsMessage {
  type: 'CONNECTED';
  payload: {
    connectionId: string;
    playerId: string;
    displayName: string;
    isAnonymous: boolean;
    serverTime: number;
    heartbeatIntervalMs: number;
  };
}

export interface MatchJoinedMessage extends BaseWsMessage {
  type: 'MATCH_JOINED';
  payload: {
    matchId: string;
    playerId: string;
    isHost: boolean;
    roomCapacity: number;
    connectedPlayerIds: string[];
  };
}

export interface PlayerJoinedMessage extends BaseWsMessage {
  type: 'PLAYER_JOINED';
  payload: {
    matchId: string;
    playerId: string;
    displayName: string;
    avatarId?: string;
    colorHex?: string;
    isBot?: boolean;
    totalConnected: number;
  };
}

export interface PlayerLeftMessage extends BaseWsMessage {
  type: 'PLAYER_LEFT';
  payload: {
    matchId: string;
    playerId: string;
    reason?: string;
    totalConnected: number;
  };
}

export interface GameEventMessage extends BaseWsMessage {
  type: 'GAME_EVENT';
  payload: {
    matchId: string;
    eventType: string;
    actingPlayerId?: string;
    stateVersion: number;
    summary: string;
    data?: Record<string, unknown>;
  };
}

export interface StateSyncMessage extends BaseWsMessage {
  type: 'STATE_SYNC';
  payload: {
    matchId: string;
    stateVersion: number;
    syncType: 'FULL' | 'DELTA';
    stateSnapshot?: Record<string, unknown>;
    deltaChanges?: Record<string, unknown>;
  };
}

export interface ErrorMessage extends BaseWsMessage {
  type: 'ERROR';
  correlationMessageId?: string;
  payload: WsErrorPayload;
}

export interface PongMessage extends BaseWsMessage {
  type: 'PONG';
  payload: {
    clientTime: number;
    serverTime: number;
  };
}

export type ServerMessage =
  | ConnectedMessage
  | MatchJoinedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameEventMessage
  | StateSyncMessage
  | ErrorMessage
  | PongMessage;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function createServerMessage<T extends ServerMessage>(
  type: T['type'],
  payload: T['payload'],
  correlationMessageId?: string,
  protocolVersion = CURRENT_PROTOCOL_VERSION
): T {
  return {
    protocolVersion,
    messageId: crypto.randomUUID(),
    correlationMessageId,
    timestamp: Date.now(),
    type,
    payload,
  } as T;
}
