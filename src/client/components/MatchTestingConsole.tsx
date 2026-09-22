/**
 * Interactive Match Testing Console (Step 2 Authoritative Functions)
 * Allows developers and testers to create matches, populate bots, roll dice via server-authoritative
 * Cloud Functions, acquire properties, execute auctions, and observe live Firestore synchronization.
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  UserPlus,
  Dice5,
  Gavel,
  ShoppingBag,
  Bot,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Coins,
  History,
  TrendingUp,
  Users,
  Zap,
  Sliders,
  LogIn,
  Mail,
  Lock,
  Database,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { PRESET_BOT_PROFILES, BotPersonality } from '../../bot/botTypes';
import { botRunnerService } from '../../bot/botRunnerService';
import { DeveloperDiceStudioCard } from './game/dice/DeveloperDiceStudioCard';
import { ConfigurationInspector } from './admin/ConfigurationInspector';
import { formatBM } from '../utils/currency';

export const MatchTestingConsole: React.FC = () => {
  const {
    activeMatchId,
    match,
    players,
    logs,
    activeAuction,
    openMatches,
    matchError,
    isActionPending,
    clearMatchError,
    createMatch,
    createSoloBotMatch,
    createCustomBotMatch,
    joinMatch,
    leaveMatch,
    addBotPlayer,
    removeBotPlayer,
    startMatch,
    requestRoll,
    buyProperty,
    startSpaceAuction,
    executeBotTurn,
    placeBid,
    passAuction,
    resolveAuction,
    completeTurn,
  } = useGame();

  const {
    isAuthenticated,
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    isFirebaseConfigured,
  } = useAuth();
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showEmailAuth, setShowEmailAuth] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'match' | 'dice_studio' | 'configurations'>('match');
  const [bidInput, setBidInput] = useState<number>(100);
  const [lastRollResult, setLastRollResult] = useState<{ roll: number; newSpace: number } | null>(null);
  const [selectedBotCount, setSelectedBotCount] = useState<number>(3);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(true);
  const [decisionSpeed, setDecisionSpeed] = useState<number>(800);
  const [selectedBotProfile, setSelectedBotProfile] = useState<string>(PRESET_BOT_PROFILES[0].displayName);

  useEffect(() => {
    botRunnerService.setConfig({
      enabled: autoPlayEnabled,
      decisionDelayMs: decisionSpeed,
    });
  }, [autoPlayEnabled, decisionSpeed]);

  const isHost = Boolean(match && user && match.hostUserId === user.uid);
  const isCurrentTurn = Boolean(
    match && user && match.currentPlayerId && players.find((p) => p.userId === user.uid)?.id === match.currentPlayerId
  );
  const currentPlayerObj = players.find((p) => p.id === match?.currentPlayerId);

  const handleRoll = async () => {
    try {
      const res = await requestRoll();
      setLastRollResult(res);
    } catch (err) {
      console.error('Roll error:', err);
    }
  };

  const handleStartCustomBots = async () => {
    if (!isAuthenticated) {
      setAuthError('Sign in with Google or Email/Password to start a match.');
      return;
    }
    try {
      if (createCustomBotMatch) {
        await createCustomBotMatch(selectedBotCount);
      } else {
        await createSoloBotMatch();
      }
    } catch (err) {
      console.error('Failed to start custom bot match:', err);
    }
  };

  const handleCreateMatch = async () => {
    if (!isAuthenticated) {
      setAuthError('Sign in with Google or Email/Password to start a match.');
      return;
    }
    try {
      await createMatch();
    } catch (err) {
      console.error('Failed to create match:', err);
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    if (!isAuthenticated) {
      setAuthError('Sign in with Google or Email/Password to start a match.');
      return;
    }
    try {
      await joinMatch(matchId);
    } catch (err) {
      console.error('Failed to join match:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auth Banner if not authenticated */}
      {!isAuthenticated && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
              <LogIn className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Sign in with Google or Email/Password to start a match.</span>
            </div>
            {isFirebaseConfigured && (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setAuthLoading(true);
                    setAuthError(null);
                    try {
                      await signInWithGoogle();
                    } catch (err: any) {
                      setAuthError(err?.message || 'Google Sign-In failed');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
                <button
                  onClick={() => setShowEmailAuth(!showEmailAuth)}
                  className="px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Sign-In</span>
                </button>
              </div>
            )}
          </div>

          {showEmailAuth && (
            <div className="p-3 bg-white rounded border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <input
                type="email"
                placeholder="Email address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-300 text-xs flex-1 min-w-[180px]"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-slate-300 text-xs flex-1 min-w-[140px]"
              />
              <button
                onClick={async () => {
                  if (!authEmail || !authPassword) {
                    setAuthError('Please enter both email and password.');
                    return;
                  }
                  setAuthLoading(true);
                  setAuthError(null);
                  try {
                    await signInWithEmail(authEmail, authPassword);
                  } catch (err: any) {
                    setAuthError(err?.message || 'Sign in failed');
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                disabled={authLoading}
                className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs font-medium hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={async () => {
                  if (!authEmail || !authPassword) {
                    setAuthError('Please enter both email and password to register.');
                    return;
                  }
                  setAuthLoading(true);
                  setAuthError(null);
                  try {
                    await signUpWithEmail(authEmail, authPassword);
                  } catch (err: any) {
                    setAuthError(err?.message || 'Registration failed');
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                disabled={authLoading}
                className="px-3 py-1.5 rounded bg-slate-200 text-slate-800 text-xs font-medium hover:bg-slate-300 disabled:opacity-50 cursor-pointer"
              >
                Register
              </button>
            </div>
          )}

          {authError && (
            <div className="text-xs text-rose-600 font-medium">
              {authError}
            </div>
          )}
        </div>
      )}

      {/* Authenticated user indicator */}
      {isAuthenticated && user && (
        <div className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Signed in as: <strong>{user.displayName || user.email || user.uid}</strong></span>
          </div>
          <button
            onClick={() => signOut().catch(console.error)}
            className="px-2.5 py-1 rounded bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors font-medium cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Global Error notice */}
      {matchError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{matchError}</span>
          </div>
          <button
            onClick={() => clearMatchError()}
            className="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Console Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
        <button
          onClick={() => setActiveConsoleTab('match')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeConsoleTab === 'match'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Match Engine & Lobby</span>
          {activeMatchId && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveConsoleTab('dice_studio')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeConsoleTab === 'dice_studio'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Dice5 className="w-3.5 h-3.5 text-amber-300" />
          <span>3D Dice Themes Studio</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-normal">
            Dev Preview
          </span>
        </button>

        <button
          onClick={() => setActiveConsoleTab('configurations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeConsoleTab === 'configurations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-300" />
          <span>System Configurations</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 font-normal">
            /configurations
          </span>
        </button>
      </div>

      {activeConsoleTab === 'dice_studio' && (
        <DeveloperDiceStudioCard />
      )}

      {activeConsoleTab === 'configurations' && (
        <ConfigurationInspector />
      )}

      {activeConsoleTab === 'match' && (
        <>
          {/* When no match is active: Lobby & Match Creation */}
          {!activeMatchId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Start Card */}
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Play className="w-4 h-4 text-emerald-600" />
              Quick Match Launcher
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Launch a live server-authoritative match populated with algorithmic AI bot investors to immediately test
              dice rolls, property acquisitions, and auctions.
            </p>

            {/* Unauthenticated notice */}
            {!isAuthenticated && (
              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-medium">Sign in with Google or Email/Password to start a match.</span>
              </div>
            )}

            {/* Bot Count Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                Select AI Opponents ({selectedBotCount}):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={!isAuthenticated}
                    onClick={() => setSelectedBotCount(count)}
                    className={`py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                      selectedBotCount === count
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {count} {count === 1 ? 'Bot' : 'Bots'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                disabled={isActionPending || !isAuthenticated}
                onClick={handleStartCustomBots}
                title={!isAuthenticated ? 'Sign in with Google or Email/Password to start a match.' : undefined}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
              >
                <Bot className="w-4 h-4" />
                {isActionPending ? 'Initializing Match...' : `Start Solo vs ${selectedBotCount} AI ${selectedBotCount === 1 ? 'Bot' : 'Bots'}`}
              </button>
              <button
                disabled={isActionPending || !isAuthenticated}
                onClick={handleCreateMatch}
                title={!isAuthenticated ? 'Sign in with Google or Email/Password to start a match.' : undefined}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create Custom Multiplayer Lobby
              </button>
            </div>
          </div>

          {/* Open Lobbies List */}
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Users className="w-4 h-4 text-indigo-600" />
                Open Match Lobbies ({openMatches.length})
              </div>
            </div>
            {openMatches.length === 0 ? (
              <div className="p-8 rounded border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No active public lobbies currently waiting for players. Create one to begin!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {openMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{m.id.substring(0, 16)}...</span>
                      <p className="text-slate-500 text-[11px]">
                        Players: {m.participantUserIds?.length || 0}/4 • Phase: {m.status}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinMatch(m.id)}
                      disabled={isActionPending || !isAuthenticated}
                      title={!isAuthenticated ? 'Sign in with Google or Email/Password to start a match.' : undefined}
                      className="px-3 py-1 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 text-[11px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Join Lobby
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* When a Match is Active */}
      {activeMatchId && match && (
        <div className="space-y-6">
          {/* Match Header Bar */}
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-indigo-50 text-indigo-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Match {match.id.substring(0, 14)}...</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-indigo-100 text-indigo-800">
                    {match.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phase: <strong className="text-slate-700">{match.currentPhase}</strong> • Turn:{' '}
                  <strong className="text-slate-700">{match.turnNumber}</strong> • Round:{' '}
                  <strong className="text-slate-700">{match.roundNumber}</strong> • Version:{' '}
                  <strong className="text-slate-700">{match.stateVersion}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {match.status === 'waiting_for_players' && isHost && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedBotProfile}
                    onChange={(e) => setSelectedBotProfile(e.target.value)}
                    className="text-xs py-1.5 px-2.5 rounded border border-slate-300 bg-white text-slate-700 font-medium"
                  >
                    {PRESET_BOT_PROFILES.map((prof) => (
                      <option key={prof.id} value={prof.displayName}>
                        {prof.displayName} ({prof.personality})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => addBotPlayer(selectedBotProfile).catch(console.error)}
                    disabled={isActionPending || players.length >= 4}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    + Add Bot
                  </button>
                  <button
                    onClick={() => startMatch().catch(console.error)}
                    disabled={isActionPending || players.length < 2}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Match
                  </button>
                </div>
              )}
              <button
                onClick={() => leaveMatch().catch(console.error)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-rose-50 hover:text-rose-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave
              </button>
            </div>
          </div>

          {/* Active Player Standings & Balances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((p) => {
              const isCurrent = match.currentPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/20 shadow-xs'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.isBot ? (
                        <Bot className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[100px] block">{p.displayName}</span>
                        {p.isBot && (
                          <span className="text-[10px] text-slate-500 font-medium">Algorithmic Bot</span>
                        )}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-600 text-white">
                        Turn
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Cash:</span>
                      <strong className="text-slate-900 font-mono">{formatBM(p.cash)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Net Worth:</span>
                      <strong className="text-slate-900 font-mono">{formatBM(p.netWorth)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Space Index:</span>
                      <span className="font-semibold text-slate-800">#{p.currentSpaceIndex}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Owned Properties:</span>
                      <span className="font-semibold text-slate-800">{p.ownedSpaceIds?.length || 0}</span>
                    </div>
                  </div>

                  {match.status === 'waiting_for_players' && isHost && p.isBot && (
                    <button
                      onClick={() => removeBotPlayer(p.id).catch(console.error)}
                      className="mt-3 w-full py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded border border-rose-200 font-medium"
                    >
                      Remove Bot
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bot Auto-Play Orchestration Toolbar */}
          {match.status === 'in_progress' && (
            <div className="p-4 bg-slate-900 text-white rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-indigo-500/20 text-indigo-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Bot Turn Engine</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        autoPlayEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {autoPlayEnabled ? 'Auto-Play Active' : 'Paused'}
                    </span>
                  </div>
                  {currentPlayerObj?.isBot && autoPlayEnabled ? (
                    <p className="text-xs text-indigo-300 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping inline-block" />
                      {currentPlayerObj.displayName} is evaluating strategic decisions...
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentPlayerObj?.isBot
                        ? `Waiting for ${currentPlayerObj.displayName} turn`
                        : `Human turn: ${currentPlayerObj?.displayName || 'Player'}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Auto-Play Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
                  <span className="text-[10px] text-slate-400 px-2">Speed:</span>
                  {[
                    { label: 'Fast', ms: 250 },
                    { label: 'Normal', ms: 800 },
                    { label: 'Slow', ms: 1500 },
                  ].map((spd) => (
                    <button
                      key={spd.ms}
                      type="button"
                      onClick={() => setDecisionSpeed(spd.ms)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        decisionSpeed === spd.ms
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    autoPlayEnabled
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {autoPlayEnabled ? 'Pause Auto-Play' : 'Resume Auto-Play'}
                </button>
              </div>
            </div>
          )}

          {/* Gameplay Actions Panel (when match is in progress) */}
          {match.status === 'in_progress' && (
            <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Dice5 className="w-4 h-4 text-indigo-600" />
                  Authoritative Turn Actions
                </div>
                <div className="text-xs text-slate-500">
                  Active Player:{' '}
                  <strong className="text-slate-800">{currentPlayerObj?.displayName || 'Unknown'}</strong>
                  {currentPlayerObj?.isBot && ' (AI Agent)'}
                </div>
              </div>

              {lastRollResult && (
                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <span>Server-Generated Authoritative RNG Roll:</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    Dice: {lastRollResult.roll} • Moved to Space #{lastRollResult.newSpace}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Roll Dice */}
                <button
                  onClick={handleRoll}
                  disabled={isActionPending || (!isCurrentTurn && !currentPlayerObj?.isBot)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
                >
                  <Dice5 className="w-4 h-4" />
                  Request Roll (Server RNG)
                </button>

                {/* Buy Property */}
                <button
                  onClick={() => buyProperty().catch(console.error)}
                  disabled={isActionPending || (!isCurrentTurn && !currentPlayerObj?.isBot)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Buy Space Property
                </button>

                {/* Auction Space */}
                <button
                  onClick={() => startSpaceAuction().catch(console.error)}
                  disabled={isActionPending || (!isCurrentTurn && !currentPlayerObj?.isBot)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                >
                  <Gavel className="w-4 h-4 text-amber-700" />
                  Send to Auction
                </button>

                {/* If AI's turn: Auto-Execute AI Turn */}
                {currentPlayerObj?.isBot && (
                  <button
                    onClick={() => executeBotTurn(currentPlayerObj.id).catch(console.error)}
                    disabled={isActionPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 shadow-xs"
                  >
                    <Bot className="w-4 h-4 text-amber-400" />
                    Execute Bot Turn
                  </button>
                )}

                {/* Complete Turn */}
                <button
                  onClick={() => completeTurn().catch(console.error)}
                  disabled={isActionPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  Complete Turn
                </button>
              </div>
            </div>
          )}

          {/* Active Auction Overlay / Panel */}
          {activeAuction && (
            <div className="p-6 bg-amber-50/70 rounded-lg border border-amber-300 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <Gavel className="w-5 h-5 text-amber-700" />
                  Live Asset Auction: {activeAuction.assetName || activeAuction.assetId}
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-900 uppercase">
                  {activeAuction.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-white rounded border border-amber-200">
                  <div className="text-slate-500">Current Highest Bid</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">
                    {formatBM(activeAuction.currentHighestBid || 0)}
                  </div>
                </div>
                <div className="p-3 bg-white rounded border border-amber-200">
                  <div className="text-slate-500">Highest Bidder</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {players.find((p) => p.id === activeAuction.currentHighestBidderId)?.displayName || 'No bids yet'}
                  </div>
                </div>
                <div className="p-3 bg-white rounded border border-amber-200">
                  <div className="text-slate-500">Passed Players</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {activeAuction.passedPlayerIds?.length || 0} / {players.length}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="number"
                  step="50"
                  value={bidInput}
                  onChange={(e) => setBidInput(Number(e.target.value))}
                  className="w-32 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono"
                />
                <button
                  onClick={() => placeBid(activeAuction.id, bidInput).catch(console.error)}
                  disabled={isActionPending}
                  className="px-4 py-2 rounded bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 disabled:opacity-50 shadow-xs"
                >
                  Place Bid
                </button>
                <button
                  onClick={() => passAuction(activeAuction.id).catch(console.error)}
                  disabled={isActionPending}
                  className="px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Pass
                </button>
                <button
                  onClick={() => resolveAuction(activeAuction.id).catch(console.error)}
                  disabled={isActionPending}
                  className="px-4 py-2 rounded border border-amber-300 bg-amber-100 text-amber-900 text-xs font-semibold hover:bg-amber-200 disabled:opacity-50"
                >
                  Resolve Auction
                </button>
              </div>
            </div>
          )}

          {/* Real-time Match Logs Feed */}
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <History className="w-4 h-4 text-slate-600" />
                Live Match Audit Log (Firestore Subcollection)
              </div>
              <span className="text-xs text-slate-500 font-mono">{logs.length} events logged</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No match logs recorded yet.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-800 uppercase">
                        {log.type}
                      </span>
                      <span className="text-slate-800 font-medium">{log.summary}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
