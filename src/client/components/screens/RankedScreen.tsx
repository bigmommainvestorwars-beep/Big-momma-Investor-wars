import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  ChevronLeft,
  Flame,
  Award,
  Crown,
  Sparkles,
  Clock,
  Gift,
  Shield,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import {
  RankedService,
  RANKED_TIERS,
  CURRENT_SEASON,
  PlayerRankedProfile,
  LeaderboardEntry,
  RankedTier,
} from '../../../services/ranked/rankedService';

export const RankedScreen: React.FC = () => {
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PlayerRankedProfile>(() =>
    RankedService.getProfile(user?.uid || 'user_local', user?.displayName || 'Investor')
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    RankedService.getGlobalLeaderboard()
  );
  const [activeTab, setActiveTab] = useState<'global' | 'rewards' | 'season'>('global');
  const [timeLeft, setTimeLeft] = useState({ days: 42, hours: 14, mins: 32 });
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  // Refresh profile & countdown
  useEffect(() => {
    const p = RankedService.getProfile(user?.uid || 'user_local', user?.displayName || 'Investor');
    setProfile(p);
    setLeaderboard(RankedService.getGlobalLeaderboard());

    const updateTimer = () => {
      const diff = Math.max(0, CURRENT_SEASON.endsAt - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft({ days, hours, mins });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const tierInfo = RANKED_TIERS[profile.tier];

  // Calculate progress toward next tier
  const getTierProgress = () => {
    if (profile.tier === 'Apex Investor') return 100;
    const current = profile.elo - tierInfo.minElo;
    const total = tierInfo.maxElo - tierInfo.minElo;
    return Math.min(100, Math.max(5, Math.round((current / total) * 100)));
  };

  const handleClaimWeekly = () => {
    const res = RankedService.claimWeeklyReward();
    setClaimStatus(res.message);
    setProfile(RankedService.getProfile(user?.uid || 'user_local', user?.displayName || 'Investor'));
    setTimeout(() => setClaimStatus(null), 5000);
  };

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                Ranked Arena
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {CURRENT_SEASON.name}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Elo Rating Engine • Weekly Reward Distributions
            </div>
          </div>
        </div>

        {/* Season Countdown */}
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Season Ends:</span>
          <span className="text-cyan-300 font-bold">
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.mins}m
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Claim Alert Banner if available */}
        <AnimatePresence>
          {claimStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 flex items-center justify-between shadow-xl shadow-emerald-950/50"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">{claimStatus}</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Standing Card */}
        <div
          className="p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl"
          style={{
            backgroundColor: tierInfo.badgeBg,
            borderColor: tierInfo.borderColor,
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-2xl border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderColor: tierInfo.borderColor,
                }}
              >
                {tierInfo.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl font-black uppercase tracking-wider"
                    style={{ color: tierInfo.color }}
                  >
                    {profile.division}
                  </span>
                  {profile.syndicateTag && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300">
                      [{profile.syndicateTag}]
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">
                  Rating:{' '}
                  <span className="font-bold text-white text-sm">{profile.elo} Elo</span> •
                  Peak:{' '}
                  <span className="text-slate-400">{profile.peakElo} Elo</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      {profile.wins}W - {profile.matchesPlayed - profile.wins}L (
                      {profile.matchesPlayed > 0
                        ? Math.round((profile.wins / profile.matchesPlayed) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  {profile.winStreak > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{profile.winStreak} Win Streak</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Claim Weekly Reward Button */}
            <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-2">
              <div className="text-[11px] font-mono text-slate-400">
                Weekly Tier Yield:
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono">
                +{tierInfo.weeklyRewardBM.toLocaleString()} ƁM & +{tierInfo.weeklyRewardSP} SP
              </div>
              <button
                onClick={handleClaimWeekly}
                className="mt-1 w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4" />
                Claim Weekly Rewards
              </button>
            </div>
          </div>

          {/* Tier Progress Bar */}
          <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1.5">
              <span>Tier Progression</span>
              <span>
                {profile.elo} / {tierInfo.maxElo === 9999 ? 'MAX' : tierInfo.maxElo} Elo (
                {getTierProgress()}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
              <div
                className="h-full transition-all duration-700 rounded-full"
                style={{
                  width: `${getTierProgress()}%`,
                  backgroundColor: tierInfo.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'global'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Global Top 100 Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tier Rewards Matrix
          </button>
        </div>

        {/* Tab 1: Global Leaderboard */}
        {activeTab === 'global' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white uppercase">
                  Season 1 Sovereign Standings
                </span>
              </div>
              <div>Top High-Yield Portfolios</div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {leaderboard.map((entry) => {
                const entryTier = RANKED_TIERS[entry.tier];
                return (
                  <div
                    key={entry.userId}
                    className={`p-4 flex items-center justify-between transition-colors ${
                      entry.isCurrentUser
                        ? 'bg-amber-500/10 border-l-4 border-amber-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <div className="w-8 text-center font-black font-mono text-sm">
                        {entry.rank === 1 ? (
                          <span className="text-yellow-400 text-base">🥇</span>
                        ) : entry.rank === 2 ? (
                          <span className="text-slate-300 text-base">🥈</span>
                        ) : entry.rank === 3 ? (
                          <span className="text-amber-600 text-base">🥉</span>
                        ) : (
                          <span className="text-slate-500">#{entry.rank}</span>
                        )}
                      </div>

                      {/* Tier Icon */}
                      <div className="text-lg">{entryTier.icon}</div>

                      {/* Name & Syndicate */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {entry.displayName}
                          </span>
                          {entry.syndicateTag && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-cyan-400">
                              [{entry.syndicateTag}]
                            </span>
                          )}
                          {entry.isCurrentUser && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {entry.division} • {entry.matchesPlayed} matches •{' '}
                          {entry.winRate}% win rate
                        </div>
                      </div>
                    </div>

                    {/* Elo display */}
                    <div className="text-right">
                      <div
                        className="text-base font-black font-mono"
                        style={{ color: entryTier.color }}
                      >
                        {entry.elo}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        Elo Rating
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Tier Rewards Matrix */}
        {activeTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(RANKED_TIERS) as RankedTier[]).map((tierKey) => {
              const info = RANKED_TIERS[tierKey];
              const isCurrent = profile.tier === tierKey;
              return (
                <div
                  key={tierKey}
                  className={`p-5 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all ${
                    isCurrent
                      ? 'ring-2 ring-amber-400 shadow-xl shadow-amber-950/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                  style={isCurrent ? { backgroundColor: info.badgeBg } : {}}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{info.icon}</span>
                      <div>
                        <div
                          className="text-sm font-black uppercase tracking-wider"
                          style={{ color: info.color }}
                        >
                          {info.tier}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {info.minElo} -{' '}
                          {info.maxElo === 9999 ? '∞' : info.maxElo} Elo
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400 text-black uppercase">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs font-mono text-slate-300 pt-2 border-t border-white/10">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Weekly Cash:</span>
                      <span className="font-bold text-emerald-400">
                        +{info.weeklyRewardBM.toLocaleString()} ƁM
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Strategy Points:</span>
                      <span className="font-bold text-amber-400">
                        +{info.weeklyRewardSP} SP
                      </span>
                    </div>
                    {info.exclusiveCosmetic && (
                      <div className="flex justify-between pt-1 text-[11px] text-purple-300">
                        <span>Exclusive Cosmetic:</span>
                        <span className="font-bold">Unlocked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
