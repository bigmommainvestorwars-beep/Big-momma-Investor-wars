export type DiceSkinId =
  | 'obsidian-gold'
  | 'neon-cyberpunk'
  | 'crystal-ruby'
  | 'ivory'
  | 'emerald-vip';

export interface DiceSkinMetadata {
  id: DiceSkinId;
  name: string;
  tagline: string;
  description: string;
  badgeIcon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  rarityColor: string;
  accentColor: string;
  pedestalColor: string;
  glowColor: string;
  previewGradient: string;
  unlockedByDefault: boolean;
  unlockRequirement: string;
  unlockCriteria: string;
  materialStats: {
    finish: string;
    reflectivity: string;
    pips: string;
    trim: string;
  };
}

export const DICE_SKINS: Record<DiceSkinId, DiceSkinMetadata> = {
  'obsidian-gold': {
    id: 'obsidian-gold',
    name: 'Obsidian & Gold',
    tagline: 'High-Roller Volcanic Elegance',
    badgeIcon: '🌋',
    description:
      'Carved from ultra-dense volcanic obsidian crystal, hand-finished to a mirror black sheen with 24K gold leaf inlay borders and deep recessed gold enamel pips.',
    rarity: 'Legendary',
    rarityColor: '#f59e0b',
    accentColor: '#fbbf24',
    pedestalColor: '#b45309',
    glowColor: '#f59e0b',
    previewGradient: 'from-amber-950 via-slate-900 to-black',
    unlockedByDefault: true,
    unlockRequirement: 'Standard High-Roller Reward (Unlocked)',
    unlockCriteria: 'Standard High-Roller Reward (Unlocked)',
    materialStats: {
      finish: 'Mirror-Polished Volcanic Obsidian',
      reflectivity: '96% Specular Reflection',
      pips: '24K Liquid-Gold Infill',
      trim: '24K Gold Inlay Groove',
    },
  },
  'neon-cyberpunk': {
    id: 'neon-cyberpunk',
    name: 'Neon Cyberpunk',
    tagline: 'Quantum Carbon & LED Phosphors',
    badgeIcon: '⚡',
    description:
      'Constructed from high-density carbon nano-lattice with quantum LED circuitry micro-traces that emit vibrant cyan and electric magenta ultraviolet light.',
    rarity: 'Mythic',
    rarityColor: '#06b6d4',
    accentColor: '#22d3ee',
    pedestalColor: '#0891b2',
    glowColor: '#00f0ff',
    previewGradient: 'from-cyan-950 via-slate-950 to-fuchsia-950',
    unlockedByDefault: false,
    unlockRequirement: 'Reach ƁM 150,000 Net Worth or Win 1 Match',
    unlockCriteria: 'Reach ƁM 150,000 Net Worth or Win 1 Match',
    materialStats: {
      finish: 'Matte Carbon Nano-Lattice',
      reflectivity: 'Dual-Color Emissive Bloom',
      pips: 'UV Phosphor LED Arrays',
      trim: 'Cyber Circuit Micro-Traces',
    },
  },
  'crystal-ruby': {
    id: 'crystal-ruby',
    name: 'Crystal Ruby',
    tagline: 'Vegas Casino Candy Refraction',
    badgeIcon: '💎',
    description:
      'Hand-faceted synthetic corundum jewel featuring internal light caustics, radiant rose-crimson transmission, and brilliant diamond-cut white pips.',
    rarity: 'Epic',
    rarityColor: '#f43f5e',
    accentColor: '#fb7185',
    pedestalColor: '#be123c',
    glowColor: '#f43f5e',
    previewGradient: 'from-rose-950 via-red-950 to-slate-950',
    unlockedByDefault: false,
    unlockRequirement: 'Acquire 3 High-Yield Properties in a Single Game',
    unlockCriteria: 'Acquire 3 High-Yield Properties in a Single Game',
    materialStats: {
      finish: 'Translucent Corundum Crystal',
      reflectivity: 'Internal Refractive Caustics (IOR 1.76)',
      pips: 'Sparkling Diamond White Enamel',
      trim: 'Faceted Beveled Rim',
    },
  },
  'ivory': {
    id: 'ivory',
    name: 'Royal Ivory',
    tagline: 'Monaco Aristocrat Classical Edition',
    badgeIcon: '🏛️',
    description:
      'Heavy porcelain ivory with delicate micro-porcelain grain, inlaid 24K gold framing filigree, and mirror-polished black onyx lacquer pips with a ruby ace.',
    rarity: 'Rare',
    rarityColor: '#10b981',
    accentColor: '#34d399',
    pedestalColor: '#047857',
    glowColor: '#10b981',
    previewGradient: 'from-emerald-950 via-slate-900 to-amber-950',
    unlockedByDefault: true,
    unlockRequirement: 'Standard Investor Issue (Unlocked)',
    unlockCriteria: 'Standard Investor Issue (Unlocked)',
    materialStats: {
      finish: 'Silky Porcelain Ivory',
      reflectivity: 'Warm Glossy Clearcoat',
      pips: 'Polished Onyx & Ruby Ace',
      trim: '24K Gold Inlay Filigree',
    },
  },
  'emerald-vip': {
    id: 'emerald-vip',
    name: 'Emerald VIP',
    tagline: 'Imperial Jade & Gold Medallion',
    badgeIcon: '👑',
    description:
      'Carved from deep imperial green jadeite with translucent crystalline veins, golden starlight pips, and a crowned ace starburst.',
    rarity: 'Legendary',
    rarityColor: '#10b981',
    accentColor: '#6ee7b7',
    pedestalColor: '#065f46',
    glowColor: '#10b981',
    previewGradient: 'from-emerald-950 via-teal-950 to-black',
    unlockedByDefault: false,
    unlockRequirement: 'Execute 5 Corporate Restructuring / Mortgage Pledges',
    unlockCriteria: 'Execute 5 Corporate Restructuring / Mortgage Pledges',
    materialStats: {
      finish: 'Imperial Jadeite Crystal',
      reflectivity: 'Subsurface Green Translucency',
      pips: '24K Polished Gold Star Pips',
      trim: 'Burnished Gold Bevel',
    },
  },
};

