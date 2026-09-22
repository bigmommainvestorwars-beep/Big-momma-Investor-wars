import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Loader2, X, Sparkles, ShieldCheck } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export const MatchmakingQueueOverlay: React.FC = () => {
  const { matchmakingQueueState, queueTimeSeconds, cancelQuickMatchQueue } = useGame();

  if (matchmakingQueueState === 'idle') return null;

  const minutes = Math.floor(queueTimeSeconds / 60);
  const seconds = queueTimeSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <AnimatePresence>
      <div
        id="matchmaking-queue-backdrop"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          id="matchmaking-queue-card"
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-slate-900/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Animated background ambient glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close / Cancel Button */}
          {matchmakingQueueState === 'searching' && (
            <button
              id="cancel-matchmaking-queue-btn"
              onClick={cancelQuickMatchQueue}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700/60"
              title="Cancel Matchmaking"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Animated Radar Pulse / Status Icon */}
          <div className="relative mb-6 mt-2">
            <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 flex items-center justify-center relative">
              <motion.div
                animate={{
                  scale: [1, 1.45, 1],
                  opacity: [0.6, 0.1, 0.6],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
              />
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: 'linear',
                }}
                className="absolute inset-2 rounded-full border-t-2 border-r-2 border-cyan-400 opacity-70"
              />
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center">
                {matchmakingQueueState === 'matched' || matchmakingQueueState === 'joining' ? (
                  <Sparkles className="w-8 h-8 text-emerald-400 animate-bounce" />
                ) : (
                  <Users className="w-8 h-8 text-emerald-400" />
                )}
              </div>
            </div>
          </div>

          {/* Status Text */}
          <div className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {matchmakingQueueState === 'searching' && 'SEARCHING FOR INVESTORS'}
            {matchmakingQueueState === 'matched' && 'MATCH FOUND!'}
            {matchmakingQueueState === 'joining' && 'CONNECTING TO ROOM...'}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
            {matchmakingQueueState === 'searching'
              ? 'Quick-Match Queue'
              : 'Room Allocated'}
          </h2>

          <p className="text-xs text-slate-400 max-w-xs mb-6 font-mono">
            {matchmakingQueueState === 'searching' &&
              'Evaluating open lobbies across standard ƁM server partitions...'}
            {matchmakingQueueState === 'matched' &&
              'Synchronizing player IDs with Authoritative Server Engine...'}
            {matchmakingQueueState === 'joining' &&
              'Entering lobby and initializing real-time subscriptions...'}
          </p>

          {/* Queue Timer display */}
          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-around">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Queue Time</div>
              <div className="text-2xl font-mono font-black text-emerald-400">{formattedTime}</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Lobby Format</div>
              <div className="text-sm font-black text-slate-200">4-Player Free-For-All</div>
            </div>
          </div>

          {/* Bottom Actions */}
          {matchmakingQueueState === 'searching' ? (
            <button
              id="cancel-queue-action-btn"
              onClick={cancelQuickMatchQueue}
              className="w-full py-3.5 px-6 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancel Matchmaking
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Launching session...</span>
            </div>
          )}

          {/* Security & Reliability Footnote */}
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Authoritative Roll & State Verification Active</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
