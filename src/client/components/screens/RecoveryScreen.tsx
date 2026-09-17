import React from 'react';
import { motion } from 'motion/react';
import { Play, LogOut, AlertTriangle } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useGame } from '../../context/GameContext';

export const RecoveryScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { match, leaveMatch } = useGame();

  const handleRejoin = () => {
    if (match?.status === 'waiting_for_players') {
      navigate('LOBBY');
    } else {
      navigate('GAMEPLAY');
    }
  };

  const handleAbandon = async () => {
    try {
      await leaveMatch();
      navigate('HOME');
    } catch {
      navigate('HOME');
    }
  };

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-slate-900 border border-amber-900/50 rounded-3xl p-8 shadow-2xl text-center"
      >
        <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        
        <h1 className="text-xl font-black uppercase tracking-widest text-amber-400 mb-2">
          ACTIVE MATCH FOUND
        </h1>
        <p className="text-slate-400 text-sm font-mono mb-8">
          You have an unfinished game session in progress.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleRejoin}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            Rejoin Match
          </button>

          <button 
            onClick={handleAbandon}
            className="w-full py-4 bg-slate-950/50 hover:bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abandon Match
          </button>
        </div>
      </motion.div>
    </div>
  );
};
