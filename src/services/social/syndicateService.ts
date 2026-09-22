/**
 * Phase 5 Investor Syndicates (Guild/Clan) System:
 * Clan creation, membership roles, shared Strategy Points (SP) vault,
 * perk unlock trees, and syndicate activity feed.
 */

export interface SyndicatePerk {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  requiredSP: number;
  effectType: 'salary_boost' | 'bailout_defense' | 'auction_intel' | 'cartel_dividend';
  multiplier: number;
}

export const SYNDICATE_PERKS: SyndicatePerk[] = [
  {
    id: 'perk-salary-boost',
    name: 'Salary Yield Boost',
    tagline: '+10% Go Pass Liquidity',
    description: 'All syndicate members receive an additional 10% bonus cash whenever passing Space 0 (Go).',
    icon: '⚡',
    requiredSP: 500,
    effectType: 'salary_boost',
    multiplier: 0.1,
  },
  {
    id: 'perk-bailout-defense',
    name: 'Syndicate Bailout Reserve',
    tagline: '-20% Rest & Penalty Costs',
    description: 'Legal retainers and emergency liquid reserves subsidize 20% of all luxury tax, bail, and rest station fees.',
    icon: '🛡️',
    requiredSP: 1500,
    effectType: 'bailout_defense',
    multiplier: 0.2,
  },
  {
    id: 'perk-auction-intel',
    name: 'Market Intelligence',
    tagline: '-10% Property Auction Settlements',
    description: 'Syndicate analytical feeds give members a 10% discount on final winning bids during open distressed auctions.',
    icon: '📊',
    requiredSP: 3500,
    effectType: 'auction_intel',
    multiplier: 0.1,
  },
  {
    id: 'perk-apex-cartel',
    name: 'Apex Cartel Dividend',
    tagline: '+5% Rent Income Across All Assets',
    description: 'Cartel-wide pricing power boosts tenant rental yields by 5% on all landed properties.',
    icon: '👑',
    requiredSP: 8000,
    effectType: 'cartel_dividend',
    multiplier: 0.05,
  },
];

export interface SyndicateMember {
  userId: string;
  displayName: string;
  role: 'Founder' | 'Executive' | 'Associate';
  spContributed: number;
  elo: number;
  joinedAt: number;
}

export interface Syndicate {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  description: string;
  founderId: string;
  minElo: number;
  maxMembers: number;
  vaultSP: number;
  members: SyndicateMember[];
  createdAt: number;
  activityFeed: Array<{ id: string; text: string; timestamp: number }>;
}

const STORAGE_SYNDICATES_KEY = 'bm_syndicates_catalog_v1';
const STORAGE_USER_SYNDICATE_KEY = 'bm_user_syndicate_id_v1';

