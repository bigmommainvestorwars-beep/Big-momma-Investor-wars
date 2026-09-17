/**
 * Production Configuration Boundary: SP Actions Configuration
 */

import { SPAction } from '../types/spAction';

export interface SPActionConfigRegistry {
  getAction(code: string): SPAction | undefined;
  listActions(): SPAction[];
  registerAction(action: SPAction): void;
}

class DefaultSPActionRegistry implements SPActionConfigRegistry {
  private actions = new Map<string, SPAction>();

  public registerAction(action: SPAction): void {
    this.actions.set(action.code, action);
  }

  public getAction(code: string): SPAction | undefined {
    return this.actions.get(code);
  }

  public listActions(): SPAction[] {
    return Array.from(this.actions.values());
  }
}

export const spActionRegistry = new DefaultSPActionRegistry();

export const DEFAULT_SP_ACTIONS: SPAction[] = [
  {
    id: 'sp_liquidity_injection',
    code: 'LIQUIDITY_INJECTION',
    name: 'Strategic Liquidity Injection',
    description: 'Convert 25 Strategy Points (SP) into 75 ƁM emergency working capital cash infusion directly into corporate treasury.',
    category: 'utility',
    spCost: 25,
    cooldownTurns: 1,
    requiresTarget: false,
    actionHandlerKey: 'strategic_liquidity',
  },
  {
    id: 'sp_market_scan',
    code: 'MARKET_SCAN',
    name: 'Syndicate Market Intelligence',
    description: 'Deploy 35 Strategy Points (SP) to analyze indicators and activate yield multiplier perks across all corporate holdings.',
    category: 'investment',
    spCost: 35,
    cooldownTurns: 2,
    requiresTarget: false,
    actionHandlerKey: 'market_intelligence',
  },
  {
    id: 'sp_regulatory_shield',
    code: 'REGULATORY_SHIELD',
    name: 'Regulatory Harbor Shield',
    description: 'Deploy 30 Strategy Points (SP) into legal contingency reserves, shielding your corporation against regulatory penalties.',
    category: 'defensive',
    spCost: 30,
    cooldownTurns: 2,
    requiresTarget: false,
    actionHandlerKey: 'regulatory_shield',
  },
  {
    id: 'sp_hostile_takeover',
    code: 'HOSTILE_TAKEOVER',
    name: 'Hostile Takeover Bid',
    description: 'Deploy 50 Strategy Points (SP) and 1.5x valuation to forcibly acquire an un-monopolized target property from a rival.',
    category: 'offensive',
    spCost: 50,
    cooldownTurns: 3,
    requiresTarget: true,
    targetType: 'space',
    actionHandlerKey: 'hostile_takeover',
  },
  {
    id: 'sp_patent_freeze',
    code: 'PATENT_FREEZE',
    name: 'Patent Injunction Freeze',
    description: 'Spend 35 Strategy Points (SP) to freeze a rival property sector, suspending rent collection for 2 rounds.',
    category: 'offensive',
    spCost: 35,
    cooldownTurns: 2,
    requiresTarget: true,
    targetType: 'space',
    actionHandlerKey: 'patent_freeze',
  },
  {
    id: 'sp_short_attack',
    code: 'SHORT_ATTACK',
    name: 'Short Seller Raid',
    description: 'Spend 40 Strategy Points (SP) to orchestrate a short squeeze, penalizing target rival 150 ƁM in liquid margin calls.',
    category: 'offensive',
    spCost: 40,
    cooldownTurns: 3,
    requiresTarget: true,
    targetType: 'player',
    actionHandlerKey: 'short_attack',
  },
];

for (const act of DEFAULT_SP_ACTIONS) {
  spActionRegistry.registerAction(act);
}

