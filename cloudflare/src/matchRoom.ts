/**
 * MatchRoom Durable Object
 * Implements single-match room coordination using Cloudflare Durable Objects
 * and the WebSocket Hibernation API.
 */

import { Env, WsAttachment, DurableObjectState, CloudflareWebSocket } from './types/env';
import {
  CURRENT_PROTOCOL_VERSION,
  ServerMessage,
  createServerMessage,
  ConnectedMessage,
  MatchJoinedMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  PongMessage,
} from './protocol/messages';
import { parseAndValidateRawMessage } from './protocol/schemas';
import { WsErrorCode, createErrorResponse } from './protocol/errors';

// Ambient declaration for Cloudflare WebSocketPair in runtime
declare class WebSocketPair {
  0: CloudflareWebSocket;
  1: CloudflareWebSocket;
}

export interface RoomMetadata {
  matchId: string;
  createdAt: number;
  maxCapacity: number;
  hostPlayerId: string | null;
  joinedPlayerIds: string[];
}

export class MatchRoom {
  private state: DurableObjectState;
  private env: Env;
  private roomMeta: RoomMetadata | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Loads room metadata from Durable Object storage or initializes defaults
   */
  private async getOrInitRoomMeta(matchId: string, hostPlayerId?: string): Promise<RoomMetadata> {
    if (this.roomMeta) return this.roomMeta;

    const stored = await this.state.storage.get<RoomMetadata>('room_metadata');
    if (stored) {
      this.roomMeta = stored;
      return stored;
    }

    this.roomMeta = {
      matchId,
      createdAt: Date.now(),
      maxCapacity: 6,
      hostPlayerId: hostPlayerId || null,
      joinedPlayerIds: hostPlayerId ? [hostPlayerId] : [],
    };

    await this.state.storage.put('room_metadata', this.roomMeta);
    return this.roomMeta;
  }

  /**
   * HTTP upgrade entry point forwarded by the Worker router
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health / Diagnostics endpoint
    if (url.pathname.endsWith('/status')) {
      const activeSockets = this.state.getWebSockets();
      const meta = await this.getOrInitRoomMeta(url.searchParams.get('matchId') || 'unknown');
      return Response.json({
        matchId: meta.matchId,
        connectedSocketsCount: activeSockets.length,
        joinedPlayers: meta.joinedPlayerIds,
        hostPlayerId: meta.hostPlayerId,
        createdAt: meta.createdAt,
      });
    }

    // Must be a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const playerId = request.headers.get('x-player-id') || 'anonymous_player';
    const displayName = request.headers.get('x-display-name') || 'Player';
    const isAnonymous = request.headers.get('x-is-anonymous') === 'true';
    const matchId = request.headers.get('x-match-id') || 'default-match';

    // In Cloudflare Worker environment, WebSocketPair is provided globally
    const pair = new WebSocketPair();
    const clientWs = pair[0];
    const serverWs = pair[1];

    const connectionId = crypto.randomUUID();
    const attachment: WsAttachment = {
      connectionId,
      playerId,
      displayName,
      isAnonymous,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId,
    };

    // Accept WebSocket via Hibernation API with tag index by playerId
    this.state.acceptWebSocket(serverWs, [playerId, connectionId]);
    serverWs.serializeAttachment(attachment);

    await this.getOrInitRoomMeta(matchId, playerId);

    // Send initial CONNECTED confirmation to this client
    const connectedMsg = createServerMessage<ConnectedMessage>('CONNECTED', {
      connectionId,
      playerId,
      displayName,
      isAnonymous,
      serverTime: Date.now(),
      heartbeatIntervalMs: 15000,
    });
    serverWs.send(JSON.stringify(connectedMsg));

    return new Response(null, {
      status: 101,
      // @ts-expect-error - Cloudflare Workers ResponseInit accepts webSocket
      webSocket: clientWs,
    });
  }

  /**
   * Hibernation API: Handles incoming WebSocket messages
   */
  async webSocketMessage(ws: CloudflareWebSocket, message: string | ArrayBuffer): Promise<void> {
    const rawText = typeof message === 'string' ? message : new TextDecoder().decode(message);
    const attachment = ws.deserializeAttachment() as WsAttachment | null;

    // 1. Parse and validate JSON envelope
    const validation = parseAndValidateRawMessage(rawText);
    if (!validation.success || !validation.data) {
      const errorMsg = createErrorResponse(
        CURRENT_PROTOCOL_VERSION,
        validation.error || {
          code: WsErrorCode.SCHEMA_VALIDATION_FAILED,
          message: 'Invalid message structure.',
        }
      );
      ws.send(JSON.stringify(errorMsg));
      return;
    }

    const clientMsg = validation.data;
    const meta = await this.getOrInitRoomMeta(attachment?.matchId || 'default-match');

    // 2. Dispatch by message type
    switch (clientMsg.type) {
      case 'PING': {
        if (attachment) {
          attachment.lastPingAt = Date.now();
          ws.serializeAttachment(attachment);
        }
        const pong = createServerMessage<PongMessage>(
          'PONG',
          {
            clientTime: clientMsg.payload.clientTime,
            serverTime: Date.now(),
          },
          clientMsg.messageId
        );
        ws.send(JSON.stringify(pong));
        break;
      }

      case 'CONNECT': {
        const connectedMsg = createServerMessage<ConnectedMessage>(
          'CONNECTED',
          {
            connectionId: attachment?.connectionId || crypto.randomUUID(),
            playerId: attachment?.playerId || 'guest',
            displayName: attachment?.displayName || 'Player',
            isAnonymous: attachment?.isAnonymous || false,
            serverTime: Date.now(),
            heartbeatIntervalMs: 15000,
          },
          clientMsg.messageId
        );
        ws.send(JSON.stringify(connectedMsg));
        break;
      }

      case 'JOIN_MATCH': {
        const pId = attachment?.playerId || 'unknown';
        const dName = clientMsg.payload.displayName || attachment?.displayName || 'Player';

        if (!meta.joinedPlayerIds.includes(pId)) {
          meta.joinedPlayerIds.push(pId);
          await this.state.storage.put('room_metadata', meta);
        }

        const allSockets = this.state.getWebSockets();

        // 1. Confirm to the joining player
        const joinedAck = createServerMessage<MatchJoinedMessage>(
          'MATCH_JOINED',
          {
            matchId: meta.matchId,
            playerId: pId,
            isHost: meta.hostPlayerId === pId,
            roomCapacity: meta.maxCapacity,
            connectedPlayerIds: meta.joinedPlayerIds,
          },
          clientMsg.messageId
        );
        ws.send(JSON.stringify(joinedAck));

        // 2. Broadcast PLAYER_JOINED to all other sockets in this match room
        const broadcastJoined = createServerMessage<PlayerJoinedMessage>(
          'PLAYER_JOINED',
          {
            matchId: meta.matchId,
            playerId: pId,
            displayName: dName,
            avatarId: clientMsg.payload.avatarId,
            colorHex: clientMsg.payload.colorHex,
            isBot: false,
            totalConnected: allSockets.length,
          },
          clientMsg.messageId
        );
        this.broadcast(broadcastJoined, ws);
        break;
      }

      case 'LEAVE_MATCH': {
        const pId = attachment?.playerId || 'unknown';
        meta.joinedPlayerIds = meta.joinedPlayerIds.filter((id) => id !== pId);
        await this.state.storage.put('room_metadata', meta);

        const leftBroadcast = createServerMessage<PlayerLeftMessage>(
          'PLAYER_LEFT',
          {
            matchId: meta.matchId,
            playerId: pId,
            reason: clientMsg.payload.reason || 'Player voluntarily left the match.',
            totalConnected: Math.max(0, this.state.getWebSockets().length - 1),
          },
          clientMsg.messageId
        );
        this.broadcast(leftBroadcast, ws);

        try {
          ws.close(1000, 'Left match');
        } catch {
          // Socket already closed
        }
        break;
      }

      case 'RECONNECT': {
        const pId = clientMsg.payload.playerId || attachment?.playerId || 'unknown';
        const syncMsg = createServerMessage(
          'STATE_SYNC',
          {
            matchId: meta.matchId,
            stateVersion: 1,
            syncType: 'FULL' as const,
            stateSnapshot: {
              matchId: meta.matchId,
              status: 'in_progress',
              joinedPlayerIds: meta.joinedPlayerIds,
              reconnectedPlayerId: pId,
            },
          },
          clientMsg.messageId
        );
        ws.send(JSON.stringify(syncMsg));
        break;
      }

      case 'GAME_COMMAND': {
        // Transport-level relay & verification:
        // Gameplay logic remains server-authoritative and will be connected in Phase 2
        const cmd = clientMsg.payload;
        const ackEvent = createServerMessage(
          'GAME_EVENT',
          {
            matchId: cmd.matchId,
            eventType: `COMMAND_RECEIVED:${cmd.command}`,
            actingPlayerId: cmd.playerId,
            stateVersion: cmd.expectedStateVersion || 1,
            summary: `Command ${cmd.command} acknowledged by match room.`,
            data: {
              requestId: cmd.requestId,
              command: cmd.command,
              args: cmd.args,
            },
          },
          clientMsg.messageId
        );
        this.broadcast(ackEvent);
        break;
      }
    }
  }

