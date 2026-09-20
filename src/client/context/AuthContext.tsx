/**
 * Production Auth Context
 * Provides real-time Firebase Authentication state to the React client tree,
 * with a safe DEVELOPMENT/LOCAL TEST MODE toggle for offline/local gameplay testing.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '../../types/auth';
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
  updateDisplayName: (newName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only use local test mode if Firebase is not configured; production/cloud mode must be default
  const hasFirebase = authService.isConfigured();
  const [isLocalTestMode, setIsLocalTestModeState] = useState<boolean>(!hasFirebase);
  
  // Synchronously compute initial user state immediately on initialization
  const resolveInitialUser = (): { user: User | null; isAuthenticated: boolean } => {
    // 1. Try Firebase Auth currentUser directly
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
        setActiveClientUser({ uid: resolved.uid, displayName: resolved.displayName || 'Investor' });
        if (typeof window !== 'undefined') {
          localStorage.setItem('investor_wars_client_uid', resolved.uid);
          localStorage.setItem('investor_wars_client_name', resolved.displayName || 'Investor');
          localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolved));
        }
        return { user: resolved, isAuthenticated: true };
      }
    } catch {}

    // 2. Check saved investor profile in localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('investor_wars_persisted_user');
        const storedUid = localStorage.getItem('investor_wars_client_uid');
        const storedName = localStorage.getItem('investor_wars_client_name');

        if (saved) {
          const parsed = JSON.parse(saved) as User;
          if (parsed?.uid) {
            if (storedName && storedName !== 'Investor' && storedName !== 'Elite Investor') {
              parsed.displayName = storedName;
            }
            setActiveClientUser({ uid: parsed.uid, displayName: parsed.displayName || 'Investor' });
            return { user: parsed, isAuthenticated: true };
          }
        } else if (storedUid) {
          const fallbackUser: User = {
            uid: storedUid,
            email: 'founder@investorwars.dev',
            displayName: storedName || 'Investor',
            photoURL: null,
            emailVerified: true,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          };
          setActiveClientUser({ uid: fallbackUser.uid, displayName: fallbackUser.displayName || 'Investor' });
          return { user: fallbackUser, isAuthenticated: true };
        }
      } catch {}
    }

    // 3. Fallback: Auto-provision a clean persistent guest investor session
    const guestUid = `investor_${Math.random().toString(36).substring(2, 9)}`;
    const guestUser: User = {
      uid: guestUid,
      email: `${guestUid}@investorwars.dev`,
      displayName: 'Investor',
      photoURL: null,
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('investor_wars_client_uid', guestUid);
        localStorage.setItem('investor_wars_client_name', 'Investor');
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(guestUser));
      } catch {}
    }
    setActiveClientUser({ uid: guestUid, displayName: 'Investor' });
    return { user: guestUser, isAuthenticated: true };
  };

  const initialResolved = resolveInitialUser();

  const [mockUser, setMockUser] = useState<User | null>(initialResolved.user);
  const [firebaseAuthState, setFirebaseAuthState] = useState<AuthState>({
    isAuthenticated: initialResolved.isAuthenticated,
    user: initialResolved.user,
    isLoading: hasFirebase && !initialResolved.user,
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

    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      let effectiveDisplayName = user?.displayName;
      
      // If Firebase Auth does not have displayName, check local storage
      if (!effectiveDisplayName && typeof window !== 'undefined') {
        const storedName = localStorage.getItem('investor_wars_client_name');
        if (storedName && storedName !== 'Investor' && storedName !== 'Elite Investor') {
          effectiveDisplayName = storedName;
        }
      }

      // If still not found, check Firestore user profile document
      if (!effectiveDisplayName && user?.uid) {
        try {
          const uDoc = await userRepository.getUser(user.uid);
          if (uDoc?.displayName) {
            effectiveDisplayName = uDoc.displayName;
          }
        } catch {}
      }

      // Fallback to email prefix or generic Investor
      if (!effectiveDisplayName && user?.email) {
        effectiveDisplayName = user.email.split('@')[0];
      }
      if (!effectiveDisplayName) {
        effectiveDisplayName = 'Investor';
      }

      // Sync effective display name back to Firebase Auth if user is authenticated
      if (user && effectiveDisplayName && !user.displayName) {
        try {
          await authService.updateCurrentUserProfile(effectiveDisplayName);
        } catch {}
      }

      if (user) {
        setFirebaseAuthState({
          isAuthenticated: true,
          user: { ...user, displayName: effectiveDisplayName },
          isLoading: false,
          error: null,
        });
        setActiveClientUser({ uid: user.uid, displayName: effectiveDisplayName });
        const resolvedUser: User = { ...user, displayName: effectiveDisplayName };
        if (typeof window !== 'undefined') {
          localStorage.setItem('investor_wars_client_uid', user.uid);
          localStorage.setItem('investor_wars_client_name', effectiveDisplayName);
          localStorage.setItem('investor_wars_persisted_user', JSON.stringify(resolvedUser));
        }
        setMockUser(resolvedUser);
      } else {
        // Retain or restore active guest session
        let guestUser = mockUser;
        if (!guestUser && typeof window !== 'undefined') {
          const saved = localStorage.getItem('investor_wars_persisted_user');
          if (saved) {
            try { guestUser = JSON.parse(saved); } catch {}
          }
        }
        if (!guestUser) {
          const storedUid = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_uid') : null;
          const storedName = typeof window !== 'undefined' ? localStorage.getItem('investor_wars_client_name') : null;
          const fallbackUid = storedUid || `investor_${Math.random().toString(36).substring(2, 9)}`;
          guestUser = {
            uid: fallbackUid,
            email: `${fallbackUid}@investorwars.dev`,
            displayName: storedName || 'Investor',
            photoURL: null,
            emailVerified: true,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('investor_wars_client_uid', fallbackUid);
            localStorage.setItem('investor_wars_client_name', guestUser.displayName || 'Investor');
            localStorage.setItem('investor_wars_persisted_user', JSON.stringify(guestUser));
          }
        }
        setActiveClientUser({ uid: guestUser.uid, displayName: guestUser.displayName || 'Investor' });
        setMockUser(guestUser);
        setFirebaseAuthState({
          isAuthenticated: true,
          user: guestUser,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const updateDisplayName = async (newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('investor_wars_client_name', trimmed);
    }

    const currentUid = firebaseAuthState.user?.uid || mockUser?.uid || 'user_local';
    setActiveClientUser({
      uid: currentUid,
      displayName: trimmed,
    });

    setFirebaseAuthState((prev) => {
      const updatedUser = prev.user ? { ...prev.user, displayName: trimmed } : null;
      if (updatedUser && typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(updatedUser));
      }
      return {
        ...prev,
        user: updatedUser,
      };
    });

    setMockUser((prev) => {
      const updatedUser = prev ? { ...prev, displayName: trimmed } : null;
      if (updatedUser && typeof window !== 'undefined') {
        localStorage.setItem('investor_wars_persisted_user', JSON.stringify(updatedUser));
      }
      return updatedUser;
    });

    try {
      await authService.updateCurrentUserProfile(trimmed);
      if (firebaseAuthState.user?.uid) {
        await userRepository.updateUserDisplayName(firebaseAuthState.user.uid, trimmed);
      }
    } catch (err) {
      console.warn('[AuthContext] Update display name notice:', err);
    }
  };

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
      await authService.updateCurrentUserProfile(displayName);
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
