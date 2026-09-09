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
