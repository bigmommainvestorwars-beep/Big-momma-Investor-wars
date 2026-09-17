import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Gavel,
  ShieldCheck,
  TrendingUp,
  Landmark,
  Zap,
  Info,
  CheckCircle2,
  Coins,
  Compass,
  Lock,
  Unlock,
  Trash2,
} from 'lucide-react';
import { DEFAULT_STANDARD_SPACES } from '../../../../config/boardConfig';
import { BoardSpace } from '../../../../types/board';
import { FirestorePlayerDoc } from '../../../../services/firebase/matchSyncService';
import { formatBM, formatSP } from '../../../utils/currency';
import { BOARD_GROUP_THEMES, PLAYER_PALETTES } from '../CircularBoard52';
import { SPACE_GDD_REGISTRY } from './spaceGddData';
import { SpaceEntailAnimation } from './SpaceEntailAnimation';
import { diceAudio } from '../dice/diceAudio';

interface HDSpacePopOutModalProps {
  spaceIndex: number;
  players: FirestorePlayerDoc[];
  humanPlayer: FirestorePlayerDoc | null;
  isHumanTurn: boolean;
  currentPhase: string;
  isActionPending: boolean;
  onSelectSpace: (index: number) => void;
  onClose: () => void;
  onBuyProperty?: () => void;
  onSendToAuction?: () => void;
  onMortgageProperty?: (spaceId: string) => Promise<void>;
  onUnmortgageProperty?: (spaceId: string) => Promise<void>;
  onLiquidateProperty?: (spaceId: string) => Promise<void>;
}

