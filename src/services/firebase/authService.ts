/**
 * Production Firebase Authentication Service
 * Wraps Firebase Auth operations behind a typed interface.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously as fbSignInAnonymously,
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUserWithEmail,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './config';
import { ENV } from '../../config/env';
import { User } from '../../types/auth';
import { errorHandler } from '../monitoring/errorHandler';
import { logger } from '../monitoring/logger';

export type ApprovedAuthProvider = 'google' | 'password';

export interface AuthenticatedRequestContext {
  userId: string;
  idToken: string;
  email: string | null;
}

export interface UserAccountState {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  creationTime: number;
  lastSignInTime: number;
  approvedProviders: string[];
}

export interface IAuthService {
  isConfigured(): boolean;
  getCurrentUser(): User | null;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  getAuthenticatedRequestContext(): Promise<AuthenticatedRequestContext | null>;
  getAccountState(): Promise<UserAccountState | null>;
  signInWithGoogle(): Promise<User>;
  signInAnonymously(): Promise<User>;
  signInWithEmail(email: string, password: string): Promise<User>;
  signUpWithEmail(email: string, password: string, displayName?: string): Promise<User>;
  signInWithApprovedProvider(provider: ApprovedAuthProvider): Promise<User>;
  signOut(): Promise<void>;
  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe;
}

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    emailVerified: fbUser.emailVerified,
    createdAt: fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).getTime() : Date.now(),
    lastLoginAt: fbUser.metadata.lastSignInTime ? new Date(fbUser.metadata.lastSignInTime).getTime() : Date.now(),
  };
}

class FirebaseAuthService implements IAuthService {
  private approvedProviders: ApprovedAuthProvider[] = ['google', 'password'];

  public isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  public getCurrentUser(): User | null {
    try {
      const auth = getFirebaseAuth();
      if (!auth || !auth.currentUser) return null;
      return mapFirebaseUser(auth.currentUser);
    } catch {
      return null;
    }
  }

  public async getIdToken(forceRefresh = false): Promise<string | null> {
    try {
      const auth = getFirebaseAuth();
      if (!auth || !auth.currentUser) return null;
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      errorHandler.capture(err, { errorCode: 'AUTH_TOKEN_RETRIEVAL_FAILED', action: 'getIdToken' });
      return null;
    }
  }

  public async getAuthenticatedRequestContext(): Promise<AuthenticatedRequestContext | null> {
    try {
      const auth = getFirebaseAuth();
      if (!auth || !auth.currentUser) return null;
      const idToken = await auth.currentUser.getIdToken();
      return {
        userId: auth.currentUser.uid,
        idToken,
        email: auth.currentUser.email,
      };
    } catch {
      return null;
    }
  }

  public async getAccountState(): Promise<UserAccountState | null> {
    try {
      const auth = getFirebaseAuth();
      if (!auth || !auth.currentUser) return null;
      const user = auth.currentUser;
      return {
        userId: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        creationTime: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now(),
        lastSignInTime: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : Date.now(),
        approvedProviders: user.providerData.map((p) => p.providerId),
      };
    } catch {
      return null;
    }
  }

  public async signInWithApprovedProvider(provider: ApprovedAuthProvider): Promise<User> {
    if (!this.approvedProviders.includes(provider)) {
      throw new Error(`Authentication provider '${provider}' is not an approved provider.`);
    }

    if (provider === 'google') {
      return this.signInWithGoogle();
    }

    throw new Error(`Provider ${provider} requires credentials. Use dedicated signInWithEmail.`);
  }

  public async signInWithEmail(email: string, password: string): Promise<User> {
    const auth = getFirebaseAuth();
    try {
      const credential = await fbSignInWithEmail(auth, email, password);
      const user = mapFirebaseUser(credential.user);
      logger.log('security_event', 'info', `User signed in with email: ${user.uid}`, { userId: user.uid });
      return user;
    } catch (error) {
      errorHandler.capture(error, { errorCode: 'AUTH_EMAIL_SIGN_IN_FAILED', action: 'signInWithEmail' });
      throw error;
    }
  }

  public async signUpWithEmail(email: string, password: string, displayName?: string): Promise<User> {
    const auth = getFirebaseAuth();
    try {
      const credential = await fbCreateUserWithEmail(auth, email, password);
      if (displayName && credential.user) {
        await updateProfile(credential.user, { displayName });
      }
      const user = mapFirebaseUser(credential.user);
      if (displayName) {
        user.displayName = displayName;
      }
      logger.log('security_event', 'info', `User registered with email: ${user.uid}`, { userId: user.uid });
      return user;
    } catch (error) {
      errorHandler.capture(error, { errorCode: 'AUTH_EMAIL_SIGN_UP_FAILED', action: 'signUpWithEmail' });
      throw error;
    }
  }

  public async signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      const user = mapFirebaseUser(credential.user);
      logger.log('security_event', 'info', `User signed in with Google: ${user.uid}`, { userId: user.uid });
      return user;
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'deployed domain';
        const msg = `Google Sign-In is blocked because "${host}" is not in Firebase Authorized Domains. Please add "${host}" in Firebase Console > Authentication > Settings > Authorized domains. Or use Quick Investor Sign-In below.`;
        const domainErr = new Error(msg);
        (domainErr as any).code = 'auth/unauthorized-domain';
        errorHandler.capture(domainErr, { errorCode: 'AUTH_UNAUTHORIZED_DOMAIN', action: 'signInWithGoogle' });
        throw domainErr;
      }
      if (error?.code === 'auth/popup-blocked') {
        const msg = 'Safari blocked the Google popup window. Tap to allow popups in Safari settings, or use Quick Investor Sign-In below.';
        const popupErr = new Error(msg);
        (popupErr as any).code = 'auth/popup-blocked';
        errorHandler.capture(popupErr, { errorCode: 'AUTH_POPUP_BLOCKED', action: 'signInWithGoogle' });
        throw popupErr;
      }
      errorHandler.capture(error, { errorCode: 'AUTH_SIGN_IN_FAILED', action: 'signInWithGoogle' });
      throw error;
    }
  }

  /**
   * Anonymous Authentication for quick investor access
   */
  public async signInAnonymously(): Promise<User> {
    const auth = getFirebaseAuth();
    try {
      const credential = await fbSignInAnonymously(auth);
      const user = mapFirebaseUser(credential.user);
      logger.log('security_event', 'info', `User signed in anonymously: ${user.uid}`, { userId: user.uid });
      return user;
    } catch (error) {
      errorHandler.capture(error, { errorCode: 'AUTH_ANON_SIGN_IN_FAILED', action: 'signInAnonymously' });
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      await fbSignOut(auth);
      logger.log('security_event', 'info', `User signed out: ${uid || 'unknown'}`);
    } catch (error) {
      errorHandler.capture(error, { errorCode: 'AUTH_SIGN_OUT_FAILED', action: 'signOut' });
      throw error;
    }
  }

  public onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    try {
      const auth = getFirebaseAuth();
      return onAuthStateChanged(auth, (fbUser) => {
        callback(fbUser ? mapFirebaseUser(fbUser) : null);
      });
    } catch {
      callback(null);
      return () => {};
    }
  }
}

export const authService = new FirebaseAuthService();

