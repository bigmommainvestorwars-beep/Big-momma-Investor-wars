/**
 * Production TypeScript Foundation: ActionRequest & Idempotency Contracts
 */

export interface ActionRequest<TPayload = Record<string, unknown>> {
  requestId: string; // Unique client idempotency key (UUID v4)
  gameId: string; // Target game ID
  playerId: string; // Calling player ID
  actionType: string; // e.g. 'ROLL_DICE', 'BUY_PROPERTY', 'BID_AUCTION'
  payload: TPayload; // Strongly typed payload per action type
  clientTimestamp: number; // Client time of request
  expectedStateVersion?: number; // Optimistic concurrency check
  clientVersion?: string; // Client app version
}

export type IdempotencyStatus = 'processing' | 'completed' | 'failed';

export interface IdempotencyRecord<TResult = unknown> {
  requestId: string;
  gameId: string;
  playerId: string;
  actionType: string;
  status: IdempotencyStatus;
  result?: TResult;
  error?: string;
  processedAt: number;
  expiresAt: number;
}
