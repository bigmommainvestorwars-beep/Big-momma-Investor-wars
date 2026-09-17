/**
 * Production TypeScript Foundation: MarketEvent Contracts
 */

export type MarketEventScope = 'global' | 'sector' | 'target_player' | 'asset_class';

export interface MarketImpact {
  affectedTarget: string; // e.g. 'all', sector name, playerId
  assetValueMultiplier?: number;
  rentMultiplier?: number;
  taxRateDelta?: number;
  sharePriceDeltaPercent?: number;
}

export interface MarketEvent {
  id: string;
  name: string;
  code: string;
  description: string;
  scope: MarketEventScope;
  impact: MarketImpact;
  durationRounds: number;
  roundsRemaining: number;
  activatedAtTurn: number;
  active: boolean;
}

export interface MarketChoiceModifier {
  type: 'sector_boost' | 'market_shield' | 'dividend_surge' | 'rate_discount' | 'patent_freeze';
  sector?: string;
  rentMultiplier?: number;
  durationRounds: number;
}

export interface MarketChoiceOption {
  id: string;
  label: string;
  description: string;
  effectSummary: string;
  cashDelta?: number; // ƁM delta
  spDelta?: number;   // SP delta
  modifier?: MarketChoiceModifier;
}

export interface PendingMarketChoiceDoc {
  id: string;
  eventId: string;
  playerId: string;
  spaceIndex: number;
  title: string;
  subtitle: string;
  lore: string;
  options: MarketChoiceOption[];
  expiresAt: number;
}
