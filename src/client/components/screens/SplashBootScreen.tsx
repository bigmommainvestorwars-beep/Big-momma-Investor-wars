import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Landmark, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

export const SplashBootScreen: React.FC = () => {
  const { isFirebaseConfigured, isLoading } = useAuth();
  const { navigate } = useNavigation();
  const [showDirectEntry, setShowDirectEntry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDirectEntry(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  let statusText = 'INITIALIZING SYSTEM...';
  if (!isFirebaseConfigured) statusText = 'VERIFYING FIREBASE CONFIGURATION...';
  else if (isLoading) statusText = 'AUTHENTICATING SECURE SESSION...';

  return (
    <div className="absolute inset-0 bg-[#030712] flex items-center justify-center text-slate-100 font-sans p-4">
      <div className="text-center max-w-sm w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-indigo-500/20 border border-emerald-400/40 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        >
          <Landmark className="w-12 h-12 text-emerald-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-indigo-300"
        >
          BIG MOMMA
        </motion.h1>
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl font-bold tracking-[0.3em] text-slate-400 mt-2"
        >
          INVESTORS' WAR
        </motion.h2>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-500 tracking-widest">{statusText}</span>

          {showDirectEntry && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate('HOME')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono tracking-wider transition-all"
            >
              <span>ENTER GAME</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
};
