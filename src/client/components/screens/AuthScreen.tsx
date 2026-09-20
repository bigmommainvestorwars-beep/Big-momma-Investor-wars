import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark, Smartphone, Mail, AlertCircle, Loader2, User, ArrowRight, ShieldAlert, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithEmail,
    signUpWithEmail,
    signInWithQuickProfile,
    isLoading: authLoading,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'quick' | 'google' | 'email'>('quick');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [domainWarning, setDomainWarning] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Email form state
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customName, setCustomName] = useState('');

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'big-momma-investor-wars-dl7b.vercel.app';

  const copyDomainToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setDomainWarning(null);
    setLoadingAction('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        setDomainWarning(currentHost);
        setErrorMessage(
          `Google Sign-In blocked: "${currentHost}" is not listed in Firebase Authorized Domains.`
        );
      } else if (err?.code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setErrorMessage('Browser blocked the popup window. Use "Sign in with Google (Redirect Mode)" below for iPhone / Safari!');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage(
          'Google popup was closed before completing login. On mobile Safari, use "Sign in with Google (Redirect Mode)" below or 1-Tap Phone Sign-In!'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setErrorMessage(null);
    setDomainWarning(null);
    setLoadingAction('google-redirect');
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        setDomainWarning(currentHost);
        setErrorMessage(
          `Google Sign-In blocked: "${currentHost}" is not listed in Firebase Authorized Domains.`
        );
      } else {
        setErrorMessage(msg);
      }
      setLoadingAction(null);
    }
  };

  const handleQuickLogin = async (preset: 'phone_a' | 'phone_b' | 'custom') => {
    setErrorMessage(null);
    setDomainWarning(null);
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
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    // Client-side email validation to catch single-character entries like 'r'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. investor@example.com).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setErrorMessage(null);
    setLoadingAction('email');
    try {
      if (emailMode === 'signin') {
        try {
          await signInWithEmail(cleanEmail, password);
        } catch (signErr: any) {
          // If account doesn't exist yet, auto-register smoothly so the user isn't blocked
          if (
            signErr?.code === 'auth/user-not-found' ||
            signErr?.code === 'auth/invalid-credential' ||
            signErr?.message?.includes('No account found')
          ) {
            try {
              const fallbackName = customName.trim() || cleanEmail.split('@')[0];
              await signUpWithEmail(cleanEmail, password, fallbackName);
              return;
            } catch (createErr: any) {
              // If create fails (e.g. account actually existed and password was truly incorrect), throw signErr
              throw signErr;
            }
          }
          throw signErr;
        }
      } else {
        try {
          await signUpWithEmail(cleanEmail, password, customName.trim() || undefined);
        } catch (upErr: any) {
          if (upErr?.code === 'auth/email-already-in-use' || upErr?.message?.includes('already exists')) {
            // If already registered, attempt seamless sign in
            await signInWithEmail(cleanEmail, password);
            return;
          }
          throw upErr;
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoadingAction(null);
    }
  };

  const fillTestCredentials = (account: 'a' | 'b') => {
    setErrorMessage(null);
    if (account === 'a') {
      setEmail('phone_a@investorwars.dev');
      setPassword('Investor123!');
      setCustomName('Investor Alpha');
    } else {
      setEmail('phone_b@investorwars.dev');
      setPassword('Investor123!');
      setCustomName('Investor Beta');
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
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Why Google OAuth Refused Connection:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Because your app is deployed on Vercel (<span className="font-mono text-amber-300">{domainWarning}</span>), Firebase blocks Google login popups until that domain is whitelisted.
              </p>
              
              <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/20 space-y-2 font-sans text-[11px]">
                <p className="text-slate-400 font-bold">1-Minute Fix in Firebase Console:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Go to <strong>Firebase Console</strong> → <strong>Authentication</strong></li>
                  <li>Open <strong>Settings</strong> tab → <strong>Authorized domains</strong></li>
                  <li>Click <strong>Add domain</strong> and paste your Vercel URL below:</li>
                </ol>
                
                <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-slate-800">
                  <code className="flex-1 bg-black/60 px-2.5 py-1.5 rounded-lg text-emerald-300 font-mono text-[11px] truncate select-all border border-slate-700">
                    {domainWarning}
                  </code>
                  <button
                    type="button"
                    onClick={copyDomainToClipboard}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 text-[11px] font-bold shrink-0 transition-colors"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href="https://console.firebase.google.com/project/bigmomma-investor-wars/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg flex items-center gap-1 text-[11px] font-bold shrink-0 transition-colors"
                  >
                    <span>Console ↗</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
                <span className="text-[11px] text-emerald-300 font-medium">Or play immediately without OAuth delay:</span>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('custom')}
                  className="text-xs text-white font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-950/60 active:scale-95 text-center"
                >
                  ⚡ Instant 1-Tap Access →
                </button>
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && !domainWarning && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <p>{errorMessage}</p>
                {errorMessage.includes('credentials') && (
                  <p className="mt-1 text-[11px] text-rose-300 font-medium">
                    Tip: Switch to <strong>Create Account</strong> if this is your first time, or tap <strong>1-Tap Phone</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sign-In Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('quick');
                setErrorMessage(null);
                setDomainWarning(null);
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
                setDomainWarning(null);
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
                setDomainWarning(null);
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
                <p className="text-xs text-slate-300 font-semibold mb-1">Instant 2-Phone Testing (Recommended)</p>
                <p className="text-[11px] text-slate-400">
                  Select Phone A on device 1, and Phone B on device 2 to connect to room <strong className="text-emerald-400">BM-0X9X</strong>. No passwords or OAuth required.
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
                      placeholder="Or enter custom investor name..."
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
            <div className="space-y-3">
              <p className="text-xs text-slate-400 text-center font-mono">
                OFFICIAL GOOGLE OAUTH AUTHORIZATION
              </p>

              {/* Primary Mobile-Friendly Redirect Option */}
              <button
                id="google-redirect-btn"
                disabled={Boolean(loadingAction) || authLoading}
                onClick={handleGoogleRedirectLogin}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-95 disabled:opacity-50 shadow-lg shadow-white/10 cursor-pointer"
              >
                {loadingAction === 'google-redirect' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
                ) : (
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                )}
                <span>SIGN IN WITH GOOGLE (REDIRECT / MOBILE)</span>
              </button>

              {/* Desktop Popup Option */}
              <button
                id="google-popup-btn"
                disabled={Boolean(loadingAction) || authLoading}
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 border border-slate-700/60 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loadingAction === 'google' && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
                <span>Open Desktop Popup Window</span>
              </button>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Firebase Authorized Domain:</span>
                  <button
                    type="button"
                    onClick={copyDomainToClipboard}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-emerald-300 text-[10px] bg-black/40 px-2 py-1 rounded border border-slate-800 truncate select-all">
                  {currentHost}
                </div>
                <p className="text-slate-400 leading-relaxed text-[10px]">
                  <strong>Tip:</strong> If you already added the domain above to Authorized Domains, also verify in Firebase Console that the <strong>Google provider is Enabled</strong> under <em>Authentication → Sign-in method</em> with a project support email set.
                </p>
                <p className="text-[10px] text-slate-500">
                  <strong>iPhone Note:</strong> iOS Safari often blocks popups. Tap <strong>Redirect / Mobile</strong> above or use <strong>1-Tap Phone</strong>.
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
                  onClick={() => {
                    setEmailMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    emailMode === 'signin' ? 'bg-slate-800 text-emerald-300 border border-slate-700' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    emailMode === 'signup' ? 'bg-slate-800 text-emerald-300 border border-slate-700' : 'text-slate-500 hover:text-slate-300'
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
                  placeholder="investor@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fillTestCredentials('a')}
                  className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 font-medium rounded-lg border border-slate-700/60 transition-colors"
                >
                  Fill Phone A Creds
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCredentials('b')}
                  className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 font-medium rounded-lg border border-slate-700/60 transition-colors"
                >
                  Fill Phone B Creds
                </button>
              </div>

              <button
                type="submit"
                disabled={Boolean(loadingAction) || authLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-2 shadow-lg shadow-emerald-950/40"
              >
                {loadingAction === 'email' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(emailMode === 'signin' ? 'signup' : 'signin');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-emerald-300 transition-colors"
                >
                  {emailMode === 'signin'
                    ? "Don't have an account? Create one now"
                    : 'Already registered? Sign in here'}
                </button>
              </div>
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
