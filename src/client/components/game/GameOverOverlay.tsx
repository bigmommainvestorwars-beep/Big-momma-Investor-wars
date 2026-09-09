import React from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, RefreshCw, XCircle } from 'lucide-react';
import { FirestorePlayerDoc } from '../../../services/firebase/matchSyncService';
import { formatBM } from '../../utils/currency';

interface GameOverOverlayProps {
  players: FirestorePlayerDoc[];
  onPlayAgain: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ players, onPlayAgain }) => {
  // Sort players by net worth descending
  const sortedPlayers = [...players].sort((a, b) => b.netWorth - a.netWorth);
  const winner = sortedPlayers[0];

  if (!winner) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 text-center border-b border-slate-800 bg-gradient-to-b from-slate-800 to-slate-900">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
          >
            <Trophy className="w-10 h-10 text-slate-950 font-black" />
          </motion.div>
          
          <h1 className="text-4xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300">
            MARKET DOMINATION
          </h1>
          <p className="text-slate-400 mt-2 font-mono uppercase tracking-wider text-sm">
            The Financial War Has Concluded
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-slate-950/80 rounded-2xl p-6 border border-amber-500/30 text-center">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Victor</h2>
            <div className="text-2xl font-black text-amber-400 mb-2">{winner.displayName}</div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-mono text-sm">Final Net Worth:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{formatBM(winner.netWorth)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Final Standings</h3>
            <div className="space-y-2">
              {sortedPlayers.map((p, idx) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${idx === 0 ? 'bg-amber-950/20 border-amber-500/20' : 'bg-slate-950/50 border-slate-800/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      {idx + 1}
                    </div>
                    <span className={`font-bold ${idx === 0 ? 'text-amber-400' : 'text-slate-300'}`}>{p.displayName}</span>
                    {p.status === 'bankrupt' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-900 uppercase">Eliminated</span>
                    )}
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-300">
                    {formatBM(p.netWorth)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onPlayAgain}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Return to Market Lobby</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
