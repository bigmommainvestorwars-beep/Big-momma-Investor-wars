/**
 * Production Configuration Boundary: Market Events Configuration
 */

import { MarketEventScope, MarketImpact, MarketChoiceOption } from '../types/marketEvent';

export interface MarketEventDefinition {
  code: string;
  name: string;
  description: string;
  scope: MarketEventScope;
  defaultDurationRounds: number;
  impact: MarketImpact;
  probabilityWeight: number;
}

export interface MarketEventConfigRegistry {
  getEventDefinition(code: string): MarketEventDefinition | undefined;
  listEventDefinitions(): MarketEventDefinition[];
  registerEventDefinition(def: MarketEventDefinition): void;
}

class DefaultMarketEventRegistry implements MarketEventConfigRegistry {
  private events = new Map<string, MarketEventDefinition>();

  public registerEventDefinition(def: MarketEventDefinition): void {
    this.events.set(def.code, def);
  }

  public getEventDefinition(code: string): MarketEventDefinition | undefined {
    return this.events.get(code);
  }

  public listEventDefinitions(): MarketEventDefinition[] {
    return Array.from(this.events.values());
  }
}

export const marketEventRegistry = new DefaultMarketEventRegistry();

export const DEFAULT_MARKET_EVENTS: MarketEventDefinition[] = [
  {
    code: 'TECH_BOOM',
    name: 'Artificial Intelligence Boom',
    description: 'Breakthrough AI models drive corporate valuations. AI and Tech properties yield +50% rent.',
    scope: 'sector',
    defaultDurationRounds: 3,
    impact: { affectedTarget: 'Artificial Intelligence', rentMultiplier: 1.5 },
    probabilityWeight: 25,
  },
  {
    code: 'BULL_MARKET',
    name: 'Global Bull Market',
    description: 'Euphoric market sentiment boosts investor revenues across all asset sectors by +25%.',
    scope: 'global',
    defaultDurationRounds: 3,
    impact: { affectedTarget: 'all', rentMultiplier: 1.25 },
    probabilityWeight: 25,
  },
  {
    code: 'RATE_HIKE',
    name: 'Federal Reserve Rate Hike',
    description: 'Central bank raises benchmark interest rates. Real asset valuations compressed by 10%.',
    scope: 'global',
    defaultDurationRounds: 2,
    impact: { affectedTarget: 'all', assetValueMultiplier: 0.9 },
    probabilityWeight: 20,
  },
  {
    code: 'ENERGY_SURGE',
    name: 'Renewable CleanTech Surge',
    description: 'Global energy transition mandates spike demand for CleanTech infrastructure (+40% rent).',
    scope: 'sector',
    defaultDurationRounds: 3,
    impact: { affectedTarget: 'CleanTech Energy', rentMultiplier: 1.4 },
    probabilityWeight: 15,
  },
  {
    code: 'FINTECH_DISRUPTION',
    name: 'Fintech Payment Explosion',
    description: 'Decentralized settlement networks surge in transaction volume. Fintech assets yield +35% rent.',
    scope: 'sector',
    defaultDurationRounds: 2,
    impact: { affectedTarget: 'Fintech', rentMultiplier: 1.35 },
    probabilityWeight: 15,
  },
];

export interface MarketChoiceTemplate {
  eventId: string;
  title: string;
  subtitle: string;
  lore: string;
  options: MarketChoiceOption[];
  defaultOptionId: string;
}

