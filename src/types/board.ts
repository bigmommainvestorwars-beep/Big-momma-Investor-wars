/**
 * Production TypeScript Foundation: Board & BoardSpace Contracts
 */

export type BoardSpaceType =
  | 'start'
  | 'property'
  | 'company'
  | 'market_event'
  | 'sp_station'
  | 'penalty'
  | 'auction'
  | 'rest';

export interface BoardSpace {
  id: string;
  index: number;
  name: string;
  type: BoardSpaceType;
  group?: string; // Grouping (e.g., color district, sector)
  baseCost?: number;
  rentTiers?: number[];
  assetId?: string;
  companyId?: string;
  description?: string;
}

export interface Board {
  id: string;
  name: string;
  version: string;
  totalSpaces: number;
  spaces: BoardSpace[];
  layoutType: 'square' | 'rect' | 'custom';
}
