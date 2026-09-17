/**
 * Phase 5 Cosmetics Catalog:
 * Complete definitions for Board Skins, 3D Investor Tokens, Dice Skins,
 * Custom Dice Roll Trails, and Bankruptcy Animation Vignettes.
 */

export type CosmeticCategory = 'board' | 'token' | 'dice' | 'trail' | 'vignette';

export type CosmeticRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  tagline: string;
  description: string;
  rarity: CosmeticRarity;
  rarityColor: string;
  accentColor: string;
  badgeIcon: string;
  costBM?: number;
  costSP?: number;
  unlockedByDefault: boolean;
  unlockRequirement?: string;
  previewGradient: string;
  previewDetails: Record<string, string>;
}

// 1. Board Skins Catalog
export const BOARD_SKINS: CosmeticItem[] = [
  {
    id: 'board-wallstreet-night',
    category: 'board',
    name: 'Wall Street Midnight',
    tagline: 'High-Frequency Trading Floor at 3 AM',
    description: 'Deep obsidian trading floor with laser-etched gold transit lines and phosphor market tickers.',
    rarity: 'Common',
    rarityColor: '#94a3b8',
    accentColor: '#10b981',
    badgeIcon: '🏛️',
    unlockedByDefault: true,
    previewGradient: 'from-slate-950 via-slate-900 to-black',
    previewDetails: {
      Surface: 'Matte Obsidian Composite',
      Tickers: 'Emerald Real-Time LED Traces',
      Perimeter: 'Champagne Gold Trim',
    },
  },
  {
    id: 'board-cyberpunk-tokyo',
    category: 'board',
    name: 'Cyberpunk Neo-Tokyo',
    tagline: 'Neon-Drenched Synthetic District',
    description: 'Wet asphalt reflections, holographic corporate billboards, and pulsing ultraviolet neon rail lines.',
    rarity: 'Epic',
    rarityColor: '#a855f7',
    accentColor: '#06b6d4',
    badgeIcon: '🌆',
    costBM: 8000,
    costSP: 400,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 8,000 ƁM or 400 SP',
    previewGradient: 'from-indigo-950 via-purple-950 to-cyan-950',
    previewDetails: {
      Surface: 'Wet Cyber Asphalt with Neon Reflections',
      Tickers: 'Holographic Japanese Kanji & USD/BTC Indices',
      Perimeter: 'Dual UV Violet & Electric Cyan LED Rails',
    },
  },
  {
    id: 'board-sovereign-gold',
    category: 'board',
    name: 'Sovereign Gold & Obsidian',
    tagline: 'Imperial Private Wealth Reserve',
    description: 'Hand-polished black marble embedded with 24K gold foil geometric lattices and diamond-cut corner monuments.',
    rarity: 'Legendary',
    rarityColor: '#f59e0b',
    accentColor: '#fbbf24',
    badgeIcon: '👑',
    costBM: 15000,
    costSP: 800,
    unlockedByDefault: false,
    unlockRequirement: 'Reach Gold Tier or 15,000 ƁM',
    previewGradient: 'from-amber-950 via-yellow-950 to-slate-950',
    previewDetails: {
      Surface: 'Mirror-Finished Portoro Black Marble',
      Tickers: '24K Liquid-Gold Leaf Engravings',
      Perimeter: 'Beveled Architectural Diamond Trim',
    },
  },
  {
    id: 'board-classic-emerald',
    category: 'board',
    name: 'Classic Emerald Exchange',
    tagline: 'Old-Money Mayfair Financial Club',
    description: 'Rich British racing green felt with mahogany wood dividers and brushed brass instrument gauges.',
    rarity: 'Rare',
    rarityColor: '#3b82f6',
    accentColor: '#10b981',
    badgeIcon: '🍀',
    costBM: 5000,
    costSP: 250,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 5,000 ƁM or 250 SP',
    previewGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    previewDetails: {
      Surface: 'English Racing Green Baize Felt',
      Tickers: 'Brushed Brass Analog Indices',
      Perimeter: 'Solid Honduras Mahogany Wood Rail',
    },
  },
];

