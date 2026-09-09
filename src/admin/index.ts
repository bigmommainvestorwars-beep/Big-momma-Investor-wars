/**
 * Production Admin Dashboard Architectural Boundary
 * Defines administration contracts, telemetry inspection shapes, and audit structures.
 * Functional gameplay admin tools are deferred to their dedicated production step.
 */

export interface SystemHealthReport {
  environment: string;
  firebaseConfigured: boolean;
  activeGamesCount: number;
  unresolvedErrorsCount: number;
  timestamp: number;
}

export interface AdminAuditAction {
  id: string;
  adminUserId: string;
  targetGameId?: string;
  action: string;
  reason: string;
  timestamp: number;
}

export interface IAdminDashboardService {
  getSystemHealth(): Promise<SystemHealthReport>;
}
