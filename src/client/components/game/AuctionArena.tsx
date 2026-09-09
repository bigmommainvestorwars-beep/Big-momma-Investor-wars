import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Gavel, Clock, Trophy, Check, X, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { FirestoreAuctionDoc, FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { formatBM } from '../../utils/currency';

interface AuctionArenaProps {
  auction: FirestoreAuctionDoc;
  players: FirestorePlayerDoc[];
  humanPlayer: FirestorePlayerDoc | null;
  isActionPending: boolean;
  onPlaceBid: (amount: number) => void;
  onPassAuction: () => void;
  onResolveAuction: () => void;
}

export const AuctionArena: React.FC<AuctionArenaProps> = ({
  auction,
  players,
  humanPlayer,
  isActionPending,
  onPlaceBid,
  onPassAuction,
  onResolveAuction,
}) => {
  const leader = players.find((p) => p.id === auction.currentHighestBidderId);
  const isHumanLeader = humanPlayer && auction.currentHighestBidderId === humanPlayer.id;
  const hasHumanPassed = humanPlayer ? auction.passedPlayerIds.includes(humanPlayer.id) : false;
  const humanCash = humanPlayer?.cash || 0;

  const minBid = auction.currentHighestBid + 10;
  const [customBidAmount, setCustomBidAmount] = useState<number>(minBid);

  const canAfford = (amount: number) => humanCash >= amount;

  return (
    <div className="bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-2xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.25)] relative overflow-hidden">
      {/* Background Gavel Silhouette */}
      <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
        <Gavel className="w-32 h-32 text-amber-400" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Gavel className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
              High-Frequency Auction
            </div>
            <h3 className="text-base font-black text-slate-100 truncate">{auction.assetName}</h3>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Active Bidding</span>
        </div>
      </div>

      {/* Main Bid Highlight Box */}
      <div className="bg-slate-950/90 rounded-xl border border-amber-500/40 p-4 mb-4 text-center relative">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          Current Highest Offer
        </div>
        <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
          {formatBM(auction.currentHighestBid)}
        </div>
        <div className="text-xs text-slate-300 mt-1 flex items-center justify-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Leader:{' '}
            <strong className="text-amber-300">
              {leader ? leader.displayName : 'Initial Floor Bid'}
            </strong>
          </span>
          {isHumanLeader && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-700">
              YOU LEAD
            </span>
          )}
        </div>
      </div>

      {/* Bid Increment Buttons */}
      {!hasHumanPassed && (
        <div className="space-y-3 mb-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Quick Counter Bids (Cash Available: {formatBM(humanCash)})
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[10, 50, 100].map((inc) => {
              const target = auction.currentHighestBid + inc;
              const affordable = canAfford(target);
              return (
                <button
                  key={inc}
                  type="button"
                  onClick={() => onPlaceBid(target)}
                  disabled={isActionPending || !affordable}
                  className={`py-2.5 px-2 rounded-xl font-mono text-xs font-black transition-all flex flex-col items-center justify-center min-h-[44px] ${
                    affordable
                      ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-950/60 active:scale-95 cursor-pointer'
                      : 'bg-slate-800/80 text-slate-600 border border-slate-700/50 cursor-not-allowed'
                  }`}
                >
                  <span>+{inc} ƁM</span>
                  <span className="text-[9px] opacity-75">{formatBM(target)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pass & Settle Controls */}
      <div className="flex gap-2">
        {!hasHumanPassed ? (
          <button
            type="button"
            onClick={onPassAuction}
            disabled={isActionPending}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors min-h-[44px] cursor-pointer"
          >
            Pass Auction
          </button>
        ) : (
          <div className="flex-1 py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 text-center flex items-center justify-center gap-1.5">
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>You have passed on this auction</span>
          </div>
        )}

        <button
          type="button"
          onClick={onResolveAuction}
          disabled={isActionPending}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-950/50 min-h-[44px] cursor-pointer"
        >
          Settle Auction
        </button>
      </div>

      {/* Participant Status Pips */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Bidders:</span>
        <div className="flex gap-2">
          {players.map((p) => {
            const hasPassed = auction.passedPlayerIds.includes(p.id);
            const isLeading = p.id === auction.currentHighestBidderId;
            return (
              <span
                key={p.id}
                className={`px-2 py-0.5 rounded ${
                  isLeading
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : hasPassed
                    ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40 line-through'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {p.displayName.split(' ')[0]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
