import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  Zap,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PendingMarketChoiceDoc, MarketChoiceOption, MarketEvent } from '../../../types/marketEvent';
import { formatBM, formatSP } from '../../utils/currency';

interface MarketChoiceModalProps {
  pendingChoice: PendingMarketChoiceDoc | null;
  activeMarketEvent?: MarketEvent | null;
  isActionPending: boolean;
  onSubmitChoice: (eventId: string, choiceId: string) => Promise<void>;
  onDismiss?: () => void;
}

export const MarketChoiceModal: React.FC<MarketChoiceModalProps> = ({
  pendingChoice,
  activeMarketEvent,
  isActionPending,
  onSubmitChoice,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    pendingChoice?.options?.[0]?.id || ''
  );

  if (!pendingChoice) return null;

  const currentSelected =
    pendingChoice.options.find((opt) => opt.id === selectedOptionId) ||
    pendingChoice.options[0];

  const handleConfirm = async () => {
    if (!currentSelected || isActionPending) return;
    await onSubmitChoice(pendingChoice.eventId, currentSelected.id);
  };

  return (
    <div
      id="market-choice-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-3.5 flex items-center justify-between text-slate-950 font-black text-xs uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-950" />
            <span>Boardroom Strategic Directive</span>
            <span>•</span>
            <span>Space #{pendingChoice.spaceIndex}</span>
          </div>
          {activeMarketEvent?.active && (
            <span className="bg-slate-950/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-950">
              Macro Cycle: {activeMarketEvent.name}
            </span>
          )}
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Title & Briefing */}
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold tracking-wide uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{pendingChoice.subtitle || 'Capital Allocation Dilemma'}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight leading-snug">
              {pendingChoice.title}
            </h2>
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-slate-300 leading-relaxed">
              <p>{pendingChoice.lore}</p>
            </div>
          </div>

          {/* Directive Options Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Select Strategic Course of Action:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pendingChoice.options.map((option: MarketChoiceOption, idx: number) => {
                const isSelected = option.id === (currentSelected?.id || '');

                return (
                  <button
                    key={option.id}
                    id={`choice-option-${option.id}`}
                    type="button"
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`relative text-left p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-black text-sm text-slate-100 leading-snug">
                            {option.label}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-400 leading-normal">
                        {option.description}
                      </p>
                    </div>

                    {/* Impact Pills */}
                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap items-center gap-2">
                      {option.cashDelta !== undefined && option.cashDelta !== 0 && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            option.cashDelta > 0
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          <Coins className="w-3 h-3" />
                          {option.cashDelta > 0 ? `+${formatBM(option.cashDelta)}` : formatBM(option.cashDelta)}
                        </span>
                      )}

                      {option.spDelta !== undefined && option.spDelta !== 0 && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            option.spDelta > 0
                              ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          {option.spDelta > 0 ? `+${formatSP(option.spDelta)}` : formatSP(option.spDelta)}
                        </span>
                      )}

                      {option.modifier && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                          <ShieldCheck className="w-3 h-3" />
                          {option.modifier.durationRounds}R: {option.modifier.type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Option Deep Summary */}
          {currentSelected && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Projected Executive Resolution:
                </span>
                <p className="text-xs text-amber-100/90 mt-0.5 font-medium">
                  {currentSelected.effectSummary}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Executive resolution binding upon match state</span>
          </div>

          <button
            id="ratify-market-directive-btn"
            type="button"
            disabled={!currentSelected || isActionPending}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            {isActionPending ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Ratifying Directive...</span>
              </>
            ) : (
              <>
                <span>Ratify Directive</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
