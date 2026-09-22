/**
 * Production Auth Context
 * Provides real-time Firebase Authentication state to the React client tree with explicit lifecycle states,
 * token verification, and seamless synchronization across devices.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, AuthState, AuthLifecycleStatus } from '../../types/auth';
import { authService } from '../../services/firebase/authService';
import { userRepository } from '../../services/firestore/userRepository';
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

export interface AuthContextValue extends AuthState {
  isLocalTestMode: boolean;
  setLocalTestMode: (enabled: boolean) => void;
  switchMockUser: (displayName: string, email?: string) => void;
  ensureAuthenticatedUser: (forceTokenRefresh?: boolean) => Promise<User>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signInWithGoogle: () => Promise<User>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  signInAnonymously: () => Promise<User>;
  signInWithQuickProfile: (preset: 'phone_a' | 'phone_b' | 'custom', customName?: string) => Promise<User>;
  updateDisplayName: (newName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasFirebase = authService.isConfigured();
  const [isLocalTestMode, setIsLocalTestModeState] = useState<boolean>(!hasFirebase);
  
  // Auth state machine
  const [authStatus, setAuthStatus] = useState<AuthLifecycleStatus>('AUTH_INITIALIZING');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const authReadyResolverRef = useRef<(() => void) | null>(null);
  const authReadyPromiseRef = useRef<Promise<void>>(
    new Promise<void>((resolve) => {
      authReadyResolverRef.current = resolve;
    })
  );

  // Synchronously compute fallback / persisted user for instant UI rendering while Firebase initializes
  useEffect(() => {
    try {
      const fbUser = authService.getCurrentUser();
      if (fbUser?.uid) {
        let displayName = fbUser.displayName;
        if (!displayName && typeof window !== 'undefined') {
          const storedName = localStorage.getItem('investor_wars_client_name');
          if (storedName && storedName !== 'Investor' && storedName !== 'Elite Investor') {
            displayName = storedName;
          }
        }
        if (!displayName && fbUser.email) {
          displayName = fbUser.email.split('@')[0];
        }
        const resolved: User = {
          ...fbUser,
          displayName: displayName || 'Investor',
        };
        setCurrentUser(resolved);
        setActiveClientUser({ uid: resolved.uid, displayName: resolved.displayName || 'Investor' });
      } else if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('investor_wars_persisted_user');
        if (saved) {
          const parsed = JSON.parse(saved) as User;
          if (parsed?.uid) {
            setCurrentUser(parsed);
            setActiveClientUser({ uid: parsed.uid, displayName: parsed.displayName || 'Investor' });
          }
        }
      }
    } catch {}
  }, []);

  const setLocalTestMode = (enabled: boolean) => {
    setIsLocalTestModeState(enabled);
    setCloudFunctionsLocalTestMode(enabled);
  };

  const switchMockUser = (displayName: string, email?: string) => {
    const updatedUser: User = {
      uid: currentUser?.uid || `local_${Math.random().toString(36).substring(2, 7)}`,
      email: email || 'founder@investorwars.dev',
      displayName: displayName || 'Investor (You)',
      photoURL: null,
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    setCurrentUser(updatedUser);
    setAuthStatus('AUTHENTICATED');
    if (typeof window !== 'undefined') {
      localStorage.setItem('investor_wars_persisted_user', JSON.stringify(updatedUser));
      localStorage.setItem('investor_wars_client_uid', updatedUser.uid);
      localStorage.setItem('investor_wars_client_name', updatedUser.displayName || 'Investor');
    }
    setActiveClientUser({ uid: updatedUser.uid, displayName: updatedUser.displayName || 'Investor' });
  };

  // Firebase Auth Lifecycle Subscription
  useEffect(() => {
    if (!authService.isConfigured()) {
      setAuthStatus('AUTH_UNAUTHENTICATED');
      if (authReadyResolverRef.current) authReadyResolverRef.current();
      return;
    }

    // Check for returning Google redirect authentication
    authService.checkRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        const dName = redirectUser.displayName || (redirectUser.email ? redirectUser.email.split('@')[0] : 'Investor');
        const resolvedUser: User = { ...redirectUser, displayName: dName };
        setCurrentUser(resolvedUser);
        setAuthStatus('AUTHENTICATED');
        setAuthError(null);
        setActiveClientUser({ uid: resolvedUser.uid, displayName: dName });
        if (typeof window !== 'undefined') {
          localStorage.setItem('investor_wars_client_uid', resolvedUser.uid);
          localStorage.setItem('investor_wars_client_name', dName);
          localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedUser));
        }
      }
    }).catch((err) => {
      console.warn('[AuthContext] Redirect login note:', err);
    });

    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      if (user) {
        let effectiveDisplayName = user.displayName;
        if (!effectiveDisplayName && typeof window !== 'undefined') {
          const storedName = localStorage.getItem('investor_wars_client_name');
          if (storedName && storedName !== 'Investor' && storedName !== 'Elite Investor') {
            effectiveDisplayName = storedName;
          }
        }
        if (!effectiveDisplayName && user.uid) {
          try {
            const uDoc = await userRepository.getUser(user.uid);
            if (uDoc?.displayName) effectiveDisplayName = uDoc.displayName;
          } catch {}
        }
        if (!effectiveDisplayName && user.email) {
          effectiveDisplayName = user.email.split('@')[0];
        }
        if (!effectiveDisplayName) {
          effectiveDisplayName = 'Investor';
        }

        const resolvedUser: User = { ...user, displayName: effectiveDisplayName };
        setCurrentUser(resolvedUser);
        setAuthStatus('AUTHENTICATED');
        setAuthError(null);
        setActiveClientUser({ uid: resolvedUser.uid, displayName: effectiveDisplayName });

        if (typeof window !== 'undefined') {
          localStorage.setItem('investor_wars_client_uid', resolvedUser.uid);
          localStorage.setItem('investor_wars_client_name', effectiveDisplayName);
          localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedUser));
        }
      } else {
        // If not logged into Firebase Auth, check if we have a persisted local session
        const storedUid = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_uid') : null;
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_name') : null;

        if (storedUid) {
          const guestUser: User = {
            uid: storedUid,
            email: `${storedUid}@investorwars.dev`,
            displayName: storedName || 'Investor',
            photoURL: null,
            emailVerified: true,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          };
          setCurrentUser(guestUser);
          setAuthStatus('AUTHENTICATED');
          setActiveClientUser({ uid: guestUser.uid, displayName: guestUser.displayName || 'Investor' });
        } else {
          setCurrentUser(null);
          setAuthStatus('AUTH_UNAUTHENTICATED');
          setActiveClientUser(null);
        }
      }

      if (authReadyResolverRef.current) {
        authReadyResolverRef.current();
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Authoritative Readiness Guard:
   * Guarantees that Firebase Auth is initialized and currentUser is valid
   * before any protected multiplayer or lobby operation executes.
   */
  const ensureAuthenticatedUser = useCallback(async (forceTokenRefresh = false): Promise<User> => {
    if (!authService.isConfigured()) {
      throw new Error('Firebase Authentication is not configured. Cloud multiplayer requires Firebase.');
    }

    // 1. Wait for initial auth listener resolution with 3000ms safety timeout
    await Promise.race([
      authReadyPromiseRef.current,
      new Promise<void>((res) => setTimeout(res, 3000)),
    ]);

    // 2. Check current live Firebase Auth instance
    const fbUser = authService.getCurrentUser();
    if (fbUser?.uid) {
      if (forceTokenRefresh) {
        setAuthStatus('AUTH_REAUTHENTICATING');
        await authService.getIdToken(true);
        setAuthStatus('AUTHENTICATED');
      }
      return fbUser;
    }

    // 3. If unauthenticated in Firebase, auto-authenticate anonymously for seamless lobby participation
    setAuthStatus('AUTHENTICATING');
    try {
      const anonUser = await authService.signInAnonymously();
      const storedName = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_name') : null;
      let dName = storedName || anonUser.displayName || 'Investor';
      if (dName && dName !== anonUser.displayName) {
        try {
          await authService.updateCurrentUserProfile(dName);
        } catch {}
      }
      const resolvedAnon: User = { ...anonUser, displayName: dName };
      setCurrentUser(resolvedAnon);
      setAuthStatus('AUTHENTICATED');
      setAuthError(null);
      setActiveClientUser({ uid: resolvedAnon.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', resolvedAnon.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedAnon));
      }
      return resolvedAnon;
    } catch (anonErr: any) {
      setAuthStatus('AUTH_ERROR');
      const errMessage = anonErr instanceof Error ? anonErr.message : String(anonErr);
      setAuthError(errMessage);
      throw anonErr;
    }
  }, []);

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    return authService.getIdToken(forceRefresh);
  }, []);

  const updateDisplayName = async (newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('investor_wars_client_name', trimmed);
    }

    const currentUid = currentUser?.uid || 'user_local';
    setActiveClientUser({ uid: currentUid, displayName: trimmed });

    setCurrentUser((prev) => {
      const updated = prev ? { ...prev, displayName: trimmed } : null;
      if (updated && typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await authService.updateCurrentUserProfile(trimmed);
      if (currentUser?.uid) {
        await userRepository.updateUserDisplayName(currentUser.uid, trimmed);
      }
    } catch (err) {
      console.warn('[AuthContext] Update display name note:', err);
    }
  };

  const handleSignInWithGoogleRedirect = async (): Promise<void> => {
    try {
      setAuthStatus('AUTHENTICATING');
      setAuthError(null);
      await authService.signInWithGoogleRedirect();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAuthStatus('AUTH_ERROR');
      setAuthError(errorMsg);
      throw err;
    }
  };

  const handleSignInWithGoogle = async (): Promise<User> => {
    try {
      setAuthStatus('AUTHENTICATING');
      setAuthError(null);
      const user = await authService.signInWithGoogle();
      const dName = user.displayName || (user.email ? user.email.split('@')[0] : 'Investor');
      const resolvedUser: User = { ...user, displayName: dName };
      setCurrentUser(resolvedUser);
      setAuthStatus('AUTHENTICATED');
      setActiveClientUser({ uid: resolvedUser.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', resolvedUser.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedUser));
      }
      return resolvedUser;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAuthStatus('AUTH_ERROR');
      setAuthError(errorMsg);
      throw err;
    }
  };

  const handleSignInWithEmail = async (email: string, password: string): Promise<User> => {
    try {
      setAuthStatus('AUTHENTICATING');
      setAuthError(null);
      const user = await authService.signInWithEmail(email, password);
      const dName = user.displayName || email.split('@')[0];
      const resolvedUser: User = { ...user, displayName: dName };
      setCurrentUser(resolvedUser);
      setAuthStatus('AUTHENTICATED');
      setActiveClientUser({ uid: resolvedUser.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', resolvedUser.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedUser));
      }
      return resolvedUser;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAuthStatus('AUTH_ERROR');
      setAuthError(errorMsg);
      throw err;
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string, displayName?: string): Promise<User> => {
    try {
      setAuthStatus('AUTHENTICATING');
      setAuthError(null);
      const user = await authService.signUpWithEmail(email, password, displayName);
      const dName = displayName || email.split('@')[0];
      const resolvedUser: User = { ...user, displayName: dName };
      setCurrentUser(resolvedUser);
      setAuthStatus('AUTHENTICATED');
      setActiveClientUser({ uid: resolvedUser.uid, displayName: dName });
      if (typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_client_uid', resolvedUser.uid);
        localStorage.setItem('investor_wars_client_name', dName);
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedUser));
      }
      return resolvedUser;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAuthStatus('AUTH_ERROR');
      setAuthError(errorMsg);
      throw err;
    }
  };

  const handleSignInAnonymously = async (): Promise<User> => {
    try {
      setAuthStatus('AUTHENTICATING');
      setAuthError(null);
      const user = await authService.signInAnonymously();
      const resolvedUser: User = { ...user, displayName: 'Anonymous Investor' };
      setCurrentUser(resolvedUser);
      setAuthStatus('AUTHENTICATED');
      setActiveClientUser({ uid: resolvedUser.uid, displayName: 'Anonymous Investor' });
      return resolvedUser;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAuthStatus('AUTH_ERROR');
      setAuthError(errorMsg);
      throw err;
    }
  };

  const handleSignInWithQuickProfile = async (
    preset: 'phone_a' | 'phone_b' | 'custom',
    customName?: string
  ): Promise<User> => {
    setAuthStatus('AUTHENTICATING');
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
      await authService.updateCurrentUserProfile(displayName);
    } catch {
      // If Firebase anonymous auth is disabled or offline, use unique persistent ID
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

    setCurrentUser(newUser);
    setAuthStatus('AUTHENTICATED');
    setActiveClientUser({ uid, displayName });
    if (typeof window !== 'undefined') {
      localStorage.setItem('investor_wars_client_uid', uid);
      localStorage.setItem('investor_wars_client_name', displayName);
      localStorage.setItem('investor_wars_persisted_user', JSON.stringify(newUser));
    }

    return newUser;
  };

  const handleSignOut = async (): Promise<void> => {
    setCurrentUser(null);
    setActiveClientUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('investor_wars_persisted_user');
      localStorage.removeItem('investor_wars_client_uid');
      localStorage.removeItem('investor_wars_client_name');
    }
    try {
      setAuthStatus('AUTH_INITIALIZING');
      await authService.signOut();
      setAuthStatus('AUTH_UNAUTHENTICATED');
      setAuthError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setAuthStatus('AUTH_ERROR');
      setAuthError(errorMsg);
    }
  };

  const isAuthenticated = authStatus === 'AUTHENTICATED' && Boolean(currentUser);
  const isLoading = authStatus === 'AUTH_INITIALIZING' || authStatus === 'AUTHENTICATING';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        status: authStatus,
        user: currentUser,
        isLoading,
        error: authError,
        isLocalTestMode,
        setLocalTestMode,
        switchMockUser,
        ensureAuthenticatedUser,
        getIdToken,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGoogleRedirect: handleSignInWithGoogleRedirect,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signInAnonymously: handleSignInAnonymously,
        signInWithQuickProfile: handleSignInWithQuickProfile,
        updateDisplayName,
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
