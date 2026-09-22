import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Zap,
  Landmark,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Gavel,
  Check,
  MapPin,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { DEFAULT_STANDARD_SPACES } from '../../../config/boardConfig';
import { BoardSpace } from '../../../types/board';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { formatBM } from '../../utils/currency';

// The 52 spaces total
const TOTAL_SPACES = 52;

// Group styling for 52-space board
export const BOARD_GROUP_THEMES: Record<
  string,
  { barColor: string; textColor: string; borderColor: string; glow: string; label: string }
> = {
  'Seed Stage': {
    barColor: 'bg-amber-500',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    glow: 'rgba(245, 158, 11, 0.4)',
    label: 'Seed Stage',
  },
  Transport: {
    barColor: 'bg-slate-400',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-500/50',
    glow: 'rgba(148, 163, 184, 0.4)',
    label: 'Transit',
  },
  'Cyber & Quantum': {
    barColor: 'bg-cyan-400',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    glow: 'rgba(6, 182, 212, 0.4)',
    label: 'Cyber/Quantum',
  },
  BioTech: {
    barColor: 'bg-emerald-400',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    glow: 'rgba(16, 185, 129, 0.4)',
    label: 'BioTech',
  },
  'Energy Utility': {
    barColor: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/50',
    glow: 'rgba(234, 179, 8, 0.4)',
    label: 'Utility',
  },
  'CleanTech Energy': {
    barColor: 'bg-teal-400',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-500/50',
    glow: 'rgba(20, 184, 166, 0.4)',
    label: 'CleanTech',
  },
  Fintech: {
    barColor: 'bg-blue-400',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    glow: 'rgba(59, 130, 246, 0.4)',
    label: 'Fintech',
  },
  'Artificial Intelligence': {
    barColor: 'bg-purple-400',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    glow: 'rgba(168, 85, 247, 0.4)',
    label: 'AI Core',
  },
  'Global Titans': {
    barColor: 'bg-rose-400',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    glow: 'rgba(244, 63, 94, 0.4)',
    label: 'Titans',
  },
  'Wall Street Apex': {
    barColor: 'bg-amber-300',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400/60',
    glow: 'rgba(251, 191, 36, 0.5)',
    label: 'Apex Wall St',
  },
};

export const PLAYER_PALETTES = [
  {
    id: 0,
    bg: 'bg-emerald-500',
    text: 'text-emerald-950',
    border: 'border-emerald-400',
    ring: 'ring-emerald-400',
    glow: 'rgba(16, 185, 129, 0.7)',
    hex: '#10b981',
  },
  {
    id: 1,
    bg: 'bg-amber-500',
    text: 'text-amber-950',
    border: 'border-amber-400',
    ring: 'ring-amber-400',
    glow: 'rgba(245, 158, 11, 0.7)',
    hex: '#f59e0b',
  },
  {
    id: 2,
    bg: 'bg-purple-500',
    text: 'text-purple-950',
    border: 'border-purple-400',
    ring: 'ring-purple-400',
    glow: 'rgba(168, 85, 247, 0.7)',
    hex: '#a855f7',
  },
  {
    id: 3,
    bg: 'bg-cyan-500',
    text: 'text-cyan-950',
    border: 'border-cyan-400',
    ring: 'ring-cyan-400',
    glow: 'rgba(6, 182, 212, 0.7)',
    hex: '#06b6d4',
  },
];

interface CircularBoard52Props {
  players: FirestorePlayerDoc[];
  currentPlayerId: string | null;
  selectedSpaceIndex: number;
  onSelectSpace: (index: number) => void;
  highlightSpaceIndex?: number | null;
}

