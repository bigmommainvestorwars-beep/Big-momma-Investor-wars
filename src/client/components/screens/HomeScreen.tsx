import React from 'react';
import { motion } from 'motion/react';
import { Landmark, Play, User, Settings, LogOut } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';

export const HomeScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, signOut } = useAuth();
  const { activeMatchId } = useGame();

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex overflow-hidden">
      
      {/* Left Sidebar Menu / Main Menu Panel */}
      <div className="w-full md:w-80 bg-slate-950/90 backdrop-blur-xl md:border-r border-slate-800 flex flex-col z-10 relative">
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-emerald-400 uppercase">BIG MOMMA</div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Investors' War</div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-3 flex flex-col justify-center">
          {activeMatchId && (
            <button
              onClick={() => navigate('GAMEPLAY')}
              className="w-full py-3.5 px-4 rounded-xl flex items-center gap-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all text-sm font-bold tracking-wider uppercase text-left cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Rejoin Active Match
            </button>
          )}

          <button
            onClick={() => navigate('MATCH_SETUP')}
            className="w-full py-4 px-5 rounded-xl flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-900/50 transition-all text-sm font-black tracking-widest uppercase text-left active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            New Game
          </button>

          <button
            onClick={() => navigate('PROFILE')}
            className="w-full py-3.5 px-5 rounded-xl flex items-center gap-3 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-all text-sm font-bold tracking-wider uppercase text-left border border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <User className="w-4 h-4" />
            Profile
          </button>

          <button
            onClick={() => navigate('SETTINGS')}
            className="w-full py-3.5 px-5 rounded-xl flex items-center gap-3 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-all text-sm font-bold tracking-wider uppercase text-left border border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0 border border-slate-700">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-slate-400 font-mono truncate">{user?.email}</span>
            </div>
            <button onClick={signOut} className="p-2 text-slate-500 hover:text-slate-300 shrink-0 cursor-pointer" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Decorative for Tablet and Desktop */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-slate-900 to-[#030712] items-center justify-center">
         <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="text-center opacity-30"
         >
           <Landmark className="w-64 h-64 mx-auto text-emerald-500" />
         </motion.div>
      </div>

    </div>
  );
};
