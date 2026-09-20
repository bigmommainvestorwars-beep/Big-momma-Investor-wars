import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { TEST_ROOM_CODE, TEST_MATCH_ID, IS_TEST_ROOM_MODE } from '../../../config/testRoomConfig';
import { useAuth } from '../../context/AuthContext';

export const LobbyScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    match,
    players,
    localRole,
    startMatch,
    addBotPlayer,
    fillRemainingWithBots,
    removeLobbyPlayer,
    resetLobby,
    leaveMatch,
    isActionPending,
    matchError,
    connectionStatus,
  } = useGame();
  const { navigate } = useNavigation();

  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-navigate to gameplay once match has started
  useEffect(() => {
    if (
      match?.status === 'active' ||
      match?.status === 'in_progress' ||
      (match?.currentPhase && match.currentPhase !== 'LOBBY')
    ) {
      console.log('[LobbyScreen] Match started. Transitioning to GAMEPLAY for user:', user?.uid);
      navigate('GAMEPLAY');
    }
  }, [match?.status, match?.currentPhase, navigate, user?.uid]);

  const accessCode =
    match?.accessCode ||
    (match as any)?.accessCode ||
    (IS_TEST_ROOM_MODE ? TEST_ROOM_CODE : match?.id || 'ROOM');

  const isHost =
    localRole === 'host' ||
    (localRole !== 'guest' && Boolean(
      (match?.hostUserId && (match.hostUserId === user?.uid || (players.length > 0 && players[0]?.id === user?.uid))) ||
      (!match?.hostUserId && players.length > 0 && players[0]?.id === user?.uid)
    ));

  const canStartMatch = players.length >= 2;

  const clientRole = isHost ? 'CLIENT A (HOST)' : 'CLIENT B (GUEST)';
  const diagnosticString = `${clientRole} userId: ${user?.uid || 'anonymous'} matchId: ${match?.id || TEST_MATCH_ID} roomCode: ${accessCode}`;

  useEffect(() => {
    if (user?.uid) {
      console.log(`[Diagnostic] ${diagnosticString}`);
    }
  }, [diagnosticString, user?.uid]);

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

  const handleResetLobby = async () => {
    try {
      await resetLobby();
    } catch (err) {
      console.warn('Reset lobby error:', err);
    }
  };

  const handleRemovePlayer = async (targetPlayerId: string) => {
    try {
      await removeLobbyPlayer(targetPlayerId);
    } catch (err) {
      console.warn('Remove player error:', err);
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

  // Authoritative Host Player (Slot 1)
  const hostPlayer = useMemo(() => {
    if (players.length > 0) {
      if (match?.hostUserId) {
        const found = players.find((p) => p.userId === match.hostUserId || p.id === match.hostUserId);
        if (found) return found;
      }
      return players[0];
    }
    return null;
  }, [players, match?.hostUserId]);

  // Authoritative Guest Player (Slot 2)
  const guestPlayer = useMemo(() => {
    if (players.length > 1) {
      return players.find((p) => hostPlayer ? (p.id !== hostPlayer.id && p.userId !== hostPlayer.userId) : false) || players[1];
    }
    return null;
  }, [players, hostPlayer]);

  const maxPlayers = 2;
  const playerCount = players.length;
  const emptySeats = Math.max(0, maxPlayers - playerCount);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-5">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Multiplayer Room Active</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-300 font-mono font-black">
                {players.length}/{maxPlayers} {players.length >= maxPlayers ? 'Ready to Start' : 'Waiting for Player 2'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              INVESTOR LOBBY ROOM CODE: {accessCode}
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

        {/* Authoritative Diagnostic Card */}
        <div
          id="authoritative-diagnostic-banner"
          className="mb-6 p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-left font-mono text-xs shadow-inner"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px]">
            <span className="font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DIAGNOSTIC TRACE
            </span>
            <span className="text-slate-500 text-[10px]">AUTH & SYNC VERIFIED</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-500">ROLE:</span>{' '}
              <span className={isHost ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                {clientRole}
              </span>
            </div>
            <div>
              <span className="text-slate-500">USER ID:</span>{' '}
              <span className="text-slate-200">{user?.uid ? `${user.uid.substring(0, 10)}...` : 'anonymous'}</span>
            </div>
            <div>
              <span className="text-slate-500">MATCH ID:</span>{' '}
              <span className="text-slate-200">{match?.id ? `${match.id.substring(0, 14)}...` : 'Initializing'}</span>
            </div>
            <div>
              <span className="text-slate-500">ROOM CODE:</span>{' '}
              <span className="text-cyan-300 font-bold">{accessCode}</span>
            </div>
          </div>
        </div>

        {/* Global Match Error Alert */}
        {matchError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs text-left font-mono">
            {matchError}
          </div>
        )}

        {/* Slots Container (Exactly 2 Players Max) */}
        <div className="space-y-3 mb-6 text-left">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider px-1">
            <span>Investor Roster ({players.length}/{maxPlayers})</span>
            <span>Status</span>
          </div>

          {/* Slot 1: Host (or Waiting for Host) */}
          {hostPlayer ? (
            <div
              id="player-slot-1"
              className="flex items-center gap-3.5 bg-slate-950/70 border border-emerald-800/50 p-3.5 rounded-2xl transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700/60">
                {hostPlayer.isBot ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <User className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-2">
                  <span>{hostPlayer.displayName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono uppercase">
                    Host (Slot 1)
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 flex items-center gap-2">
                  <span>{hostPlayer.isBot ? 'AI Bot' : 'Human Player'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>{hostPlayer.connected !== false ? 'Connected' : 'Reconnecting'}</span>
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-bold px-3 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded-full uppercase tracking-wider">
                READY
              </div>
            </div>
          ) : (
            <div
              id="player-slot-1-empty"
              className="flex items-center justify-between border border-dashed border-slate-800/90 p-3.5 rounded-2xl text-slate-500 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span>Slot 1: Initializing host...</span>
              </div>
            </div>
          )}

          {/* Slot 2: Guest Player 2 (or Empty Waiting for Player 2) */}
          {guestPlayer ? (
            <div
              id="player-slot-2"
              className="flex items-center gap-3.5 bg-slate-950/70 border border-cyan-800/50 p-3.5 rounded-2xl transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700/60">
                {guestPlayer.isBot ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <User className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-2">
                  <span>{guestPlayer.displayName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono uppercase">
                    Player 2 (Guest)
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 flex items-center gap-2">
                  <span>{guestPlayer.isBot ? 'AI Bot' : 'Human Player'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>{guestPlayer.connected !== false ? 'Connected' : 'Reconnecting'}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-bold px-3 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded-full uppercase tracking-wider">
                  READY
                </div>
                {isHost && (
                  <button
                    type="button"
                    title="Remove Player 2"
                    onClick={() => handleRemovePlayer(guestPlayer.id)}
                    disabled={isActionPending}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              id="player-slot-2-empty"
              className="flex items-center justify-between border border-dashed border-slate-800/90 p-3.5 rounded-2xl text-slate-500 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span>Slot 2: Waiting for Player 2 (Code: {accessCode})</span>
              </div>

              {isHost && (
                <button
                  id="add-bot-slot-2-btn"
                  onClick={() => addBotPlayer('AI Partner')}
                  disabled={isActionPending}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add Bot
                </button>
              )}
            </div>
          )}

          {/* Additional players if 4-player format */}
          {players.slice(2).map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-3.5 bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700/60">
                {p.isBot ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <User className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-2">
                  <span>{p.displayName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono uppercase">
                    Slot {idx + 3}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-bold px-3 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded-full uppercase tracking-wider">
                  READY
                </div>
                {isHost && (
                  <button
                    type="button"
                    title={`Remove Slot ${idx + 3}`}
                    onClick={() => handleRemovePlayer(p.id)}
                    disabled={isActionPending}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Action Bar: Fill remaining with bots or Reset Lobby */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          {emptySeats > 0 ? (
            <div className="w-full p-3 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Need an opponent now?</span>
              <button
                id="fill-bots-lobby-btn"
                onClick={() => fillRemainingWithBots()}
                disabled={isActionPending}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Fill with AI Bots</span>
              </button>
            </div>
          ) : (
            <div className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-mono font-bold">Lobby Full & Ready</span>
              {isHost && (
                <button
                  id="reset-lobby-btn"
                  onClick={handleResetLobby}
                  disabled={isActionPending}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  title="Remove guests and reset to single host"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset Lobby</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            id="leave-lobby-btn"
            onClick={handleLeaveLobby}
            disabled={isActionPending}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>

          {isHost ? (
            <button
              id="start-match-btn"
              onClick={handleStartGame}
              disabled={!canStartMatch || isActionPending}
              className={`flex-1 w-full py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                canStartMatch && !isActionPending
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-950/50 active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
              }`}
            >
              {isActionPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>STARTING MATCH...</span>
                </>
              ) : canStartMatch ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>START MATCH NOW</span>
                </>
              ) : (
                <span>WAITING FOR PLAYER 2 ({players.length}/{maxPlayers})</span>
              )}
            </button>
          ) : (
            <div className="flex-1 w-full py-4 px-6 rounded-2xl bg-slate-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>WAITING FOR HOST TO START GAME</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
