import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Shield, Eye, TrendingDown, Lock, Skull, X, Check, Crosshair } from 'lucide-react';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { formatSP, formatBM } from '../../utils/currency';
import { DEFAULT_STANDARD_SPACES } from '../../../config/boardConfig';
import { BoardSpace } from '../../../types/board';

interface SPActionModalProps {
  player: FirestorePlayerDoc;
  allPlayers?: FirestorePlayerDoc[];
  isActionPending: boolean;
  onExecute: (actionId: string, spCost: number, targetId?: string) => void;
  onClose: () => void;
}

interface Ability {
  id: string;
  name: string;
  cost: number;
  description: string;
  effect: string;
  icon: React.ReactNode;
  requiresTarget: boolean;
  targetType?: 'player' | 'space';
}

const AVAILABLE_ABILITIES: Ability[] = [
  {
    id: 'strategic_liquidity',
    name: 'Strategic Liquidity Injection',
    cost: 25,
    description: 'Convert tactical strategic influence into emergency institutional cash flow.',
    effect: '+75 ƁM Liquid Capital directly to treasury',
    icon: <Zap className="w-5 h-5 text-indigo-400" />,
    requiresTarget: false,
  },
  {
    id: 'market_intelligence',
    name: 'Syndicate Market Intelligence',
    cost: 35,
    description: 'Intercept high-value market events and boost property returns across holdings.',
    effect: 'Activates 1.5x yield multiplier bonus on all owned companies for 2 rounds',
    icon: <Eye className="w-5 h-5 text-cyan-400" />,
    requiresTarget: false,
  },
  {
    id: 'regulatory_shield',
    name: 'Regulatory Harbor Shield',
    cost: 30,
    description: 'Deploy legal contingency reserves against immediate regulatory penalties.',
    effect: 'Immunizes against next SEC audit penalty assessment',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    requiresTarget: false,
  },
  {
    id: 'hostile_takeover',
    name: 'Hostile Takeover Bid',
    cost: 50,
    description: 'Launch aggressive buyout raid to forcibly seize an un-monopolized rival property.',
    effect: 'Forcibly transfers target property from rival at 1.5x base cost',
    icon: <Lock className="w-5 h-5 text-amber-400" />,
    requiresTarget: true,
    targetType: 'space',
  },
  {
    id: 'patent_freeze',
    name: 'Patent Injunction Freeze',
    cost: 35,
    description: 'File emergency antitrust injunction to suspend rival rent revenues.',
    effect: 'Freezes target property sector; rent collection suspended for 2 rounds',
    icon: <TrendingDown className="w-5 h-5 text-blue-400" />,
    requiresTarget: true,
    targetType: 'space',
  },
  {
    id: 'short_attack',
    name: 'Short Seller Raid',
    cost: 40,
    description: 'Orchestrate coordinated short squeeze against an overextended corporate rival.',
    effect: 'Forces rival to settle 150 ƁM in liquid margin calls or liquidations',
    icon: <Skull className="w-5 h-5 text-rose-400" />,
    requiresTarget: true,
    targetType: 'player',
  },
];