export class SyndicateService {
  private static getStoredSyndicates(): Syndicate[] {
    try {
      const raw = localStorage.getItem(STORAGE_SYNDICATES_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading syndicates:', e);
    }

    // Default seeded syndicates
    const defaults: Syndicate[] = [
      {
        id: 'syn_apex',
        name: 'Apex Sovereign Cartel',
        tag: 'APEX',
        emblem: '👑',
        description: 'Elite high-frequency investors and real estate monopolists dominating the global leaderboards.',
        founderId: 'user_sovereignquant',
        minElo: 1800,
        maxMembers: 30,
        vaultSP: 9450,
        createdAt: Date.now() - 30 * 86400000,
        members: [
          { userId: 'user_sovereignquant', displayName: 'SovereignQuant', role: 'Founder', spContributed: 3500, elo: 2480, joinedAt: Date.now() - 30 * 86400000 },
          { userId: 'user_alphaarbitrage', displayName: 'AlphaArbitrage', role: 'Executive', spContributed: 2400, elo: 2320, joinedAt: Date.now() - 25 * 86400000 },
          { userId: 'user_local', displayName: 'You', role: 'Associate', spContributed: 450, elo: 1200, joinedAt: Date.now() - 5 * 86400000 },
        ],
        activityFeed: [
          { id: 'act_1', text: 'SovereignQuant deposited 500 SP into the Syndicate Vault', timestamp: Date.now() - 7200000 },
          { id: 'act_2', text: 'Syndicate unlocked Perk: Apex Cartel Dividend (+5% Rent)!', timestamp: Date.now() - 14400000 },
          { id: 'act_3', text: 'You deposited 100 SP into the Syndicate Vault', timestamp: Date.now() - 86400000 },
        ],
      },
      {
        id: 'syn_titan',
        name: 'Titan Venture Guild',
        tag: 'TITN',
        emblem: '🏛️',
        description: 'Venture capitalists and distressed asset liquidators focusing on high-risk, high-yield acquisitions.',
        founderId: 'user_titanventure',
        minElo: 1400,
        maxMembers: 30,
        vaultSP: 4200,
        createdAt: Date.now() - 20 * 86400000,
        members: [
          { userId: 'user_titanventure', displayName: 'TitanVenture', role: 'Founder', spContributed: 2800, elo: 2415, joinedAt: Date.now() - 20 * 86400000 },
          { userId: 'user_ventureduchess', displayName: 'VentureDuchess', role: 'Executive', spContributed: 1400, elo: 2180, joinedAt: Date.now() - 15 * 86400000 },
        ],
        activityFeed: [
          { id: 'act_t1', text: 'Titan Venture Guild unlocked Market Intelligence Perk (-10% Auctions)!', timestamp: Date.now() - 3600000 },
        ],
      },
      {
        id: 'syn_gold',
        name: 'Gilded Mayfair Union',
        tag: 'GOLD',
        emblem: '🦁',
        description: 'Old-money traditionalists accumulating classical utility networks and high-amenity monopolies.',
        founderId: 'user_wallstvalkyrie',
        minElo: 1000,
        maxMembers: 30,
        vaultSP: 2100,
        createdAt: Date.now() - 15 * 86400000,
        members: [
          { userId: 'user_wallstvalkyrie', displayName: 'WallStValkyrie', role: 'Founder', spContributed: 1500, elo: 2360, joinedAt: Date.now() - 15 * 86400000 },
          { userId: 'user_liquiditywhale', displayName: 'LiquidityWhale', role: 'Associate', spContributed: 600, elo: 2140, joinedAt: Date.now() - 10 * 86400000 },
        ],
        activityFeed: [
          { id: 'act_g1', text: 'Gilded Mayfair Union unlocked Syndicate Bailout Reserve (-20% Penalty)!', timestamp: Date.now() - 7200000 },
        ],
      },
    ];

    this.saveSyndicates(defaults);
    return defaults;
  }

  private static saveSyndicates(list: Syndicate[]): void {
    try {
      localStorage.setItem(STORAGE_SYNDICATES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving syndicates:', e);
    }
  }

  public static getUserSyndicateId(): string | null {
    return localStorage.getItem(STORAGE_USER_SYNDICATE_KEY) || 'syn_apex';
  }

  public static setUserSyndicateId(id: string | null): void {
    if (id) {
      localStorage.setItem(STORAGE_USER_SYNDICATE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_USER_SYNDICATE_KEY);
    }
  }

  public static getAllSyndicates(): Syndicate[] {
    return this.getStoredSyndicates();
  }

  public static getSyndicateById(id: string): Syndicate | undefined {
    return this.getStoredSyndicates().find((s) => s.id === id);
  }

  public static getUserSyndicate(): Syndicate | undefined {
    const id = this.getUserSyndicateId();
    if (!id) return undefined;
    return this.getSyndicateById(id);
  }

  /**
   * Deposit player's SP into the Syndicate Vault
   */
  public static depositSP(
    syndicateId: string,
    amount: number,
    userId: string,
    displayName: string
  ): { success: boolean; newVaultTotal: number; unlockedNewPerk?: SyndicatePerk; message: string } {
    const syndicates = this.getStoredSyndicates();
    const syn = syndicates.find((s) => s.id === syndicateId);
    if (!syn) {
      return { success: false, newVaultTotal: 0, message: 'Syndicate not found' };
    }

    const prevVault = syn.vaultSP;
    syn.vaultSP += amount;

    // Update or add member contribution
    const member = syn.members.find((m) => m.userId === userId);
    if (member) {
      member.spContributed += amount;
    } else {
      syn.members.push({
        userId,
        displayName,
        role: 'Associate',
        spContributed: amount,
        elo: 1200,
        joinedAt: Date.now(),
      });
    }

    // Check if new perk unlocked
    let unlockedNewPerk: SyndicatePerk | undefined;
    for (const perk of SYNDICATE_PERKS) {
      if (prevVault < perk.requiredSP && syn.vaultSP >= perk.requiredSP) {
        unlockedNewPerk = perk;
        syn.activityFeed.unshift({
          id: `act_${Date.now()}`,
          text: `🎉 Syndicate unlocked Perk: ${perk.name} (${perk.tagline})!`,
          timestamp: Date.now(),
        });
      }
    }

    syn.activityFeed.unshift({
      id: `act_dep_${Date.now()}`,
      text: `${displayName} deposited ${amount} SP into the Syndicate Vault`,
      timestamp: Date.now(),
    });

    this.saveSyndicates(syndicates);

    return {
      success: true,
      newVaultTotal: syn.vaultSP,
      unlockedNewPerk,
      message: `Deposited ${amount} SP into ${syn.name}! Vault balance: ${syn.vaultSP} SP`,
    };
  }

  /**
   * Create a new Syndicate
   */
  public static createSyndicate(
    name: string,
    tag: string,
    emblem: string,
    description: string,
    founderId: string,
    founderName: string,
    minElo: number = 1000
  ): { success: boolean; syndicate?: Syndicate; message: string } {
    const syndicates = this.getStoredSyndicates();
    if (syndicates.some((s) => s.tag.toUpperCase() === tag.toUpperCase())) {
      return { success: false, message: `Syndicate tag [${tag.toUpperCase()}] is already registered.` };
    }

    const newSyn: Syndicate = {
      id: `syn_${Date.now()}`,
      name,
      tag: tag.toUpperCase(),
      emblem,
      description,
      founderId,
      minElo,
      maxMembers: 30,
      vaultSP: 0,
      createdAt: Date.now(),
      members: [
        {
          userId: founderId,
          displayName: founderName,
          role: 'Founder',
          spContributed: 0,
          elo: 1200,
          joinedAt: Date.now(),
        },
      ],
      activityFeed: [
        {
          id: `act_created_${Date.now()}`,
          text: `${founderName} established [${tag.toUpperCase()}] ${name}!`,
          timestamp: Date.now(),
        },
      ],
    };

    syndicates.unshift(newSyn);
    this.saveSyndicates(syndicates);
    this.setUserSyndicateId(newSyn.id);

    return {
      success: true,
      syndicate: newSyn,
      message: `Successfully chartered Syndicate [${newSyn.tag}] ${newSyn.name}!`,
    };
  }

  /**
   * Join an existing Syndicate
   */
  public static joinSyndicate(
    syndicateId: string,
    userId: string,
    displayName: string,
    elo: number
  ): { success: boolean; message: string } {
    const syndicates = this.getStoredSyndicates();
    const syn = syndicates.find((s) => s.id === syndicateId);
    if (!syn) {
      return { success: false, message: 'Syndicate not found' };
    }

    if (syn.members.length >= syn.maxMembers) {
      return { success: false, message: 'This Syndicate has reached its maximum roster size (30 members).' };
    }

    if (elo < syn.minElo) {
      return {
        success: false,
        message: `Requires minimum rating of ${syn.minElo} Elo (your rating: ${elo} Elo).`,
      };
    }

    if (syn.members.some((m) => m.userId === userId)) {
      return { success: false, message: 'You are already a member of this Syndicate.' };
    }

    syn.members.push({
      userId,
      displayName,
      role: 'Associate',
      spContributed: 0,
      elo,
      joinedAt: Date.now(),
    });

    syn.activityFeed.unshift({
      id: `act_join_${Date.now()}`,
      text: `${displayName} joined the Syndicate!`,
      timestamp: Date.now(),
    });

    this.saveSyndicates(syndicates);
    this.setUserSyndicateId(syn.id);

    return {
      success: true,
      message: `Welcome to [${syn.tag}] ${syn.name}!`,
    };
  }

  /**
   * Leave current Syndicate
   */
  public static leaveSyndicate(userId: string): { success: boolean; message: string } {
    const currentId = this.getUserSyndicateId();
    if (!currentId) return { success: false, message: 'Not in a syndicate' };

    const syndicates = this.getStoredSyndicates();
    const syn = syndicates.find((s) => s.id === currentId);
    if (syn) {
      syn.members = syn.members.filter((m) => m.userId !== userId);
      this.saveSyndicates(syndicates);
    }

    this.setUserSyndicateId(null);
    return { success: true, message: 'Left Syndicate successfully.' };
  }
}