// 2. 3D Investor Tokens Catalog
export const INVESTOR_TOKENS: CosmeticItem[] = [
  {
    id: 'token-golden-bull',
    category: 'token',
    name: 'Golden Bull of Wall St',
    tagline: 'Unstoppable Market Momentum',
    description: 'The definitive symbol of aggressive capital growth, sculpted in cast brass with high-polish horn highlights.',
    rarity: 'Common',
    rarityColor: '#94a3b8',
    accentColor: '#f59e0b',
    badgeIcon: '🐂',
    unlockedByDefault: true,
    previewGradient: 'from-amber-950 via-slate-900 to-black',
    previewDetails: {
      Material: 'Cast Architectural Brass',
      Weight: 'Heavy Tactile Center of Gravity',
      Finish: 'Polished Horns & Matte Flank Textures',
    },
  },
  {
    id: 'token-titan-yacht',
    category: 'token',
    name: 'Titan Mega-Yacht',
    tagline: 'Offshore Sovereign Mobility',
    description: 'Sleek 140-meter explorer yacht miniature with twin helipads, teak decks, and mirrored chrome hull.',
    rarity: 'Rare',
    rarityColor: '#3b82f6',
    accentColor: '#38bdf8',
    badgeIcon: '🛥️',
    costBM: 6000,
    costSP: 300,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 6,000 ƁM or 300 SP',
    previewGradient: 'from-sky-950 via-slate-900 to-blue-950',
    previewDetails: {
      Material: 'Mirrored Chrome & Real Teak Veneer',
      Details: 'Twin Helipads & Submersible Garage Bay',
      Finish: 'High-Gloss Sea-Spray Hydrophobic Coat',
    },
  },
  {
    id: 'token-private-jet',
    category: 'token',
    name: 'Apex Private Jet',
    tagline: 'Supersonic Continental Transit',
    description: 'Mach 2.2 carbon-composite private cruiser with swept delta wings and titanium turbine intakes.',
    rarity: 'Epic',
    rarityColor: '#a855f7',
    accentColor: '#c084fc',
    badgeIcon: '✈️',
    costBM: 10000,
    costSP: 500,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 10,000 ƁM or 500 SP',
    previewGradient: 'from-purple-950 via-slate-950 to-indigo-950',
    previewDetails: {
      Material: 'Weaved Carbon Fiber & Machined Titanium',
      Details: 'Swept Delta Wings & Tinted Quartz Cockpit',
      Finish: 'Anti-Radar Stealth Satin Black',
    },
  },
  {
    id: 'token-quantum-diamond',
    category: 'token',
    name: 'Quantum Diamond Core',
    tagline: 'Pure Concentrated Value Matrix',
    description: '58-facet brilliant-cut synthetic diamond core levitating inside a counter-rotating platinum gyroscope cage.',
    rarity: 'Legendary',
    rarityColor: '#f59e0b',
    accentColor: '#06b6d4',
    badgeIcon: '💎',
    costBM: 14000,
    costSP: 700,
    unlockedByDefault: false,
    unlockRequirement: 'Reach Platinum Tier or 14,000 ƁM',
    previewGradient: 'from-cyan-950 via-slate-950 to-blue-950',
    previewDetails: {
      Material: '58-Facet Brilliant Lab Diamond & 950 Platinum',
      Details: 'Magnetic Levitating Gimbal Ring Assembly',
      Finish: 'Prismatic Dispersion Caustic Glare',
    },
  },
  {
    id: 'token-billionaire-hat',
    category: 'token',
    name: 'Billionaire Top Hat',
    tagline: 'The Gilded Age Monopolist',
    description: 'Structured silk beaver-felt top hat with a polished sterling silver band and monogrammed silk lining.',
    rarity: 'Common',
    rarityColor: '#94a3b8',
    accentColor: '#e2e8f0',
    badgeIcon: '🎩',
    costBM: 3500,
    costSP: 180,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 3,500 ƁM or 180 SP',
    previewGradient: 'from-slate-900 via-slate-950 to-black',
    previewDetails: {
      Material: 'Midnight Black Silk Felt & Sterling Silver',
      Details: 'Engraved Monogrammed Hatband',
      Finish: 'Gilded Age Architectural Elegance',
    },
  },
  {
    id: 'token-sovereign-lion',
    category: 'token',
    name: 'Golden Sovereign Lion',
    tagline: 'The Apex Apex Predator of Capital',
    description: 'Cast solid 24K gold rampant heraldic lion perched upon an emerald pedestal. Exclusive to Apex Rank investors.',
    rarity: 'Mythic',
    rarityColor: '#e11d48',
    accentColor: '#f43f5e',
    badgeIcon: '🦁',
    costBM: 20000,
    costSP: 1000,
    unlockedByDefault: false,
    unlockRequirement: 'Reach Apex Investor Rank (2200+ Elo)',
    previewGradient: 'from-rose-950 via-amber-950 to-black',
    previewDetails: {
      Material: 'Cast Solid 24K Gold & Natural Colombian Emerald',
      Details: 'Twin Flawless Ruby Eyes',
      Finish: 'Imperial Crown Heritage Hallmark',
    },
  },
];

