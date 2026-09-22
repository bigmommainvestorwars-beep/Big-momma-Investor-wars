import React from 'react';
import { motion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { Users, Bot, User } from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const { match, players } = useGame();

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center"
      >
        <h1 className="text-2xl font-black uppercase tracking-widest text-emerald-400 mb-2">
          LOBBY PREPARATION
        </h1>
        <p className="text-slate-400 text-sm font-mono mb-8 uppercase tracking-wider">
          Awaiting Server Authority Authorization
        </p>

        <div className="space-y-3 mb-8 text-left">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                {p.isBot ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-200">{p.displayName}</div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  {p.isBot ? 'Automated Trader' : 'Human Investor'}
                </div>
              </div>
              <div className="text-xs font-bold px-3 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded-full uppercase tracking-wider">
                READY
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-mono tracking-widest uppercase">
            Match Status: {match?.status}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
