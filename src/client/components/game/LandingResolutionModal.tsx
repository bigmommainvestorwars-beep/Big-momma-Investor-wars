import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Gavel,
  Landmark,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import { BoardSpace } from '../../../types/board';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { BOARD_GROUP_THEMES, PLAYER_PALETTES } from './CircularBoard52';
import { formatBM } from '../../utils/currency';

interface LandingResolutionModalProps {
  space: BoardSpace | null;
  owner: { playerId: string; playerIndex: number; displayName: string } | null;
  humanPlayer: FirestorePlayerDoc | null;
  isHumanTurn: boolean;
  currentPhase: string;
  isActionPending: boolean;
  onBuyProperty: () => void;
  onSendToAuction: () => void;
  onDismiss: () => void;
}

export const LandingResolutionModal: React.FC<LandingResolutionModalProps> = ({
  space,
  owner,
  humanPlayer,
  isHumanTurn,
  currentPhase,
  isActionPending,
  onBuyProperty,
  onSendToAuction,
  onDismiss,
}) => {
  if (!space) return null;

  const isPurchasable =
    (space.type === 'property' || space.type === 'company') && !owner && currentPhase === 'AWAITING_ACTION';
  const groupTheme = space.group ? BOARD_GROUP_THEMES[space.group] : null;
  const canAfford = humanPlayer && space.baseCost ? humanPlayer.cash >= space.baseCost : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header Ribbon */}
        <div
          className={`px-5 py-3 flex items-center justify-between text-slate-950 font-black text-xs uppercase tracking-wider ${
            groupTheme
              ? groupTheme.barColor
              : space.type === 'start'
              ? 'bg-emerald-500'
              : space.type === 'penalty'
              ? 'bg-rose-500 text-white'
              : space.type === 'sp_station'
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>Space #{space.index}</span>
            <span>•</span>
            <span>{space.group || space.type.toUpperCase()}</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded hover:bg-black/10 transition-colors text-slate-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-xl font-black text-slate-100 leading-snug">{space.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{space.description || 'Standard corporate financial asset.'}</p>
          </div>

          {/* Unowned Property: Investment Card */}
          {isPurchasable && (
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-slate-400 uppercase">Acquisition Cost</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{formatBM(space.baseCost)}</span>
                </div>

                {space.rentTiers && space.rentTiers.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Projected Rent Yields</div>
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                      <div className="bg-slate-900 rounded p-1">
                        <span className="text-slate-400 block">Base</span>
                        <span className="text-emerald-400 font-bold">{formatBM(space.rentTiers[0])}</span>
                      </div>
                      <div className="bg-slate-900 rounded p-1">
                        <span className="text-slate-400 block">Tier 2</span>
                        <span className="text-emerald-400 font-bold">{formatBM(space.rentTiers[1] || space.rentTiers[0] * 2)}</span>
                      </div>
                      <div className="bg-slate-900 rounded p-1">
                        <span className="text-slate-400 block">Apex</span>
                        <span className="text-emerald-400 font-bold">{formatBM(space.rentTiers[space.rentTiers.length - 1])}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons if Human Turn */}
              {isHumanTurn ? (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onBuyProperty}
                    disabled={isActionPending || !canAfford}
                    className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all min-h-[44px] ${
                      canAfford
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-95 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{canAfford ? 'Acquire Property' : 'Insufficient Funds'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onSendToAuction}
                    disabled={isActionPending}
                    className="py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 active:scale-95 transition-all min-h-[44px] cursor-pointer"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>Send to Auction</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-xs font-mono text-slate-400">
                  Investor evaluating acquisition opportunity...
                </div>
              )}
            </div>
          )}

          {/* Owned by Opponent: Rent notice */}
          {owner && (
            <div className="p-3 bg-amber-950/30 border border-amber-600/40 rounded-xl space-y-1 text-center">
              <div className="text-xs font-mono text-amber-400 uppercase">Controlled Asset</div>
              <div className="text-sm font-bold text-slate-200">
                Proprietary holding of <span className="text-amber-300 font-black">{owner.displayName}</span>.
              </div>
              <div className="text-xs text-slate-400">
                Authoritative rent payment processed automatically.
              </div>
            </div>
          )}

          {/* START space notice */}
          {space.type === 'start' && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-xl text-center space-y-1">
              <Landmark className="w-6 h-6 text-emerald-400 mx-auto" />
              <div className="text-sm font-black text-emerald-300">+200 ƁM Capital Grant</div>
              <div className="text-xs text-slate-300">Founding investor stipend credited to treasury.</div>
            </div>
          )}

          {/* SP Station notice */}
          {space.type === 'sp_station' && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-600/40 rounded-xl text-center space-y-1">
              <Zap className="w-6 h-6 text-indigo-400 mx-auto" />
              <div className="text-sm font-black text-indigo-300">+25 Strategy Points Gained</div>
              <div className="text-xs text-slate-300">Strategic capacity upgraded for tactical takeover actions.</div>
            </div>
          )}

          {/* Penalty notice */}
          {space.type === 'penalty' && (
            <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded-xl text-center space-y-1">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <div className="text-sm font-black text-rose-300">Regulatory Tax Audit</div>
              <div className="text-xs text-slate-300">Tax assessment of {formatBM(space.baseCost || 150)} settled with oversight agency.</div>
            </div>
          )}

          {/* Market Event notice */}
          {space.type === 'market_event' && (
            <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-center space-y-1">
              <TrendingUp className="w-6 h-6 text-amber-400 mx-auto" />
              <div className="text-sm font-black text-amber-300">Angel Syndicate Dividend</div>
              <div className="text-xs text-slate-300">Private syndicate dividend of +100 ƁM deposited.</div>
            </div>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors min-h-[44px]"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
};