// 3. Custom Dice Roll Trails Catalog
export const DICE_TRAILS: CosmeticItem[] = [
  {
    id: 'trail-golden-stardust',
    category: 'trail',
    name: 'Golden Stardust',
    tagline: 'Sparkling Liquid Gold Trajectory',
    description: 'Streams of micro-faceted golden stardust and glowing embers that track every tumble and bounce across the felt.',
    rarity: 'Common',
    rarityColor: '#94a3b8',
    accentColor: '#f59e0b',
    badgeIcon: '✨',
    unlockedByDefault: true,
    previewGradient: 'from-amber-950 via-slate-900 to-black',
    previewDetails: {
      ParticleCount: '120 active trailing embers',
      Dissipation: 'Subtle exponential gravity decay',
      Glow: 'Warm 24K specular shimmer',
    },
  },
  {
    id: 'trail-cyber-neon',
    category: 'trail',
    name: 'Cyber Neon Cyan',
    tagline: 'Overclocked Fiber-Optic Tracer',
    description: 'High-frequency electric cyan particle ribbons with digital glitch artifacts following the dice momentum.',
    rarity: 'Rare',
    rarityColor: '#3b82f6',
    accentColor: '#06b6d4',
    badgeIcon: '⚡',
    costBM: 4000,
    costSP: 200,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 4,000 ƁM or 200 SP',
    previewGradient: 'from-cyan-950 via-slate-950 to-indigo-950',
    previewDetails: {
      ParticleCount: '180 neon vector segments',
      Dissipation: 'Digital pixelation fade',
      Glow: 'Dual ultraviolet & electric cyan bloom',
    },
  },
  {
    id: 'trail-molten-fire',
    category: 'trail',
    name: 'Molten Gold Sparks',
    tagline: 'Forge-Heated Foundry Sparks',
    description: 'Intense incandescent embers that shower upon floor impacts, leaving glowing scorch marks that fade away.',
    rarity: 'Epic',
    rarityColor: '#a855f7',
    accentColor: '#ea580c',
    badgeIcon: '🔥',
    costBM: 7500,
    costSP: 350,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 7,500 ƁM or 350 SP',
    previewGradient: 'from-orange-950 via-red-950 to-slate-950',
    previewDetails: {
      ParticleCount: '240 volcanic ember sparks',
      Dissipation: 'Dynamic floor collision bursts',
      Glow: '1,400°C molten gold temperature color',
    },
  },
  {
    id: 'trail-cosmic-void',
    category: 'trail',
    name: 'Cosmic Violet Flare',
    tagline: 'Gravitational Singularity Wake',
    description: 'Hypnotic deep violet and magenta nebula swirls with sparkling micro-stars swirling around the tumbling cube.',
    rarity: 'Legendary',
    rarityColor: '#f59e0b',
    accentColor: '#d946ef',
    badgeIcon: '🌌',
    costBM: 12000,
    costSP: 600,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 12,000 ƁM or 600 SP',
    previewGradient: 'from-fuchsia-950 via-purple-950 to-black',
    previewDetails: {
      ParticleCount: '300 swirling nebula dust grains',
      Dissipation: 'Gravitational orbital vortex decay',
      Glow: 'Multispectral ultraviolet flare',
    },
  },
  {
    id: 'trail-emerald-glint',
    category: 'trail',
    name: 'Emerald Glint',
    tagline: 'Crystalline Mineral Shimmer',
    description: 'Crisp geometric emerald flecks that bounce cleanly off the perimeter rails and settle quietly.',
    rarity: 'Rare',
    rarityColor: '#3b82f6',
    accentColor: '#10b981',
    badgeIcon: '❇️',
    costBM: 3000,
    costSP: 150,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 3,000 ƁM or 150 SP',
    previewGradient: 'from-emerald-950 via-slate-900 to-black',
    previewDetails: {
      ParticleCount: '100 prismatic mineral facets',
      Dissipation: 'Refractive flash sparkle',
      Glow: 'Clean 532nm pure emerald green',
    },
  },
];

