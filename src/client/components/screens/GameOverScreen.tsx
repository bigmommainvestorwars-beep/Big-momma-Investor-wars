import React from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, RefreshCw, XCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useNavigation } from '../../context/NavigationContext';
import { formatBM } from '../../utils/currency';

export const GameOverScreen: React.FC = () => {
  const { players, leaveMatch } = useGame();
  const { navigate } = useNavigation();

  const handleReturnHome = async () => {
    try {
      await leaveMatch();
      navigate('HOME');
    } catch {
      navigate('HOME');
    }
  };

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
        <div className="bg-gradient-to-b from-amber-500/20 to-transparent p-8 text-center border-b border-slate-800">
          <div className="w-20 h-20 mx-auto bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-amber-400 mb-2">
            Match Completed
          </h1>
          <p className="text-slate-400 font-mono">
            Final Standings & Net Worth Evaluation
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  index === 0 
                  ? 'bg-amber-950/30 border-amber-900/50' 
                  : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-500 text-amber-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className={`font-bold ${index === 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {player.displayName}
                    </div>
                    <div className="text-[10px] uppercase font-mono text-slate-500">
                      {player.isBot ? 'AI Bot' : 'Human Player'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-mono font-bold ${index === 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {formatBM(player.netWorth)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Net Worth
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={handleReturnHome}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Close Match
            </button>
            <button
              onClick={handleReturnHome}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              New Game
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};