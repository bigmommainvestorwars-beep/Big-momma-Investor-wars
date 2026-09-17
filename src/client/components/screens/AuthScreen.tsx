import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark,
  User,
  ArrowRight,
  Shuffle,
  Shield,
  Sparkles,
  Zap,
  Crown,
  CheckCircle2,
  Lock,
  History,
  Trash2,
  Copy,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

const SUGGESTED_USERNAMES = [
  'ApexTrader',
  'BullRunner',
  'VentureQueen',
  'CyberBaron',
  'QuantumInvestor',
  'ShadowBroker',
  'MetropolisTycoon',
  'GoldStash',
];

export const AuthScreen: React.FC = () => {
  const {
    signInWithUsername,
    signInAsGuest,
    signInWithGoogle,
    signInWithGooglePreview,
    savedUsername,
    savedAccounts,
    deleteSavedAccount,
  } = useAuth();
  const { navigate } = useNavigation();

  const [activeTab, setActiveTab] = useState<'username' | 'guest'>('username');
  const [usernameInput, setUsernameInput] = useState<string>(savedUsername || '');
  const [guestMoniker, setGuestMoniker] = useState<string>(() => {
    return `Guest #${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedDomainInfo, setUnauthorizedDomainInfo] = useState<{
    domain: string;
    message: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const isExistingAccount = savedAccounts.some(
    (a) => a.username.toLowerCase() === usernameInput.trim().toLowerCase()
  );

  const handleRandomizeGuest = () => {
    const titles = ['Rookie', 'Guest', 'Speculator', 'Nomad', 'Investor', 'Scout'];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setGuestMoniker(`${randomTitle} #${randomNum}`);
  };

  const handleSelectPreset = (name: string) => {
    setUsernameInput(name);
    setAuthError(null);
  };

  const handleSubmitUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim();
    if (!clean) {
      setAuthError('Please enter a valid username (min 2 characters).');
      return;
    }
    if (clean.length < 2) {
      setAuthError('Username must be at least 2 characters.');
      return;
    }
    if (clean.length > 20) {
      setAuthError('Username must not exceed 20 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setAuthError(null);
      await signInWithUsername(clean);
      navigate('HOME');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to sign in with username.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchGuest = async () => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      await signInAsGuest(guestMoniker);
      navigate('HOME');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to launch guest session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSavedAccount = async (accountName: string) => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      await signInWithUsername(accountName);
      navigate('HOME');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to resume saved account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      setUnauthorizedDomainInfo(null);
      await signInWithGoogle();
      navigate('HOME');
    } catch (err: any) {
      if (
        err?.code === 'auth/unauthorized-domain' ||
        err?.domain ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('not authorized')
      ) {
        const domain =
          err?.domain || (typeof window !== 'undefined' ? window.location.hostname : 'current domain');
        setUnauthorizedDomainInfo({
          domain,
          message:
            err?.message ||
            `Domain "${domain}" is not authorized for Google OAuth in Firebase Console.`,
        });
      } else if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // User closed the popup, silently clear
      } else {
        setAuthError(err?.message || 'Google authorization could not be completed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueWithGooglePreview = async () => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      await signInWithGooglePreview('bigmommainvestorwars@gmail.com', 'bigmomma');
      navigate('HOME');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to initialize Google preview profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyDomain = async (domain: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(domain);
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="absolute inset-0 bg-[#030712] flex items-center justify-center text-slate-100 font-sans p-4 sm:p-6 overflow-y-auto">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 my-auto"
      >
        {/* Header Branding */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-800/60 to-slate-900/80 relative">
          <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-400/30 rounded-2xl flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Landmark className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-[0.18em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-indigo-300">
            BIG MOMMA
          </h1>
          <h2 className="text-xs font-bold tracking-[0.25em] text-slate-400 mt-1 uppercase">
            Investors' War
          </h2>
          <div className="mt-2 text-[10px] font-mono text-emerald-400/90 flex items-center justify-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-3 h-3" />
            <span>Persistent Player Profile & Syndicate Arena</span>
          </div>
        </div>

        {/* Saved Accounts List (if any exist) */}
        {savedAccounts.length > 0 && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <History className="w-3.5 h-3.5" />
                <span>Saved User Profiles ({savedAccounts.length})</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Data Persisted</span>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {savedAccounts.map((account) => {
                const isSelected =
                  usernameInput.trim().toLowerCase() === account.username.toLowerCase();
                return (
                  <div
                    key={account.uid}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleSelectSavedAccount(account.displayName)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                        {account.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{account.displayName}</span>
                          {account.isGuest && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Guest
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-2">
                          <span className="text-amber-300 font-bold">
                            {account.rankedProfile?.elo || 1200} Elo
                          </span>
                          <span>•</span>
                          <span>{account.rankedProfile?.tier || 'Silver'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelectSavedAccount(account.displayName)}
                        disabled={isSubmitting}
                        className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Resume</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedAccount(account.username)}
                        title="Remove profile from this device"
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('username');
                setAuthError(null);
              }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'username'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Username</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('guest');
                setAuthError(null);
              }}
              className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'guest'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Play as Guest</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mx-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {authError}
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 pt-3 space-y-5">
          <AnimatePresence mode="wait">
            {activeTab === 'username' ? (
              <motion.form
                key="tab-username"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmitUsername}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="username-input-field"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between"
                  >
                    <span>Choose / Enter Username</span>
                    <span className="text-[10px] font-mono text-slate-500">2-20 characters</span>
                  </label>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="username-input-field"
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="e.g. ApexTrader"
                      maxLength={20}
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Preset Suggestions */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Quick Suggestions:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_USERNAMES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelectPreset(name)}
                        className={`text-[11px] font-mono py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                          usernameInput === name
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Identity Preview Card */}
                {usernameInput.trim().length >= 2 && (
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-slate-800 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-sm">
                      {usernameInput.trim()[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="text-xs font-bold text-white truncate">
                        {usernameInput.trim()}
                      </div>
                      <div className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          {isExistingAccount
                            ? 'Saved profile detected • All progress restored'
                            : 'New profile • Data will be auto-saved'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  id="submit-username-btn"
                  type="submit"
                  disabled={isSubmitting || !usernameInput.trim()}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer active:scale-95 min-h-[46px]"
                >
                  <span>{isExistingAccount ? 'Sign In & Resume Data' : 'Create & Save Profile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="tab-guest"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-center"
              >
                <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <Shield className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Zero-Friction Guest Access</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Play instantly with a guest moniker. Guest sessions and ratings are saved so you can resume anytime.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300">
                      {guestMoniker}
                    </span>
                    <button
                      type="button"
                      onClick={handleRandomizeGuest}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                      title="Generate new guest codename"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  id="launch-guest-btn"
                  type="button"
                  onClick={handleLaunchGuest}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer active:scale-95 min-h-[46px]"
                >
                  <span>Launch Saved Guest Session</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cloud Sync Information */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <button
              id="google-authorize-btn"
              type="button"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4"
              />
              <span>Authorize with Google (Cloud Sync)</span>
            </button>

            {/* Unauthorized Domain Guidance & Immediate Fallback */}
            <AnimatePresence>
              {unauthorizedDomainInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-left space-y-2.5 overflow-hidden"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        Firebase Preview Domain Authorization
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Google Sign-In requires your preview domain to be added in Firebase Console.
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-amber-200/90 truncate max-w-[200px]">
                      {unauthorizedDomainInfo.domain}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyDomain(unauthorizedDomainInfo.domain)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedDomain ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href="https://console.firebase.google.com/project/bigmomma-investor-wars/authentication/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 font-semibold"
                    >
                      <span>Firebase Settings</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueWithGooglePreview}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>Continue as bigmommainvestorwars</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