export const HDSpacePopOutModal: React.FC<HDSpacePopOutModalProps> = ({
  spaceIndex,
  players,
  humanPlayer,
  isHumanTurn,
  currentPhase,
  isActionPending,
  onSelectSpace,
  onClose,
  onBuyProperty,
  onSendToAuction,
  onMortgageProperty,
  onUnmortgageProperty,
  onLiquidateProperty,
}) => {
  const totalSpaces = 52;
  const currentSpace: BoardSpace = DEFAULT_STANDARD_SPACES[spaceIndex] || DEFAULT_STANDARD_SPACES[0];
  const gddData = SPACE_GDD_REGISTRY[spaceIndex] || SPACE_GDD_REGISTRY[0];
  const groupTheme = currentSpace.group ? BOARD_GROUP_THEMES[currentSpace.group] : null;

  // Space ownership check
  const owner = React.useMemo(() => {
    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      const p = players[pIdx];
      if (p.ownedSpaceIds?.includes(currentSpace.id)) {
        return {
          player: p,
          playerIndex: pIdx,
          palette: PLAYER_PALETTES[pIdx % PLAYER_PALETTES.length],
        };
      }
    }
    return null;
  }, [players, currentSpace.id]);

  // Can the user buy or auction this space right now?
  const isLandedByHuman = humanPlayer?.currentSpaceIndex === spaceIndex;
  const canActOnProperty =
    isHumanTurn &&
    isLandedByHuman &&
    (currentSpace.type === 'property' || currentSpace.type === 'company') &&
    !owner &&
    currentPhase === 'AWAITING_ACTION';

  const canAfford = humanPlayer && currentSpace.baseCost ? humanPlayer.cash >= currentSpace.baseCost : false;
  const isOwnedByHuman = owner?.player.id === humanPlayer?.id;
  const isMortgaged = owner?.player.mortgagedSpaceIds?.includes(currentSpace.id) || false;
  const mortgageValue = Math.round((currentSpace.baseCost || 100) * 0.5);
  const redemptionCost = Math.round((currentSpace.baseCost || 100) * 0.55);

  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [spaceIndex]);

  const navigatePrev = useCallback(() => {
    const nextIdx = (spaceIndex - 1 + totalSpaces) % totalSpaces;
    diceAudio.playHDPopOutSound(nextIdx);
    onSelectSpace(nextIdx);
  }, [spaceIndex, totalSpaces, onSelectSpace]);

  const navigateNext = useCallback(() => {
    const nextIdx = (spaceIndex + 1) % totalSpaces;
    diceAudio.playHDPopOutSound(nextIdx);
    onSelectSpace(nextIdx);
  }, [spaceIndex, totalSpaces, onSelectSpace]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigatePrev, navigateNext, onClose]);

  // Sound feedback on mount
  useEffect(() => {
    diceAudio.playHDPopOutSound(spaceIndex);
  }, [spaceIndex]);

  return (
    <div
      id="hd-space-popout-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xl select-none"
      onClick={onClose}
    >
      <motion.div
        key={spaceIndex}
        initial={{ opacity: 0, scale: 0.85, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20, rotateX: -6 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border-2 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col text-slate-100"
        style={{
          perspective: 1200,
          borderColor: gddData.accentColor ? `${gddData.accentColor}70` : '#334155',
          boxShadow: `0 0 40px ${gddData.accentColor}33`,
        }}
      >
        {/* TOP HD HERO BANNER WITH THEMATIC PHOTOGRAPHY & GRADIENT */}
        <div className="relative w-full h-36 sm:h-44 shrink-0 overflow-hidden rounded-t-2xl bg-slate-950">
          {/* Ambient theme fallback & loading aura */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${gddData.accentColor}30 0%, #030712 90%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle, ${gddData.accentColor}40 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />
          </div>

          {!imageError && (
            <img
              key={gddData.imageUrl}
              src={gddData.imageUrl}
              alt={currentSpace.name}
              referrerPolicy="no-referrer"
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover object-center filter saturate-125 brightness-90 transition-opacity duration-300 hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-950/40 pointer-events-none" />

          {/* Top Bar Controls */}
          <div className="absolute top-3 inset-x-3 sm:inset-x-4 flex items-center justify-between z-20">
            {/* Sector / Type Pill */}
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider font-mono shadow-md border flex items-center gap-1.5"
                style={{
                  backgroundColor: `${gddData.accentColor}25`,
                  borderColor: gddData.accentColor,
                  color: gddData.accentColor,
                }}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Space #{currentSpace.index}</span>
                <span>•</span>
                <span>{currentSpace.group || currentSpace.type.toUpperCase()}</span>
              </span>

              {owner && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase shadow border"
                  style={{
                    backgroundColor: `${owner.palette.hex}30`,
                    borderColor: owner.palette.hex,
                    color: owner.palette.hex,
                  }}
                >
                  Claimed: {owner.player.displayName.split(' ')[0]}
                </span>
              )}
            </div>

            {/* Close Button */}
            <button
              id="hd-popout-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg"
              title="Close Space Dossier (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Space Title in Hero */}
          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide leading-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-white to-slate-300 drop-shadow">
                {currentSpace.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium drop-shadow mt-0.5">
                {gddData.tagline}
              </p>
            </div>

            {currentSpace.baseCost ? (
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Acquisition</span>
                <span className="text-lg sm:text-xl font-black font-mono text-emerald-400 drop-shadow">
                  {formatBM(currentSpace.baseCost)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* SECTION 1: BESPOKE 60 FPS PROCEDURAL ANIMATION FOR THIS EXACT SPACE */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs font-mono uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: gddData.accentColor }}>
                <Zap className="w-3.5 h-3.5" />
                <span>GDD Animated Kinetic Simulation</span>
              </span>
              <span className="text-[10px] text-slate-500">HD 60 FPS Engine</span>
            </div>

            {/* Embedded 60 FPS Procedural Simulation Canvas */}
            <SpaceEntailAnimation
              spaceIndex={currentSpace.index}
              animationType={gddData.animationType}
              accentColor={gddData.accentColor}
              secondaryColor={gddData.secondaryColor}
              className="w-full h-40 sm:h-44 shadow-inner"
            />
          </div>

          {/* SECTION 2: GDD STRATEGIC ENTAILS & FINANCIAL METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Strategic Utility */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1">
                  Strategic Utility
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {gddData.strategicUtility}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Sector Role:</span>
                <span className="font-bold text-slate-200">{gddData.sector}</span>
              </div>
            </div>

            {/* Monopoly Synergy */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                  Monopoly & Sector Synergy
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {gddData.monopolySynergy}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Sector Siblings:</span>
                <span className="font-bold text-slate-200">
                  {gddData.siblings.length > 0
                    ? gddData.siblings.map((s) => `#${s}`).join(', ')
                    : 'Independent'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: RENT & PROGRESSION LADDER */}
          {currentSpace.rentTiers && currentSpace.rentTiers.length > 0 ? (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-2">
                Yield Progression Ladder (Toll Schedule)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {currentSpace.rentTiers.map((tier, tIdx) => {
                  const label =
                    tIdx === 0
                      ? 'Base Rent'
                      : tIdx === currentSpace.rentTiers!.length - 1
                      ? 'Apex Monopoly'
                      : `Tier ${tIdx}`;
                  return (
                    <div
                      key={tIdx}
                      className={`p-2 rounded-lg border text-center font-mono ${
                        tIdx === currentSpace.rentTiers!.length - 1
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="text-[9px] text-slate-400 uppercase">{label}</div>
                      <div className="text-xs font-bold mt-0.5 font-mono text-emerald-400">
                        {formatBM(tier)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentSpace.type === 'sp_station' ? (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-indigo-200">Strategy Point Allocation</div>
                  <div className="text-[10px] text-indigo-400">
                    Directly enhances your tactical war-room action reserve.
                  </div>
                </div>
              </div>
              <span className="text-base font-mono font-black text-indigo-300">
                {currentSpace.description || '+SP'}
              </span>
            </div>
          ) : null}

          {/* SECTION 4: GDD CONFIDENTIAL INTELLIGENCE BRIEFING */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              GDD Intelligence Briefing
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              {gddData.loreDossier}
            </p>
          </div>

          {/* SECTION 5: CONTEXTUAL IN-GAME ACTION BUTTONS IF LANDED */}
          {canActOnProperty && onBuyProperty && onSendToAuction && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>You have landed on this property!</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Your Balance: {formatBM(humanPlayer?.cash || 0)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onBuyProperty}
                  disabled={!canAfford || isActionPending}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer shadow-lg ${
                    canAfford
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Acquire ({formatBM(currentSpace.baseCost || 0)})</span>
                </button>

                <button
                  type="button"
                  onClick={onSendToAuction}
                  disabled={isActionPending}
                  className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer shadow-lg shadow-amber-950/60"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Send to Auction</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 5B: OWNER DEBT RESTRUCTURING & MORTGAGE CONTROLS */}
          {isOwnedByHuman && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  <span>Corporate Asset & Debt Restructuring</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    isMortgaged
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isMortgaged ? 'Mortgaged to Bank' : 'Unencumbered Deed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {!isMortgaged ? (
                  <button
                    type="button"
                    onClick={() => onMortgageProperty && onMortgageProperty(currentSpace.id)}
                    disabled={isActionPending}
                    className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer shadow-lg shadow-amber-950/60 disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Mortgage (+{formatBM(mortgageValue)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUnmortgageProperty && onUnmortgageProperty(currentSpace.id)}
                    disabled={isActionPending || (humanPlayer?.cash || 0) < redemptionCost}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer shadow-lg shadow-emerald-950/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Lift Mortgage (-{formatBM(redemptionCost)})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onLiquidateProperty && onLiquidateProperty(currentSpace.id)}
                  disabled={isActionPending}
                  className="py-2.5 px-3 bg-rose-700/90 hover:bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer shadow-lg shadow-rose-950/60 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isMortgaged ? 'Foreclose Deed' : `Liquidate (+${formatBM(mortgageValue)})`}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                {isMortgaged
                  ? 'Rent collection currently paused while mortgaged to central bank.'
                  : 'Pledge for 50% ƁM value (rent paused) or liquidate permanently to bank treasury.'}
              </p>
            </div>
          )}

          {/* FOOTER: NAVIGATION CONTROLS ACROSS ALL 52 SPACES */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              id="hd-popout-prev-btn"
              type="button"
              onClick={navigatePrev}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              title="Previous Space (Arrow Left)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-mono">#{((spaceIndex - 1 + totalSpaces) % totalSpaces)} Prev</span>
            </button>

            {/* Direct Space Quick Select */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Jump to:</span>
              <select
                id="hd-popout-space-select"
                value={spaceIndex}
                onChange={(e) => {
                  const target = Number(e.target.value);
                  diceAudio.playHDPopOutSound(target);
                  onSelectSpace(target);
                }}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                {DEFAULT_STANDARD_SPACES.map((s) => (
                  <option key={s.index} value={s.index}>
                    #{s.index}: {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="hd-popout-next-btn"
              type="button"
              onClick={navigateNext}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              title="Next Space (Arrow Right)"
            >
              <span className="text-[11px] font-mono">Next #{((spaceIndex + 1) % totalSpaces)}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