export const DICE_SKIN_LIST: DiceSkinMetadata[] = Object.values(DICE_SKINS);

const STORAGE_EQUIPPED_KEY = 'bm_equipped_dice_skin';
const STORAGE_UNLOCKED_KEY = 'bm_unlocked_dice_skins';
const STORAGE_DEV_MODE_KEY = 'bm_dev_dice_preview_mode';

export class DiceSkinManager {
  private static subscribers: Array<(skin: DiceSkinId) => void> = [];
  private static memoryEquipped: DiceSkinId = 'obsidian-gold';
  private static previewSkin: DiceSkinId | null = null;
  private static developerMode: boolean = false;
  private static isNotifying: boolean = false;
  private static memoryUnlocked: Set<DiceSkinId> = new Set<DiceSkinId>([
    'obsidian-gold',
    'ivory',
  ]);

  private static notifySubscribers(): void {
    if (this.isNotifying) return;
    this.isNotifying = true;
    const effective = this.getEffectiveSkin();
    try {
      this.subscribers.forEach((cb) => {
        try {
          cb(effective);
        } catch (err) {
          console.error('[DiceSkinManager] Error in subscriber callback:', err);
        }
      });
    } finally {
      this.isNotifying = false;
    }
  }

  static isDeveloperMode(): boolean {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_DEV_MODE_KEY);
        if (stored !== null) {
          this.developerMode = stored === 'true';
        }
      } catch {
        // Ignore
      }
    }
    return this.developerMode;
  }

  static setDeveloperMode(enabled: boolean): void {
    if (this.developerMode === enabled) return;
    this.developerMode = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_DEV_MODE_KEY, String(enabled));
      } catch {
        // Ignore
      }
    }
    this.notifySubscribers();
  }

  static getPreviewSkin(): DiceSkinId | null {
    return this.previewSkin;
  }

  static setPreviewSkin(skinId: DiceSkinId | null): void {
    if (this.previewSkin === skinId) return;
    this.previewSkin = skinId;
    this.notifySubscribers();
  }

  static getEffectiveSkin(): DiceSkinId {
    if (this.previewSkin && DICE_SKINS[this.previewSkin]) {
      return this.previewSkin;
    }
    return this.getEquippedSkin();
  }

  static getEquippedSkin(): DiceSkinId {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_EQUIPPED_KEY) as DiceSkinId;
        if (stored && DICE_SKINS[stored]) {
          this.memoryEquipped = stored;
          return stored;
        }
      } catch {
        // Fallback to memory
      }
    }
    return this.memoryEquipped;
  }

  static setEquippedSkin(skinId: DiceSkinId): void {
    if (!DICE_SKINS[skinId]) return;
    if (this.memoryEquipped === skinId) return;
    this.memoryEquipped = skinId;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_EQUIPPED_KEY, skinId);
      } catch {
        // Ignore
      }
    }
    this.notifySubscribers();
  }

  static equipSkin(skinId: DiceSkinId): { success: boolean; error?: string } {
    if (!DICE_SKINS[skinId]) {
      return { success: false, error: 'Unknown dice skin' };
    }
    if (!this.isDeveloperMode() && !this.isSkinUnlocked(skinId)) {
      return { success: false, error: 'Skin is locked' };
    }
    this.setEquippedSkin(skinId);
    return { success: true };
  }

  static getUnlockedSkins(): Set<DiceSkinId> {
    const unlocked = new Set<DiceSkinId>();
    // If developer mode is active, all skins are unlocked
    if (this.isDeveloperMode()) {
      Object.keys(DICE_SKINS).forEach((id) => unlocked.add(id as DiceSkinId));
      return unlocked;
    }

    // Add default unlocked
    Object.values(DICE_SKINS).forEach((skin) => {
      if (skin.unlockedByDefault) {
        unlocked.add(skin.id);
      }
    });

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_UNLOCKED_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          parsed.forEach((id) => {
            if (id in DICE_SKINS) {
              unlocked.add(id as DiceSkinId);
            }
          });
          this.memoryUnlocked = new Set(unlocked);
          return unlocked;
        }
      } catch {
        // Fallback
      }
    }

    // Merge in-memory unlocks
    this.memoryUnlocked.forEach((id) => unlocked.add(id));
    return unlocked;
  }

  static getUnlockedSkinsArray(): DiceSkinId[] {
    return Array.from(this.getUnlockedSkins());
  }

  static isSkinUnlocked(skinId: DiceSkinId): boolean {
    if (this.isDeveloperMode()) return true;
    return this.getUnlockedSkins().has(skinId);
  }

  static unlockAllSkins(): void {
    Object.keys(DICE_SKINS).forEach((id) => {
      this.memoryUnlocked.add(id as DiceSkinId);
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_UNLOCKED_KEY,
          JSON.stringify(Object.keys(DICE_SKINS))
        );
      } catch {
        // Ignore
      }
    }
    this.notifySubscribers();
  }

  static unlockSkin(skinId: DiceSkinId): boolean {
    if (!DICE_SKINS[skinId]) return false;
    this.memoryUnlocked.add(skinId);
    const unlocked = this.getUnlockedSkins();
    unlocked.add(skinId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_UNLOCKED_KEY,
          JSON.stringify(Array.from(unlocked))
        );
      } catch {
        // In-memory unlock succeeded
      }
    }
    this.notifySubscribers();
    return true;
  }

  static lockSkin(skinId: DiceSkinId): boolean {
    if (!DICE_SKINS[skinId] || DICE_SKINS[skinId].unlockedByDefault) return false;
    this.memoryUnlocked.delete(skinId);
    const unlocked = this.getUnlockedSkins();
    unlocked.delete(skinId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_UNLOCKED_KEY,
          JSON.stringify(Array.from(unlocked))
        );
      } catch {
        // Memory delete succeeded
      }
    }
    if (this.getEquippedSkin() === skinId) {
      this.setEquippedSkin('obsidian-gold');
    }
    this.notifySubscribers();
    return true;
  }

  static resetToDefaults(): void {
    this.memoryEquipped = 'obsidian-gold';
    this.previewSkin = null;
    this.developerMode = false;
    this.memoryUnlocked = new Set<DiceSkinId>();
    Object.values(DICE_SKINS).forEach((skin) => {
      if (skin.unlockedByDefault) {
        this.memoryUnlocked.add(skin.id);
      }
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_EQUIPPED_KEY);
        localStorage.removeItem(STORAGE_UNLOCKED_KEY);
        localStorage.removeItem(STORAGE_DEV_MODE_KEY);
      } catch {
        // Ignore
      }
    }
    this.notifySubscribers();
  }

  static subscribe(callback: (skin: DiceSkinId) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }
}
