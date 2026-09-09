/**
 * Production Idempotency Foundation
 * Tracks ActionRequests, detects duplicate/replay requests, and caches execution results.
 */

import { ActionRequest, IdempotencyRecord, IdempotencyStatus } from '../types/request';
import { GameError } from '../types/error';

export interface IdempotencyStore {
  get(requestId: string): Promise<IdempotencyRecord | null>;
  set(record: IdempotencyRecord): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  public async get(requestId: string): Promise<IdempotencyRecord | null> {
    const record = this.records.get(requestId);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.records.delete(requestId);
      return null;
    }
    return record;
  }

  public async set(record: IdempotencyRecord): Promise<void> {
    this.records.set(record.requestId, record);
  }

  public clear(): void {
    this.records.clear();
  }
}

export class IdempotencyManager {
  private store: IdempotencyStore;
  private readonly ttlMs: number;

  constructor(store?: IdempotencyStore, ttlMs: number = 5 * 60 * 1000) {
    this.store = store || new InMemoryIdempotencyStore();
    this.ttlMs = ttlMs;
  }

  /**
   * Check if a request has already been seen or is currently in flight.
   * Returns existing record if duplicate, or null if fresh.
   */
  public async checkDuplicate(requestId: string): Promise<IdempotencyRecord | null> {
    return this.store.get(requestId);
  }

  /**
   * Mark a request as currently processing. Throws if already in processing or completed.
   */
  public async acquireLock(request: ActionRequest): Promise<void> {
    const existing = await this.store.get(request.requestId);
    if (existing) {
      if (existing.status === 'processing') {
        throw new GameError({
          errorCode: 'DUPLICATE_REQUEST_IN_FLIGHT',
          message: `Request ${request.requestId} is already being processed.`,
          requestId: request.requestId,
          gameId: request.gameId,
          action: request.actionType,
        });
      }
      throw new GameError({
        errorCode: 'DUPLICATE_REQUEST_ALREADY_COMPLETED',
        message: `Request ${request.requestId} was already executed.`,
        requestId: request.requestId,
        gameId: request.gameId,
        action: request.actionType,
      });
    }

    const record: IdempotencyRecord = {
      requestId: request.requestId,
      gameId: request.gameId,
      playerId: request.playerId,
      actionType: request.actionType,
      status: 'processing',
      processedAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs,
    };

    await this.store.set(record);
  }

  /**
   * Finalize an idempotency record upon successful mutation.
   */
  public async markCompleted<TResult>(
    requestId: string,
    result: TResult
  ): Promise<void> {
    const existing = await this.store.get(requestId);
    if (existing) {
      existing.status = 'completed';
      existing.result = result;
      await this.store.set(existing);
    }
  }

  /**
   * Mark a request as failed so that retry or error reporting is clear.
   */
  public async markFailed(requestId: string, errorMessage: string): Promise<void> {
    const existing = await this.store.get(requestId);
    if (existing) {
      existing.status = 'failed';
      existing.error = errorMessage;
      await this.store.set(existing);
    }
  }
}

export const defaultIdempotencyManager = new IdempotencyManager();
