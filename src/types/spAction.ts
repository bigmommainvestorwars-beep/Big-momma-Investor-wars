/**
 * Production TypeScript Foundation: SPAction Contracts
 */

export type SPActionCategory = 'defensive' | 'offensive' | 'investment' | 'utility';

export interface SPAction {
  id: string;
  code: string;
  name: string;
  description: string;
  category: SPActionCategory;
  spCost: number;
  cooldownTurns: number;
  requiresTarget: boolean;
  targetType?: 'player' | 'asset' | 'space' | 'none';
  actionHandlerKey: string;
}
