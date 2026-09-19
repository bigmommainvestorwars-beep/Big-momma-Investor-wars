/**
 * Production Auth Context
 * Provides real-time Firebase Authentication state to the React client tree,
 * with a safe DEVELOPMENT/LOCAL TEST MODE toggle for offline/local gameplay testing.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '../../types/auth';
import { authService } from '../../services/firebase/authService';
import { setCloudFunctionsLocalTestMode } from '../../services/firebase/cloudFunctionsClient';

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
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  signInAnonymously: () => Promise<User>;
  signOut: () => Promise<void>;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only use local test mode if Firebase is not configured; production/cloud mode must be default
  const hasFirebase = authService.isConfigured();
  const [isLocalTestMode, setIsLocalTestModeState] = useState<boolean>(!hasFirebase);
  const [mockUser, setMockUser] = useState<User | null>(!hasFirebase ? DEFAULT_LOCAL_TEST_USER : null);
  const [firebaseAuthState, setFirebaseAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  });

  const setLocalTestMode = (enabled: boolean) => {
    setIsLocalTestModeState(enabled);
    setCloudFunctionsLocalTestMode(enabled);
  };

  const switchMockUser = (displayName: string, email?: string) => {
    const updatedUser: User = {
      uid: 'local_founder_1',
      email: email || 'founder@investorwars.dev',
      displayName: displayName || 'Investor (You)',
      photoURL: null,
      emailVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    setMockUser(updatedUser);
  };

  useEffect(() => {
    if (!authService.isConfigured()) {
      setFirebaseAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const unsubscribe = authService.onAuthStateChanged((user) => {
      setFirebaseAuthState({
        isAuthenticated: Boolean(user),
        user,
        isLoading: false,
        error: null,
      });
    });

    return () => unsubscribe();
  }, []);

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
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw err;
    }
  };

  const handleSignOut = async (): Promise<void> => {
    if (isLocalTestMode) {
      setMockUser(null);
      return;
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
      throw err;
    }
  };

  // Compute effective auth state depending on mode
  const effectiveAuthState: AuthState = isLocalTestMode
    ? {
        isAuthenticated: Boolean(mockUser),
        user: mockUser,
        isLoading: false,
        error: null,
      }
    : firebaseAuthState;

  return (
    <AuthContext.Provider
      value={{
        ...effectiveAuthState,
        isLocalTestMode,
        setLocalTestMode,
        switchMockUser,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signInAnonymously: handleSignInAnonymously,
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
