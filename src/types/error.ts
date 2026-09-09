/**
 * Production TypeScript Foundation: ErrorRecord & Error Architecture Contracts
 */

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'fatal';

export interface ErrorRecord {
  id: string;
  errorCode: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: number;
  requestId?: string;
  userId?: string;
  gameId?: string;
  action?: string; // function/action where applicable
  details?: Record<string, unknown>;
  stack?: string;
  environment: string;
}

export class GameError extends Error {
  public readonly errorCode: string;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: number;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly gameId?: string;
  public readonly action?: string;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    errorCode: string;
    message: string;
    severity?: ErrorSeverity;
    requestId?: string;
    userId?: string;
    gameId?: string;
    action?: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'GameError';
    this.errorCode = params.errorCode;
    this.severity = params.severity ?? 'error';
    this.timestamp = Date.now();
    this.requestId = params.requestId;
    this.userId = params.userId;
    this.gameId = params.gameId;
    this.action = params.action;
    this.details = params.details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GameError);
    }
  }

  public toRecord(environment: string): ErrorRecord {
    return {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      errorCode: this.errorCode,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      gameId: this.gameId,
      action: this.action,
      details: this.details,
      stack: this.stack,
      environment,
    };
  }
}
