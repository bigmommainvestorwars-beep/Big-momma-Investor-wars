/**
 * Production TypeScript Foundation: Structured Logging Contracts
 */

export type LogCategory =
  | 'game_event'
  | 'transaction'
  | 'security_event'
  | 'admin_action'
  | 'system_error'
  | 'network'
  | 'state_sync';

export type LogSeverity = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  category: LogCategory;
  severity: LogSeverity;
  message: string;
  timestamp: number;
  environment: string;
  gameId?: string;
  userId?: string;
  playerId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}