// 4. Custom Bankruptcy Animation Vignettes Catalog
export const BANKRUPTCY_VIGNETTES: CosmeticItem[] = [
  {
    id: 'vignette-blackswan',
    category: 'vignette',
    name: 'Black Swan Market Crash',
    tagline: 'Sudden Catastrophic Shock',
    description: 'Red ticker warning klaxons, plummeting candle charts, and a shatter effect across the player card.',
    rarity: 'Common',
    rarityColor: '#94a3b8',
    accentColor: '#ef4444',
    badgeIcon: '🦢',
    unlockedByDefault: true,
    previewGradient: 'from-red-950 via-slate-900 to-black',
    previewDetails: {
      Soundtrack: 'Emergency Exchange Bell & Klaxon Echo',
      VFX: 'Fractured Glass & Red Candlestick Collapse',
      Duration: '3.8 seconds cinematic sequence',
    },
  },
  {
    id: 'vignette-margin-call',
    category: 'vignette',
    name: 'Margin Call Liquidation',
    tagline: 'Immediate Syndicate Asset Seizure',
    description: 'Official liquidation stamps slam down onto assets as debt counters tally down to absolute zero.',
    rarity: 'Rare',
    rarityColor: '#3b82f6',
    accentColor: '#f97316',
    badgeIcon: '📉',
    costBM: 5000,
    costSP: 250,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 5,000 ƁM or 250 SP',
    previewGradient: 'from-orange-950 via-slate-950 to-red-950',
    previewDetails: {
      Soundtrack: 'Hydraulic Stamp Thuds & Paper Shredder',
      VFX: 'RED INK LIQUIDATED Holographic Stamping',
      Duration: '4.2 seconds cinematic sequence',
    },
  },
  {
    id: 'vignette-vault-implosion',
    category: 'vignette',
    name: 'Vault Implosion',
    tagline: 'Structural Catastrophic Breach',
    description: 'Bank vault doors burst open in reverse slow-motion, draining gold bars and ƁM banknotes into a vortex.',
    rarity: 'Epic',
    rarityColor: '#a855f7',
    accentColor: '#a855f7',
    badgeIcon: '🌪️',
    costBM: 9000,
    costSP: 450,
    unlockedByDefault: false,
    unlockRequirement: 'Purchase with 9,000 ƁM or 450 SP',
    previewGradient: 'from-purple-950 via-slate-950 to-black',
    previewDetails: {
      Soundtrack: 'Heavy Vault Steel Groan & Vacuum Swirl',
      VFX: 'Gravitational Vortex Draining Gold Bullion',
      Duration: '4.5 seconds cinematic sequence',
    },
  },
  {
    id: 'vignette-golden-parachute',
    category: 'vignette',
    name: 'Golden Parachute Bailout',
    tagline: 'Executive Protection Exit',
    description: 'The corporation collapses, but the executive floats safely upward into a private helicopter in comedic style.',
    rarity: 'Legendary',
    rarityColor: '#f59e0b',
    accentColor: '#eab308',
    badgeIcon: '🪂',
    costBM: 15000,
    costSP: 750,
    unlockedByDefault: false,
    unlockRequirement: 'Reach Gold Tier or 15,000 ƁM',
    previewGradient: 'from-yellow-950 via-amber-950 to-slate-950',
    previewDetails: {
      Soundtrack: 'Champagne Cork Pop & Helicopter Rotor Beats',
      VFX: '24K Silk Parachute Opening with Confetti Rain',
      Duration: '5.0 seconds cinematic sequence',
    },
  },
];

export const ALL_COSMETICS: CosmeticItem[] = [
  ...BOARD_SKINS,
  ...INVESTOR_TOKENS,
  ...DICE_TRAILS,
  ...BANKRUPTCY_VIGNETTES,
];

export const COSMETICS_MAP = ALL_COSMETICS.reduce<Record<string, CosmeticItem>>((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
