import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark, User as UserIcon, Mail, Lock, Sparkles, ShieldAlert, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnonymously, error, isLoading } = useAuth();

  const [authMode, setAuthMode] = useState<'options' | 'email_signin' | 'email_signup'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';

  const handleGoogleAuth = async () => {
    setLocalError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setLocalError(
          `Domain "${currentHostname}" is not in your Firebase Authorized Domains list. You can add it in Firebase Console > Authentication > Settings, or play immediately as a Guest below.`
        );
      } else {
        setLocalError(err?.message || 'Google authorization could not be completed.');
      }
    }
  };

  const handleGuestAuth = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInAnonymously();
    } catch (err: any) {
      setLocalError(err?.message || 'Guest authorization failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);
    try {
      if (authMode === 'email_signup') {
        await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;
  const isDomainError = activeError?.includes('unauthorized-domain') || activeError?.includes('Authorized Domains');

  return (
    <div className="absolute inset-0 bg-[#030712] flex items-center justify-center text-slate-100 font-sans p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Header Section */}
        <div className="p-7 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-800/60 to-slate-900/60 relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-400/30 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-emerald-950/40">
            <Landmark className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black tracking-[0.18em] uppercase text-emerald-300">
            BIG MOMMA
          </h1>
          <h2 className="text-xs font-bold tracking-[0.25em] text-slate-400 mt-0.5">INVESTORS' WAR</h2>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Error Banner */}
          {activeError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-mono space-y-2">
              <div className="flex items-start gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{isDomainError ? 'Firebase Domain Notice' : 'Authorization Notice'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-300/90 pl-6">
                {activeError}
              </p>
              {isDomainError && (
                <div className="pl-6 pt-1">
                  <button
                    type="button"
                    onClick={handleGuestAuth}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Play as Guest Instead</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {authMode === 'options' ? (
            <div className="space-y-3">
              <p className="text-xs text-center text-slate-400 font-mono uppercase tracking-wider mb-2">
                Choose Authentication Method
              </p>

              {/* Google OAuth Button */}
              <button
                id="google-signin-btn"
                onClick={handleGoogleAuth}
                disabled={isLoading || isSubmitting}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:scale-98 text-slate-900 rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-4 h-4"
                />
                <span>SIGN IN WITH GOOGLE</span>
              </button>

              {/* Guest Quick Play Button */}
              <button
                id="guest-signin-btn"
                onClick={handleGuestAuth}
                disabled={isLoading || isSubmitting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/60 disabled:opacity-50 border border-emerald-400/30"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>PLAY AS GUEST (INSTANT ACCESS)</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Email Options */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('email_signin')}
                  className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Email Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('email_signup')}
                  className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 cursor-pointer transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  {authMode === 'email_signup' ? 'Create Syndicate Account' : 'Investor Email Sign In'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('options');
                    setLocalError(null);
                  }}
                  className="text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Back
                </button>
              </div>

              {authMode === 'email_signup' && (
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Investor Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warren B."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="investor@syndicate.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'email_signup' ? 'REGISTER ACCOUNT' : 'SIGN IN'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'email_signin' ? 'email_signup' : 'email_signin')}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 cursor-pointer"
                >
                  {authMode === 'email_signin'
                    ? "Don't have an account? Create one"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          )}

          <p className="text-[10px] text-slate-600 text-center uppercase tracking-wider">
            Big Momma Investors' War • Financial Authorization Engine
          </p>
        </div>
      </motion.div>
    </div>
  );
};

