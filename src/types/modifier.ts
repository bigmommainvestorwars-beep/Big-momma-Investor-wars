/**
 * Production TypeScript Foundation: Modifier Contracts
 */

export type ModifierTargetType = 'player' | 'asset' | 'company' | 'board_space';

export interface Modifier {
  id: string;
  name: string;
  description: string;
  sourceType: 'sp_card' | 'market_event' | 'board_tile' | 'perk';
  targetType: ModifierTargetType;
  targetId: string;
  attribute: string; // e.g. 'rent_immunity', 'double_rent', 'tax_shield'
  effectValue: number;
  durationTurns: number;
  turnsRemaining: number;
  isExpired: boolean;
  appliedAtTimestamp: number;
}