export const CircularBoard52: React.FC<CircularBoard52Props> = ({
  players,
  currentPlayerId,
  selectedSpaceIndex,
  onSelectSpace,
  highlightSpaceIndex,
}) => {
  // Track continuous animated positions for players (handling multi-step forward movement)
  const [animatedSpacePositions, setAnimatedSpacePositions] = useState<Record<string, number>>({});
  const prevPlayerSpaces = useRef<Record<string, number>>({});

  useEffect(() => {
    players.forEach((p) => {
      const prev = prevPlayerSpaces.current[p.id];
      const target = p.currentSpaceIndex;

      if (prev === undefined) {
        // Initial setup
        prevPlayerSpaces.current[p.id] = target;
        setAnimatedSpacePositions((curr) => ({ ...curr, [p.id]: target }));
      } else if (prev !== target) {
        // Multi-step forward hop animation
        const steps: number[] = [];
        let cur = prev;
        while (cur !== target) {
          cur = (cur + 1) % TOTAL_SPACES;
          steps.push(cur);
        }

        prevPlayerSpaces.current[p.id] = target;

        // Step by step animation
        steps.forEach((stepSpace, idx) => {
          setTimeout(() => {
            setAnimatedSpacePositions((curr) => ({ ...curr, [p.id]: stepSpace }));
          }, idx * 70); // 70ms per hop for snappy responsive feel
        });
      }
    });
  }, [players]);

  // Ownership map
  const spaceOwnersMap = useMemo(() => {
    const map = new Map<
      number,
      { playerId: string; playerIndex: number; displayName: string; isMortgaged: boolean }
    >();
    players.forEach((p, pIdx) => {
      (p.ownedSpaceIds || []).forEach((sId) => {
        const sp = DEFAULT_STANDARD_SPACES.find((s) => s.id === sId);
        if (sp) {
          map.set(sp.index, {
            playerId: p.id,
            playerIndex: pIdx,
            displayName: p.displayName,
            isMortgaged: (p.mortgagedSpaceIds || []).includes(sId),
          });
        }
      });
    });
    return map;
  }, [players]);

  // Group players by current (animated) space for collision-free token offsetting
  const spaceToPlayersMap = useMemo(() => {
    const map = new Map<number, FirestorePlayerDoc[]>();
    players.forEach((p) => {
      const spaceIdx = animatedSpacePositions[p.id] ?? p.currentSpaceIndex;
      const list = map.get(spaceIdx) || [];
      list.push(p);
      map.set(spaceIdx, list);
    });
    return map;
  }, [players, animatedSpacePositions]);

  return (
    <div className="relative w-full aspect-square max-w-[820px] max-h-[820px] flex items-center justify-center select-none">
      {/* Outer Glow Halo */}
      <div className="absolute inset-[3%] rounded-full bg-cyan-500/5 blur-2xl pointer-events-none" />

      {/* Main Outer Circular Rim Track */}
      <div className="relative w-full h-full rounded-full bg-slate-950 border-[6px] sm:border-[8px] border-slate-800/90 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
        
        {/* Subtle Radial Measurement Ticks */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/15 pointer-events-none" />
        <div className="absolute inset-[15%] rounded-full border border-emerald-500/15 pointer-events-none" />
        <div className="absolute inset-[25%] rounded-full border border-slate-700/40 pointer-events-none" />

        {/* Central Financial District Core / Centerpiece */}
        <div className="absolute inset-[17%] rounded-full bg-gradient-to-br from-[#060b18] via-[#091124] to-[#040711] border-2 sm:border-4 border-slate-700/60 shadow-[inset_0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col items-center justify-center z-10 pointer-events-none">
          {/* Subtle HD Skyscrapers & Trees Skylight Reflection */}
          <div className="absolute inset-0 opacity-35 mix-blend-screen pointer-events-none">
            <img
              src="https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80"
              alt="Central Park Skyscrapers and Trees"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter saturate-150 contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#060b18]/60 via-transparent to-[#040711]/75" />
          </div>

          {/* Inner Grid Conduits */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Central Logo & Atmosphere */}
          <div className="relative z-10 text-center flex flex-col items-center p-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-indigo-500/20 border border-emerald-400/40 flex items-center justify-center mb-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>

            <div className="text-[8px] sm:text-[10px] font-black tracking-[0.35em] uppercase text-emerald-400 mb-0.5">
              BIG MOMMA
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-[0.18em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-indigo-300 leading-tight">
              INVESTORS' WAR
            </h1>
            <div className="text-[8px] sm:text-[10px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase mt-0.5">
              Financial District • 52 Spaces
            </div>

            {/* Subtle Live Indicator Ribbon */}
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-slate-800 text-[8px] sm:text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Authoritative Engine</span>
            </div>
          </div>
        </div>

        {/* 52 RADIAL BOARD SPACES */}
        {DEFAULT_STANDARD_SPACES.map((space) => {
          const angle = (space.index / TOTAL_SPACES) * 360;
          const owner = spaceOwnersMap.get(space.index);
          const isSelected = selectedSpaceIndex === space.index;
          const isHighlighted = highlightSpaceIndex === space.index;
          const groupTheme = space.group ? BOARD_GROUP_THEMES[space.group] : null;

          return (
            <div
              key={space.id}
              className="absolute inset-0 pointer-events-none origin-center"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              {/* Space Tile (Top edge of container, oriented facing the center) */}
              <div
                id={`board-space-${space.index}`}
                onClick={() => onSelectSpace(space.index)}
                className={`absolute top-[0.6%] left-1/2 -translate-x-1/2 w-[5.6%] h-[15.8%] pointer-events-auto cursor-pointer rounded-t-sm rounded-b-xs overflow-hidden transition-all duration-150 flex flex-col items-center justify-between border ${
                  isSelected
                    ? 'ring-2 ring-cyan-300 scale-110 z-30 shadow-[0_0_15px_#22d3ee]'
                    : isHighlighted
                    ? 'ring-2 ring-emerald-400 scale-105 z-25 shadow-[0_0_12px_#34d399]'
                    : owner
                    ? `${PLAYER_PALETTES[owner.playerIndex % PLAYER_PALETTES.length].border} shadow-[0_0_8px_${PLAYER_PALETTES[owner.playerIndex % PLAYER_PALETTES.length].glow}]`
                    : 'border-slate-700/60 hover:border-slate-400 hover:scale-105 hover:z-20'
                } ${
                  space.type === 'start'
                    ? 'bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950'
                    : space.type === 'sp_station'
                    ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950'
                    : space.type === 'penalty'
                    ? 'bg-gradient-to-b from-rose-950/80 via-slate-900 to-slate-950'
                    : space.type === 'market_event'
                    ? 'bg-gradient-to-b from-amber-950/70 via-slate-900 to-slate-950'
                    : 'bg-slate-900/95'
                }`}
                title={`${space.name} (Space #${space.index})`}
              >
                {/* Top Category Color Bar */}
                <div
                  className={`w-full h-[18%] shrink-0 flex items-center justify-center ${
                    groupTheme
                      ? groupTheme.barColor
                      : space.type === 'start'
                      ? 'bg-emerald-500'
                      : space.type === 'sp_station'
                      ? 'bg-indigo-500'
                      : space.type === 'penalty'
                      ? 'bg-rose-500'
                      : space.type === 'market_event'
                      ? 'bg-amber-500'
                      : space.type === 'auction'
                      ? 'bg-cyan-500'
                      : 'bg-slate-600'
                  }`}
                >
                  <span className="text-[5px] sm:text-[6px] font-mono font-black text-slate-950 uppercase leading-none">
                    #{space.index}
                  </span>
                </div>

                {/* Content facing inward toward the hub */}
                <div className="flex-1 w-full flex flex-col items-center justify-center px-0.5 py-0.5 text-center leading-[1.05] relative">
                  <span className="text-[5px] sm:text-[6.5px] md:text-[7.5px] font-black tracking-tighter text-slate-200 uppercase line-clamp-2 w-full break-words">
                    {space.name}
                  </span>

                  {space.baseCost ? (
                    <span className="text-[5.5px] sm:text-[7px] md:text-[8px] font-mono font-bold text-emerald-400 mt-0.5">
                      {formatBM(space.baseCost)}
                    </span>
                  ) : space.type === 'sp_station' ? (
                    <span className="text-[5.5px] sm:text-[7px] md:text-[8px] font-mono font-bold text-indigo-300 mt-0.5">
                      +SP
                    </span>
                  ) : null}

                  {owner?.isMortgaged && (
                    <div className="absolute inset-x-0 bottom-0.5 bg-amber-950/90 border-y border-amber-500/50 py-0.5 text-center pointer-events-none">
                      <span className="text-[4px] sm:text-[4.5px] font-mono font-black text-amber-300 uppercase tracking-tight block leading-none">
                        MORTGAGED
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Ownership Pip */}
                {owner && (
                  <div
                    className={`w-full h-[14%] shrink-0 ${
                      owner.isMortgaged
                        ? 'bg-amber-500'
                        : PLAYER_PALETTES[owner.playerIndex % PLAYER_PALETTES.length].bg
                    } flex items-center justify-center`}
                    title={
                      owner.isMortgaged
                        ? `Mortgaged to bank by ${owner.displayName}`
                        : `Owned by ${owner.displayName}`
                    }
                  >
                    <span className="text-[4px] sm:text-[5px] font-black text-slate-950 uppercase leading-none">
                      {owner.isMortgaged ? 'M' : owner.displayName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* MULTI-PLAYER COLLISION-FREE TOKENS */}
        {players.map((p, pIdx) => {
          const spaceIdx = animatedSpacePositions[p.id] ?? p.currentSpaceIndex;
          const playersOnThisSpace = spaceToPlayersMap.get(spaceIdx) || [p];
          const rankInGroup = playersOnThisSpace.findIndex((item) => item.id === p.id);
          const totalInGroup = playersOnThisSpace.length;

          // Angular & radial displacement when 2+ players share the exact space
          const baseAngle = (spaceIdx / TOTAL_SPACES) * 360;
          // Offset angularly by up to ±2 degrees per extra player
          const angleOffset = totalInGroup > 1 ? (rankInGroup - (totalInGroup - 1) / 2) * 2.6 : 0;
          const tokenAngle = baseAngle + angleOffset;

          // Stagger radial position if overlapping
          const radialTop = totalInGroup > 1 && rankInGroup % 2 === 1 ? '1.8%' : '0.4%';

          const palette = PLAYER_PALETTES[pIdx % PLAYER_PALETTES.length];
          const isTurn = p.id === currentPlayerId;

          return (
            <motion.div
              key={p.id}
              animate={{ rotate: tokenAngle }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none origin-center z-40"
            >
              {/* Token marker positioned on the space track */}
              <div
                style={{ top: radialTop }}
                className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 ${
                  isTurn
                    ? `${palette.border} ring-4 ring-emerald-400/60 shadow-[0_0_15px_#10b981]`
                    : 'border-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                } ${palette.bg} ${palette.text} flex items-center justify-center font-black text-[8px] sm:text-[10px] md:text-xs select-none`}
                title={`${p.displayName} (${p.isBot ? 'AI Bot' : 'Human'}) on Space #${spaceIdx}`}
              >
                {p.isBot ? <Bot className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" /> : p.displayName.charAt(0)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
