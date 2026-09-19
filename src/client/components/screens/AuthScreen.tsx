import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, Smartphone, Mail, AlertCircle, Loader2, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithQuickProfile,
    isLoading: authLoading,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'quick' | 'google' | 'email'>('quick');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [domainWarning, setDomainWarning] = useState<string | null>(null);

  // Email form state
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customName, setCustomName] = useState('');

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'deployed-domain.vercel.app';

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setDomainWarning(null);
    setLoadingAction('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain') || msg.includes('not in Firebase Authorized Domains')) {
        setDomainWarning(currentHost);
        setErrorMessage(
          `Google Sign-In blocked: "${currentHost}" is not added to your Firebase Authorized Domains.`
        );
      } else if (err?.code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setErrorMessage('iPhone Safari blocked the popup. Allow popups in Safari settings or use Quick Investor Sign-In below.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleQuickLogin = async (preset: 'phone_a' | 'phone_b' | 'custom') => {
    setErrorMessage(null);
    setLoadingAction(preset);
    try {
      await signInWithQuickProfile(preset, customName);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize quick investor profile');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setErrorMessage(null);
    setLoadingAction('email');
    try {
      if (emailMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, customName || undefined);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoadingAction(null);
    }
  };

  const fillTestCredentials = (account: 'a' | 'b') => {
    if (account === 'a') {
      setEmail('phone_a@investorwars.dev');
      setPassword('Investor123!');
      setCustomName('Investor Alpha (Phone A)');
    } else {
      setEmail('phone_b@investorwars.dev');
      setPassword('Investor123!');
      setCustomName('Investor Beta (Phone B)');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-100 font-sans p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-800/40 to-slate-900/60">
          <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-400/30 rounded-2xl flex items-center justify-center mb-3">
            <Landmark className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black tracking-[0.15em] uppercase text-emerald-300">
            BIG MOMMA
          </h1>
          <h2 className="text-xs font-bold tracking-[0.2em] text-slate-400 mt-1">INVESTORS' WAR</h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Domain Warning Explanation Banner */}
          {domainWarning && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Why Google Sign-In Failed on Vercel:</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Firebase restricts OAuth to authorized domains. <span className="font-mono text-amber-300 font-semibold">{domainWarning}</span> is not on your project's list yet.
              </p>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-amber-500/20 space-y-1 font-mono text-[11px]">
                <p className="text-slate-400 font-sans font-bold">To permanently authorize Google OAuth:</p>
                <p>1. Open <strong className="text-amber-300">Firebase Console</strong></p>
                <p>2. Go to <strong className="text-amber-300">Authentication</strong> → <strong className="text-amber-300">Settings</strong> → <strong className="text-amber-300">Authorized domains</strong></p>
                <p>3. Click <strong className="text-amber-300">Add domain</strong> and paste: <span className="text-emerald-400 underline">{domainWarning}</span></p>
              </div>
              <p className="text-emerald-300 font-medium">
                👉 In the meantime, use <strong>Quick 1-Tap Access</strong> below to test multiplayer on both phones right now!
              </p>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && !domainWarning && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {/* Sign-In Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('quick');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'quick'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1-Tap Phone
            </button>
            <button
              onClick={() => {
                setActiveTab('google');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'google'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google
            </button>
            <button
              onClick={() => {
                setActiveTab('email');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'email'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Email/Pass
            </button>
          </div>

          {/* TAB 1: QUICK 1-TAP ACCESS (OPTIMIZED FOR 2 PHONES) */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5 text-center">
                <p className="text-xs text-slate-300 font-semibold mb-1">Instant 2-Phone Testing</p>
                <p className="text-[11px] text-slate-400">
                  Select Phone A on device 1, and Phone B on device 2 to connect to room <strong className="text-emerald-400">BM-0X9X</strong>.
                </p>
              </div>

              {/* Phone A Button */}
              <button
                disabled={Boolean(loadingAction) || authLoading}
                onClick={() => handleQuickLogin('phone_a')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-between shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700/60 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-emerald-200" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm">Phone A (Host)</div>
                    <div className="text-[10px] text-emerald-200 font-normal">Investor Alpha • Creates Lobby</div>
                  </div>
                </div>
                {loadingAction === 'phone_a' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>

              {/* Phone B Button */}
              <button
                disabled={Boolean(loadingAction) || authLoading}
                onClick={() => handleQuickLogin('phone_b')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center justify-between shadow-lg shadow-cyan-950/50 transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-700/60 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-cyan-200" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm">Phone B (Guest)</div>
                    <div className="text-[10px] text-cyan-200 font-normal">Investor Beta • Joins BM-0X9X</div>
                  </div>
                </div>
                {loadingAction === 'phone_b' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>

              {/* Custom Name Accordion */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Or enter custom name..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    disabled={Boolean(loadingAction) || authLoading}
                    onClick={() => handleQuickLogin('custom')}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {loadingAction === 'custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SIGN-IN */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 text-center font-mono">
                OFFICIAL GOOGLE OAUTH AUTHORIZATION
              </p>
              
              <button
                disabled={Boolean(loadingAction) || authLoading}
                onClick={handleGoogleLogin}
                className="w-full py-4 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-95 disabled:opacity-50"
              >
                {loadingAction === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
                ) : (
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                )}
                <span>AUTHORIZE WITH GOOGLE</span>
              </button>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="text-slate-300 font-semibold">Note for Vercel Deployments:</p>
                <p>
                  If Google blocks your login, add <span className="font-mono text-emerald-400 font-bold">{currentHost}</span> to Firebase Console Authorized Domains, or switch to the <strong>1-Tap Phone</strong> tab!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL / PASSWORD */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setEmailMode('signin')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                    emailMode === 'signin' ? 'bg-slate-800 text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('signup')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                    emailMode === 'signup' ? 'bg-slate-800 text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {emailMode === 'signup' && (
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Investor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Warren Buffet"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="investor@wars.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fillTestCredentials('a')}
                  className="flex-1 py-1 bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-400 rounded-lg"
                >
                  Fill Phone A Creds
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCredentials('b')}
                  className="flex-1 py-1 bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-400 rounded-lg"
                >
                  Fill Phone B Creds
                </button>
              </div>

              <button
                type="submit"
                disabled={Boolean(loadingAction) || authLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-2"
              >
                {loadingAction === 'email' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>
          )}

          <p className="text-[10px] text-slate-600 text-center uppercase tracking-wider pt-2">
            By authorizing, you agree to the Syndicate Terms & Conditions.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
