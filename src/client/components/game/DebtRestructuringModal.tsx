import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark,
  Coins,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Building2,
  Lock,
  Unlock,
  Trash2,
  CheckCircle2,
  TrendingDown,
  Info,
  DollarSign,
} from 'lucide-react';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { DEFAULT_STANDARD_SPACES } from '../../../config/boardConfig';
import { BoardSpace } from '../../../types/board';
import { formatBM } from '../../utils/currency';
import { BOARD_GROUP_THEMES } from './CircularBoard52';
import { diceAudio } from './dice/diceAudio';

interface DebtRestructuringModalProps {
  player: FirestorePlayerDoc;
  isActionPending: boolean;
  onMortgageProperty: (spaceId: string) => Promise<void>;
  onUnmortgageProperty: (spaceId: string) => Promise<void>;
  onLiquidateProperty: (spaceId: string) => Promise<void>;
  onClose: () => void;
}

type RestructureTab = 'mortgage' | 'unmortgage' | 'liquidate';

export const DebtRestructuringModal: React.FC<DebtRestructuringModalProps> = ({
  player,
  isActionPending,
  onMortgageProperty,
  onUnmortgageProperty,
  onLiquidateProperty,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<RestructureTab>('mortgage');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingSpaceId, setProcessingSpaceId] = useState<string | null>(null);

  const ownedSpaceIds = player.ownedSpaceIds || [];
  const mortgagedSpaceIds = player.mortgagedSpaceIds || [];

  // Categorize owned spaces
  const ownedSpaces: BoardSpace[] = ownedSpaceIds
    .map((id) => DEFAULT_STANDARD_SPACES.find((s) => s.id === id))
    .filter((s): s is BoardSpace => s !== undefined);

  const unmortgagedSpaces = ownedSpaces.filter((s) => !mortgagedSpaceIds.includes(s.id));
  const activeMortgagedSpaces = ownedSpaces.filter((s) => mortgagedSpaceIds.includes(s.id));

  // Compute total borrowing power (50% of unmortgaged properties base cost)
  const totalBorrowingCapacity = unmortgagedSpaces.reduce(
    (acc, s) => acc + Math.round((s.baseCost || 100) * 0.5),
    0
  );

  // Compute total debt to lift mortgages (55% of base cost)
  const totalRedemptionDebt = activeMortgagedSpaces.reduce(
    (acc, s) => acc + Math.round((s.baseCost || 100) * 0.55),
    0
  );

  const isLiquidityCrisis = player.cash < 150;

  const handleMortgage = async (spaceId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setProcessingSpaceId(spaceId);
    try {
      diceAudio.playClick();
      await onMortgageProperty(spaceId);
      setActionSuccess('Mortgage executed: Pledged deed to central bank for +50% ƁM liquidity.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to mortgage property.');
    } finally {
      setProcessingSpaceId(null);
    }
  };

  const handleUnmortgage = async (spaceId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setProcessingSpaceId(spaceId);
    try {
      diceAudio.playClick();
      await onUnmortgageProperty(spaceId);
      setActionSuccess('Mortgage redeemed: Paid principal + 10% fee. Full rent yield restored!');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to lift mortgage.');
    } finally {
      setProcessingSpaceId(null);
    }
  };

  const handleLiquidate = async (spaceId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setProcessingSpaceId(spaceId);
    try {
      diceAudio.playClick();
      await onLiquidateProperty(spaceId);
      setActionSuccess('Deed liquidated: Transferred to central bank treasury.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to liquidate property.');
    } finally {
      setProcessingSpaceId(null);
    }
  };

  return (
    <div
      id="debt-restructure-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* TOP BANNER */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 px-5 py-3.5 flex items-center justify-between text-slate-100 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/30 text-amber-200">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm tracking-wide flex items-center gap-2">
                <span>CORPORATE DEBT RESTRUCTURING</span>
                <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-mono text-amber-300 font-bold uppercase">
                  Central Bank Desk
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Pledge deeds for 50% ƁM emergency liquidity or liquidate non-core holdings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/20 text-amber-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIQUIDITY CRISIS WARNING (IF CASH IS LOW) */}
        {isLiquidityCrisis && (
          <div className="px-5 py-2.5 bg-rose-950/70 border-b border-rose-500/40 flex items-center gap-2.5 text-rose-200 text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-rose-300">Imminent Liquidity Warning:</span> Your cash
              reserves ({formatBM(player.cash)}) are below sustainable solvency thresholds. Pledge
              properties below to avoid sudden bankruptcy.
            </div>
          </div>
        )}

        {/* FINANCIAL SUMMARY STRIP */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Treasury Cash</span>
            <span
              className={`text-sm font-black font-mono ${
                isLiquidityCrisis ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatBM(player.cash)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Borrowing Power</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              +{formatBM(totalBorrowingCapacity)}
            </span>
            <span className="text-[9px] text-slate-400 block">50% pledge value</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Pledged Deeds</span>
            <span className="text-sm font-black font-mono text-amber-400">
              {activeMortgagedSpaces.length} / {ownedSpaces.length}
            </span>
            <span className="text-[9px] text-slate-400 block">{formatBM(totalRedemptionDebt)} debt</span>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionError && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* SUB-MENU TABS */}
        <div className="px-5 pt-3 pb-2 flex gap-1.5 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('mortgage');
              setActionError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'mortgage'
                ? 'bg-amber-600 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Mortgage Property ({unmortgagedSpaces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('unmortgage');
              setActionError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'unmortgage'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Lift Mortgage ({activeMortgagedSpaces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('liquidate');
              setActionError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'liquidate'
                ? 'bg-rose-700 text-white shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sell / Liquidate ({ownedSpaces.length})</span>
          </button>
        </div>

        {/* TAB CONTENT SCROLL AREA */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 min-h-[260px]">
          {/* TAB 1: MORTGAGE PROPERTY */}
          {activeTab === 'mortgage' && (
            <div>
              <div className="mb-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">How Mortgage Works:</strong> You pledge the deed
                  to the central bank for <span className="text-amber-300 font-bold">50% ƁM value</span>.
                  You retain ownership, but <span className="text-rose-300 font-bold">rent collection is suspended</span> until
                  you lift the mortgage (+10% interest).
                </div>
              </div>

              {unmortgagedSpaces.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Building2 className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold">No Unmortgaged Properties Available</p>
                  <p className="text-xs text-slate-400">
                    {ownedSpaces.length === 0
                      ? 'You currently do not own any properties to pledge.'
                      : 'All of your owned properties are already mortgaged.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {unmortgagedSpaces.map((space) => {
                    const theme = space.group ? BOARD_GROUP_THEMES[space.group] : null;
                    const mortgagePayout = Math.round((space.baseCost || 100) * 0.5);
                    const isProcessing = processingSpaceId === space.id;

                    return (
                      <div
                        key={space.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-10 rounded-sm shrink-0 ${
                              theme ? theme.barColor : 'bg-slate-600'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-xs sm:text-sm">
                                {space.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                #{space.index}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                              <span>Cost: {formatBM(space.baseCost || 0)}</span>
                              <span>•</span>
                              <span>Base Rent: {formatBM(space.rentTiers?.[0] || 0)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Bank Payout
                            </span>
                            <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                              +{formatBM(mortgagePayout)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMortgage(space.id)}
                            disabled={isActionPending || isProcessing}
                            className="py-2 px-3 sm:px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950/50"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Pledging...' : 'Pledge Deed'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIFT MORTGAGE */}
          {activeTab === 'unmortgage' && (
            <div>
              <div className="mb-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Redemption Terms:</strong> Pay the 50% principal
                  plus standard bank interest (10% fee = <span className="text-emerald-300 font-bold">55% of base cost</span>).
                  Active rent collection will be restored immediately across the board.
                </div>
              </div>

              {activeMortgagedSpaces.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50" />
                  <p className="text-sm font-semibold">No Pledged Mortgages</p>
                  <p className="text-xs text-slate-400">
                    You have no properties currently encumbered by bank debt.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeMortgagedSpaces.map((space) => {
                    const theme = space.group ? BOARD_GROUP_THEMES[space.group] : null;
                    const redemptionCost = Math.round((space.baseCost || 100) * 0.55);
                    const canAfford = player.cash >= redemptionCost;
                    const isProcessing = processingSpaceId === space.id;

                    return (
                      <div
                        key={space.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 hover:border-amber-500/50 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-10 rounded-sm shrink-0 ${
                              theme ? theme.barColor : 'bg-slate-600'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-xs sm:text-sm">
                                {space.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase">
                                Mortgaged
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                              <span>Base Cost: {formatBM(space.baseCost || 0)}</span>
                              <span>•</span>
                              <span className="text-rose-400">Rent Paused</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Repayment Cost
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-black font-mono ${
                                canAfford ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              -{formatBM(redemptionCost)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUnmortgage(space.id)}
                            disabled={!canAfford || isActionPending || isProcessing}
                            className={`py-2 px-3 sm:px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                              canAfford
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Redeeming...' : 'Lift Mortgage'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SELL SHARE / LIQUIDATE DEED TO BANK */}
          {activeTab === 'liquidate' && (
            <div>
              <div className="mb-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Deed Liquidation:</strong> Surrender property
                  permanently back to the Central Bank Treasury for{' '}
                  <span className="text-rose-300 font-bold">50% ƁM cash value</span>. If already
                  mortgaged, foreclosure extinguishes debt and deeds are released back to the open
                  market.
                </div>
              </div>

              {ownedSpaces.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Trash2 className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold">No Properties to Liquidate</p>
                  <p className="text-xs text-slate-400">You do not own any property deeds.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ownedSpaces.map((space) => {
                    const theme = space.group ? BOARD_GROUP_THEMES[space.group] : null;
                    const isMortgaged = mortgagedSpaceIds.includes(space.id);
                    const liquidationPayout = isMortgaged
                      ? 0
                      : Math.round((space.baseCost || 100) * 0.5);
                    const isProcessing = processingSpaceId === space.id;

                    return (
                      <div
                        key={space.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-rose-900/60 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-10 rounded-sm shrink-0 ${
                              theme ? theme.barColor : 'bg-slate-600'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-xs sm:text-sm">
                                {space.name}
                              </span>
                              {isMortgaged && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase">
                                  Pledged
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                              <span>Base Cost: {formatBM(space.baseCost || 0)}</span>
                              <span>•</span>
                              <span className="text-rose-300 font-mono">
                                {isMortgaged ? 'Foreclose Mortgaged Deed' : 'Liquidate Deed'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {isMortgaged ? 'Debt Cleared' : 'Bank Payout'}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-rose-400 font-mono">
                              {isMortgaged ? 'Debt Settled' : `+${formatBM(liquidationPayout)}`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleLiquidate(space.id)}
                            disabled={isActionPending || isProcessing}
                            className="py-2 px-3 sm:px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isProcessing ? 'Liquidating...' : 'Sell to Bank'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Central Bank Authoritative Clearing House</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer min-h-[40px]"
          >
            Close Restructure Desk
          </button>
        </div>
      </motion.div>
    </div>
  );
};
