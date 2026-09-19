/**
 * Phase 1: Cloudflare WebSocket & Durable Objects Infrastructure Test Suite
 * Validates message protocol, authentication, Worker routing, and MatchRoom Durable Object logic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateRawMessage, validateIncomingMessage } from '../../cloudflare/src/protocol/schemas';
import { WsErrorCode } from '../../cloudflare/src/protocol/errors';
import { verifyFirebaseToken } from '../../cloudflare/src/auth/firebaseToken';
import { MatchRoom } from '../../cloudflare/src/matchRoom';
import worker from '../../cloudflare/src/index';
import {
  Env,
  WsAttachment,
  DurableObjectState,
  DurableObjectId,
  DurableObjectStub,
  DurableObjectNamespace,
  CloudflareWebSocket,
} from '../../cloudflare/src/types/env';
import {
  CURRENT_PROTOCOL_VERSION,
  createServerMessage,
  ServerMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
} from '../../cloudflare/src/protocol/messages';

// ---------------------------------------------------------------------------
// Mock In-Memory Durable Object Runtime for Unit Testing
// ---------------------------------------------------------------------------

class MockWebSocket {
  public sentMessages: string[] = [];
  public closed = false;
  public closeCode?: number;
  public closeReason?: string;
  public attachment: WsAttachment | null = null;
  public tags: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = '') {
    this.closed = true;
    this.closeCode = code;
    this.closeReason = reason;
  }

  serializeAttachment(attachment: WsAttachment) {
    this.attachment = attachment;
  }

  deserializeAttachment(): WsAttachment | null {
    return this.attachment;
  }

  getLastParsedMessage<T = ServerMessage>(): T | null {
    if (this.sentMessages.length === 0) return null;
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]) as T;
  }
}

class MockDurableObjectStorage {
  private data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }
}

class MockDurableObjectState {
  public storage = new MockDurableObjectStorage();
  public sockets: MockWebSocket[] = [];

  acceptWebSocket(ws: WebSocket | CloudflareWebSocket, tags: string[] = []) {
    const mockWs = ws as unknown as MockWebSocket;
    mockWs.tags = tags;
    if (!this.sockets.includes(mockWs)) {
      this.sockets.push(mockWs);
    }
  }

  getWebSockets(tag?: string): CloudflareWebSocket[] {
    const active = this.sockets.filter((s) => !s.closed);
    if (!tag) return active as unknown as CloudflareWebSocket[];
    return active.filter((s) => s.tags.includes(tag)) as unknown as CloudflareWebSocket[];
  }
}

function createMockEnv(roomInstances = new Map<string, MatchRoom>()): Env {
  return {
    FIREBASE_PROJECT_ID: 'bigmomma-investor-wars',
    PROTOCOL_VERSION: '1.0.0',
    ENVIRONMENT: 'test',
    MATCH_ROOMS: {
      idFromName(name: string) {
        return { name, toString: () => name } as unknown as DurableObjectId;
      },
      idFromString(id: string) {
        return { name: id, toString: () => id } as unknown as DurableObjectId;
      },
      newUniqueId() {
        const id = crypto.randomUUID();
        return { name: id, toString: () => id } as unknown as DurableObjectId;
      },
      get(id: DurableObjectId) {
        const key = id.toString();
        if (!roomInstances.has(key)) {
          const state = new MockDurableObjectState() as unknown as DurableObjectState;
          const room = new MatchRoom(state, {} as Env);
          roomInstances.set(key, room);
        }
        const instance = roomInstances.get(key)!;
        return {
          id,
          fetch: (req: Request | string) => {
            const request = typeof req === 'string' ? new Request(req) : req;
            return instance.fetch(request);
          },
        } as DurableObjectStub;
      },
    } as DurableObjectNamespace,
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

test('Phase 1: Cloudflare WebSocket & Durable Objects Infrastructure Audit', async (t) => {
  // 1. Worker rejects non-WebSocket requests
  await t.test('1. Worker rejects non-WebSocket HTTP request with 426 Upgrade Required', async () => {
    const env = createMockEnv();
    const req = new Request('https://worker.local/ws/match/match_123', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test_token_player1',
      },
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 426);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, WsErrorCode.INVALID_UPGRADE);
  });

  // 2. Worker rejects missing authentication
  await t.test('2. Worker rejects unauthenticated connection requests with 401 Unauthorized', async () => {
    const env = createMockEnv();
    const req = new Request('https://worker.local/ws/match/match_123', {
      method: 'GET',
      headers: {
        Upgrade: 'websocket',
      },
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, WsErrorCode.UNAUTHORIZED);
  });

  // 3. Worker rejects malformed matchId
  await t.test('3. Worker rejects malformed matchId with 400 Bad Request', async () => {
    const env = createMockEnv();
    const req = new Request('https://worker.local/ws/match/!invalid$$match!!', {
      method: 'GET',
      headers: {
        Upgrade: 'websocket',
        Authorization: 'Bearer test_token_player1',
      },
    });

    const res = await worker.fetch(req, env);
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, WsErrorCode.INVALID_MATCH_ID);
  });

  // 4. Protocol parsing: Malformed JSON is rejected
  await t.test('4. Protocol Parser: Malformed JSON is rejected with MALFORMED_JSON', () => {
    const result = parseAndValidateRawMessage('{ invalid json payload: ');
    assert.equal(result.success, false);
    assert.equal(result.error?.code, WsErrorCode.MALFORMED_JSON);
  });

  // 5. Protocol parsing: Unknown message type is rejected
  await t.test('5. Protocol Parser: Unknown message type is rejected with UNKNOWN_MESSAGE_TYPE', () => {
    const payload = {
      protocolVersion: '1.0.0',
      messageId: 'msg_001',
      timestamp: Date.now(),
      type: 'INVALID_UNKNOWN_TYPE',
      payload: {},
    };
    const result = validateIncomingMessage(payload);
    assert.equal(result.success, false);
    assert.equal(result.error?.code, WsErrorCode.UNKNOWN_MESSAGE_TYPE);
  });

  // 6. Protocol parsing: Invalid protocol message is rejected
  await t.test('6. Protocol Parser: Invalid envelope or missing required payload is rejected', () => {
    const missingVersion = {
      messageId: 'msg_002',
      timestamp: Date.now(),
      type: 'PING',
      payload: { clientTime: Date.now() },
    };
    const res1 = validateIncomingMessage(missingVersion);
    assert.equal(res1.success, false);
    assert.equal(res1.error?.code, WsErrorCode.INVALID_PROTOCOL_VERSION);

    const invalidGameCommand = {
      protocolVersion: '1.0.0',
      messageId: 'msg_003',
      timestamp: Date.now(),
      type: 'GAME_COMMAND',
      payload: {
        // missing requestId, matchId, playerId, command
        someField: 123,
      },
    };
    const res2 = validateIncomingMessage(invalidGameCommand);
    assert.equal(res2.success, false);
    assert.equal(res2.error?.code, WsErrorCode.SCHEMA_VALIDATION_FAILED);
  });

  // 7. Token Verification: Valid, Mock and Anonymous tokens
  await t.test('7. Auth Verifier: Decodes identity correctly and enforces project validation', async () => {
    const validMock = await verifyFirebaseToken('test_token_alice_456');
    assert.equal(validMock.valid, true);
    assert.equal(validMock.user?.userId, 'alice_456');
    assert.equal(validMock.user?.isAnonymous, false);

    const empty = await verifyFirebaseToken('');
    assert.equal(empty.valid, false);

    const malformed = await verifyFirebaseToken('not.a.jwt.token');
    assert.equal(malformed.valid, false);
  });

  // 8. MatchRoom DO: Two clients connect to same match & receive CONNECTED
  await t.test('8. MatchRoom DO: Two clients connect and receive initial CONNECTED handshake', async () => {
    const mockState = new MockDurableObjectState();
    const room = new MatchRoom(mockState as unknown as DurableObjectState, {} as Env);

    const clientWsA = new MockWebSocket();
    const clientWsB = new MockWebSocket();

    mockState.acceptWebSocket(clientWsA as unknown as CloudflareWebSocket, ['player_a']);
    clientWsA.serializeAttachment({
      connectionId: 'conn_a',
      playerId: 'player_a',
      displayName: 'Player A',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_1',
    });

    mockState.acceptWebSocket(clientWsB as unknown as CloudflareWebSocket, ['player_b']);
    clientWsB.serializeAttachment({
      connectionId: 'conn_b',
      playerId: 'player_b',
      displayName: 'Player B',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_1',
    });

    assert.equal(mockState.getWebSockets().length, 2);
  });

  // 9. MatchRoom DO: Player join broadcast produces PLAYER_JOINED to other clients
  await t.test('9. MatchRoom DO: Player join produces MATCH_JOINED for joiner and PLAYER_JOINED broadcast', async () => {
    const mockState = new MockDurableObjectState();
    const room = new MatchRoom(mockState as unknown as DurableObjectState, {} as Env);

    const clientWsA = new MockWebSocket();
    const clientWsB = new MockWebSocket();

    mockState.acceptWebSocket(clientWsA as unknown as CloudflareWebSocket, ['player_a']);
    clientWsA.serializeAttachment({
      connectionId: 'conn_a',
      playerId: 'player_a',
      displayName: 'Alice',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_2',
    });

    mockState.acceptWebSocket(clientWsB as unknown as CloudflareWebSocket, ['player_b']);
    clientWsB.serializeAttachment({
      connectionId: 'conn_b',
      playerId: 'player_b',
      displayName: 'Bob',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_2',
    });

    // Alice joins match
    await room.webSocketMessage(
      clientWsA as unknown as CloudflareWebSocket,
      JSON.stringify({
        protocolVersion: CURRENT_PROTOCOL_VERSION,
        messageId: 'msg_join_1',
        timestamp: Date.now(),
        type: 'JOIN_MATCH',
        payload: {
          matchId: 'match_cf_2',
          displayName: 'Alice',
        },
      })
    );

    const aliceLastMsg = clientWsA.getLastParsedMessage<ServerMessage>();
    assert.equal(aliceLastMsg?.type, 'MATCH_JOINED');

    // Bob joins match
    await room.webSocketMessage(
      clientWsB as unknown as CloudflareWebSocket,
      JSON.stringify({
        protocolVersion: CURRENT_PROTOCOL_VERSION,
        messageId: 'msg_join_2',
        timestamp: Date.now(),
        type: 'JOIN_MATCH',
        payload: {
          matchId: 'match_cf_2',
          displayName: 'Bob',
        },
      })
    );

    // Alice should receive PLAYER_JOINED about Bob
    const aliceReceived = clientWsA.sentMessages.map((m) => JSON.parse(m) as ServerMessage);
    const bobJoinedEvent = aliceReceived.find(
      (m) => m.type === 'PLAYER_JOINED' && (m as PlayerJoinedMessage).payload.playerId === 'player_b'
    );
    assert.ok(bobJoinedEvent, 'Alice must receive PLAYER_JOINED broadcast when Bob joins');
  });

  // 10. MatchRoom DO: Broadcast reaches all clients, targeted reaches only intended player
  await t.test('10. MatchRoom DO: Broadcast reaches all clients and targeted delivery reaches only recipient', async () => {
    const mockState = new MockDurableObjectState();
    const room = new MatchRoom(mockState as unknown as DurableObjectState, {} as Env);

    const clientWsA = new MockWebSocket();
    const clientWsB = new MockWebSocket();

    mockState.acceptWebSocket(clientWsA as unknown as CloudflareWebSocket, ['player_a']);
    mockState.acceptWebSocket(clientWsB as unknown as CloudflareWebSocket, ['player_b']);

    // Targeted message to Alice only
    const targetedMsg = createServerMessage('GAME_EVENT', {
      matchId: 'match_cf_3',
      eventType: 'SECRET_DEAL',
      stateVersion: 1,
      summary: 'Targeted private alert for Alice.',
    });
    room.sendToPlayer('player_a', targetedMsg);

    assert.equal(clientWsA.sentMessages.length, 1);
    assert.equal(clientWsB.sentMessages.length, 0);

    // Broadcast message to everyone
    const broadcastMsg = createServerMessage('GAME_EVENT', {
      matchId: 'match_cf_3',
      eventType: 'GLOBAL_ANNOUNCEMENT',
      stateVersion: 2,
      summary: 'Public market event.',
    });
    room.broadcast(broadcastMsg);

    assert.equal(clientWsA.sentMessages.length, 2);
    assert.equal(clientWsB.sentMessages.length, 1);
  });

  // 11. MatchRoom DO: Player disconnect produces PLAYER_LEFT
  await t.test('11. MatchRoom DO: Player disconnect triggers PLAYER_LEFT broadcast to remaining clients', async () => {
    const mockState = new MockDurableObjectState();
    const room = new MatchRoom(mockState as unknown as DurableObjectState, {} as Env);

    const clientWsA = new MockWebSocket();
    const clientWsB = new MockWebSocket();

    mockState.acceptWebSocket(clientWsA as unknown as CloudflareWebSocket, ['player_a']);
    clientWsA.serializeAttachment({
      connectionId: 'conn_a',
      playerId: 'player_a',
      displayName: 'Alice',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_4',
    });

    mockState.acceptWebSocket(clientWsB as unknown as CloudflareWebSocket, ['player_b']);
    clientWsB.serializeAttachment({
      connectionId: 'conn_b',
      playerId: 'player_b',
      displayName: 'Bob',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_4',
    });

    // Bob disconnects / closes connection
    clientWsB.close(1001, 'Going away');
    await room.webSocketClose(clientWsB as unknown as CloudflareWebSocket, 1001, 'Going away', true);

    const aliceReceived = clientWsA.sentMessages.map((m) => JSON.parse(m) as ServerMessage);
    const bobLeftEvent = aliceReceived.find(
      (m) => m.type === 'PLAYER_LEFT' && (m as PlayerLeftMessage).payload.playerId === 'player_b'
    );
    assert.ok(bobLeftEvent, 'Alice must receive PLAYER_LEFT broadcast when Bob disconnects');
  });

  // 12. MatchRoom DO: Responds to PING with PONG
  await t.test('12. MatchRoom DO: Responds to PING with PONG containing client & server timestamps', async () => {
    const mockState = new MockDurableObjectState();
    const room = new MatchRoom(mockState as unknown as DurableObjectState, {} as Env);

    const clientWs = new MockWebSocket();
    mockState.acceptWebSocket(clientWs as unknown as CloudflareWebSocket, ['player_1']);
    clientWs.serializeAttachment({
      connectionId: 'conn_1',
      playerId: 'player_1',
      displayName: 'Player 1',
      isAnonymous: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      matchId: 'match_cf_5',
    });

    const clientTime = Date.now() - 50;
    await room.webSocketMessage(
      clientWs as unknown as CloudflareWebSocket,
      JSON.stringify({
        protocolVersion: CURRENT_PROTOCOL_VERSION,
        messageId: 'ping_001',
        timestamp: Date.now(),
        type: 'PING',
        payload: { clientTime },
      })
    );

    const lastMsg = clientWs.getLastParsedMessage<{ type: string; payload: { clientTime: number; serverTime: number } }>();
    assert.equal(lastMsg?.type, 'PONG');
    assert.equal(lastMsg?.payload.clientTime, clientTime);
    assert.ok(lastMsg?.payload.serverTime);
  });
});
