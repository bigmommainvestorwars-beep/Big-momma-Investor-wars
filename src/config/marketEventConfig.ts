/**
 * Production Configuration Boundary: Market Events Configuration
 */

import { MarketEventScope, MarketImpact } from '../types/marketEvent';

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

for (const event of DEFAULT_MARKET_EVENTS) {
  marketEventRegistry.registerEventDefinition(event);
}

