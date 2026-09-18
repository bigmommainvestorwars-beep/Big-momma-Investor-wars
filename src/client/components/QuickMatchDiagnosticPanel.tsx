/**
 * Quick Match Diagnostic Panel (Development Only)
 * Displays real-time instrumentation for Quick Match, Auth, App Check, Cloud Functions, and Firestore listeners.
 */

import React, { useEffect, useState } from 'react';
import { quickMatchDiagnosticStore, QuickMatchDiagnosticsState } from '../../services/quickMatchDiagnosticStore';
import { ENV } from '../../config/env';
import { Terminal, Shield, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export function QuickMatchDiagnosticPanel() {
  const [state, setState] = useState<QuickMatchDiagnosticsState>(quickMatchDiagnosticStore.getState());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return quickMatchDiagnosticStore.subscribe(setState);
  }, []);

  // Hide entirely in production
  if (ENV.isProduction) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-slate-900 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-lg shadow-xl flex items-center gap-2 text-xs font-mono hover:bg-slate-800 transition-colors"
        title="Open Quick Match Diagnostics"
      >
        <Terminal className="w-4 h-4" />
        <span>Quick Match Diagnostics</span>
        {state.lastErrorCode && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-slate-950/95 text-slate-100 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs overflow-hidden flex flex-col max-h-[85vh]">
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Terminal className="w-4 h-4" />
          <span>Quick Match Diagnostics (Phase 3A)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => quickMatchDiagnosticStore.reset()}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Reset Diagnostics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
          <div>
            <span className="text-slate-400">AUTH:</span>{' '}
            <span className={state.authStatus === 'OK' ? 'text-emerald-400 font-bold' : state.authStatus === 'FAIL' ? 'text-red-400 font-bold' : 'text-amber-400'}>
              {state.authStatus}
            </span>
          </div>
          <div>
            <span className="text-slate-400">APPCHECK:</span>{' '}
            <span className={state.appCheckStatus === 'OK' ? 'text-emerald-400 font-bold' : state.appCheckStatus === 'FAIL' ? 'text-red-400 font-bold' : 'text-amber-400'}>
              {state.appCheckStatus}
            </span>
          </div>
          <div>
            <span className="text-slate-400">FUNCTION:</span>{' '}
            <span className={state.functionStatus === 'OK' ? 'text-emerald-400 font-bold' : state.functionStatus === 'FAIL' ? 'text-red-400 font-bold' : 'text-amber-400'}>
              {state.functionStatus}
            </span>
          </div>
          <div>
            <span className="text-slate-400">MATCH LISTENER:</span>{' '}
            <span className={state.firestoreMatchListener === 'OK' ? 'text-emerald-400 font-bold' : state.firestoreMatchListener === 'FAIL' ? 'text-red-400 font-bold' : 'text-amber-400'}>
              {state.firestoreMatchListener}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400">PLAYER LISTENER:</span>{' '}
            <span className={state.firestorePlayerListener === 'OK' ? 'text-emerald-400 font-bold' : state.firestorePlayerListener === 'FAIL' ? 'text-red-400 font-bold' : 'text-amber-400'}>
              {state.firestorePlayerListener}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
          <div className="truncate"><span className="text-slate-400">MATCH ID:</span> {state.matchId || 'None'}</div>
          <div className="truncate"><span className="text-slate-400">PLAYER ID:</span> {state.playerId || 'None'}</div>
          <div><span className="text-slate-400">CURRENT STAGE:</span> <span className="text-cyan-400">{state.currentStage}</span></div>
          <div><span className="text-slate-400">LOBBY PLAYERS:</span> [{state.lobbyPlayers.join(', ') || 'none'}]</div>
        </div>

        {state.lastErrorCode && (
          <div className="bg-red-950/40 border border-red-900/60 p-2.5 rounded-lg space-y-1">
            <div className="text-red-400 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>LAST ERROR CODE: {state.lastErrorCode}</span>
            </div>
            <div className="text-red-300 text-[11px] break-all">{state.lastErrorMessage}</div>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider">Stages Timeline</div>
          <div className="bg-slate-900/80 p-2 rounded-lg max-h-36 overflow-y-auto space-y-1 text-[11px]">
            {state.stagesLog.length === 0 ? (
              <div className="text-slate-500 italic">No stages recorded yet. Tap Quick Match.</div>
            ) : (
              state.stagesLog.map((log, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 border-b border-slate-800/40 pb-1">
                  <span className="text-slate-200 font-medium">{log.stage}</span>
                  <span className="text-slate-500 text-[10px] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-[10px] text-amber-500/80 text-center font-sans italic">
          REAL TWO-CLIENT TEST NOT VERIFIED
        </div>
      </div>
    </div>
  );
}
