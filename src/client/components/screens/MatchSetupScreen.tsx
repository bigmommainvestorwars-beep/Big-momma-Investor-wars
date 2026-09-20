import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, Bot, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useGame } from '../../context/GameContext';

export const MatchSetupScreen: React.FC = () => {
  const { goBack, navigate } = useNavigation();
  const { createCustomBotMatch, isActionPending, matchError, clearMatchError } = useGame();
  
  const [botCount, setBotCount] = useState<number>(3);
  const [localError, setLocalError] = useState<string | null>(null);

  React.useEffect(() => {
    clearMatchError();
  }, [clearMatchError]);

  const handleStart = async () => {
    setLocalError(null);
    clearMatchError();
    try {
      await createCustomBotMatch(botCount);
      navigate('GAMEPLAY');
    } catch (e: any) {
      console.error('Failed to create match', e);
      setLocalError(e?.message || 'Failed to initialize match simulation. Please try again.');
    }
  };

  const handleSelectBotCount = (count: number) => {
    setBotCount(count);
    setLocalError(null);
    clearMatchError();
  };

  const activeError = localError || matchError;

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center gap-4 shrink-0 z-10">
        <button 
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">MATCH SETUP</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-gradient-to-b from-slate-900 to-[#030712]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto"
        >
          <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-3">
            <Users className="w-6 h-6" />
            AI Training Simulation
          </h2>
          
          <div className="space-y-6 sm:space-y-8">
            {activeError && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="font-mono">{activeError}</div>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Select AI Opponents
              </label>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => handleSelectBotCount(num)}
                    className={`py-4 rounded-xl text-center border transition-all cursor-pointer ${
                      botCount === num 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <Bot className="w-6 h-6 mx-auto mb-2 opacity-80" />
                    <span className="font-bold tracking-wider uppercase text-xs sm:text-sm">
                      {num} {num === 1 ? 'Bot' : 'Bots'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Simulation Parameters</div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Board Configuration</span>
                <span className="text-slate-300 font-bold">Standard 52-Space Circular</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Currency</span>
                <span className="text-emerald-400 font-bold">ƁM (Big Momma's Currency)</span>
              </div>
            </div>
            
            <button
              onClick={handleStart}
              disabled={isActionPending}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isActionPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  INITIALIZING SIMULATION...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  START SIMULATION
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
