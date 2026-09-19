/**
 * Cloudflare Worker and Durable Object Environment Types
 * Provides self-contained ambient type definitions for Cloudflare Workers & Hibernation API.
 */

export interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
  name?: string;
}

export interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  put<T = unknown>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  deleteAll(): Promise<void>;
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>;
}

export interface CloudflareWebSocket extends WebSocket {
  serializeAttachment(attachment: unknown): void;
  deserializeAttachment(): unknown;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
}

export interface DurableObjectState {
  id: DurableObjectId;
  storage: DurableObjectStorage;
  waitUntil(promise: Promise<unknown>): void;
  acceptWebSocket(ws: WebSocket | CloudflareWebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): CloudflareWebSocket[];
  setWebSocketAutoResponse?(pair: unknown): void;
}

export interface DurableObjectStub {
  id: DurableObjectId;
  name?: string;
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
}

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  newUniqueId(options?: { jurisdiction?: string }): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface Env {
  MATCH_ROOMS: DurableObjectNamespace;
  FIREBASE_PROJECT_ID?: string;
  PROTOCOL_VERSION?: string;
  ENVIRONMENT?: string;
  ALLOW_ANONYMOUS_AUTH?: string;
}

export interface WsAttachment {
  connectionId: string;
  playerId: string;
  displayName: string;
  isAnonymous: boolean;
  connectedAt: number;
  lastPingAt: number;
  matchId: string;
}

export interface AuthenticatedUser {
  userId: string;
  displayName: string;
  email?: string;
  isAnonymous: boolean;
  tokenIssuedAt?: number;
  tokenExpiresAt?: number;
}
