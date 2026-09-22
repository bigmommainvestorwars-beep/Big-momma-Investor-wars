import React from 'react';
import { Bot, User as UserIcon, Landmark, TrendingUp, Zap, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { PLAYER_PALETTES } from './CircularBoard52';
import { formatBM, formatSP } from '../../utils/currency';
import { DEFAULT_STANDARD_SPACES } from '../../../config/boardConfig';

interface PlayerHUDCardProps {
  player: FirestorePlayerDoc;
  index: number;
  isCurrentTurn: boolean;
  isHuman: boolean;
}

export const PlayerHUDCard: React.FC<PlayerHUDCardProps> = ({
  player,
  index,
  isCurrentTurn,
  isHuman,
}) => {
  const palette = PLAYER_PALETTES[index % PLAYER_PALETTES.length];
  const isBankrupt = player.status === 'bankrupt';
  const isDisconnected = player.status === 'disconnected';

  // Current space details
  const currentSpace = DEFAULT_STANDARD_SPACES[player.currentSpaceIndex] || {
    name: `Space #${player.currentSpaceIndex}`,
  };

  // Persona tags for AI bots
  const getPersonaTag = (name: string) => {
    if (name.includes('Apex')) return 'Quant Apex';
    if (name.includes('Venture')) return 'Growth VC';
    if (name.includes('Bullish')) return 'Momentum';
    if (name.includes('Silicon')) return 'Tech Syndicate';
    return 'Autonomous AI';
  };

  // Status badge config
  const getStatusBadge = () => {
    if (isBankrupt) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-400 text-[9px] font-mono font-bold border border-rose-800">
          ELIMINATED
        </span>
      );
    }
    if (isDisconnected) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-400 text-[9px] font-mono font-bold border border-amber-800">
          DISCONNECTED
        </span>
      );
    }
    if (isCurrentTurn) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          ACTIVE
        </span>
      );
    }
    if (player.isBot) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-800 flex items-center gap-1">
          <Bot className="w-2.5 h-2.5" />
          BOT
        </span>
      );
    }
    if (player.playerTag) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-cyan-300 text-[9px] font-mono font-bold border border-slate-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          {player.playerTag}
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-emerald-400 text-[9px] font-mono flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        ONLINE
      </span>
    );
  };

  return (
    <div
      id={`hud-player-${player.id}`}
      className={`relative rounded-xl p-2.5 transition-all duration-200 border ${
        isBankrupt
          ? 'bg-slate-950/50 border-rose-900/30 opacity-50'
          : isCurrentTurn
          ? `bg-slate-900/95 ${palette.border} ring-2 ring-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]`
          : 'bg-slate-900/60 border-slate-800/70 hover:border-slate-700/80'
      }`}
    >
      {/* Top Header Row: Token/Avatar, Name, Badges */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Token Marker */}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border border-slate-900 shadow-inner ${palette.bg} ${palette.text}`}
          >
            {isHuman ? (
              <span className="text-xs">👑</span>
            ) : (
              <Bot className="w-4 h-4 text-slate-900" />
            )}
          </div>

          {/* Name & Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-100 truncate">
                {player.displayName}
              </span>
              {player.rating && (
                <span className="text-[8px] font-mono text-slate-400 shrink-0">
                  {player.rating}
                </span>
              )}
              {isHuman && (
                <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[8px] font-mono font-bold border border-cyan-800 shrink-0">
                  YOU
                </span>
              )}
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
              <span className="truncate">#{player.currentSpaceIndex} {currentSpace.name}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {getStatusBadge()}
        </div>
      </div>

      {/* Metrics Row: Cash, Net Worth, SP, Assets */}
      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
        {/* Cash */}
        <div className="bg-slate-950/80 rounded p-1 border border-slate-800/60">
          <span className="text-[8px] text-slate-400 uppercase block">Cash</span>
          <span className="font-bold text-emerald-400 truncate block text-[11px]">
            {formatBM(player.cash)}
          </span>
        </div>

        {/* Net Worth */}
        <div className="bg-slate-950/80 rounded p-1 border border-slate-800/60">
          <span className="text-[8px] text-slate-400 uppercase block">Net Worth</span>
          <span className="font-bold text-slate-200 truncate block text-[11px]">
            {formatBM(player.netWorth)}
          </span>
        </div>

        {/* Strategy Points */}
        <div className="bg-slate-950/80 rounded p-1 border border-slate-800/60">
          <span className="text-[8px] text-slate-400 uppercase block">SP</span>
          <span className="font-bold text-indigo-300 truncate block text-[11px]">
            {formatSP(player.specialPoints)}
          </span>
        </div>

        {/* Holdings count */}
        <div className="bg-slate-950/80 rounded p-1 border border-slate-800/60">
          <span className="text-[8px] text-slate-400 uppercase block">Assets</span>
          <span className="font-bold text-cyan-300 truncate block text-[11px]">
            {(player.ownedSpaceIds || []).length} / 38
          </span>
        </div>
      </div>
    </div>
  );
};
