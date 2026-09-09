import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark,
  Bot,
  User as UserIcon,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Sliders,
  Activity,
  History,
  Info,
  ShieldCheck,
  ChevronRight,
  Gavel,
  Zap,
  Building2,
  Trophy,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Plus,
  Compass,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_STANDARD_SPACES } from '../../../config/boardConfig';
import { BoardSpace } from '../../../types/board';
import { CitySkylineBackground } from './CitySkylineBackground';
import { CircularBoard52, BOARD_GROUP_THEMES } from './CircularBoard52';
import { PlayerHUDCard } from './PlayerHUDCard';
import { DiceVisualizer } from './DiceVisualizer';
import { LandingResolutionModal } from './LandingResolutionModal';
import { AuctionArena } from './AuctionArena';
import { SPActionModal } from './SPActionModal';
import { OrientationGuard } from './OrientationGuard';
import { FoundationStatus } from '../FoundationStatus';
import { MatchTestingConsole } from '../MatchTestingConsole';
import { formatBM, formatSP } from '../../utils/currency';
import { MainMenuOverlay } from './MainMenuOverlay';
import { GameOverOverlay } from './GameOverOverlay';

export const LandscapeGameScreen: React.FC = () => {
  const {
    match,
    players,
    logs,
    activeAuction,
    matchError,
    isActionPending,
    clearMatchError,
    createCustomBotMatch,
    leaveMatch,
    requestRoll,
    buyProperty,
    startSpaceAuction,
    placeBid,
    passAuction,
    resolveAuction,
    executeSPAction,
    completeTurn,
    executeBotTurn,
  } = useGame();

  const { user } = useAuth();

  // Local UI state
  const [selectedSpaceIndex, setSelectedSpaceIndex] = useState<number>(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [showLandingModal, setShowLandingModal] = useState<boolean>(false);
  const [showSPModal, setShowSPModal] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Auto-play bot loop controls
  const [autoPlayBots, setAutoPlayBots] = useState<boolean>(true);
  const [botSpeedMs, setBotSpeedMs] = useState<number>(1200); // 1.2s per bot action

  // Selected space object
  const selectedSpace = DEFAULT_STANDARD_SPACES[selectedSpaceIndex] || DEFAULT_STANDARD_SPACES[0];

  // Identify Human vs Current Active player
  const humanPlayer = players.find((p) => !p.isBot) || players[0] || null;
  const currentPlayer = players.find((p) => p.id === match?.currentPlayerId) || null;
  const isHumanTurn = Boolean(currentPlayer && !currentPlayer.isBot);

  // Phase analysis
  const currentPhase = match?.currentPhase || 'TURN_START';
  const canRoll = isHumanTurn && (currentPhase === 'TURN_START' || currentPhase === 'AWAITING_ROLL');
  const canActOnProperty = isHumanTurn && currentPhase === 'AWAITING_ACTION';
  const canEndTurn = isHumanTurn && currentPhase === 'TURN_END';

  // Ownership of selected space
  const selectedSpaceOwner = players.find((p) =>
    (p.ownedSpaceIds || []).includes(selectedSpace.id)
  );

  // Sync selected space when current player moves
  useEffect(() => {
    if (currentPlayer) {
      setSelectedSpaceIndex(currentPlayer.currentSpaceIndex);
    }
  }, [currentPlayer?.currentSpaceIndex]);

  // Trigger landing modal when human lands on a space in AWAITING_ACTION
  useEffect(() => {
    if (isHumanTurn && currentPhase === 'AWAITING_ACTION') {
      setShowLandingModal(true);
    }
  }, [isHumanTurn, currentPhase]);

  // Autonomous Bot Runner Loop
  useEffect(() => {
    if (!autoPlayBots || !match || match.status !== 'in_progress') return;
    if (!currentPlayer || !currentPlayer.isBot) return;

    const timer = setTimeout(async () => {
      try {
        await executeBotTurn(currentPlayer.id);
      } catch {
        // Handled through match error
      }
    }, botSpeedMs);

    return () => clearTimeout(timer);
  }, [autoPlayBots, match?.status, currentPlayer?.id, currentPlayer?.isBot, match?.currentPhase, botSpeedMs]);

  // Handle human roll
  const handleRollDice = async () => {
    if (!canRoll || isRolling || isActionPending) return;
    setIsRolling(true);
    try {
      const res = await requestRoll();
      setLastRoll(res.roll);
      setSelectedSpaceIndex(res.newSpace);
    } catch {
      // Error handled by context
    } finally {
      setIsRolling(false);
    }
  };

  // Handle property acquisition
  const handleBuyProperty = async () => {
    try {
      await buyProperty();
      setShowLandingModal(false);
    } catch {
      // Handled
    }
  };

  // Handle sending property to auction
  const handleSendToAuction = async () => {
    try {
      await startSpaceAuction();
      setShowLandingModal(false);
    } catch {
      // Handled
    }
  };

  return (
    <OrientationGuard>
      <div className="relative w-full min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        {(!match || match.status === 'waiting_for_players') && (
          <MainMenuOverlay />
        )}
        {match?.status === 'completed' && (
          <GameOverOverlay players={players} onPlayAgain={leaveMatch} />
        )}
        {/* Dynamic Futuristic Financial City Skyline */}
        <CitySkylineBackground />

        {/* TOP NAVIGATION HUD (Landscape Responsive) */}
        <header className="relative z-30 w-full px-3 sm:px-6 py-2 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-3">
          {/* Left Title & Match Info */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.5)] shrink-0">
              <Landmark className="w-4 h-4 text-slate-950 font-black" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-slate-100">
                  BIG MOMMA: INVESTORS' WAR
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 text-[9px] font-mono border border-cyan-800">
                  52-SPACE PROD
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <span>Match #{match?.id.slice(0, 8) || 'Active'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">Round {match?.roundNumber || 1}</span>
                <span>•</span>
                <span>Turn #{match?.turnNumber || 1}</span>
              </div>
            </div>
          </div>

          {/* Center: Current Phase Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 shadow-inner">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Phase:</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {currentPhase.replace('_', ' ')}
            </span>
            {currentPlayer && (
              <span className="text-xs text-slate-300 font-medium">
                ({currentPlayer.displayName})
              </span>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Auto-play Toggle */}
            <button
              type="button"
              onClick={() => setAutoPlayBots(!autoPlayBots)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all min-h-[36px] ${
                autoPlayBots
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
              title="Toggle autonomous AI bot auto-advancement"
            >
              {autoPlayBots ? <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">AI Auto</span>
            </button>

            {/* AI Speed Cycle */}
            <button
              type="button"
              onClick={() => setBotSpeedMs((prev) => (prev === 1200 ? 500 : prev === 500 ? 200 : 1200))}
              className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1 min-h-[36px]"
              title="Adjust AI bot turn resolution speed"
            >
              <FastForward className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">
                {botSpeedMs === 1200 ? '1x' : botSpeedMs === 500 ? '2.5x' : 'Fast'}
              </span>
            </button>

            {/* New 3-Bot Match Quick Restart */}
            <button
              type="button"
              onClick={() => createCustomBotMatch(3)}
              disabled={isActionPending}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1 min-h-[36px] transition-colors"
              title="Start fresh 4-player game with 3 autonomous bots"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Match</span>
            </button>

            {/* Diagnostics Panel Toggle */}
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors min-h-[36px]"
              title="Open Foundation Health & Testing Console"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </header>

        {/* ERROR BANNER IF ANY */}
        <AnimatePresence>
          {matchError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative z-40 bg-rose-950/90 border-b border-rose-600/80 px-4 py-2 flex items-center justify-between text-xs text-rose-200"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{matchError}</span>
              </div>
              <button
                type="button"
                onClick={clearMatchError}
                className="p-1 text-rose-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN LANDSCAPE PLAYFIELD (BOARD ON LEFT/CENTER, TERMINAL ON RIGHT) */}
        <main className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          
          {/* LEFT/CENTER: CIRCULAR 52-SPACE BOARD CENTERPIECE (lg:col-span-7 xl:col-span-7) */}
          <section className="lg:col-span-7 xl:col-span-7 w-full flex flex-col items-center justify-start gap-3 order-1">
            
            {/* Dynamic Turn & Phase Announcement Banner */}
            <div className={`w-full max-w-xl py-2 px-4 rounded-xl border flex items-center justify-between shadow-lg transition-all ${
              isHumanTurn
                ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isHumanTurn ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    {isHumanTurn ? 'Authoritative Active Player' : 'Authoritative Turn Flow'}
                  </div>
                  <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                    {isHumanTurn
                      ? currentPhase === 'TURN_START'
                        ? 'YOUR TURN — ROLL THE DICE TO ADVANCE'
                        : currentPhase === 'AWAITING_ACTION'
                        ? 'YOUR TURN — DECIDE PROPERTY ACQUISITION'
                        : currentPhase === 'AUCTION'
                        ? 'YOUR TURN — ACTIVE HIGH-FREQUENCY AUCTION'
                        : 'YOUR TURN — COMPLETE TURN'
                      : `BOT'S TURN — ${currentPlayer?.displayName || 'AI'} IS COMPUTING STRATEGY...`}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[10px] text-cyan-400">
                Space #{currentPlayer?.currentSpaceIndex ?? 0}
              </div>
            </div>

            {/* 52-Space Circular Board */}
            <div className="w-full flex justify-center">
              <CircularBoard52
                players={players}
                currentPlayerId={match?.currentPlayerId || null}
                selectedSpaceIndex={selectedSpaceIndex}
                onSelectSpace={(idx) => setSelectedSpaceIndex(idx)}
                highlightSpaceIndex={currentPlayer?.currentSpaceIndex ?? null}
              />
            </div>

            {/* Central Space Inspection Pill */}
            <div className="w-full max-w-xl bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-8 rounded-sm ${
                    selectedSpace.group
                      ? BOARD_GROUP_THEMES[selectedSpace.group]?.barColor || 'bg-slate-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                    <span>#{selectedSpace.index} {selectedSpace.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      ({selectedSpace.group || selectedSpace.type})
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {selectedSpace.baseCost ? `Acquisition: ${formatBM(selectedSpace.baseCost)}` : selectedSpace.description}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {selectedSpaceOwner ? (
                  <div className="text-xs font-bold text-amber-400 font-mono">
                    Owner: {selectedSpaceOwner.displayName.split(' ')[0]}
                  </div>
                ) : selectedSpace.baseCost ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800 font-bold">
                    Available
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">Special Space</span>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT SIDE HUD: PLAYERS, ACTION TERMINAL & ACTIVITY STREAM (lg:col-span-5 xl:col-span-5) */}
          <section className="lg:col-span-5 xl:col-span-5 w-full flex flex-col gap-3 order-2">
            
            {/* AUCTION ARENA IF ACTIVE */}
            {activeAuction && (
              <AuctionArena
                auction={activeAuction}
                players={players}
                humanPlayer={humanPlayer}
                isActionPending={isActionPending}
                onPlaceBid={(amt) => placeBid(activeAuction.id, amt)}
                onPassAuction={() => passAuction(activeAuction.id)}
                onResolveAuction={() => resolveAuction(activeAuction.id)}
              />
            )}

            {/* ACTIVE SYNDICATE PLAYERS (UP TO 4) */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 shadow-md">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Investors Syndicate ({players.length}/4)</span>
                </h2>
                <span className="text-[10px] font-mono text-cyan-400">Standard: ƁM</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {players.map((p, idx) => (
                  <PlayerHUDCard
                    key={p.id}
                    player={p}
                    index={idx}
                    isCurrentTurn={p.id === match?.currentPlayerId}
                    isHuman={!p.isBot}
                  />
                ))}
              </div>
            </div>

            {/* DYNAMIC ACTION TERMINAL CARD */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Action Terminal
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {isHumanTurn ? 'Your Active Turn' : 'Autonomous Bot Turn'}
                </span>
              </div>

              {/* Tactile 3D Dice Visualizer */}
              <div className="mb-4">
                <DiceVisualizer
                  lastRoll={lastRoll}
                  isRolling={isRolling}
                  canRoll={canRoll}
                  onRoll={handleRollDice}
                  disabledReason={!isHumanTurn ? 'Waiting for Bot' : currentPhase !== 'TURN_START' ? 'Turn in progress' : undefined}
                />
              </div>

              {/* Dynamic Contextual Action Buttons */}
              <div className="space-y-2">
                {/* Property Purchase Button if on unowned property */}
                {canActOnProperty && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleBuyProperty}
                      disabled={isActionPending}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all min-h-[44px] cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Buy</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendToAuction}
                      disabled={isActionPending}
                      className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all min-h-[44px] cursor-pointer"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>Auction</span>
                    </button>
                  </div>
                )}

                {/* End Turn Button */}
                {canEndTurn && (
                  <button
                    type="button"
                    onClick={completeTurn}
                    disabled={isActionPending}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 min-h-[48px] cursor-pointer transition-all active:scale-95"
                  >
                    <span>Complete Turn</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* SP Tactical Menu Trigger */}
                {humanPlayer && (
                  <button
                    type="button"
                    onClick={() => setShowSPModal(true)}
                    className="w-full py-2.5 px-3 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                  >
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Strategy Points ({formatSP(humanPlayer.specialPoints)})</span>
                  </button>
                )}

                {/* Manual Bot Step Button (if auto-play paused) */}
                {!autoPlayBots && currentPlayer && currentPlayer.isBot && (
                  <button
                    type="button"
                    onClick={() => executeBotTurn(currentPlayer.id)}
                    disabled={isActionPending}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Advance AI Step</span>
                  </button>
                )}
              </div>
            </div>

            {/* LIVE ACTIVITY FEED */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col flex-1 min-h-[190px]">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3 text-cyan-400" />
                  <span>Authoritative Event Stream</span>
                </span>
                <span>{logs.length} events</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-48 space-y-1.5 pr-1 text-[11px] font-mono">
                {logs.slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/50 text-slate-300 leading-snug flex items-start gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                    <div className="flex-1 break-words">
                      <span>{log.summary}</span>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Awaiting game events...
                  </div>
                )}
              </div>
            </div>

            {/* Quick Match Statistics Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs font-mono">
              <div className="text-[10px] text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                <span>Financial Overview</span>
                <span className="text-emerald-400 font-bold">52 Spaces</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Holdings Claimed:</span>
                  <span className="font-bold text-slate-100">
                    {players.reduce((acc, p) => acc + (p.ownedSpaceIds?.length || 0), 0)} / 38
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Currency Standard:</span>
                  <span className="font-bold text-emerald-400">ƁM (Big Momma's Currency)</span>
                </div>
              </div>
            </div>

          </section>
        </main>

        {/* OVERLAY: LANDING RESOLUTION DIALOG */}
        <AnimatePresence>
          {showLandingModal && (
            <LandingResolutionModal
              space={selectedSpace}
              owner={
                selectedSpaceOwner
                  ? {
                      playerId: selectedSpaceOwner.id,
                      playerIndex: players.findIndex((p) => p.id === selectedSpaceOwner.id),
                      displayName: selectedSpaceOwner.displayName,
                    }
                  : null
              }
              humanPlayer={humanPlayer}
              isHumanTurn={isHumanTurn}
              currentPhase={currentPhase}
              isActionPending={isActionPending}
              onBuyProperty={handleBuyProperty}
              onSendToAuction={handleSendToAuction}
              onDismiss={() => setShowLandingModal(false)}
            />
          )}
        </AnimatePresence>

        {/* OVERLAY: SP TACTICAL ABILITIES MODAL */}
        <AnimatePresence>
          {showSPModal && humanPlayer && (
            <SPActionModal
              player={humanPlayer}
              isActionPending={isActionPending}
              onExecute={async (actionId, cost) => {
                try {
                  await executeSPAction(actionId, cost);
                  setShowSPModal(false);
                } catch {
                  // Handled
                }
              }}
              onClose={() => setShowSPModal(false)}
            />
          )}
        </AnimatePresence>

        {/* OVERLAY: DIAGNOSTICS & TESTING DRAWER */}
        <AnimatePresence>
          {showDiagnostics && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto p-6 space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
                      Foundation Health & Audit Console
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Embedded Foundation Status & Match Console */}
                <FoundationStatus />
                <MatchTestingConsole />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </OrientationGuard>
  );
};
