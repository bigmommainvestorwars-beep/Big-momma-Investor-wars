import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, User, LogOut, Trash2 } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const { user, signOut } = useAuth();

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center gap-4">
        <button 
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">INVESTOR PROFILE</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-900 to-[#030712]">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 flex items-center gap-6 shadow-2xl">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700 text-slate-400 text-3xl font-black">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-200">{user?.displayName || 'Unknown Investor'}</h2>
              <div className="text-sm text-slate-500 font-mono mt-1">{user?.email}</div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                <User className="w-3 h-3" />
                Verified Account
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Account Management</h3>
            
            <button 
              onClick={signOut}
              className="w-full py-4 px-6 bg-slate-950/50 hover:bg-slate-800 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3 font-bold">
                <LogOut className="w-5 h-5 text-slate-400" />
                Sign Out
              </div>
            </button>

            <button 
              className="w-full py-4 px-6 bg-rose-950/20 hover:bg-rose-950/40 rounded-xl border border-rose-900/30 flex items-center justify-between text-rose-400 transition-colors"
            >
              <div className="flex items-center gap-3 font-bold">
                <Trash2 className="w-5 h-5 text-rose-500" />
                Delete Account
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
