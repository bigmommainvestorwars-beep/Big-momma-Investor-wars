/**
 * Account Store & Profile Persistence Service
 * Enables persistent saving and restoring of user accounts by username.
 * Saves full player data: Username, UID, Ranked Elo/Stats, Dice Skins,
 * Cosmetics loadout, and Currency both in persistent client storage and Firestore.
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseFirestore, isFirebaseConfigured } from '../firebase/config';

export interface SavedUserAccount {
  username: string; // unique lowercase key
  displayName: string; // presentation codename
  uid: string; // persistent unique identifier
  email: string;
  createdAt: number;
  lastLoginAt: number;
  isGuest: boolean;
  
  // Competitive & Match Stats
  rankedProfile: {
    elo: number;
    tier: string;
    division: string;
    matchesPlayed: number;
    wins: number;
    winStreak: number;
    peakElo: number;
    syndicateTag?: string;
  };
  
  // Customization & Inventory
  equippedDiceSkin: string;
  unlockedDiceSkins: string[];
  unlockedCosmetics: string[];
  equippedCosmetics: {
    boardSkin: string;
    token: string;
    trail: string;
    vignette: string;
  };
  
  // Capital & Currency
  bankroll: number;
  strategyPoints: number;
}

const STORAGE_ACCOUNTS_KEY = 'bm_saved_accounts_v1';
const STORAGE_CURRENT_USERNAME_KEY = 'bm_username';
const STORAGE_CURRENT_UID_KEY = 'bm_user_uid';

export class AccountStore {
  /**
   * Normalizes a username into a consistent lookup key (lowercased, trimmed).
   */
  public static normalizeUsername(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  /**
   * Retrieves all saved user accounts stored locally.
   */
  public static getAllAccounts(): SavedUserAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
      }
      return [];
    } catch (e) {
      console.warn('Failed to parse saved accounts:', e);
      return [];
    }
  }

  /**
   * Finds a saved user account by username.
   */
  public static getAccount(username: string): SavedUserAccount | null {
    const key = this.normalizeUsername(username);
    if (!key) return null;
    const accounts = this.getAllAccounts();
    return accounts.find((a) => this.normalizeUsername(a.username) === key) || null;
  }

  /**
   * Generates a stable unique UID for a username.
   */
  public static generateStableUid(username: string): string {
    const key = this.normalizeUsername(username);
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const hexHash = Math.abs(hash).toString(16);
    return `inv_${key.substring(0, 8)}_${hexHash}`;
  }

  /**
   * Creates or loads an existing account by username.
   * Restores all saved stats, skins, and cosmetics if the account exists,
   * or initializes a new profile with starting assets.
   */
  public static loginOrCreateAccount(
    rawUsername: string,
    isGuest: boolean = false
  ): SavedUserAccount {
    const cleanDisplay = rawUsername.trim() || (isGuest ? 'Guest Investor' : 'ApexTrader');
    const normalized = this.normalizeUsername(cleanDisplay) || (isGuest ? 'guest' : 'investor');
    
    let existing = this.getAccount(cleanDisplay);

    if (existing) {
      // Update last login and displayName formatting
      existing.lastLoginAt = Date.now();
      existing.displayName = cleanDisplay;
      this.saveAccount(existing);
      this.applyAccountToEnvironment(existing);
      return existing;
    }

    // Create fresh account
    const uid = this.generateStableUid(normalized);
    const newAccount: SavedUserAccount = {
      username: normalized,
      displayName: cleanDisplay,
      uid,
      email: `${normalized}@investorwars.syndicate`,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isGuest,
      rankedProfile: {
        elo: 1200, // Silver baseline
        tier: 'Silver',
        division: 'Silver II',
        matchesPlayed: 0,
        wins: 0,
        winStreak: 0,
        peakElo: 1200,
        syndicateTag: 'APEX',
      },
      equippedDiceSkin: 'obsidian-gold',
      unlockedDiceSkins: ['obsidian-gold', 'neon-cyberpunk'],
      unlockedCosmetics: [
        'board-wallstreet-night',
        'token-golden-bull',
        'trail-golden-stardust',
        'vignette-blackswan',
      ],
      equippedCosmetics: {
        boardSkin: 'board-wallstreet-night',
        token: 'token-golden-bull',
        trail: 'trail-golden-stardust',
        vignette: 'vignette-blackswan',
      },
      bankroll: 25000,
      strategyPoints: 100,
    };

    this.saveAccount(newAccount);
    this.applyAccountToEnvironment(newAccount);
    return newAccount;
  }

  /**
   * Applies the account's state into the individual game subsystems and localStorage.
   */
  public static applyAccountToEnvironment(account: SavedUserAccount): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_CURRENT_USERNAME_KEY, account.displayName);
      localStorage.setItem(STORAGE_CURRENT_UID_KEY, account.uid);

      // Ranked Profile
      const rankedKey = `bm_ranked_profile_${account.uid}`;
      const rankedData = {
        userId: account.uid,
        displayName: account.displayName,
        ...account.rankedProfile,
      };
      localStorage.setItem(rankedKey, JSON.stringify(rankedData));
      localStorage.setItem('bm_ranked_profile_v1', JSON.stringify(rankedData));

      // Dice Skins
      localStorage.setItem('bm_equipped_dice_skin', account.equippedDiceSkin);
      localStorage.setItem('bm_unlocked_dice_skins', JSON.stringify(account.unlockedDiceSkins));

      // Cosmetics
      localStorage.setItem('bm_equipped_board_skin', account.equippedCosmetics.boardSkin);
      localStorage.setItem('bm_equipped_token', account.equippedCosmetics.token);
      localStorage.setItem('bm_equipped_trail', account.equippedCosmetics.trail);
      localStorage.setItem('bm_equipped_vignette', account.equippedCosmetics.vignette);
      localStorage.setItem('bm_unlocked_cosmetics', JSON.stringify(account.unlockedCosmetics));

      // Background cloud sync
      this.syncToFirestore(account).catch(() => {
        // Safe offline tolerance
      });
    } catch (e) {
      console.warn('Failed to apply account to environment:', e);
    }
  }

  /**
   * Saves an account into the local registry and writes to persistent storage.
   */
  public static saveAccount(account: SavedUserAccount): void {
    if (typeof window === 'undefined') return;
    try {
      const accounts = this.getAllAccounts();
      const norm = this.normalizeUsername(account.username);
      const filtered = accounts.filter((a) => this.normalizeUsername(a.username) !== norm);
      filtered.push(account);
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to save account to storage:', e);
    }
  }

  /**
   * Updates fields of the currently active account.
   */
  public static updateCurrentAccount(updates: Partial<SavedUserAccount>): void {
    if (typeof window === 'undefined') return;
    const currentName = localStorage.getItem(STORAGE_CURRENT_USERNAME_KEY);
    if (!currentName) return;

    const account = this.getAccount(currentName);
    if (!account) return;

    const updatedAccount: SavedUserAccount = {
      ...account,
      ...updates,
      lastLoginAt: Date.now(),
    };

    this.saveAccount(updatedAccount);
    this.applyAccountToEnvironment(updatedAccount);
  }

  /**
   * Removes a saved account by username.
   */
  public static deleteAccount(username: string): void {
    if (typeof window === 'undefined') return;
    try {
      const accounts = this.getAllAccounts();
      const norm = this.normalizeUsername(username);
      const remaining = accounts.filter((a) => this.normalizeUsername(a.username) !== norm);
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(remaining));

      const currentName = localStorage.getItem(STORAGE_CURRENT_USERNAME_KEY);
      if (currentName && this.normalizeUsername(currentName) === norm) {
        localStorage.removeItem(STORAGE_CURRENT_USERNAME_KEY);
        localStorage.removeItem(STORAGE_CURRENT_UID_KEY);
      }
    } catch (e) {
      console.warn('Failed to delete account:', e);
    }
  }

  /**
   * Asynchronously pushes user account data to Firestore when configured.
   */
  public static async syncToFirestore(account: SavedUserAccount): Promise<void> {
    if (!isFirebaseConfigured()) return;
    try {
      const db = getFirebaseFirestore();
      const userRef = doc(db, 'users', account.uid);
      await setDoc(
        userRef,
        {
          uid: account.uid,
          username: account.username,
          displayName: account.displayName,
          email: account.email,
          isGuest: account.isGuest,
          rankedProfile: account.rankedProfile,
          equippedDiceSkin: account.equippedDiceSkin,
          unlockedDiceSkins: account.unlockedDiceSkins,
          equippedCosmetics: account.equippedCosmetics,
          unlockedCosmetics: account.unlockedCosmetics,
          bankroll: account.bankroll,
          strategyPoints: account.strategyPoints,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch {
      // Graceful offline fallback
    }
  }

  /**
   * Attempts to pull the latest cloud profile for an account from Firestore.
   */
  public static async syncFromFirestore(uid: string): Promise<Partial<SavedUserAccount> | null> {
    if (!isFirebaseConfigured()) return null;
    try {
      const db = getFirebaseFirestore();
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as Partial<SavedUserAccount>;
      }
      return null;
    } catch {
      return null;
    }
  }
}
