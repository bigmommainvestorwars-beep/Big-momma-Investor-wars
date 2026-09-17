/**
 * Production Auth Context
 * Provides real-time Firebase Authentication state to the React client tree,
 * with a safe DEVELOPMENT/LOCAL TEST MODE toggle for offline/local gameplay testing.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '../../types/auth';
import { authService } from '../../services/firebase/authService';
import { setCloudFunctionsLocalTestMode } from '../../services/firebase/cloudFunctionsClient';
import { AccountStore, type SavedUserAccount } from '../../services/auth/accountStore';

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
  signInWithUsername: (username: string) => Promise<User>;
  signInAsGuest: (guestName?: string) => Promise<User>;
  updateUsername: (newUsername: string) => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  signInWithGooglePreview: (email?: string, name?: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  signInAnonymously: () => Promise<User>;
  signOut: () => Promise<void>;
  ensureAuthenticated: () => Promise<User>;
  isFirebaseConfigured: boolean;
  savedUsername: string | null;
  savedAccounts: SavedUserAccount[];
  currentAccount: SavedUserAccount | null;
  deleteSavedAccount: (username: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getInitialUser = (): {
  user: User;
  savedName: string;
  account: SavedUserAccount;
} => {
  try {
    const savedName = localStorage.getItem('bm_username');
    if (savedName && savedName.trim()) {
      const account = AccountStore.getAccount(savedName) || AccountStore.loginOrCreateAccount(savedName);
      return {
        user: {
          uid: account.uid,
          email: account.email,
          displayName: account.displayName,
          photoURL: null,
          emailVerified: true,
          createdAt: account.createdAt,
          lastLoginAt: account.lastLoginAt,
        },
        savedName: account.displayName,
        account,
      };
    }
  } catch {}

  // Auto-create initial default guest account so every visitor is instantly ready to play
  const defaultGuest = `Guest Investor #${Math.floor(100 + Math.random() * 900)}`;
  const guestAccount = AccountStore.loginOrCreateAccount(defaultGuest, true);
  return {
    user: {
      uid: guestAccount.uid,
      email: guestAccount.email,
      displayName: guestAccount.displayName,
      photoURL: null,
      emailVerified: true,
      createdAt: guestAccount.createdAt,
      lastLoginAt: guestAccount.lastLoginAt,
    },
    savedName: guestAccount.displayName,
    account: guestAccount,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = getInitialUser();
  const [isLocalTestMode, setIsLocalTestModeState] = useState<boolean>(true);
  const [mockUser, setMockUser] = useState<User | null>(initialData.user);
  const [savedUsername, setSavedUsername] = useState<string | null>(initialData.savedName);
  const [currentAccount, setCurrentAccount] = useState<SavedUserAccount | null>(initialData.account);
  const [savedAccounts, setSavedAccounts] = useState<SavedUserAccount[]>(() =>
    AccountStore.getAllAccounts()
  );

  const [firebaseAuthState, setFirebaseAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  });

  const setLocalTestMode = (enabled: boolean) => {
    setIsLocalTestModeState(enabled);
    setCloudFunctionsLocalTestMode(enabled);
  };

  const switchMockUser = (displayName: string, email?: string) => {
    const account = AccountStore.loginOrCreateAccount(displayName, false);
    setSavedUsername(account.displayName);
    setCurrentAccount(account);
    setSavedAccounts(AccountStore.getAllAccounts());
    const updatedUser: User = {
      uid: account.uid,
      email: email || account.email,
      displayName: account.displayName,
      photoURL: null,
      emailVerified: true,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    };
    setMockUser(updatedUser);
  };

  const handleSignInWithUsername = async (username: string): Promise<User> => {
    const account = AccountStore.loginOrCreateAccount(username, false);
    setSavedUsername(account.displayName);
    setCurrentAccount(account);
    setSavedAccounts(AccountStore.getAllAccounts());
    const newUser: User = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      photoURL: null,
      emailVerified: true,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    };
    setMockUser(newUser);
    setIsLocalTestModeState(true);
    return newUser;
  };

  const handleSignInAsGuest = async (guestName?: string): Promise<User> => {
    const defaultGuest = guestName?.trim() || `Guest Investor #${Math.floor(100 + Math.random() * 900)}`;
    const account = AccountStore.loginOrCreateAccount(defaultGuest, true);
    setSavedUsername(account.displayName);
    setCurrentAccount(account);
    setSavedAccounts(AccountStore.getAllAccounts());
    const newUser: User = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      photoURL: null,
      emailVerified: true,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    };
    setMockUser(newUser);
    setIsLocalTestModeState(true);
    return newUser;
  };

  const handleUpdateUsername = async (newUsername: string): Promise<void> => {
    const cleanName = newUsername.trim();
    if (!cleanName) return;
    AccountStore.updateCurrentAccount({
      displayName: cleanName,
      username: AccountStore.normalizeUsername(cleanName),
    });
    setSavedUsername(cleanName);
    const updated = AccountStore.getAccount(cleanName);
    if (updated) {
      setCurrentAccount(updated);
    }
    setSavedAccounts(AccountStore.getAllAccounts());
    if (mockUser) {
      setMockUser({
        ...mockUser,
        displayName: cleanName,
        email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'investor'}@investorwars.syndicate`,
      });
    }
  };

  const handleDeleteSavedAccount = (username: string) => {
    AccountStore.deleteAccount(username);
    setSavedAccounts(AccountStore.getAllAccounts());
    if (
      savedUsername &&
      AccountStore.normalizeUsername(savedUsername) === AccountStore.normalizeUsername(username)
    ) {
      setSavedUsername(null);
      setMockUser(null);
      setCurrentAccount(null);
    }
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
      
      const accountName = user.displayName || user.email?.split('@')[0] || 'Investor';
      const account = AccountStore.loginOrCreateAccount(accountName, false);
      if (user.email) {
        account.email = user.email;
        AccountStore.saveAccount(account);
      }
      setSavedUsername(account.displayName);
      setCurrentAccount(account);
      setSavedAccounts(AccountStore.getAllAccounts());
      setMockUser(user);

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

  const handleSignInWithGooglePreview = async (
    customEmail: string = 'bigmommainvestorwars@gmail.com',
    customName?: string
  ): Promise<User> => {
    const cleanName = customName?.trim() || customEmail.split('@')[0] || 'Google Investor';
    const account = AccountStore.loginOrCreateAccount(cleanName, false);
    account.email = customEmail.trim();
    AccountStore.saveAccount(account);
    setSavedUsername(account.displayName);
    setCurrentAccount(account);
    setSavedAccounts(AccountStore.getAllAccounts());

    const previewUser: User = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      photoURL: null,
      emailVerified: true,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    };
    setMockUser(previewUser);
    setIsLocalTestModeState(true);
    setFirebaseAuthState({
      isAuthenticated: true,
      user: previewUser,
      isLoading: false,
      error: null,
    });
    return previewUser;
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
    localStorage.removeItem('bm_username');
    setSavedUsername(null);
    setMockUser(null);
    if (!isLocalTestMode && authService.isConfigured()) {
      try {
        setFirebaseAuthState((prev) => ({ ...prev, isLoading: true }));
        await authService.signOut();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setFirebaseAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      }
    }
    setFirebaseAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });
  };

  const handleEnsureAuthenticated = async (): Promise<User> => {
    if (firebaseAuthState.user) return firebaseAuthState.user;
    if (mockUser) return mockUser;
    if (authService.isConfigured()) {
      try {
        const anon = await authService.signInAnonymously();
        return anon;
      } catch (err) {
        console.warn('Anonymous sign-in fallback notice:', err);
      }
    }
    return handleSignInAsGuest();
  };

  // Compute effective auth state across both modes seamlessly
  const effectiveUser = isLocalTestMode
    ? (mockUser || firebaseAuthState.user)
    : (firebaseAuthState.user || mockUser);

  const effectiveAuthState: AuthState = {
    isAuthenticated: Boolean(effectiveUser),
    user: effectiveUser,
    isLoading: firebaseAuthState.isLoading,
    error: firebaseAuthState.error,
  };

  return (
    <AuthContext.Provider
      value={{
        ...effectiveAuthState,
        isLocalTestMode,
        setLocalTestMode,
        switchMockUser,
        signInWithUsername: handleSignInWithUsername,
        signInAsGuest: handleSignInAsGuest,
        updateUsername: handleUpdateUsername,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGooglePreview: handleSignInWithGooglePreview,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signInAnonymously: handleSignInAnonymously,
        signOut: handleSignOut,
        ensureAuthenticated: handleEnsureAuthenticated,
        isFirebaseConfigured: authService.isConfigured(),
        savedUsername,
        savedAccounts,
        currentAccount,
        deleteSavedAccount: handleDeleteSavedAccount,
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
