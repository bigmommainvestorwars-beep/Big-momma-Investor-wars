/**
 * Production Firebase Authentication Service
 * Wraps Firebase Auth operations behind a typed interface.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  updateCurrentUserProfile(displayName: string, photoURL?: string): Promise<void>;
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
    } catch (error: any) {
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found') {
        const customErr = new Error('No account found with these credentials. If you are new, click "Create Account" to register, or use 1-Tap Phone access.');
        (customErr as any).code = error.code;
        errorHandler.capture(customErr, { errorCode: 'AUTH_EMAIL_SIGN_IN_FAILED', action: 'signInWithEmail' });
        throw customErr;
      }
      if (error?.code === 'auth/invalid-email') {
        const customErr = new Error('Please enter a valid email address (e.g. investor@domain.com).');
        (customErr as any).code = error.code;
        errorHandler.capture(customErr, { errorCode: 'AUTH_EMAIL_SIGN_IN_FAILED', action: 'signInWithEmail' });
        throw customErr;
      }
      if (error?.code === 'auth/wrong-password') {
        const customErr = new Error('Incorrect password. Please verify and try again.');
        (customErr as any).code = error.code;
        errorHandler.capture(customErr, { errorCode: 'AUTH_EMAIL_SIGN_IN_FAILED', action: 'signInWithEmail' });
        throw customErr;
      }
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
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        const customErr = new Error('An account already exists with this email. Switch to "Sign In" to log into your account.');
        (customErr as any).code = error.code;
        errorHandler.capture(customErr, { errorCode: 'AUTH_EMAIL_SIGN_UP_FAILED', action: 'signUpWithEmail' });
        throw customErr;
      }
      if (error?.code === 'auth/weak-password') {
        const customErr = new Error('Password should be at least 6 characters long.');
        (customErr as any).code = error.code;
        errorHandler.capture(customErr, { errorCode: 'AUTH_EMAIL_SIGN_UP_FAILED', action: 'signUpWithEmail' });
        throw customErr;
      }
      if (error?.code === 'auth/invalid-email') {
        const customErr = new Error('Please enter a valid email address (e.g. investor@domain.com).');
        (customErr as any).code = error.code;
        errorHandler.capture(customErr, { errorCode: 'AUTH_EMAIL_SIGN_UP_FAILED', action: 'signUpWithEmail' });
        throw customErr;
      }
      errorHandler.capture(error, { errorCode: 'AUTH_EMAIL_SIGN_UP_FAILED', action: 'signUpWithEmail' });
      throw error;
    }
  }

  /**
   * Initiates Google Sign-In via full-page redirect.
   * Highly recommended for iOS Safari and mobile browsers where popups are blocked.
   */
  public async signInWithGoogleRedirect(): Promise<void> {
    const auth = getFirebaseAuth();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'deployed domain';
      if (error?.code === 'auth/unauthorized-domain') {
        const msg = `Google Sign-In blocked: "${host}" is not listed in Firebase Authorized Domains. Add "${host}" in Firebase Console > Authentication > Settings > Authorized domains.`;
        const domainErr = new Error(msg);
        (domainErr as any).code = 'auth/unauthorized-domain';
        errorHandler.capture(domainErr, { errorCode: 'AUTH_UNAUTHORIZED_DOMAIN', action: 'signInWithGoogleRedirect' });
        throw domainErr;
      }
      errorHandler.capture(error, { errorCode: 'AUTH_SIGN_IN_FAILED', action: 'signInWithGoogleRedirect' });
      throw error;
    }
  }

  /**
   * Checks for a returning Google redirect authentication credential
   */
  public async checkRedirectResult(): Promise<User | null> {
    const auth = getFirebaseAuth();
    try {
      const credential = await getRedirectResult(auth);
      if (credential?.user) {
        const user = mapFirebaseUser(credential.user);
        logger.log('security_event', 'info', `User signed in via Google redirect: ${user.uid}`, { userId: user.uid });
        return user;
      }
      return null;
    } catch (error: any) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'deployed domain';
      if (error?.code === 'auth/unauthorized-domain') {
        const msg = `Google Sign-In blocked: "${host}" is not listed in Firebase Authorized Domains. Add "${host}" in Firebase Console > Authentication > Settings > Authorized domains.`;
        const domainErr = new Error(msg);
        (domainErr as any).code = 'auth/unauthorized-domain';
        throw domainErr;
      }
      console.warn('[AuthService] Redirect result note:', error?.message || error);
      return null;
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
      const host = typeof window !== 'undefined' ? window.location.hostname : 'deployed domain';
      if (error?.code === 'auth/unauthorized-domain') {
        const msg = `Google Sign-In blocked: "${host}" is not listed in Firebase Authorized Domains. Add "${host}" in Firebase Console > Authentication > Settings > Authorized domains, or use 1-Tap Phone Sign-In.`;
        const domainErr = new Error(msg);
        (domainErr as any).code = 'auth/unauthorized-domain';
        errorHandler.capture(domainErr, { errorCode: 'AUTH_UNAUTHORIZED_DOMAIN', action: 'signInWithGoogle' });
        throw domainErr;
      }
      if (error?.code === 'auth/popup-closed-by-user') {
        const msg = 'Google popup was closed before sign-in completed. On iPhone/Safari, use "Google Sign-In (Redirect Mode)" or 1-Tap Phone Sign-In below!';
        const popupErr = new Error(msg);
        (popupErr as any).code = 'auth/popup-closed-by-user';
        throw popupErr;
      }
      if (error?.code === 'auth/network-request-failed' || error?.message?.includes('network')) {
        const msg = `Connection to Firebase Auth was refused. Please ensure "${host}" is added to Firebase Authorized Domains, or use 1-Tap Phone Sign-In.`;
        const netErr = new Error(msg);
        (netErr as any).code = 'auth/network-request-failed';
        throw netErr;
      }
      if (error?.code === 'auth/popup-blocked') {
        const msg = 'Safari or Chrome blocked the popup window. Tap "Google Sign-In (Redirect Mode)" or use 1-Tap Phone Sign-In below.';
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

  public async updateCurrentUserProfile(displayName: string, photoURL?: string): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName,
          ...(photoURL ? { photoURL } : {}),
        });
      }
    } catch (err) {
      console.warn('[AuthService] Profile update notice:', err);
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

