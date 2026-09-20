import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Landmark,
  Play,
  User,
  Settings,
  LogOut,
  Zap,
  KeyRound,
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  PlusCircle,
  Bot,
  Users,
  Trophy,
  ShoppingBag,
  Shield,
  Sparkles,
  Trash2,
  SearchX,
  LogIn,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { NotificationCenterDrawer } from '../ui/NotificationCenterDrawer';
import { cloudFunctionsClient } from '../../../services/firebase/cloudFunctionsClient';

export const HomeScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, signOut } = useAuth();
  const {
    activeMatchId,
    startQuickMatchQueue,
    joinByRoomCode,
    joinMatch,
    createPrivateMatch,
    openMatches,
    connectionStatus,
    isOnline,
    reconnectHandshake,
  } = useGame();

  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [isPurgingLobbies, setIsPurgingLobbies] = useState(false);
  const [joiningLobbyId, setJoiningLobbyId] = useState<string | null>(null);
  const [lobbyJoinError, setLobbyJoinError] = useState<string | null>(null);
  const [hostingError, setHostingError] = useState<string | null>(null);
  const [quickMatchError, setQuickMatchError] = useState<string | null>(null);
  const [isQuickMatching, setIsQuickMatching] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handlePurgeAllLobbies = async () => {
    setIsPurgingLobbies(true);
    setLobbyJoinError(null);
    setQuickMatchError(null);
    try {
      await cloudFunctionsClient.deleteAllOpenLobbies();
    } catch (e) {
      console.warn('Purge lobbies notice:', e);
    } finally {
      setIsPurgingLobbies(false);
    }
  };

  const handleQuickMatch = async () => {
    setIsQuickMatching(true);
    setQuickMatchError(null);
    setCodeError(null);
    setHostingError(null);
    setLobbyJoinError(null);
    try {
      await startQuickMatchQueue();
      navigate('LOBBY');
    } catch (err: any) {
      console.warn('Quick Match queue error:', err);
      const msg = err?.message || 'Matchmaking search encountered an issue. Please try again or host a room.';
      setQuickMatchError(msg);
    } finally {
      setIsQuickMatching(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCodeInput.trim().toUpperCase();
    if (!clean) {
      setCodeError('Please enter a room access code (e.g. BM-0X9X or BM-EB7I).');
      return;
    }
    setIsJoiningCode(true);
    setCodeError(null);
    setHostingError(null);
    setLobbyJoinError(null);
    try {
      await joinByRoomCode(clean);
      navigate('LOBBY');
    } catch (err: any) {
      const msg = err?.message || `No active lobby found for room code "${clean}".`;
      setCodeError(msg);
    } finally {
      setIsJoiningCode(false);
    }
  };

  const handleDirectLobbyJoin = async (matchId: string, accessCode?: string) => {
    setJoiningLobbyId(matchId);
    setLobbyJoinError(null);
    setCodeError(null);
    setHostingError(null);
    try {
      if (accessCode) {
        await joinByRoomCode(accessCode);
      } else {
        await joinMatch(matchId);
      }
      navigate('LOBBY');
    } catch (err: any) {
      const msg = err?.message || 'Lobby is no longer available or was closed.';
      setLobbyJoinError(msg);
    } finally {
      setJoiningLobbyId(null);
    }
  };

  const handleHostPrivate = async () => {
    setIsHosting(true);
    setHostingError(null);
    setCodeError(null);
    setLobbyJoinError(null);
    try {
      await createPrivateMatch();
      navigate('LOBBY');
    } catch (err: any) {
      console.warn('Host private match error:', err);
      const msg = err?.message || 'Failed to create investor lobby. Please check network connection and try again.';
      setHostingError(msg);
    } finally {
      setIsHosting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex overflow-hidden">
      {/* Top Mobile/Desktop Notification Center & Status Header */}
      <div className="absolute top-3 right-4 z-40 flex items-center gap-2">
        <NotificationCenterDrawer />

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono shadow-sm">
          {connectionStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold hidden sm:inline">CLOUD SYNCED</span>
            </>
          ) : connectionStatus === 'reconnecting' ? (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-amber-400 font-bold">RECONNECTING...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-rose-400" />
              <button
                onClick={() => reconnectHandshake()}
                className="text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
              >
                OFFLINE (RETRY)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Left Navigation / Game Entry Panel */}
      <div className="w-full md:w-96 lg:w-[440px] bg-slate-950 border-r border-slate-800 flex flex-col h-full z-10 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-900/40">
              $
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider text-white uppercase">
                Big Momma
              </h2>
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                Investor Wars • Board Arena
              </p>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Active Match Banner (if session exists) */}
          {activeMatchId && (
            <div
              id="resume-active-match-card"
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    Active Match in Progress
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">ID: {activeMatchId.substring(0, 10)}...</span>
              </div>
              <p className="text-xs text-slate-300">
                You have an active investor game session in memory.
              </p>
              <div className="flex items-center gap-2">
                <button
                  id="resume-match-btn"
                  onClick={() => navigate('GAMEPLAY')}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Match</span>
                </button>
                <button
                  id="view-lobby-btn"
                  onClick={() => navigate('LOBBY')}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Lobby
                </button>
              </div>
            </div>
          )}

          {/* Quick Match / Multiplayer Instant Play */}
          <div className="space-y-2">
            <button
              id="quick-matchmaking-btn"
              disabled={isQuickMatching}
              onClick={handleQuickMatch}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase flex items-center justify-between transition-all shadow-xl shadow-emerald-950/50 cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                {isQuickMatching ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                )}
                <div className="text-left">
                  <div>{isQuickMatching ? 'Searching Match...' : 'Quick Matchmaking'}</div>
                  <div className="text-[10px] font-mono text-emerald-200 font-normal">
                    Instant 1v1 or 4-Player Syndicate
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-200" />
            </button>

            {quickMatchError && (
              <div
                id="quick-match-error-box"
                className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-left space-y-1.5 font-mono text-xs"
              >
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Matchmaking Notice</span>
                </div>
                <div className="text-[11px] text-rose-200/90 font-sans leading-relaxed">
                  {quickMatchError}
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickMatch}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-bold"
                  >
                    Retry Matchmaking
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickMatchError(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enter Room Access Code Accordion */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden transition-all">
            <button
              id="toggle-code-input-btn"
              onClick={() => {
                setShowCodeInput(!showCodeInput);
                setCodeError(null);
              }}
              className="w-full p-3.5 px-4 flex items-center justify-between text-left text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>Join with Room Code</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">
                {showCodeInput ? 'CLOSE' : 'ENTER'}
              </span>
            </button>

            {showCodeInput && (
              <form onSubmit={handleJoinWithCode} className="p-4 pt-1 space-y-3 border-t border-slate-800/60">
                <div className="flex gap-2">
                  <input
                    id="room-code-input-field"
                    type="text"
                    placeholder="e.g. BM-EB7I"
                    value={roomCodeInput}
                    onChange={(e) => {
                      setRoomCodeInput(e.target.value.toUpperCase());
                      setCodeError(null);
                    }}
                    maxLength={14}
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 uppercase tracking-widest outline-none transition-colors"
                  />
                  <button
                    id="submit-room-code-btn"
                    type="submit"
                    disabled={isJoiningCode || !roomCodeInput.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isJoiningCode ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Join</span>
                    )}
                  </button>
                </div>

                {/* Structured Error State Display */}
                {codeError && (
                  <div
                    id="room-code-error-box"
                    className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-left space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <SearchX className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                          {codeError.includes('AUTH_REQUIRED')
                            ? 'Authentication Required'
                            : codeError.includes('LOBBY_FULL')
                            ? 'Lobby Full'
                            : 'Room Not Found'}
                        </div>
                        <div className="text-[11px] text-rose-300/90 font-sans leading-relaxed">
                          {codeError}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-900/50 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={handleHostPrivate}
                        className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer font-bold"
                      >
                        Host New Room
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeError(null)}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer ml-auto"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Open Public Lobbies List */}
          {openMatches.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Live Lobbies ({openMatches.length})
                </span>
                <span className="text-[10px] text-slate-500">Tap to Join</span>
              </div>
              
              {lobbyJoinError && (
                <div className="text-[10px] font-mono text-rose-400 flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/50 rounded-lg p-2">
                  <SearchX className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{lobbyJoinError}</span>
                </div>
              )}

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {openMatches.map((m) => {
                  const pCount = Array.isArray(m.participantUserIds) ? m.participantUserIds.length : 1;
                  const displayCode = m.accessCode || m.id.substring(0, 8).toUpperCase();
                  const isCurrentJoining = joiningLobbyId === m.id;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="truncate mr-2">
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <span className="text-emerald-400">#</span>
                          <span>{displayCode}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {pCount}/2 Players
                        </div>
                      </div>
                      <button
                        onClick={() => handleDirectLobbyJoin(m.id, m.accessCode)}
                        disabled={joiningLobbyId !== null}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-all shrink-0"
                      >
                        {isCurrentJoining ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <span>Join</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host Private Match / Create Investor Lobby */}
          <div className="space-y-2">
            <button
              id="host-private-lobby-btn"
              disabled={isHosting}
              onClick={handleHostPrivate}
              className="w-full py-3 px-4 rounded-xl flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wider uppercase text-left border border-slate-800 hover:border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                {isHosting ? (
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                )}
                <span>{isHosting ? 'Creating Lobby...' : 'Create Investor Lobby'}</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">HOST</span>
            </button>

            {hostingError && (
              <div
                id="hosting-error-box"
                className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-left space-y-1.5 font-mono text-xs"
              >
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Host Lobby Error</span>
                </div>
                <div className="text-[11px] text-rose-200/90 font-sans">
                  {hostingError}
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={handleHostPrivate}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-bold"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setHostingError(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Solo / Bot Simulation Setup */}
          <button
            id="ai-bot-match-btn"
            onClick={() => navigate('MATCH_SETUP')}
            className="w-full py-3 px-4 rounded-xl flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wider uppercase text-left border border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI Training Simulation</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">SOLO</span>
          </button>

          {/* Competitive, Social & Economy Hubs */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <button
              id="ranked-arena-nav-btn"
              onClick={() => navigate('RANKED')}
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between text-amber-300 hover:text-amber-100 transition-all text-xs font-bold tracking-wider uppercase text-left cursor-pointer hover:bg-amber-950/30 border border-amber-500/20"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Ranked Arena & Elo</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 uppercase">
                Season 1
              </span>
            </button>

            <button
              id="social-syndicates-nav-btn"
              onClick={() => navigate('SOCIAL')}
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between text-cyan-300 hover:text-cyan-100 transition-all text-xs font-bold tracking-wider uppercase text-left cursor-pointer hover:bg-cyan-950/30 border border-cyan-500/20"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Syndicates & Friends</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 uppercase">
                SP Vault
              </span>
            </button>

            <button
              id="cosmetics-store-nav-btn"
              onClick={() => navigate('STORE')}
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between text-purple-300 hover:text-purple-100 transition-all text-xs font-bold tracking-wider uppercase text-left cursor-pointer hover:bg-purple-950/30 border border-purple-500/20"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span>Cosmetics & Token Shop</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-300 uppercase">
                Store
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <button
              id="profile-nav-btn"
              onClick={() => navigate('PROFILE')}
              className="w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-all text-xs font-bold tracking-wider uppercase text-left cursor-pointer hover:bg-slate-900/40"
            >
              <User className="w-4 h-4" />
              Profile & Stats
            </button>

            <button
              id="settings-nav-btn"
              onClick={() => navigate('SETTINGS')}
              className="w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-all text-xs font-bold tracking-wider uppercase text-left cursor-pointer hover:bg-slate-900/40"
            >
              <Settings className="w-4 h-4" />
              Ruleset Settings
            </button>
          </div>
        </div>

        {/* Footer info & sign out */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div
              onClick={() => navigate('PROFILE')}
              className="flex items-center gap-2.5 truncate cursor-pointer hover:opacity-90 group transition-all"
              title="Click to view/edit investor profile"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xs font-bold shrink-0">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'I'}
              </div>
              <div className="truncate">
                <div className="text-xs text-slate-200 font-bold truncate group-hover:text-amber-400 transition-colors">
                  {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Investor')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {user?.email || 'Guest Session'}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer rounded-lg hover:bg-slate-900 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Interactive Matchmaking & Multiplayer Showcase */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-slate-900 via-slate-950 to-[#030712] flex-col items-center justify-center p-8 overflow-hidden">
        <div className="max-w-xl w-full text-center space-y-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)]"
          >
            <Landmark className="w-10 h-10 text-emerald-400" />
          </motion.div>

          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              INVESTORS' WAR MULTIPLAYER
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-2 max-w-md mx-auto">
              Real-time authoritative board trading with zero desync, instant matchmaking queues, and mobile network interface switching resilience.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Open Public Lobbies
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">{openMatches.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Auto-cleans if inactive &gt;5m</div>
              </div>
              {openMatches.length > 0 && (
                <button
                  onClick={handlePurgeAllLobbies}
                  disabled={isPurgingLobbies}
                  className="mt-3 py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  title="Immediately terminate and delete all open lobbies"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isPurgingLobbies ? 'Deleting...' : 'Delete Open Lobbies'}</span>
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" />
                <span>Mobile Resilience</span>
              </div>
              <div className="text-sm font-bold text-slate-200 mt-1">Dual-Interface Handshake</div>
              <div className="text-[10px] text-slate-500 mt-1">Recovers turn state on cellular/Wi-Fi switch</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
