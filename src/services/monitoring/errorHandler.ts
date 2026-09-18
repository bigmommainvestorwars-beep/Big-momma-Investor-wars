/**
 * Production Error Handling Architecture
 * Centralized error recorder and monitoring dispatch interface.
 */

import { ErrorRecord, ErrorSeverity, GameError } from '../../types/error';
import { ENV } from '../../config/env';

export interface ErrorMonitoringTransport {
  captureError(record: ErrorRecord): Promise<void>;
}

class CentralErrorHandler {
  private transports: ErrorMonitoringTransport[] = [];
  private inMemoryErrors: ErrorRecord[] = [];
  private readonly maxInMemoryErrors = 100;

  /**
   * Register an external error monitoring transport (e.g. Sentry, Cloud Logging)
   */
  public registerTransport(transport: ErrorMonitoringTransport): void {
    this.transports.push(transport);
  }

  /**
   * Capture, enrich, and dispatch an application or game error.
   */
  public capture(
    error: unknown,
    context?: {
      errorCode?: string;
      severity?: ErrorSeverity;
      requestId?: string;
      userId?: string;
      gameId?: string;
      action?: string;
      details?: Record<string, unknown>;
    }
  ): ErrorRecord {
    let record: ErrorRecord;

    if (error instanceof GameError) {
      record = error.toRecord(ENV.appEnv);
      if (context?.requestId) record.requestId = context.requestId;
      if (context?.userId) record.userId = context.userId;
      if (context?.gameId) record.gameId = context.gameId;
      if (context?.action) record.action = context.action;
    } else if (error instanceof Error) {
      record = {
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        errorCode: context?.errorCode || 'UNHANDLED_EXCEPTION',
        message: error.message,
        severity: context?.severity || 'error',
        timestamp: Date.now(),
        requestId: context?.requestId,
        userId: context?.userId,
        gameId: context?.gameId,
        action: context?.action,
        details: context?.details,
        stack: error.stack,
        environment: ENV.appEnv,
      };
    } else {
      record = {
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        errorCode: context?.errorCode || 'UNKNOWN_ERROR',
        message: String(error),
        severity: context?.severity || 'error',
        timestamp: Date.now(),
        requestId: context?.requestId,
        userId: context?.userId,
        gameId: context?.gameId,
        action: context?.action,
        details: context?.details,
        environment: ENV.appEnv,
      };
    }

    // Keep bounded in-memory history for local inspection & crash diagnostics
    this.inMemoryErrors.push(record);
    if (this.inMemoryErrors.length > this.maxInMemoryErrors) {
      this.inMemoryErrors.shift();
    }

    // Console output formatted for structured logs
    if (ENV.isDevelopment) {
      console.error(`[ErrorRecord][${record.errorCode}] ${record.message}`, {
        severity: record.severity,
        gameId: record.gameId,
        requestId: record.requestId,
        action: record.action,
      });
    }

    // Dispatch to registered remote monitoring transports
    for (const transport of this.transports) {
      transport.captureError(record).catch((transportErr) => {
        console.warn('Failed to forward error to monitoring transport:', transportErr);
      });
    }

    return record;
  }

  public getRecentErrors(): readonly ErrorRecord[] {
    return this.inMemoryErrors;
  }

  public clearErrors(): void {
    this.inMemoryErrors = [];
  }
}

export const errorHandler = new CentralErrorHandler();
