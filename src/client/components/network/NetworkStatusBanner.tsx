import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const NetworkStatusBanner: React.FC = () => {
  const { connectionStatus, isOnline, lastReconnectedAt, reconnectHandshake, activeMatchId } = useGame();
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (lastReconnectedAt && Date.now() - lastReconnectedAt < 4000) {
      setShowRestoredToast(true);
      const timer = setTimeout(() => setShowRestoredToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [lastReconnectedAt]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      await reconnectHandshake();
    } finally {
      setIsRetrying(false);
    }
  };

  const isOffline = connectionStatus === 'offline' || !isOnline;
  const isReconnecting = Boolean(activeMatchId) && (connectionStatus === 'reconnecting' || isRetrying);

  return (
    <div id="network-status-container" className="fixed top-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            id="network-offline-banner"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full bg-rose-950/95 border-b border-rose-800/80 px-4 py-2.5 shadow-2xl backdrop-blur-md pointer-events-auto flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-rose-900/60 border border-rose-700/60 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4 text-rose-300 animate-pulse" />
              </div>
              <div className="truncate">
                <div className="text-xs font-black text-rose-200 uppercase tracking-widest flex items-center gap-2">
                  <span>Network Disconnected</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/80 text-rose-300 font-mono">Mobile Interface Lost</span>
                </div>
                <div className="text-[11px] text-rose-300/80 font-mono truncate">
                  Authoritative match state is safely paused. Awaiting Wi-Fi or Cellular handshake...
                </div>
              </div>
            </div>

            <button
              id="retry-network-connection-btn"
              onClick={handleManualRetry}
              disabled={isRetrying}
              className="shrink-0 px-3 py-1.5 bg-rose-800 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Retry Handshake</span>
            </button>
          </motion.div>
        )}

        {!isOffline && isReconnecting && (
          <motion.div
            id="network-reconnecting-banner"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full bg-amber-950/95 border-b border-amber-800/80 px-4 py-2.5 shadow-2xl backdrop-blur-md pointer-events-auto flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-900/60 border border-amber-700/60 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
              </div>
              <div className="truncate">
                <div className="text-xs font-black text-amber-200 uppercase tracking-widest flex items-center gap-2">
                  <span>Switching Network Interface</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-mono">Resilience Handshake</span>
                </div>
                <div className="text-[11px] text-amber-300/80 font-mono truncate">
                  Re-authenticating session and reconciling authoritative turn state...
                </div>
              </div>
            </div>

            <div className="shrink-0 text-xs font-mono text-amber-300/70 font-semibold uppercase tracking-wider">
              Syncing...
            </div>
          </motion.div>
        )}

        {!isOffline && !isReconnecting && showRestoredToast && (
          <motion.div
            id="network-restored-toast"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mt-2 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-2 rounded-full shadow-xl backdrop-blur-md pointer-events-auto flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Connection Restored • Session Synced</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
