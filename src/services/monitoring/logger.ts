/**
 * Production Structured Logging Pipeline
 * Supports game events, transactions, security events, administrative actions, and system errors.
 */

import { LogCategory, LogEntry, LogSeverity } from '../../types/log';
import { ENV } from '../../config/env';

export interface LogSink {
  write(entry: LogEntry): void;
}

class StructuredLogger {
  private sinks: LogSink[] = [];
  private inMemoryLogs: LogEntry[] = [];
  private readonly maxInMemoryLogs = 200;

  public registerSink(sink: LogSink): void {
    this.sinks.push(sink);
  }

  public log(
    category: LogCategory,
    severity: LogSeverity,
    message: string,
    context?: {
      gameId?: string;
      userId?: string;
      playerId?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
    }
  ): LogEntry {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      category,
      severity,
      message,
      timestamp: Date.now(),
      environment: ENV.appEnv,
      gameId: context?.gameId,
      userId: context?.userId,
      playerId: context?.playerId,
      requestId: context?.requestId,
      metadata: context?.metadata,
    };

    this.inMemoryLogs.push(entry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.shift();
    }

    // Structured terminal/console output
    const formatted = `[${new Date(entry.timestamp).toISOString()}] [${entry.severity.toUpperCase()}] [${entry.category}] ${entry.message}`;
    switch (entry.severity) {
      case 'error':
        console.error(formatted, entry.metadata || '');
        break;
      case 'warn':
        console.warn(formatted, entry.metadata || '');
        break;
      case 'debug':
        if (ENV.isDevelopment) console.debug(formatted, entry.metadata || '');
        break;
      case 'info':
      default:
        console.info(formatted, entry.metadata || '');
        break;
    }

    // Dispatch to attached sinks (Cloud Logging, Firestore audit logs, etc.)
    for (const sink of this.sinks) {
      try {
        sink.write(entry);
      } catch (err) {
        console.warn('Logging sink failure:', err);
      }
    }

    return entry;
  }

  // Specialized convenience helpers
  public gameEvent(message: string, context?: { gameId?: string; playerId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log('game_event', 'info', message, context);
  }

  public transaction(message: string, context?: { gameId?: string; playerId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log('transaction', 'info', message, context);
  }

  public securityEvent(message: string, context?: { userId?: string; gameId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log('security_event', 'warn', message, context);
  }

  public adminAction(message: string, context?: { userId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log('admin_action', 'info', message, context);
  }

  public getRecentLogs(): readonly LogEntry[] {
    return this.inMemoryLogs;
  }
}

export const logger = new StructuredLogger();