  /**
   * Hibernation API: Handles WebSocket connection close
   */
  async webSocketClose(
    ws: CloudflareWebSocket,
    code: number,
    reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const attachment = ws.deserializeAttachment() as WsAttachment | null;
    if (!attachment) return;

    const remainingSockets = this.state.getWebSockets();
    const meta = await this.getOrInitRoomMeta(attachment.matchId);

    const playerSockets = this.state.getWebSockets(attachment.playerId);
    // If player has no remaining active sockets in this room
    if (playerSockets.length <= 1) {
      const leftBroadcast = createServerMessage<PlayerLeftMessage>('PLAYER_LEFT', {
        matchId: attachment.matchId,
        playerId: attachment.playerId,
        reason: reason || `Disconnected (code ${code})`,
        totalConnected: remainingSockets.length,
      });
      this.broadcast(leftBroadcast, ws);
    }
  }

  /**
   * Hibernation API: Handles WebSocket errors
   */
  async webSocketError(ws: CloudflareWebSocket, error: unknown): Promise<void> {
    const errorPayload = createErrorResponse(CURRENT_PROTOCOL_VERSION, {
      code: WsErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'WebSocket transport error.',
    });
    try {
      ws.send(JSON.stringify(errorPayload));
    } catch {
      // Socket may already be dead
    }
  }

  /**
   * Broadcasts a message to all connected clients in this Durable Object room
   */
  public broadcast(message: ServerMessage, excludeWs?: CloudflareWebSocket): void {
    const serialized = JSON.stringify(message);
    const sockets = this.state.getWebSockets();
    for (const socket of sockets) {
      if (socket !== excludeWs) {
        try {
          socket.send(serialized);
        } catch {
          // Socket send failure is handled on close
        }
      }
    }
  }

  /**
   * Sends a targeted message to all active sockets for a specific player ID
   */
  public sendToPlayer(playerId: string, message: ServerMessage): void {
    const serialized = JSON.stringify(message);
    const sockets = this.state.getWebSockets(playerId);
    for (const socket of sockets) {
      try {
        socket.send(serialized);
      } catch {
        // Ignore dead socket
      }
    }
  }
}