export const MARKET_CHOICE_TEMPLATES: MarketChoiceTemplate[] = [
  {
    eventId: 'choice_venture_debt',
    title: 'Syndicate Growth Financing',
    subtitle: 'Venture Debt Facility vs. Non-Dilutive Innovation Grant',
    lore: 'Silicon Valley Angel Syndicate convenes an emergency board vote to structure growth capital.',
    defaultOptionId: 'opt_equity_grant',
    options: [
      {
        id: 'opt_venture_debt',
        label: 'Leveraged Venture Facility',
        description: 'Draw high-octane capital immediately to fuel rapid acquisitions.',
        effectSummary: '+180 ƁM Liquid Cash | -20 Strategy Points',
        cashDelta: 180,
        spDelta: -20,
      },
      {
        id: 'opt_equity_grant',
        label: 'Non-Dilutive Innovation Grant',
        description: 'Secure non-dilutive sovereign grant funding with pristine governance.',
        effectSummary: '+80 ƁM Liquid Cash | +25 Strategy Points',
        cashDelta: 80,
        spDelta: 25,
      },
    ],
  },
  {
    eventId: 'choice_defense_expansion',
    title: 'Corporate Portfolio Rebalancing',
    subtitle: 'Aggressive Market Expansion vs. Institutional Shield',
    lore: 'Wall Street institutional advisers propose strategic allocation directives for current holdings.',
    defaultOptionId: 'opt_institutional_shield',
    options: [
      {
        id: 'opt_sector_yield',
        label: 'Aggressive Market Expansion',
        description: 'Launch aggressive corporate marketing and capture maximum customer yield.',
        effectSummary: 'Pay 40 ƁM fee | All owned assets yield +50% rent for 2 rounds',
        cashDelta: -40,
        modifier: {
          type: 'sector_boost',
          rentMultiplier: 1.5,
          durationRounds: 2,
        },
      },
      {
        id: 'opt_institutional_shield',
        label: 'Institutional Harbor Shield',
        description: 'Erect legal defense covenants shielding your syndicate from rival attacks.',
        effectSummary: '+40 SP | Immune to hostile takeovers and regulatory fines for 3 rounds',
        spDelta: 40,
        modifier: {
          type: 'market_shield',
          durationRounds: 3,
        },
      },
    ],
  },
  {
    eventId: 'choice_tech_breakthrough',
    title: 'DeepTech Quantum Breakthrough',
    subtitle: 'Frontier AI Commercialization vs. Defensive Patent Pool',
    lore: 'Silicon Valley research labs unlock breakthrough quantum machine learning architectures.',
    defaultOptionId: 'opt_defensive_patents',
    options: [
      {
        id: 'opt_frontier_ai',
        label: 'Commercialize Frontier AI',
        description: 'Fund global deployment of autonomous models across tech infrastructure.',
        effectSummary: 'Spend 50 ƁM | Tech & AI sectors yield +60% rent for 3 rounds',
        cashDelta: -50,
        modifier: {
          type: 'sector_boost',
          sector: 'Artificial Intelligence',
          rentMultiplier: 1.6,
          durationRounds: 3,
        },
      },
      {
        id: 'opt_defensive_patents',
        label: 'Defensive Patent Licensing',
        description: 'Lock in proprietary IP rights and collect safe recurring royalty licensing.',
        effectSummary: '+50 ƁM Liquid Royalties | +35 Strategy Points',
        cashDelta: 50,
        spDelta: 35,
      },
    ],
  },
  {
    eventId: 'choice_monetary_directive',
    title: 'Central Bank Liquidity Directive',
    subtitle: 'High-Yield Syndicate Notes vs. Liquidity Treasury Buffer',
    lore: 'Federal Reserve liquidity mandates alter institutional borrowing benchmarks.',
    defaultOptionId: 'opt_liquidity_reserve',
    options: [
      {
        id: 'opt_high_yield',
        label: 'Issue High-Yield Corporate Notes',
        description: 'Capitalize on eager credit markets with institutional short-term debt.',
        effectSummary: '+200 ƁM Cash Injection | -15 Strategy Points',
        cashDelta: 200,
        spDelta: -15,
      },
      {
        id: 'opt_liquidity_reserve',
        label: 'Fortify Treasury Buffer',
        description: 'Pledge capital reserves to earn privileged discount-window interest.',
        effectSummary: '+60 ƁM Safe Coupon | +30 Strategy Points',
        cashDelta: 60,
        spDelta: 30,
      },
    ],
  },
  {
    eventId: 'choice_insider_arbitrage',
    title: 'Quantitative Market Arbitrage',
    subtitle: 'Short Squeeze Raid vs. White Knight Syndicate',
    lore: 'Algorithmic market markers flag cross-sector dislocation ripe for exploitation.',
    defaultOptionId: 'opt_white_knight',
    options: [
      {
        id: 'opt_short_catalyst',
        label: 'Execute Short Squeeze Raid',
        description: 'Trigger margin calls across extended market positions.',
        effectSummary: '+130 ƁM Arbitrage Harvest | -10 Strategy Points',
        cashDelta: 130,
        spDelta: -10,
      },
      {
        id: 'opt_white_knight',
        label: 'White Knight Syndicate Alliance',
        description: 'Backstop distressed corporate founders to build long-term alliance goodwill.',
        effectSummary: '+50 Strategy Points | +40 ƁM Partnership Fee',
        cashDelta: 40,
        spDelta: 50,
      },
    ],
  },
  {
    eventId: 'choice_cleantech_mandate',
    title: 'CleanTech Energy Transition Directive',
    subtitle: 'Carbon Credit Trading vs. Smart Grid Expansion',
    lore: 'Sovereign environmental agencies roll out expedited clean power mandates.',
    defaultOptionId: 'opt_carbon_credits',
    options: [
      {
        id: 'opt_carbon_credits',
        label: 'Carbon Offset Monetization',
        description: 'Sell excess emission credits into international compliance markets.',
        effectSummary: '+110 ƁM Clean Cash | +20 Strategy Points',
        cashDelta: 110,
        spDelta: 20,
      },
      {
        id: 'opt_clean_grid',
        label: 'Smart Grid Modernization',
        description: 'Underwrite next-gen power transmission lines for industrial tenants.',
        effectSummary: 'Pay 40 ƁM | CleanTech sector yields +75% rent for 3 rounds',
        cashDelta: -40,
        modifier: {
          type: 'sector_boost',
          sector: 'CleanTech Energy',
          rentMultiplier: 1.75,
          durationRounds: 3,
        },
      },
    ],
  },
  {
    eventId: 'choice_sovereign_alliance',
    title: 'Sovereign Wealth Syndicate Alliance',
    subtitle: 'Immediate Sovereign Dividend vs. Tactical War Chest',
    lore: 'A premier sovereign wealth delegation seeks a domestic corporate flagship partner.',
    defaultOptionId: 'opt_war_chest',
    options: [
      {
        id: 'opt_syndicate_dividend',
        label: 'Distribute Sovereign Dividend',
        description: 'Receive direct capital injection into your corporate treasury.',
        effectSummary: '+160 ƁM Sovereign Dividend | Direct Cash Inflow',
        cashDelta: 160,
      },
      {
        id: 'opt_war_chest',
        label: 'Fortify Tactical War Chest',
        description: 'Convert sovereign diplomatic standing into elite strategic capability.',
        effectSummary: '+55 Strategy Points | Strategic Warfare Reserves',
        spDelta: 55,
      },
    ],
  },
];

export function getRandomMarketChoiceTemplate(excludeId?: string): MarketChoiceTemplate {
  const filtered = excludeId
    ? MARKET_CHOICE_TEMPLATES.filter((t) => t.eventId !== excludeId)
    : MARKET_CHOICE_TEMPLATES;
  const list = filtered.length > 0 ? filtered : MARKET_CHOICE_TEMPLATES;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

