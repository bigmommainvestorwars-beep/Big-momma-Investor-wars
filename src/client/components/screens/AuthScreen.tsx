import React from 'react';
import { motion } from 'motion/react';
import { Landmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="absolute inset-0 bg-[#030712] flex items-center justify-center text-slate-100 font-sans p-4">
      {/* City background could go here if wanted, or just simple */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-800/50 to-slate-900/50">
          <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-400/30 rounded-2xl flex items-center justify-center mb-4">
            <Landmark className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black tracking-[0.15em] uppercase text-emerald-300">
            BIG MOMMA
          </h1>
          <h2 className="text-sm font-bold tracking-[0.2em] text-slate-400 mt-1">INVESTORS' WAR</h2>
        </div>

        <div className="p-8 space-y-6 text-center">
          <p className="text-sm text-slate-400 font-mono">
            SECURE FINANCIAL AUTHORIZATION REQUIRED
          </p>
          
          <button
            onClick={signInWithGoogle}
            className="w-full py-4 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span>AUTHORIZE WITH GOOGLE</span>
          </button>
          
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            By authorizing, you agree to the Syndicate Terms & Conditions.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
