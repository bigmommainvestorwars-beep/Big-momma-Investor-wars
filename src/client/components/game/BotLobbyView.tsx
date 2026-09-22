import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bot, Users, Play, Shield, Zap, TrendingUp, Lock, Sparkles, AlertCircle, Loader2, User } from 'lucide-react';
import { BotPersonality, PRESET_BOT_PROFILES } from '../../../bot/botTypes';

interface BotConfigItem {
  id: string;
  name: string;
  personality: BotPersonality;
  avatarId: string;
}

interface BotLobbyViewProps {
  onStartMatch: (bots: BotConfigItem[]) => Promise<void> | void;
  isPending?: boolean;
  error?: string | null;
  onBack?: () => void;
}

export const BotLobbyView: React.FC<BotLobbyViewProps> = ({
  onStartMatch,
  isPending = false,
  error = null,
  onBack,
}) => {
  const [botCount, setBotCount] = useState<number>(3);
  const [bots, setBots] = useState<BotConfigItem[]>([
    { id: 'bot_1', name: 'Apex Capital (AI)', personality: 'aggressive', avatarId: 'bot-apex' },
    { id: 'bot_2', name: 'Venture Bot (AI)', personality: 'balanced', avatarId: 'bot-venture' },
    { id: 'bot_3', name: 'Bullish Quant (AI)', personality: 'speculative', avatarId: 'bot-quant' },
  ]);

  const personalities: Array<{ type: BotPersonality; label: string; desc: string; icon: React.ReactNode; color: string }> = [
    { type: 'conservative', label: 'Conservative', desc: 'Preserves cash, avoids high risks, disciplined bids.', icon: <Shield className="w-4 h-4 text-emerald-400" />, color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300' },
    { type: 'balanced', label: 'Balanced', desc: 'Prudent cash buffer with smart property accumulation.', icon: <TrendingUp className="w-4 h-4 text-cyan-400" />, color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300' },
    { type: 'aggressive', label: 'Aggressive', desc: 'High asset acquisition, aggressive bidding, low reserves.', icon: <Zap className="w-4 h-4 text-amber-400" />, color: 'border-amber-500/40 bg-amber-950/20 text-amber-300' },
    { type: 'speculative', label: 'Speculative', desc: 'Calculated volatility risks and high market reward plays.', icon: <Sparkles className="w-4 h-4 text-purple-400" />, color: 'border-purple-500/40 bg-purple-950/20 text-purple-300' },
  ];

  const handleBotCountChange = (count: number) => {
    setBotCount(count);
    const presets = PRESET_BOT_PROFILES;
    const newBots: BotConfigItem[] = [];
    for (let i = 0; i < count; i++) {
      const preset = presets[i % presets.length];
      newBots.push({
        id: `bot_${i + 1}`,
        name: preset.displayName,
        personality: preset.personality,
        avatarId: preset.avatarId,
      });
    }
    setBots(newBots);
  };

  const handlePersonalityChange = (index: number, personality: BotPersonality) => {
    const updated = [...bots];
    const matchPreset = PRESET_BOT_PROFILES.find(p => p.personality === personality);
    updated[index] = {
      ...updated[index],
      personality,
      name: matchPreset ? matchPreset.displayName : `${personality.toUpperCase()} Bot (AI)`,
    };
    setBots(updated);
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...bots];
    updated[index] = { ...updated[index], name };
    setBots(updated);
  };

  const handleStart = async () => {
    await onStartMatch(bots.slice(0, botCount));
  };

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold uppercase"
            >
              Back
            </button>
          )}
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Investor Lobby — Bot & AI Configuration
          </h1>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Single-Player Match Setup
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center bg-gradient-to-b from-slate-900 to-[#030712]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-emerald-400 uppercase tracking-wider">
                Configure Match Participants
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                You are locked as the primary HUMAN investor. Configure 1 to 3 AI bot opponents with unique decision personalities.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 px-2 uppercase">AI Opponents:</span>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleBotCountChange(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    botCount === num
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-mono">{error}</span>
            </div>
          )}

          {/* Participant Slots */}
          <div className="space-y-4 mb-8">
            {/* Slot 1: Human Player (Fixed) */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-100">You (Primary Investor)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                      HUMAN
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Interactive Player Control • Full Asset & Auction Authority
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fixed (Cannot be replaced by AI)</span>
              </div>
            </div>

            {/* Slots 2 to (1 + botCount): AI Bots */}
            {bots.slice(0, botCount).map((bot, index) => {
              const currentPersonalityInfo = personalities.find(p => p.type === bot.personality) || personalities[0];
              return (
                <div
                  key={bot.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={bot.name}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-[10px] uppercase tracking-wider">
                          BOT
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Automated AI Decision Engine
                      </div>
                    </div>
                  </div>

                  {/* Personality Selectors */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {personalities.map((p) => (
                      <button
                        key={p.type}
                        onClick={() => handlePersonalityChange(index, p.type)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          bot.personality === p.type
                            ? p.color + ' shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.icon}
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            onClick={handleStart}
            disabled={isPending}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-cyan-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                INITIALIZING BOTS & BOARD...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                LAUNCH SIMULATION WITH {botCount} AI BOT{botCount > 1 ? 'S' : ''}
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
