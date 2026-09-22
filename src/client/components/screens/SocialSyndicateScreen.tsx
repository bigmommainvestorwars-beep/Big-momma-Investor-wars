import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Shield,
  Zap,
  ChevronLeft,
  Copy,
  Check,
  UserPlus,
  Swords,
  Crown,
  Sparkles,
  TrendingUp,
  PlusCircle,
  LogOut,
  Building,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import {
  SyndicateService,
  SYNDICATE_PERKS,
  Syndicate,
  SyndicatePerk,
} from '../../../services/social/syndicateService';
import {
  FriendsService,
  Friend,
} from '../../../services/social/friendsService';
import { NotificationService } from '../../../services/notifications/notificationService';

export const SocialSyndicateScreen: React.FC = () => {
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { createPrivateMatch } = useGame();

  const [activeTab, setActiveTab] = useState<'my_syndicate' | 'directory' | 'friends'>('my_syndicate');
  const [syndicate, setSyndicate] = useState<Syndicate | undefined>(() => SyndicateService.getUserSyndicate());
  const [allSyndicates, setAllSyndicates] = useState<Syndicate[]>(() => SyndicateService.getAllSyndicates());
  const [friends, setFriends] = useState<Friend[]>(() => FriendsService.getFriends());
  const [myFriendCode, setMyFriendCode] = useState<string>(() => FriendsService.getMyFriendCode());

  // Input states
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [friendNotice, setFriendNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [spDepositAmount, setSpDepositAmount] = useState<number>(100);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Create Syndicate Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSynName, setNewSynName] = useState('');
  const [newSynTag, setNewSynTag] = useState('');
  const [newSynDesc, setNewSynDesc] = useState('');
  const [newSynEmblem, setNewSynEmblem] = useState('👑');

  useEffect(() => {
    setSyndicate(SyndicateService.getUserSyndicate());
    setAllSyndicates(SyndicateService.getAllSyndicates());
    setFriends(FriendsService.getFriends());
  }, []);

  const handleCopyFriendCode = () => {
    navigator.clipboard.writeText(myFriendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) return;
    const res = FriendsService.addFriendByCode(friendCodeInput);
    if (res.success) {
      setFriends(FriendsService.getFriends());
      setFriendNotice({ text: res.message });
      setFriendCodeInput('');
    } else {
      setFriendNotice({ text: res.message, error: true });
    }
    setTimeout(() => setFriendNotice(null), 3500);
  };

  const handleDepositSP = (amount: number) => {
    if (!syndicate) return;
    const res = SyndicateService.depositSP(
      syndicate.id,
      amount,
      user?.uid || 'user_local',
      user?.displayName || 'You'
    );
    if (res.success) {
      setSyndicate(SyndicateService.getUserSyndicate());
      setAllSyndicates(SyndicateService.getAllSyndicates());
      setActionNotice(res.message);
      if (res.unlockedNewPerk) {
        NotificationService.dispatch(
          'SYNDICATE_EVENT',
          `🎉 Perk Unlocked: ${res.unlockedNewPerk.name}!`,
          res.unlockedNewPerk.description
        );
      }
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleCreateSyndicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSynName.trim() || !newSynTag.trim()) return;
    const res = SyndicateService.createSyndicate(
      newSynName.trim(),
      newSynTag.trim(),
      newSynEmblem,
      newSynDesc.trim() || 'Formidable Investor Syndicate.',
      user?.uid || 'user_local',
      user?.displayName || 'You'
    );
    if (res.success) {
      setShowCreateModal(false);
      setSyndicate(res.syndicate);
      setAllSyndicates(SyndicateService.getAllSyndicates());
      setActiveTab('my_syndicate');
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
    } else {
      setActionNotice(res.message);
    }
  };

  const handleDirectChallenge = async (friend: Friend) => {
    try {
      const matchId = await createPrivateMatch();
      const roomCode = (typeof matchId === 'string' ? matchId : 'BM-RIVAL').substring(0, 6).toUpperCase();
      FriendsService.issueDirectChallenge(friend, roomCode);
      NotificationService.triggerDirectChallenge(friend.displayName, roomCode);
      setActionNotice(`Challenge dispatched to ${friend.displayName}! Room Code: ${roomCode}`);
      setTimeout(() => {
        setActionNotice(null);
        navigate('LOBBY');
      }, 1500);
    } catch (err: any) {
      console.warn('Direct challenge error:', err);
    }
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
                Investor Syndicates & Social
              </span>
              {syndicate && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  [{syndicate.tag}] {syndicate.name}
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Shared SP Vaults • Member Perks • Private Room Challenges
            </div>
          </div>
        </div>

        {/* Friend Code Chip */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Your ID:</span>
          <span className="font-bold text-cyan-400">{myFriendCode}</span>
          <button
            onClick={handleCopyFriendCode}
            className="p-1 hover:text-white text-slate-400 transition-colors cursor-pointer"
            title="Copy Friend Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Notice Banner */}
        <AnimatePresence>
          {actionNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{actionNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('my_syndicate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'my_syndicate'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Syndicate & SP Vault
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Syndicate Directory ({allSyndicates.length})
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Friends & 1v1 Challenges ({friends.length})
          </button>
        </div>

        {/* Tab 1: My Syndicate */}
        {activeTab === 'my_syndicate' && (
          <>
            {syndicate ? (
              <div className="space-y-6">
                {/* Syndicate Header Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-xl">
                        {syndicate.emblem}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black uppercase text-white">
                            {syndicate.name}
                          </h2>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-amber-500/40 text-amber-300">
                            [{syndicate.tag}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-lg mt-1">
                          {syndicate.description}
                        </p>
                        <div className="text-[11px] font-mono text-slate-400 mt-2 flex items-center gap-4">
                          <span>
                            Members: <strong className="text-white">{syndicate.members.length} / {syndicate.maxMembers}</strong>
                          </span>
                          <span>
                            Min Elo: <strong className="text-amber-400">{syndicate.minElo}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vault SP Pool & Quick Deposit */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 min-w-[240px]">
                      <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Syndicate SP Vault</span>
                      </div>
                      <div className="text-3xl font-black text-white font-mono my-1">
                        {syndicate.vaultSP.toLocaleString()}{' '}
                        <span className="text-xs text-amber-400 font-normal">SP</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mb-3">
                        Pooled for collective game perks
                      </div>

                      {/* Deposit quick actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDepositSP(50)}
                          className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                        >
                          +50 SP
                        </button>
                        <button
                          onClick={() => handleDepositSP(100)}
                          className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                        >
                          +100 SP
                        </button>
                        <button
                          onClick={() => handleDepositSP(250)}
                          className="flex-1 py-1.5 bg-amber-500/30 hover:bg-amber-500/40 border border-amber-500/50 text-amber-100 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all active:scale-95"
                        >
                          +250 SP
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Syndicate Perks Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Shared Syndicate Perks Tree
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      Active bonuses apply to all members in every match
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SYNDICATE_PERKS.map((perk) => {
                      const isUnlocked = syndicate.vaultSP >= perk.requiredSP;
                      const progress = Math.min(100, Math.round((syndicate.vaultSP / perk.requiredSP) * 100));

                      return (
                        <div
                          key={perk.id}
                          className={`p-4 rounded-2xl border relative overflow-hidden transition-all ${
                            isUnlocked
                              ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                              : 'bg-slate-900/50 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{perk.icon}</span>
                            {isUnlocked ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                                Active Perk
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400">
                                {syndicate.vaultSP} / {perk.requiredSP} SP
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-bold text-white mb-0.5">
                            {perk.name}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-emerald-400 mb-1.5">
                            {perk.tagline}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                            {perk.description}
                          </p>

                          {!isUnlocked && (
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Member Roster & Activity Feed Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Member Roster */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Member Roster ({syndicate.members.length})
                    </h3>
                    <div className="divide-y divide-slate-800/80">
                      {syndicate.members.map((member) => (
                        <div
                          key={member.userId}
                          className="py-3 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300 border border-slate-700">
                              {member.displayName[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{member.displayName}</span>
                                {member.role === 'Founder' && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    FOUNDER
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {member.elo} Elo • Role: {member.role}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-amber-400">
                              +{member.spContributed} SP
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase">
                              Contributed
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      Syndicate Activity Feed
                    </h3>
                    <div className="space-y-3">
                      {syndicate.activityFeed.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono text-slate-300"
                        >
                          <div>{act.text}</div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {new Date(act.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
                <Crown className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">You are not in a Syndicate</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Join a Syndicate to pool Strategy Points in shared vaults, unlock game-wide perks, and conquer the global leaderboards.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('directory')}
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Browse Directory
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Create Syndicate
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Syndicate Directory */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                Explore Investor Syndicates • Pool resources for collective multipliers
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Charter New Syndicate
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSyndicates.map((syn) => {
                const isMember = syndicate?.id === syn.id;
                return (
                  <div
                    key={syn.id}
                    className={`p-5 rounded-2xl border bg-slate-900/60 transition-all flex flex-col justify-between ${
                      isMember ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{syn.emblem}</span>
                          <div>
                            <div className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                              <span>{syn.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-amber-300 border border-amber-500/30">
                                [{syn.tag}]
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Min Elo: {syn.minElo} • Vault: {syn.vaultSP} SP
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {syn.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        {syn.members.length} / {syn.maxMembers} Members
                      </span>
                      {isMember ? (
                        <span className="text-xs font-mono font-bold text-amber-400">
                          ENROLLED
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const res = SyndicateService.joinSyndicate(
                              syn.id,
                              user?.uid || 'user_local',
                              user?.displayName || 'Investor',
                              1200
                            );
                            if (res.success) {
                              setSyndicate(SyndicateService.getUserSyndicate());
                              setAllSyndicates(SyndicateService.getAllSyndicates());
                              setActionNotice(res.message);
                              setTimeout(() => setActionNotice(null), 3000);
                            } else {
                              setActionNotice(res.message);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Friends & Direct Challenges */}
        {activeTab === 'friends' && (
          <div className="space-y-6">
            {/* Add Friend Bar */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <form onSubmit={handleAddFriend} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Enter Friend Code (e.g. BM-1102)"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs font-mono font-bold uppercase text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!friendCodeInput.trim()}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect Friend
                </button>
              </form>

              {friendNotice && (
                <div
                  className={`mt-2 text-xs font-mono ${
                    friendNotice.error ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {friendNotice.text}
                </div>
              )}
            </div>

            {/* Friends Roster */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="font-bold text-white uppercase">Investor Network Contacts</span>
                <span>Direct 1v1 Room Challenge Enabled</span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {friends.map((friend) => (
                  <div
                    key={friend.userId}
                    className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Presence indicator */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                          {friend.displayName[0]}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                            friend.presence === 'online'
                              ? 'bg-emerald-400'
                              : friend.presence === 'in_match'
                              ? 'bg-amber-400'
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {friend.displayName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({friend.friendCode})
                          </span>
                          {friend.syndicateTag && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-cyan-400">
                              [{friend.syndicateTag}]
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {friend.tier} • {friend.elo} Elo •{' '}
                          <span
                            className={
                              friend.presence === 'online'
                                ? 'text-emerald-400'
                                : friend.presence === 'in_match'
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }
                          >
                            {friend.presence === 'online'
                              ? 'Online & Available'
                              : friend.presence === 'in_match'
                              ? 'In Match'
                              : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Challenge Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDirectChallenge(friend)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center gap-2"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        Challenge 1v1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Syndicate */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase text-white">
                    Charter Investor Syndicate
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-500 hover:text-white cursor-pointer text-xs font-mono"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSyndicate} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    Syndicate Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sovereign Quant Syndicate"
                    value={newSynName}
                    onChange={(e) => setNewSynName(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">
                      Ticker Tag (Max 4)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="e.g. APEX"
                      value={newSynTag}
                      onChange={(e) => setNewSynTag(e.target.value.toUpperCase())}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">
                      Emblem Icon
                    </label>
                    <div className="flex gap-2 mt-1">
                      {['👑', '🏛️', '🦁', '⚡', '🦅'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setNewSynEmblem(sym)}
                          className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center cursor-pointer ${
                            newSynEmblem === sym
                              ? 'border-amber-400 bg-amber-500/20'
                              : 'border-slate-800 bg-slate-950'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    Syndicate Charter & Bio
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe your clan strategy and membership focus..."
                    value={newSynDesc}
                    onChange={(e) => setNewSynDesc(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Charter Syndicate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
