/**
 * Production TypeScript Foundation: Asset Contracts
 */

export type AssetType = 'real_estate' | 'infrastructure' | 'utility' | 'franchise';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  baseValue: number;
  currentValue: number;
  currentRent: number;
  ownerPlayerId: string | null;
  developmentLevel: number; // Tier of improvements
  isMortgaged: boolean;
  associatedSpaceId: string;
  metadata?: Record<string, unknown>;
}
