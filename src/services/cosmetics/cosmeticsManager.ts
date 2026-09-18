/**
 * Phase 5 Cosmetics Manager:
 * Handles unlocking, purchasing with ƁM / SP, and equipping cosmetic items
 * across Board Skins, 3D Investor Tokens, Dice Trails, and Bankruptcy Vignettes.
 */

import {
  COSMETICS_MAP,
  BOARD_SKINS,
  INVESTOR_TOKENS,
  DICE_TRAILS,
  BANKRUPTCY_VIGNETTES,
  CosmeticItem,
  CosmeticCategory,
} from './cosmeticsCatalog';

const STORAGE_EQUIPPED_BOARD = 'bm_equipped_board_skin';
const STORAGE_EQUIPPED_TOKEN = 'bm_equipped_token';
const STORAGE_EQUIPPED_TRAIL = 'bm_equipped_trail';
const STORAGE_EQUIPPED_VIGNETTE = 'bm_equipped_vignette';
const STORAGE_UNLOCKED_COSMETICS = 'bm_unlocked_cosmetics';

export interface EquippedCosmeticsState {
  boardSkin: string;
  token: string;
  trail: string;
  vignette: string;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  item?: CosmeticItem;
  remainingBM?: number;
  remainingSP?: number;
}

type CosmeticListener = (equipped: EquippedCosmeticsState, unlocked: string[]) => void;

class CosmeticsManagerClass {
  private listeners: Set<CosmeticListener> = new Set();

  private getStoredUnlocked(): Set<string> {
    try {
      const defaultUnlocked = [
        'board-wallstreet-night',
        'token-golden-bull',
        'trail-golden-stardust',
        'vignette-blackswan',
      ];
      const raw = localStorage.getItem(STORAGE_UNLOCKED_COSMETICS);
      if (!raw) return new Set(defaultUnlocked);
      const parsed = JSON.parse(raw);
      return new Set([...defaultUnlocked, ...(Array.isArray(parsed) ? parsed : [])]);
    } catch {
      return new Set([
        'board-wallstreet-night',
        'token-golden-bull',
        'trail-golden-stardust',
        'vignette-blackswan',
      ]);
    }
  }

  private saveUnlocked(unlocked: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_UNLOCKED_COSMETICS, JSON.stringify(Array.from(unlocked)));
    } catch (e) {
      console.warn('Failed to save unlocked cosmetics to localStorage:', e);
    }
  }

  public getEquippedState(): EquippedCosmeticsState {
    try {
      return {
        boardSkin: localStorage.getItem(STORAGE_EQUIPPED_BOARD) || 'board-wallstreet-night',
        token: localStorage.getItem(STORAGE_EQUIPPED_TOKEN) || 'token-golden-bull',
        trail: localStorage.getItem(STORAGE_EQUIPPED_TRAIL) || 'trail-golden-stardust',
        vignette: localStorage.getItem(STORAGE_EQUIPPED_VIGNETTE) || 'vignette-blackswan',
      };
    } catch {
      return {
        boardSkin: 'board-wallstreet-night',
        token: 'token-golden-bull',
        trail: 'trail-golden-stardust',
        vignette: 'vignette-blackswan',
      };
    }
  }

  public isUnlocked(itemId: string): boolean {
    const item = COSMETICS_MAP[itemId];
    if (item?.unlockedByDefault) return true;
    return this.getStoredUnlocked().has(itemId);
  }

  public getUnlockedArray(): string[] {
    return Array.from(this.getStoredUnlocked());
  }

  public equipItem(itemId: string): { success: boolean; message: string } {
    const item = COSMETICS_MAP[itemId];
    if (!item) {
      return { success: false, message: `Cosmetic ${itemId} not found in catalog.` };
    }

    if (!this.isUnlocked(itemId)) {
      return { success: false, message: `${item.name} is locked. Unlock or purchase it first.` };
    }

    try {
      switch (item.category) {
        case 'board':
          localStorage.setItem(STORAGE_EQUIPPED_BOARD, itemId);
          break;
        case 'token':
          localStorage.setItem(STORAGE_EQUIPPED_TOKEN, itemId);
          break;
        case 'trail':
          localStorage.setItem(STORAGE_EQUIPPED_TRAIL, itemId);
          break;
        case 'vignette':
          localStorage.setItem(STORAGE_EQUIPPED_VIGNETTE, itemId);
          break;
      }
      this.notifyListeners();
      return { success: true, message: `Equipped ${item.name} successfully.` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Storage error' };
    }
  }

  public unlockItem(itemId: string): void {
    const unlocked = this.getStoredUnlocked();
    unlocked.add(itemId);
    this.saveUnlocked(unlocked);
    this.notifyListeners();
  }

  public purchaseItem(
    itemId: string,
    currencyType: 'BM' | 'SP',
    currentCashBM: number,
    currentSP: number,
    deductCashBM: (amt: number) => void,
    deductSP: (amt: number) => void
  ): PurchaseResult {
    const item = COSMETICS_MAP[itemId];
    if (!item) {
      return { success: false, message: 'Item does not exist in store.' };
    }

    if (this.isUnlocked(itemId)) {
      return { success: false, message: 'You already own this item.' };
    }

    if (currencyType === 'BM') {
      const cost = item.costBM;
      if (!cost) {
        return { success: false, message: 'This item cannot be purchased with ƁM.' };
      }
      if (currentCashBM < cost) {
        return {
          success: false,
          message: `Insufficient funds. Requires ${cost.toLocaleString()} ƁM (you have ${currentCashBM.toLocaleString()} ƁM).`,
        };
      }

      deductCashBM(cost);
      this.unlockItem(itemId);
      this.equipItem(itemId);
      return {
        success: true,
        message: `Purchased and equipped ${item.name}!`,
        item,
        remainingBM: currentCashBM - cost,
      };
    } else {
      const cost = item.costSP;
      if (!cost) {
        return { success: false, message: 'This item cannot be purchased with SP.' };
      }
      if (currentSP < cost) {
        return {
          success: false,
          message: `Insufficient Strategy Points. Requires ${cost} SP (you have ${currentSP} SP).`,
        };
      }

      deductSP(cost);
      this.unlockItem(itemId);
      this.equipItem(itemId);
      return {
        success: true,
        message: `Purchased and equipped ${item.name}!`,
        item,
        remainingSP: currentSP - cost,
      };
    }
  }

  public subscribe(listener: CosmeticListener): () => void {
    this.listeners.add(listener);
    listener(this.getEquippedState(), this.getUnlockedArray());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getEquippedState();
    const unlocked = this.getUnlockedArray();
    this.listeners.forEach((fn) => fn(state, unlocked));
  }
}

export const CosmeticsManager = new CosmeticsManagerClass();
