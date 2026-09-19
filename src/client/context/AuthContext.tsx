/**
 * Production Auth Context
 * Provides real-time Firebase Authentication state to the React client tree,
 * with a safe DEVELOPMENT/LOCAL TEST MODE toggle for offline/local gameplay testing.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '../../types/auth';
import { authService } from '../../services/firebase/authService';
import { setCloudFunctionsLocalTestMode, setActiveClientUser } from '../../services/firebase/cloudFunctionsClient';

export const DEFAULT_LOCAL_TEST_USER: User = {
  uid: 'local_founder_1',
  email: 'founder@investorwars.dev',
  displayName: 'Investor (You)',
  photoURL: null,
  emailVerified: true,
  createdAt: Date.now(),
  lastLoginAt: Date.now(),
};

interface AuthContextValue extends AuthState {
  isLocalTestMode: boolean;
  setLocalTestMode: (enabled: boolean) => void;
  switchMockUser: (displayName: string, email?: string) => void;
  signInWithGoogle: () => Promise<User>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  signInAnonymously: () => Promise<User>;
  signInWithQuickProfile: (preset: 'phone_a' | 'phone_b' | 'custom', customName?: string) => Promise<User>;
  signOut: () => Promise<void>;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only use local test mode if Firebase is not configured; production/cloud mode must be default
  const hasFirebase = authService.isConfigured();
  const [isLocalTestMode, setIsLocalTestModeState] = useState<boolean>(!hasFirebase);
  
  // Check for saved investor profile in localStorage
  const getInitialUser = (): User | null => {
    if (typeof window === 'undefined') return !hasFirebase ? DEFAULT_LOCAL_TEST_USER : null;
    try {
      const saved = localStorage.getItem('investor_wars_persisted_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.uid) return parsed;
      }
    } catch {}
    return !hasFirebase ? DEFAULT_LOCAL_TEST_USER : null;
  };

  const [mockUser, setMockUser] = useState<User | null>(getInitialUser);
  const [firebaseAuthState, setFirebaseAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: hasFirebase,
    error: null,
  });

  const setLocalTestMode = (enabled: boolean) => {
    setIsLocalTestModeState(enabled);
    setCloudFunctionsLocalTestMode(enabled);
  };

  const switchMockUser = (displayName: string, email?: string) => {
    const updatedUser: User = {
      uid: mockUser?.uid || 'local_founder_1',
      email: email || 'founder@investorwars.dev',
      displayName: displayName || 'Investor (You)',
      photoURL: null,
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    setMockUser(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('investor_wars_persisted_user', JSON.stringify(updatedUser));
      localStorage.setItem('investor_wars_client_uid', updatedUser.uid);
      localStorage.setItem('investor_wars_client_name', updatedUser.displayName || 'Investor');
    }
    setActiveClientUser({ uid: updatedUser.uid, displayName: updatedUser.displayName || 'Investor' });
  };

  useEffect(() => {
    if (mockUser) {
      setActiveClientUser({ uid: mockUser.uid, displayName: mockUser.displayName || 'Investor' });
    }

    if (!authService.isConfigured()) {
      setFirebaseAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check for incoming redirect authentication from Google
    authService.checkRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        setFirebaseAuthState({
          isAuthenticated: true,
          user: redirectUser,
          isLoading: false,
          error: null,
        });
        const dName = redirectUser.displayName || (redirectUser.email ? redirectUser.email.split('@')[0] : 'Investor');
        setActiveClientUser({ uid: redirectUser.uid, displayName: dName });
        if (typeof window !== 'undefined') {
          localStorage.setItem('investor_wars_client_uid', redirectUser.uid);
          localStorage.setItem('investor_wars_client_name', dName);
          localStorage.setItem('investor_wars_persisted_user', JSON.stringify(redirectUser));
        }
      }
    }).catch((err) => {
      console.warn('[AuthContext] Redirect login notice:', err);
    });

    const unsubscribe = authService.onAuthStateChanged((user) => {
      setFirebaseAuthState({
        isAuthenticated: Boolean(user),
        user,
        isLoading: false,
        error: null,
      });
      if (user) {
        const dName = user.displayName || (user.email ? user.email.split('@')[0] : 'Investor');
        setActiveClientUser({ uid: user.uid, displayName: dName });
        if (typeof window !== 'undefined') {
          localStorage.setItem('investor_wars_client_uid', user.uid);
          localStorage.setItem('investor_wars_client_name', dName);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogleRedirect = async (): Promise<void> => {
    try {
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      await authService.signInWithGoogleRedirect();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  };

  const handleSignInWithGoogle = async (): Promise<User> => {
    try {
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      const user = await authService.signInWithGoogle();
      setFirebaseAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
      const dName = user.displayName || (user.email ? user.email.split('@')[0] : 'Investor');
      setActiveClientUser({ uid: user.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', user.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(user));
      }
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  };

  const handleSignInWithEmail = async (email: string, password: string): Promise<User> => {
    try {
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      const user = await authService.signInWithEmail(email, password);
      setFirebaseAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
      const dName = user.displayName || email.split('@')[0];
      setActiveClientUser({ uid: user.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', user.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(user));
      }
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string, displayName?: string): Promise<User> => {
    try {
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      const user = await authService.signUpWithEmail(email, password, displayName);
      setFirebaseAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
      const dName = displayName || email.split('@')[0];
      setActiveClientUser({ uid: user.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', user.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(user));
      }
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  };

  const handleSignInAnonymously = async (): Promise<User> => {
    try {
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      const user = await authService.signInAnonymously();
      setFirebaseAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
      setActiveClientUser({ uid: user.uid, displayName: 'Anonymous Investor' });
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  };

  const handleSignInWithQuickProfile = async (
    preset: 'phone_a' | 'phone_b' | 'custom',
    customName?: string
  ): Promise<User> => {
    let uid = '';
    let displayName = '';

    if (preset === 'phone_a') {
      const existingA = typeof window !== 'undefined' ? localStorage.getItem('investor_phone_a_id') : null;
      uid = existingA || `phone_a_host_${Math.random().toString(36).substring(2, 8)}`;
      if (typeof window !== 'undefined') localStorage.setItem('investor_phone_a_id', uid);
      displayName = 'Investor Alpha (Phone A)';
    } else if (preset === 'phone_b') {
      const existingB = typeof window !== 'undefined' ? localStorage.getItem('investor_phone_b_id') : null;
      uid = existingB || `phone_b_guest_${Math.random().toString(36).substring(2, 8)}`;
      if (typeof window !== 'undefined') localStorage.setItem('investor_phone_b_id', uid);
      displayName = 'Investor Beta (Phone B)';
    } else {
      const cleanName = customName?.trim() || 'Syndicate Investor';
      uid = `investor_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 6)}`;
      displayName = cleanName;
    }

    // Attempt Firebase anonymous authentication if enabled
    try {
      const anonUser = await authService.signInAnonymously();
      uid = anonUser.uid;
      displayName = customName || (preset === 'phone_a' ? 'Investor Alpha (Phone A)' : 'Investor Beta (Phone B)');
    } catch {
      // If Firebase anonymous auth is disabled or offline, use our stable unique ID
    }

    const newUser: User = {
      uid,
      email: `${uid}@investorwars.dev`,
      displayName,
      photoURL: null,
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    setMockUser(newUser);
    setActiveClientUser({ uid, displayName });
    if (typeof window !== 'undefined') {
      localStorage.setItem('investor_wars_client_uid', uid);
      localStorage.setItem('investor_wars_client_name', displayName);
      localStorage.setItem('investor_wars_persisted_user', JSON.stringify(newUser));
    }

    return newUser;
  };

  const handleSignOut = async (): Promise<void> => {
    setMockUser(null);
    setActiveClientUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('investor_wars_persisted_user');
      localStorage.removeItem('investor_wars_client_uid');
      localStorage.removeItem('investor_wars_client_name');
    }
    try {
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: true }));
      await authService.signOut();
      setFirebaseAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
    }
  };

  // Compute effective auth state: user is authenticated if either Firebase Auth or Quick Investor Profile is present
  const effectiveUser = firebaseAuthState.user || mockUser;
  const effectiveAuthState: AuthState = {
    isAuthenticated: Boolean(effectiveUser),
    user: effectiveUser,
    isLoading: firebaseAuthState.isLoading && !mockUser,
    error: firebaseAuthState.error,
  };

  return (
    <AuthContext.Provider
      value={{
        ...effectiveAuthState,
        isLocalTestMode,
        setLocalTestMode,
        switchMockUser,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGoogleRedirect: handleSignInWithGoogleRedirect,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signInAnonymously: handleSignInAnonymously,
        signInWithQuickProfile: handleSignInWithQuickProfile,
        signOut: handleSignOut,
        isFirebaseConfigured: authService.isConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
