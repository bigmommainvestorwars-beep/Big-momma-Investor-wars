import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, Eye, X, Check, AlertCircle } from 'lucide-react';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { formatSP } from '../../utils/currency';

interface SPActionModalProps {
  player: FirestorePlayerDoc;
  isActionPending: boolean;
  onExecute: (actionId: string, spCost: number) => void;
  onClose: () => void;
}

interface Ability {
  id: string;
  name: string;
  cost: number;
  description: string;
  effect: string;
  icon: React.ReactNode;
}

const AVAILABLE_ABILITIES: Ability[] = [
  {
    id: 'strategic_liquidity',
    name: 'Strategic Liquidity Injection',
    cost: 25,
    description: 'Convert tactical strategic influence into emergency institutional cash flow.',
    effect: '+75 ƁM Liquid Capital directly to treasury',
    icon: <Zap className="w-5 h-5 text-indigo-400" />,
  },
  {
    id: 'market_intelligence',
    name: 'Syndicate Market Intelligence',
    cost: 35,
    description: 'Intercept high-value market events and optimize property yields.',
    effect: 'Activates yield multiplier bonus on all owned companies',
    icon: <Eye className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: 'regulatory_shield',
    name: 'Regulatory Harbor Shield',
    cost: 30,
    description: 'Deploy legal contingency reserves against immediate regulatory penalties.',
    effect: 'Protects against next SEC audit penalty assessment',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
  },
];

export const SPActionModal: React.FC<SPActionModalProps> = ({
  player,
  isActionPending,
  onExecute,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Tactical Strategy Center
              </h3>
              <div className="text-[10px] font-mono text-indigo-300">
                Available Reserves: <strong>{formatSP(player.specialPoints)}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abilities List */}
        <div className="p-5 space-y-3">
          {AVAILABLE_ABILITIES.map((ability) => {
            const canAfford = player.specialPoints >= ability.cost;

            return (
              <div
                key={ability.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  canAfford
                    ? 'bg-slate-950/70 border-indigo-500/30 hover:border-indigo-400/60'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      {ability.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{ability.name}</h4>
                      <span className="text-[10px] font-mono font-bold text-indigo-400">
                        Cost: {formatSP(ability.cost)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onExecute(ability.id, ability.cost)}
                    disabled={!canAfford || isActionPending}
                    className={`py-2 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all min-h-[40px] ${
                      canAfford
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/60 active:scale-95 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Deploy
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

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors min-h-[44px]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
