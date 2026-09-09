import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark, Play, Users, Bot, Settings, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';

export const MainMenuOverlay: React.FC = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { createCustomBotMatch, isActionPending } = useGame();
  const [botCount, setBotCount] = useState<number>(3);

  const handleStart = async () => {
    try {
      await createCustomBotMatch(botCount);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 text-center border-b border-slate-800 bg-gradient-to-b from-slate-800 to-slate-900">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-indigo-500/20 border border-emerald-400/40 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Landmark className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-indigo-300">
            BIG MOMMA
          </h1>
          <h2 className="text-xl font-bold tracking-[0.25em] text-slate-300 mt-1">INVESTORS' WAR</h2>
        </div>

        <div className="p-6 space-y-6">
          {!user ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-400">Sign in to access the financial district</p>
              <button
                onClick={signInWithGoogle}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>Continue with Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30 text-emerald-400 font-bold">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                  <span className="truncate max-w-[150px]">{user.email}</span>
                </div>
                <button onClick={signOut} className="text-slate-500 hover:text-slate-300 transition-colors p-2">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Select Opponents
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      onClick={() => setBotCount(num)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                        botCount === num 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {num} {num === 1 ? 'Bot' : 'Bots'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={isActionPending}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" />
                {isActionPending ? 'Connecting...' : 'Enter the Market'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
