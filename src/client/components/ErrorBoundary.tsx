import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Play, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndRestart = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    window.location.href = window.location.origin;
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030712] text-slate-100 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-100 mb-2">
              System Initialization Notice
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              The game encountered a transient runtime exception during startup. You can refresh or reset local game state to resume immediately.
            </p>

            {this.state.error && (
              <div className="mb-6 text-left">
                <div className="p-3 bg-black/50 border border-slate-800 rounded-xl font-mono text-xs text-rose-400 break-words max-h-32 overflow-y-auto">
                  {this.state.error.message || 'Unknown runtime error'}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleResetState}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700/50 transition-all active:scale-[0.98]"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                Attempt Direct Resume
              </button>

              <button
                type="button"
                onClick={this.handleClearAndRestart}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium text-xs rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Local Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
