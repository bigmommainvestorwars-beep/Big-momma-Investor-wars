/**
 * Production TypeScript Foundation: Company Contracts
 */

export type CompanyTier = 'startup' | 'growth' | 'blue_chip' | 'conglomerate';

export interface CompanyShare {
  companyId: string;
  sharesOwned: number;
  averageBuyPrice: number;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  tier: CompanyTier;
  totalShares: number;
  availableShares: number;
  sharePrice: number;
  dividendYield: number; // Percentage yield per round
  volatility: number;
  description: string;
  shareholders: Record<string, number>; // playerId -> count
}
