import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  Users,
  Bot,
  User,
  Copy,
  Check,
  Play,
  LogOut,
  UserPlus,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const {
    match,
    players,
    startMatch,
    addBotPlayer,
    fillRemainingWithBots,
    leaveMatch,
    isActionPending,
    matchError,
    connectionStatus,
  } = useGame();
  const { navigate } = useNavigation();

  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-navigate to gameplay once match has started
  useEffect(() => {
    if (match?.status === 'in_progress') {
      navigate('GAMEPLAY');
    }
  }, [match?.status, navigate]);

  const accessCode =
    match?.accessCode ||
    (match as any)?.accessCode ||
    match?.id ||
    'BM-WAR';

  const handleCopyCode = () => {
    if (navigator.clipboard && accessCode) {
      navigator.clipboard.writeText(accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleStartGame = async () => {
    try {
      await startMatch();
      navigate('GAMEPLAY');
    } catch (err) {
      console.warn('Start match error:', err);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await leaveMatch();
      navigate('HOME');
    } catch (err) {
      console.warn('Leave lobby error:', err);
      navigate('HOME');
    }
  };

  const totalSeats = 4;
  const occupiedSeats = players.length;
  const emptySeats = Math.max(0, totalSeats - occupiedSeats);

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Header with Title and Room Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-6">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Multiplayer Room Active</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              INVESTORS' LOBBY
            </h1>
          </div>

          {/* Access Code Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 border border-slate-800 rounded-2xl p-2 px-3">
            <div>
              <div className="text-[9px] uppercase font-mono text-slate-500 tracking-wider">
                Room Code
              </div>
              <div className="text-sm font-mono font-black text-cyan-400 tracking-widest">
                {accessCode}
              </div>
            </div>
            <button
              id="copy-lobby-code-btn"
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Copy Room Code to Clipboard"
            >
              {copiedCode ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {matchError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono text-left">
            {matchError}
          </div>
        )}

        {/* Players List (4 Seats) */}
        <div className="space-y-3 mb-6 text-left">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-3.5 bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700/60">
                {p.isBot ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <User className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-2">
                  <span>{p.displayName}</span>
                  {idx === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono uppercase">
                      Host
                    </span>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 flex items-center gap-2">
                  <span>{p.isBot ? 'AI Bot' : 'Human Player'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>{p.connected !== false ? 'Connected' : 'Reconnecting'}</span>
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-bold px-3 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded-full uppercase tracking-wider">
                READY
              </div>
            </div>
          ))}

          {/* Empty Seats with Quick Bot Add */}
          {Array.from({ length: emptySeats }).map((_, i) => (
            <div
              key={`empty_${i}`}
              className="flex items-center justify-between border border-dashed border-slate-800/90 p-3 rounded-2xl text-slate-500 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>Seat {occupiedSeats + i + 1}: Waiting for investor...</span>
              </div>

              <button
                onClick={() => addBotPlayer(`AI Partner ${occupiedSeats + i + 1}`)}
                disabled={isActionPending}
                className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                + Add Bot
              </button>
            </div>
          ))}
        </div>

        {/* Quick Action Bar: Fill remaining with bots */}
        {emptySeats > 0 && (
          <div className="mb-6 p-3 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Want to start without waiting?</span>
            <button
              id="fill-bots-lobby-btn"
              onClick={() => fillRemainingWithBots()}
              disabled={isActionPending}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Fill All With Bots</span>
            </button>
          </div>
        )}

        {/* Launch / Start Match Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            id="leave-lobby-btn"
            onClick={handleLeaveLobby}
            disabled={isActionPending}
            className="w-full sm:w-1/3 py-3.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>

          <button
            id="start-match-lobby-btn"
            onClick={handleStartGame}
            disabled={isActionPending || players.length < 2}
            className="w-full sm:w-2/3 py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-emerald-400/20"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {players.length < 2
                ? 'Need at least 2 players to start'
                : 'Start War (Begin Match)'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

