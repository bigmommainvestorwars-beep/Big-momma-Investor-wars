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
      console.log('[LobbyScreen] Transitioning to GAMEPLAY for user:', user?.uid);
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

  // Host player (Slot 1)
  const hostPlayer = useMemo(() => {
    if (players.length > 0) {
      if (match?.hostUserId) {
        const found = players.find((p) => p.userId === match.hostUserId || p.id === match.hostUserId);
        if (found) return found;
      }
      return players[0];
    }
    if (isHost && user) {
      return {
        id: user.uid,
        userId: user.uid,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Investor Host'),
        isBot: false,
        connected: true,
      };
    }
    return null;
  }, [players, match?.hostUserId, isHost, user]);

  // Guest player (Slot 2)
  const guestPlayer = useMemo(() => {
    if (players.length > 1) {
      return players.find((p) => hostPlayer ? (p.id !== hostPlayer.id && p.userId !== hostPlayer.userId) : false) || players[1];
    }
    if (!isHost && user) {
      return {
        id: user.uid,
        userId: user.uid,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Guest Investor'),
        isBot: false,
        connected: true,
      };
    }
    return null;
  }, [players, hostPlayer, isHost, user]);

  const maxPlayers = 2;
  const playerCount = Math.max(players.length, (hostPlayer ? 1 : 0) + (guestPlayer ? 1 : 0));
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
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-400 tracking-wider uppercase">
                {isHost ? 'CLIENT A (Host)' : 'CLIENT B (Guest)'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-800/60 text-[10px]">
              {players.length}/2 Synced
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="text-amber-300 font-bold break-all">
              {diagnosticString}
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10px] pt-0.5">
              <span>Account: {user?.displayName || user?.email || user?.uid}</span>
              <span className={players.length >= 2 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {players.length >= 2 ? 'READY TO START' : 'WAITING FOR PLAYER 2 (PHONE B)'}
              </span>
            </div>
          </div>
        </div>

        {matchError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono text-left">
            {matchError}
          </div>
        )}

        {/* Investor Lobby Slots (2 Slots: Player 1 & Player 2) */}
        <div className="space-y-3 mb-6 text-left">
          {/* Slot 1: Player 1 (Host) */}
          {hostPlayer ? (
            <div
              id="player-slot-1"
              className="flex items-center gap-3.5 bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl transition-all"
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
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono uppercase">
                    Player 1 (Host)
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
                <span>Slot 1: Waiting for host...</span>
              </div>
            </div>
          )}

          {/* Slot 2: Player 2 (or Empty Waiting for Player 2) */}
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
                <span>Slot 2: Waiting for Player 2</span>
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

          {/* Any additional players if present */}
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
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Fill With Bot</span>
              </button>
            </div>
          ) : (
            <div />
          )}

          {isHost && players.length > 1 && (
            <button
              id="reset-lobby-btn"
              onClick={handleResetLobby}
              disabled={isActionPending}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[11px] font-mono flex items-center gap-1.5 border border-slate-800 transition-all cursor-pointer disabled:opacity-50 ml-auto shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Lobby (Host Only)</span>
            </button>
          )}
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

          {isHost ? (
            <button
              id="start-match-lobby-btn"
              onClick={handleStartGame}
              disabled={isActionPending || !canStartMatch}
              className="w-full sm:w-2/3 py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-emerald-400/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {players.length < 2
                  ? 'Waiting for Player 2 (or Fill Bot)'
                  : `Start Match (${players.length} Players Ready)`}
              </span>
            </button>
          ) : (
            <div
              id="guest-waiting-status"
              className="w-full sm:w-2/3 py-3.5 bg-slate-950 border border-cyan-800/70 text-cyan-300 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-inner"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Waiting for Host to launch match...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

