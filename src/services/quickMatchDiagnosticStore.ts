/**
 * Quick Match Diagnostic Store
 * Production-safe diagnostic tracking for Quick Match & Multiplayer handshake flow.
 */

export interface QuickMatchDiagnosticsState {
  authStatus: 'OK' | 'FAIL' | 'PENDING';
  appCheckStatus: 'OK' | 'FAIL' | 'UNKNOWN' | 'PENDING';
  functionStatus: 'OK' | 'FAIL' | 'PENDING' | 'UNKNOWN';
  matchId: string | null;
  playerId: string | null;
  firestoreMatchListener: 'OK' | 'FAIL' | 'UNKNOWN';
  firestorePlayerListener: 'OK' | 'FAIL' | 'UNKNOWN';
  lobbyPlayers: string[];
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  currentStage: string;
  stagesLog: { stage: string; timestamp: number; details?: string }[];
}

class QuickMatchDiagnosticStore {
  private state: QuickMatchDiagnosticsState = {
    authStatus: 'PENDING',
    appCheckStatus: 'UNKNOWN',
    functionStatus: 'UNKNOWN',
    matchId: null,
    playerId: null,
    firestoreMatchListener: 'UNKNOWN',
    firestorePlayerListener: 'UNKNOWN',
    lobbyPlayers: [],
    lastErrorCode: null,
    lastErrorMessage: null,
    currentStage: 'idle',
    stagesLog: [],
  };

  private listeners: Set<(state: QuickMatchDiagnosticsState) => void> = new Set();

  public getState(): QuickMatchDiagnosticsState {
    return { ...this.state };
  }

  public subscribe(listener: (state: QuickMatchDiagnosticsState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getState();
    for (const l of this.listeners) {
      try {
        l(snapshot);
      } catch {}
    }
  }

  public recordStage(stage: string, details?: string) {
    this.state.currentStage = stage;
    this.state.stagesLog.push({ stage, timestamp: Date.now(), details });
    console.info(`[QuickMatchDiagnostic] Stage: ${stage}${details ? ` - ${details}` : ''}`);
    this.notify();
  }

  public recordError(code: string, message: string) {
    this.state.lastErrorCode = code;
    this.state.lastErrorMessage = message;
    console.error(`[QuickMatchDiagnostic] Error [${code}]: ${message}`);
    this.notify();
  }

  public update(patch: Partial<QuickMatchDiagnosticsState>) {
    Object.assign(this.state, patch);
    this.notify();
  }

  public reset() {
    this.state = {
      authStatus: 'PENDING',
      appCheckStatus: 'UNKNOWN',
      functionStatus: 'UNKNOWN',
      matchId: null,
      playerId: null,
      firestoreMatchListener: 'UNKNOWN',
      firestorePlayerListener: 'UNKNOWN',
      lobbyPlayers: [],
      lastErrorCode: null,
      lastErrorMessage: null,
      currentStage: 'reset',
      stagesLog: [],
    };
    this.notify();
  }
}

export const quickMatchDiagnosticStore = new QuickMatchDiagnosticStore();
