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
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { NotificationCenterDrawer } from '../ui/NotificationCenterDrawer';

export const HomeScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, signOut } = useAuth();
  const {
    activeMatchId,
    startQuickMatchQueue,
    joinByRoomCode,
    createPrivateMatch,
    openMatches,
    connectionStatus,
    isOnline,
    reconnectHandshake,
  } = useGame();

  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleQuickMatch = async () => {
    try {
      await startQuickMatchQueue();
      // Auto-transitions to GAMEPLAY or LOBBY once state updates
      navigate('LOBBY');
    } catch (err: any) {
      console.warn('Quick Match queue error:', err);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    setIsJoiningCode(true);
    setCodeError(null);
    try {
      await joinByRoomCode(roomCodeInput.trim().toUpperCase());
      navigate('LOBBY');
    } catch (err: any) {
      setCodeError(err?.message || 'Invalid or expired room code.');
    } finally {
      setIsJoiningCode(false);
    }
  };

  const handleHostPrivate = async () => {
    try {
      await createPrivateMatch();
      navigate('LOBBY');
    } catch (err: any) {
      console.warn('Host private match error:', err);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex overflow-hidden">
      {/* Left Sidebar Menu / Main Menu Panel */}
      <div className="w-full md:w-96 bg-slate-950/95 backdrop-blur-xl md:border-r border-slate-800 flex flex-col z-10 relative">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                BIG MOMMA
              </div>
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Investors' War
              </div>
            </div>
          </div>

          {/* Network Resilience Badge & Notification Bell */}
          <div className="flex items-center gap-2">
            <NotificationCenterDrawer />
            <div
              onClick={() => reconnectHandshake()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border cursor-pointer select-none transition-colors"
              style={{
                backgroundColor: isOnline && connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                borderColor: isOnline && connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                color: isOnline && connectionStatus === 'connected' ? '#34d399' : '#f87171',
              }}
              title="Click to perform network reconnection handshake"
            >
              {connectionStatus === 'reconnecting' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : isOnline && connectionStatus === 'connected' ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span className="font-bold uppercase tracking-wider">
                {connectionStatus === 'reconnecting'
                  ? 'Handshaking'
                  : isOnline && connectionStatus === 'connected'
                  ? 'Online'
                  : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-2.5 overflow-y-auto">
          {activeMatchId && (
            <button
              id="rejoin-active-match-btn"
              onClick={() => navigate('GAMEPLAY')}
              className="w-full py-3.5 px-4 rounded-xl flex items-center justify-between bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-500/40 transition-all text-xs font-black tracking-wider uppercase text-left cursor-pointer shadow-lg shadow-indigo-950/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                <span>Rejoin Active Match</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-400">RESUME</span>
            </button>
          )}

          {/* Primary Quick-Match Button */}
          <button
            id="quick-match-btn"
            onClick={handleQuickMatch}
            className="w-full py-4 px-5 rounded-2xl flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl shadow-emerald-950/60 transition-all text-sm font-black tracking-widest uppercase active:scale-98 cursor-pointer border border-emerald-400/30"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 fill-current text-yellow-300" />
              <div className="text-left">
                <div>Quick Match</div>
                <div className="text-[10px] font-mono font-normal opacity-85 lowercase tracking-normal">
                  matchmaking queue • 4 investors
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/10 uppercase">
              Queue
            </span>
          </button>

          {/* Join with Room Code Collapsible */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
            {!showCodeInput ? (
              <button
                id="toggle-join-code-btn"
                onClick={() => setShowCodeInput(true)}
                className="w-full py-2 px-3 rounded-xl flex items-center justify-between text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wider uppercase text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>Join with Match Code</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">ENTER</span>
              </button>
            ) : (
              <form onSubmit={handleJoinWithCode} className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase">
                  <span>Room Access Code</span>
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(false)}
                    className="text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    id="match-access-code-input"
                    type="text"
                    placeholder="e.g. BM-9K2F"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-white uppercase focus:outline-none placeholder:text-slate-600"
                  />
                  <button
                    id="submit-join-code-btn"
                    type="submit"
                    disabled={isJoiningCode || !roomCodeInput.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  >
                    {isJoiningCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Join'}
                  </button>
                </div>
                {codeError && (
                  <div className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>{codeError}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Host Private Match */}
          <button
            id="host-private-lobby-btn"
            onClick={handleHostPrivate}
            className="w-full py-3 px-4 rounded-xl flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wider uppercase text-left border border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Host Private Lobby</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">CUSTOM</span>
          </button>

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

          {/* Phase 5 Competitive, Social & Economy Hubs */}
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
              className="flex items-center gap-2.5 truncate cursor-pointer group"
              title="View Profile and Change Username"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0 border border-slate-700 transition-colors">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs text-slate-300 group-hover:text-emerald-300 font-semibold truncate transition-colors">
                  {user?.displayName || user?.email}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Investor Profile</div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer rounded-lg hover:bg-slate-900 transition-colors"
              title="Sign Out / Switch Identity"
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
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Open Public Lobbies</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{openMatches.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Available for quick match</div>
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

