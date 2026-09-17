import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TrendingUp,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Plus,
  Compass,
  Settings,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_STANDARD_SPACES } from '../../../config/boardConfig';
import { BoardSpace } from '../../../types/board';
import { CircularBoard52, BOARD_GROUP_THEMES } from './CircularBoard52';
import { BoardEnvironmentSurround } from './environment/BoardEnvironmentSurround';
import { PlayerHUDCard } from './PlayerHUDCard';
import { DiceVisualizer } from './DiceVisualizer';
import { LandingResolutionModal } from './LandingResolutionModal';
import { HDSpacePopOutModal } from './popout/HDSpacePopOutModal';
import { AuctionArena } from './AuctionArena';
import { SPActionModal } from './SPActionModal';
import { MarketChoiceModal } from './MarketChoiceModal';
import { DebtRestructuringModal } from './DebtRestructuringModal';
import { FoundationStatus } from '../FoundationStatus';
import { MatchTestingConsole } from '../MatchTestingConsole';
import { formatBM, formatSP } from '../../utils/currency';
import { PauseMenuOverlay } from '../screens/PauseMenuOverlay';
import { OrientationGuard } from '../ui/OrientationGuard';
import { backgroundMusic } from '../../services/backgroundMusic';
import {
  DiceSkinManager,
  type DiceSkinId,
} from '../../../services/cosmetics/diceSkins';
import { BackgroundMusicControl } from './audio/BackgroundMusicControl';
import { NotificationCenterDrawer } from '../ui/NotificationCenterDrawer';
import { NotificationService } from '../../../services/notifications/notificationService';
import { BankruptcyVignetteOverlay } from './BankruptcyVignetteOverlay';
import { CosmeticsManager, EquippedCosmeticsState } from '../../../services/cosmetics/cosmeticsManager';

