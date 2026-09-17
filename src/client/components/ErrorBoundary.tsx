import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Investor Wars Crash Guard] Caught render exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('bigmomma_active_match_id');
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    window.location.href = '/';
  };

  private handleResetAll = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#030712] text-slate-100 flex items-center justify-center p-4 z-[99999] overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900/90 border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-100">
                Application Recovery
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Investor Wars encountered an unexpected rendering error. You can reload or reset local game state without losing your cloud progress.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left font-mono text-xs text-rose-300 max-h-36 overflow-y-auto">
                <p className="font-semibold break-words">{this.state.error.message || String(this.state.error)}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Game</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Lobby</span>
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleResetAll}
              className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Storage Cache & Reset</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
