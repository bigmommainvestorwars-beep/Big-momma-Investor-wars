import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  Sparkles,
  Zap,
  Pause,
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
  } = useGame();
  const { navigate } = useNavigation();

  const [copiedCode, setCopiedCode] = useState(false);
  const [autoFillCountdown, setAutoFillCountdown] = useState<number | null>(3);
  const [autoFillPaused, setAutoFillPaused] = useState<boolean>(false);
  const autoFillingRef = useRef<boolean>(false);

  // Auto-navigate to gameplay once match has started
  useEffect(() => {
    if (match?.status === 'in_progress') {
      navigate('GAMEPLAY');
    }
  }, [match?.status, navigate]);

  const totalSeats = 4;
  const occupiedSeats = players.length;
  const emptySeats = Math.max(0, totalSeats - occupiedSeats);

  // Auto-fill bots countdown timer
  useEffect(() => {
    if (emptySeats === 0 || autoFillPaused || match?.status !== 'waiting_for_players') {
      setAutoFillCountdown(null);
      return;
    }

    if (autoFillCountdown === null) {
      setAutoFillCountdown(3);
      return;
    }

    if (autoFillCountdown <= 0) {
      if (!autoFillingRef.current && !isActionPending) {
        autoFillingRef.current = true;
        fillRemainingWithBots().finally(() => {
          autoFillingRef.current = false;
        });
      }
      return;
    }

    const timer = setTimeout(() => {
      setAutoFillCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [emptySeats, autoFillCountdown, autoFillPaused, match?.status, isActionPending, fillRemainingWithBots]);

  const accessCode =
    (match as any)?.accessCode ||
    (match?.id ? `BM-${match.id.slice(-4).toUpperCase()}` : 'BM-WAR');

  const handleCopyCode = () => {
    if (navigator.clipboard && accessCode) {
      navigator.clipboard.writeText(accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleStartGame = async () => {
    try {
      if (players.length < 2) {
        await fillRemainingWithBots();
      }
      await startMatch();
      navigate('GAMEPLAY');
    } catch (err) {
      console.warn('Start match error:', err);
    }
  };

  const handleAutoFillAndStart = async () => {
    try {
      if (emptySeats > 0) {
        await fillRemainingWithBots();
      }
      await startMatch();
      navigate('GAMEPLAY');
    } catch (err) {
      console.warn('Auto-fill and start match error:', err);
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

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Header with Title, Mode Banner, and Room Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-6">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Multiplayer & Bot Lobby Active</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              INVESTORS' LOBBY
            </h1>
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mt-0.5">
              OFFLINE BOT MODE • AUTHORITATIVE LOCAL ENGINE
            </div>
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

        {/* Auto-Fill Countdown Banner */}
        {emptySeats > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-xl bg-purple-900/50 flex items-center justify-center text-purple-300">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-purple-200">
                  {autoFillPaused
                    ? 'Auto-fill paused'
                    : autoFillCountdown !== null && autoFillCountdown > 0
                    ? `Auto-filling remaining ${emptySeats} bots in ${autoFillCountdown}s...`
                    : 'Auto-filling AI bots now...'}
                </div>
                <div className="text-[10px] text-purple-400/80 font-mono">
                  4 seats will be populated with intelligent AI investors
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoFillPaused((p) => !p)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                {autoFillPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{autoFillPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                id="auto-fill-now-btn"
                onClick={() => fillRemainingWithBots()}
                disabled={isActionPending}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/50"
              >
                <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                <span>Fill Now</span>
              </button>
            </div>
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
                  {p.isBot && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono uppercase">
                      AI Investor
                    </span>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 flex items-center gap-2">
                  <span>{p.isBot ? 'Local AI Engine' : 'Human Player'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>{p.connected !== false ? 'Ready' : 'Reconnecting'}</span>
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
                <span>Seat {occupiedSeats + i + 1}: AI Bot slot ready</span>
              </div>

              <button
                id={`add-bot-seat-${occupiedSeats + i + 1}-btn`}
                onClick={() => addBotPlayer(`AI Partner ${occupiedSeats + i + 1}`)}
                disabled={isActionPending}
                className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                + Add Bot
              </button>
            </div>
          ))}
        </div>

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

          {emptySeats > 0 ? (
            <button
              id="autofill-and-start-match-btn"
              onClick={handleAutoFillAndStart}
              disabled={isActionPending}
              className="w-full sm:w-2/3 py-3.5 bg-gradient-to-r from-purple-600 via-teal-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer border border-emerald-400/20"
            >
              <Zap className="w-4 h-4 fill-current text-yellow-300" />
              <span>Auto-Fill 4 Players & Start Match</span>
            </button>
          ) : (
            <button
              id="start-match-lobby-btn"
              onClick={handleStartGame}
              disabled={isActionPending || players.length < 2}
              className="w-full sm:w-2/3 py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-emerald-400/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start War (Begin Match)</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

