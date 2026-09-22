/**
 * Production TypeScript Foundation: Authentication & User Contracts
 */

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: number;
  lastLoginAt: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  avatarId?: string;
  totalGamesPlayed: number;
  totalGamesWon: number;
  rating?: number;
}

export type AuthLifecycleStatus =
  | 'AUTH_INITIALIZING'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'AUTH_UNAUTHENTICATED'
  | 'AUTH_ERROR'
  | 'AUTH_REAUTHENTICATING';

export interface AuthState {
  isAuthenticated: boolean;
  status: AuthLifecycleStatus;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}