export const SPActionModal: React.FC<SPActionModalProps> = ({
  player,
  allPlayers = [],
  isActionPending,
  onExecute,
  onClose,
}) => {
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [targetId, setTargetId] = useState<string>('');

  // Rivals list (excluding self and bankrupt players)
  const rivals = allPlayers.filter((p) => p.id !== player.id && p.status === 'active');

  // Rival owned spaces
  const rivalSpaces: { space: BoardSpace; owner: FirestorePlayerDoc }[] = [];
  rivals.forEach((r) => {
    (r.ownedSpaceIds || []).forEach((spaceId) => {
      const space = DEFAULT_STANDARD_SPACES.find((s) => s.id === spaceId);
      if (space) {
        rivalSpaces.push({ space, owner: r });
      }
    });
  });

  const handleStartDeploy = (ability: Ability) => {
    if (ability.requiresTarget) {
      setSelectedAbility(ability);
      if (ability.targetType === 'player' && rivals.length > 0) {
        setTargetId(rivals[0].id);
      } else if (ability.targetType === 'space' && rivalSpaces.length > 0) {
        setTargetId(rivalSpaces[0].space.id);
      } else {
        setTargetId('');
      }
    } else {
      onExecute(ability.id, ability.cost);
    }
  };

  const handleConfirmTargetDeploy = () => {
    if (!selectedAbility || !targetId) return;
    onExecute(selectedAbility.id, selectedAbility.cost, targetId);
    setSelectedAbility(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-xl bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Corporate Tactical Warfare Center
              </h3>
              <div className="text-[10px] font-mono text-indigo-300">
                Available Reserves: <strong>{formatSP(player.specialPoints)}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {!selectedAbility ? (
              <div className="space-y-3">
                {AVAILABLE_ABILITIES.map((ability) => {
                  const canAfford = player.specialPoints >= ability.cost;
                  const isHostile = ability.id === 'hostile_takeover';
                  const isShort = ability.id === 'short_attack';
                  const isFreeze = ability.id === 'patent_freeze';

                  const hasValidTargets =
                    !ability.requiresTarget ||
                    (ability.targetType === 'player' && rivals.length > 0) ||
                    (ability.targetType === 'space' && rivalSpaces.length > 0);

                  const isDeployDisabled = !canAfford || !hasValidTargets || isActionPending;

                  return (
                    <div
                      key={ability.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        canAfford && hasValidTargets
                          ? 'bg-slate-950/70 border-indigo-500/30 hover:border-indigo-400/60'
                          : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800 shrink-0">
                            {ability.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-200">{ability.name}</h4>
                              {ability.requiresTarget && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono">
                                  Targeted
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-400">
                              Cost: {formatSP(ability.cost)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartDeploy(ability)}
                          disabled={isDeployDisabled}
                          className={`py-2 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all min-h-[40px] shrink-0 ${
                            !isDeployDisabled
                              ? isHostile || isShort
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/60 active:scale-95 cursor-pointer'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/60 active:scale-95 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {ability.requiresTarget ? 'Target & Deploy' : 'Deploy'}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-1.5">{ability.description}</p>
                      <div className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{ability.effect}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TARGET SELECTION SUB-VIEW */
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Select Target: {selectedAbility.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {selectedAbility.targetType === 'player'
                          ? 'Select a corporate rival to target'
                          : 'Select a rival property to target'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAbility(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Back
                  </button>
                </div>

                {selectedAbility.targetType === 'player' ? (
                  <div className="space-y-2">
                    {rivals.length === 0 ? (
                      <p className="text-xs text-slate-400">No active rivals found.</p>
                    ) : (
                      rivals.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setTargetId(r.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            targetId === r.id
                              ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-400'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-200">{r.displayName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Treasury: {formatBM(r.cash)} | Net Worth: {formatBM(r.netWorth)}
                            </div>
                          </div>
                          {targetId === r.id && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {rivalSpaces.length === 0 ? (
                      <p className="text-xs text-slate-400">No rival-owned properties available.</p>
                    ) : (
                      rivalSpaces.map(({ space, owner }) => (
                        <button
                          key={space.id}
                          type="button"
                          onClick={() => setTargetId(space.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            targetId === space.id
                              ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-400'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-200">{space.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Sector: {space.group || 'Commercial'} | Owner: {owner.displayName} | Base: {formatBM(space.baseCost || 100)}
                            </div>
                          </div>
                          {targetId === space.id && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedAbility(null)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTargetDeploy}
                    disabled={!targetId || isActionPending}
                    className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-950/60 disabled:opacity-50 cursor-pointer"
                  >
                    Confirm Strike ({formatSP(selectedAbility.cost)})
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors min-h-[44px] cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