export const LandscapeGameScreen: React.FC = () => {
  const {
    match,
    players,
    logs,
    activeAuction,
    pendingMarketChoice,
    activeMarketEvent,
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
    submitMarketChoice,
    mortgageProperty,
    unmortgageProperty,
    liquidateProperty,
    completeTurn,
    executeBotTurn,
  } = useGame();

  const { user } = useAuth();

  // Local UI state
  const [selectedSpaceIndex, setSelectedSpaceIndex] = useState<number>(0);
  const [showSpacePopOut, setShowSpacePopOut] = useState<boolean>(false);
  const [lastRoll, setLastRoll] = useState<[number, number] | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [showLandingModal, setShowLandingModal] = useState<boolean>(false);
  const [showSPModal, setShowSPModal] = useState<boolean>(false);
  const [showDebtModal, setShowDebtModal] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showPauseMenu, setShowPauseMenu] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [equippedSkin, setEquippedSkin] = useState<DiceSkinId>(() =>
    DiceSkinManager.getEquippedSkin()
  );
  const [cosmetics, setCosmetics] = useState<EquippedCosmeticsState>(() =>
    CosmeticsManager.getEquippedState()
  );
  const [bankruptcyVignetteOpen, setBankruptcyVignetteOpen] = useState<boolean>(false);
  const [bankruptPlayerName, setBankruptPlayerName] = useState<string>('');
  const prevBankruptPlayerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubSkin = DiceSkinManager.subscribe((skin) => {
      setEquippedSkin(skin);
    });
    const unsubCosmetics = CosmeticsManager.subscribe((state) => {
      setCosmetics(state);
    });
    return () => {
      unsubSkin();
      unsubCosmetics();
    };
  }, []);

  // Monitor for any player entering bankrupt status
  useEffect(() => {
    players.forEach((p) => {
      if (p.status === 'bankrupt' && !prevBankruptPlayerIdsRef.current.has(p.id)) {
        prevBankruptPlayerIdsRef.current.add(p.id);
        setBankruptPlayerName(p.displayName);
        setBankruptcyVignetteOpen(true);
      }
    });
  }, [players]);

  // Step 16 Movement synchronization: delay player token advancement until 3D dice completes landing & glow
  const [pendingMovement, setPendingMovement] = useState<{
    playerId: string;
    targetSpace: number;
    roll: number;
  } | null>(null);
  const [boardPlayerSpaces, setBoardPlayerSpaces] = useState<Record<string, number>>({});

  // Displayed players on the circular board (holds token at starting space until dice landing completes)
  const boardPlayers = useMemo(() => {
    return players.map((p) => {
      if (boardPlayerSpaces[p.id] !== undefined) {
        return {
          ...p,
          currentSpaceIndex: boardPlayerSpaces[p.id],
        };
      }
      return p;
    });
  }, [players, boardPlayerSpaces]);

  // Auto-play bot loop controls
  const [autoPlayBots, setAutoPlayBots] = useState<boolean>(true);
  const [botSpeedMs, setBotSpeedMs] = useState<number>(1200); // 1.2s per bot action

  // Selected space object
  const selectedSpace = DEFAULT_STANDARD_SPACES[selectedSpaceIndex] || DEFAULT_STANDARD_SPACES[0];

  // Identify Human vs Current Active player
  const humanPlayer =
    players.find((p) => user?.uid && (p.userId === user.uid || p.id === user.uid)) ||
    players.find((p) => !p.isBot) ||
    players[0] ||
    null;
  const currentPlayer = players.find((p) => p.id === match?.currentPlayerId) || null;
  const isHumanTurn = Boolean(currentPlayer && humanPlayer && currentPlayer.id === humanPlayer.id);

  // Phase analysis
  const currentPhase = match?.currentPhase || 'TURN_START';
  const canRoll = isHumanTurn && (currentPhase === 'TURN_START' || currentPhase === 'AWAITING_ROLL');
  const canActOnProperty = isHumanTurn && currentPhase === 'AWAITING_ACTION';
  const canEndTurn = isHumanTurn && currentPhase === 'TURN_END';

  // Ownership of selected space
  const selectedSpaceOwner = players.find((p) =>
    (p.ownedSpaceIds || []).includes(selectedSpace.id)
  );

  // Non-stop background music playback while playing the game
  useEffect(() => {
    backgroundMusic.play();
    return () => {
      backgroundMusic.pause();
    };
  }, []);

  // Sync selected space when current player moves (only when not actively in roll flight)
  useEffect(() => {
    if (currentPlayer && !isRolling && !pendingMovement) {
      setSelectedSpaceIndex(currentPlayer.currentSpaceIndex);
    }
  }, [currentPlayer?.currentSpaceIndex, isRolling, pendingMovement]);

  // Trigger landing modal when human lands on a space in AWAITING_ACTION (guarded against active roll flight)
  useEffect(() => {
    if (isHumanTurn && currentPhase === 'AWAITING_ACTION' && !isRolling && !pendingMovement) {
      setShowLandingModal(true);
    }
  }, [isHumanTurn, currentPhase, isRolling, pendingMovement]);

  // Autonomous Bot Runner Loop (Only Host triggers bot turns to prevent multi-client collision)
  useEffect(() => {
    if (!autoPlayBots || !match || match.status !== 'in_progress') return;
    if (!currentPlayer || !currentPlayer.isBot) return;

    const isHost = !match.hostUserId || match.hostUserId === user?.uid || match.hostUserId === humanPlayer?.userId;
    if (!isHost) return;

    const timer = setTimeout(async () => {
      try {
        await executeBotTurn(currentPlayer.id);
      } catch {
        // Handled through match error
      }
    }, botSpeedMs);

    return () => clearTimeout(timer);
  }, [autoPlayBots, match?.status, match?.hostUserId, user?.uid, humanPlayer?.userId, currentPlayer?.id, currentPlayer?.isBot, match?.currentPhase, botSpeedMs]);

  // Push Notification Triggers: Your Turn Alert
  const lastNotifiedTurnRef = useRef<number>(-1);
  useEffect(() => {
    if (
      isHumanTurn &&
      canRoll &&
      match &&
      match.status === 'in_progress' &&
      match.turnNumber !== lastNotifiedTurnRef.current
    ) {
      lastNotifiedTurnRef.current = match.turnNumber;
      NotificationService.triggerYourTurn(match.id, 60);
    }
  }, [isHumanTurn, canRoll, match?.turnNumber, match?.id, match?.status]);

  // Push Notification Triggers: Opponent Roll Alert
  const prevBotActionRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentPlayer && currentPlayer.isBot && match?.currentPhase === 'AWAITING_ACTION') {
      const actionKey = `${currentPlayer.id}-${match.turnNumber}-${currentPlayer.currentSpaceIndex}`;
      if (prevBotActionRef.current !== actionKey) {
        prevBotActionRef.current = actionKey;
        const rolledSpace = DEFAULT_STANDARD_SPACES[currentPlayer.currentSpaceIndex];
        NotificationService.triggerOpponentRoll(
          currentPlayer.displayName,
          7,
          rolledSpace?.name || `Space #${currentPlayer.currentSpaceIndex}`
        );
      }
    }
  }, [currentPlayer?.id, currentPlayer?.isBot, match?.currentPhase, match?.turnNumber, currentPlayer?.currentSpaceIndex, currentPlayer?.displayName]);

  // Push Notification Triggers: Auction Outbid Alert
  const prevAuctionHighestBidderRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeAuction && humanPlayer) {
      if (
        prevAuctionHighestBidderRef.current === humanPlayer.id &&
        activeAuction.currentHighestBidderId &&
        activeAuction.currentHighestBidderId !== humanPlayer.id
      ) {
        const bidder = players.find((p) => p.id === activeAuction.currentHighestBidderId);
        const propertyName =
          activeAuction.assetName ||
          DEFAULT_STANDARD_SPACES.find((s) => s.id === activeAuction.assetId)?.name ||
          'Asset Space';
        NotificationService.triggerAuctionOutbid(
          propertyName,
          activeAuction.currentHighestBid,
          bidder?.displayName || 'Rival Investor'
        );
      }
      prevAuctionHighestBidderRef.current = activeAuction.currentHighestBidderId || null;
    } else if (!activeAuction) {
      prevAuctionHighestBidderRef.current = null;
    }
  }, [
    activeAuction?.currentHighestBidderId,
    activeAuction?.currentHighestBid,
    activeAuction?.assetId,
    activeAuction?.assetName,
    humanPlayer?.id,
    players,
  ]);

  // Handle human roll: Generate random result first, then animate 3D dice toward it
  const handleRollDice = async () => {
    if (!canRoll || isRolling || isActionPending) return;

    // Step 1: Generate the random result first for TWO dice
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const totalRoll = d1 + d2;

    // Immediately designate the final face target before launch
    setLastRoll([d1, d2]);

    // 1. Button press effect & start rolling sequence
    setIsRolling(true);

    try {
      // Retain pre-roll space on the board during 3D flight
      const startingSpace = currentPlayer?.currentSpaceIndex ?? 0;
      if (currentPlayer) {
        setBoardPlayerSpaces((prev) => ({
          ...prev,
          [currentPlayer.id]: startingSpace,
        }));
      }

      // Execute authoritative roll recording with predetermined result
      const res = await requestRoll(totalRoll);
      const finalRoll = res.roll;
      const finalSpace = res.newSpace;

      // Ensure the array matches the server's sum if there was an override
      // (If server override exists and doesn't match totalRoll, we split the server's finalRoll)
      if (finalRoll !== totalRoll) {
          const newD1 = Math.min(finalRoll - 1, 6);
          const newD2 = finalRoll - newD1;
          setLastRoll([newD1, newD2]);
      } else {
          setLastRoll([d1, d2]);
      }

      setPendingMovement({
        playerId: currentPlayer?.id || '',
        targetSpace: finalSpace,
        roll: finalRoll,
      });
    } catch {
      setIsRolling(false);
      setPendingMovement(null);
    }
  };

  // 16. Movement system begins once 3D dice lands and result glow appears
  const handleDiceAnimationComplete = (result: number) => {
    setIsRolling(false);

    if (pendingMovement) {
      const { playerId, targetSpace } = pendingMovement;

      // Release board player position override so CircularBoard52 starts token hopping!
      setBoardPlayerSpaces((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });

      setSelectedSpaceIndex(targetSpace);
      setPendingMovement(null);

      // Trigger space action modal once hopping completes (~600ms)
      setTimeout(() => {
        if (isHumanTurn && currentPhase === 'AWAITING_ACTION') {
          setShowLandingModal(true);
        }
      }, 650);
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

          {/* Center: Current Phase Badge & Macro Market Cycle */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 shadow-inner">
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

            {activeMarketEvent?.active && (
              <div
                id="header-macro-event-pill"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono shadow-sm"
                title={`${activeMarketEvent.description} (${activeMarketEvent.roundsRemaining} rounds remaining)`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">{activeMarketEvent.name}</span>
                <span className="text-[10px] text-amber-400/80">({activeMarketEvent.roundsRemaining}R)</span>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Non-stop Background Music Controller */}
            <BackgroundMusicControl />

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

            {/* In-Game Push Notification Drawer */}
            <NotificationCenterDrawer />

            {/* Pause Menu Toggle */}
            <button
              type="button"
              onClick={() => setShowPauseMenu(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1 min-h-[36px] transition-colors"
              title="Pause Menu"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Menu</span>
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

            {/* 52-Space Circular Board with HD Skyscraper & Tree Surround */}
            <div className="w-full flex justify-center">
              <BoardEnvironmentSurround>
                <CircularBoard52
                  players={boardPlayers}
                  currentPlayerId={match?.currentPlayerId || null}
                  selectedSpaceIndex={selectedSpaceIndex}
                  onSelectSpace={(idx) => {
                    setSelectedSpaceIndex(idx);
                    setShowSpacePopOut(true);
                  }}
                  highlightSpaceIndex={currentPlayer?.currentSpaceIndex ?? null}
                />
              </BoardEnvironmentSurround>
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

              <div className="flex items-center gap-3">
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

                <button
                  id="inspect-hd-dossier-btn"
                  type="button"
                  onClick={() => setShowSpacePopOut(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
                  title="Inspect HD Pop-Out & GDD Entails"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>HD Dossier</span>
                </button>
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
            <div id="investors-syndicate-section" className="relative bg-slate-900/75 border border-slate-800/80 rounded-2xl p-3 shadow-md overflow-hidden">
              {/* Subtle HD Scenery Backdrop - strictly contained within Investors Syndicate section */}
              <div className="absolute inset-0 opacity-25 pointer-events-none z-0">
                <img
                  src="https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80"
                  alt="Investors Syndicate Scenery Backdrop"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center filter saturate-[1.2] contrast-[1.1]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-slate-950/80" />
              </div>

              <div className="relative z-10">
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
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isHumanTurn
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isHumanTurn
                    ? 'Your Active Turn'
                    : currentPlayer?.isBot
                    ? `Bot: ${currentPlayer.displayName}`
                    : `Waiting for ${currentPlayer?.displayName || 'Player'}`}
                </span>
              </div>

              {/* Tactile 3D Dice Visualizer */}
              <div className="mb-4">
                <DiceVisualizer
                  lastRoll={lastRoll}
                  isRolling={isRolling}
                  canRoll={canRoll}
                  onRoll={handleRollDice}
                  onAnimationComplete={handleDiceAnimationComplete}
                  disabledReason={
                    !isHumanTurn
                      ? currentPlayer?.isBot
                        ? `Waiting for ${currentPlayer.displayName} (Bot)`
                        : `Waiting for ${currentPlayer?.displayName || 'Opponent'}`
                      : currentPhase !== 'TURN_START'
                      ? 'Turn in progress'
                      : undefined
                  }
                  initialMaterial="glossy-plastic"
                  equippedSkin={equippedSkin}
                  onSkinChange={(skin) => DiceSkinManager.setEquippedSkin(skin)}
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

                {/* Corporate Debt & Mortgage Desk Trigger */}
                {humanPlayer && (
                  <button
                    id="mortgage-restructuring-menu-btn"
                    type="button"
                    onClick={() => setShowDebtModal(true)}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer shadow-md ${
                      humanPlayer.cash < 150
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950/60 animate-pulse font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>
                      {humanPlayer.cash < 150
                        ? '⚠️ Debt Restructure / Mortgage'
                        : `Mortgages & Debt (${(humanPlayer.mortgagedSpaceIds || []).length} Pledged)`}
                    </span>
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

        {/* OVERLAY: HD 52-SPACE GDD POPOUT MODAL */}
        <AnimatePresence>
          {showSpacePopOut && (
            <HDSpacePopOutModal
              spaceIndex={selectedSpaceIndex}
              players={players}
              humanPlayer={humanPlayer}
              isHumanTurn={isHumanTurn}
              currentPhase={currentPhase}
              isActionPending={isActionPending}
              onSelectSpace={(newIdx) => setSelectedSpaceIndex(newIdx)}
              onClose={() => setShowSpacePopOut(false)}
              onBuyProperty={handleBuyProperty}
              onSendToAuction={handleSendToAuction}
              onMortgageProperty={mortgageProperty}
              onUnmortgageProperty={unmortgageProperty}
              onLiquidateProperty={liquidateProperty}
            />
          )}
        </AnimatePresence>

        {/* OVERLAY: CORPORATE DEBT RESTRUCTURING & MORTGAGE MODAL */}
        <AnimatePresence>
          {showDebtModal && humanPlayer && (
            <DebtRestructuringModal
              player={humanPlayer}
              isActionPending={isActionPending}
              onMortgageProperty={mortgageProperty}
              onUnmortgageProperty={unmortgageProperty}
              onLiquidateProperty={liquidateProperty}
              onClose={() => setShowDebtModal(false)}
            />
          )}
        </AnimatePresence>

        {/* OVERLAY: SP TACTICAL ABILITIES MODAL */}
        <AnimatePresence>
          {showSPModal && humanPlayer && (
            <SPActionModal
              player={humanPlayer}
              allPlayers={players}
              isActionPending={isActionPending}
              onExecute={async (actionId, cost, targetId) => {
                try {
                  await executeSPAction(actionId, cost, targetId);
                  setShowSPModal(false);
                } catch {
                  // Handled
                }
              }}
              onClose={() => setShowSPModal(false)}
            />
          )}
        </AnimatePresence>

        {/* OVERLAY: MARKET EVENT / CHOICE BOARDROOM MODAL */}
        <AnimatePresence>
          {pendingMarketChoice && (
            <MarketChoiceModal
              pendingChoice={pendingMarketChoice}
              activeMarketEvent={activeMarketEvent}
              isActionPending={isActionPending}
              onSubmitChoice={async (eventId, choiceId) => {
                try {
                  await submitMarketChoice(eventId, choiceId);
                } catch {
                  // Handled in context
                }
              }}
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

        {/* OVERLAY: PAUSE MENU */}
        <AnimatePresence>
          {showPauseMenu && (
            <PauseMenuOverlay onClose={() => setShowPauseMenu(false)} />
          )}
        </AnimatePresence>

        {/* OVERLAY: BANKRUPTCY CINEMATIC VIGNETTE */}
        <BankruptcyVignetteOverlay
          isOpen={bankruptcyVignetteOpen}
          vignetteId={cosmetics.vignette}
          playerName={bankruptPlayerName}
          onClose={() => setBankruptcyVignetteOpen(false)}
        />
      </div>
    </OrientationGuard>
  );
};
