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
    name: 'Liquidity Injection',
    description: 'Exchange 20 Strategy Points (SP) for an immediate $75 emergency working capital cash infusion.',
    category: 'utility',
    spCost: 20,
    cooldownTurns: 1,
    requiresTarget: false,
    actionHandlerKey: 'bonus_liquidity',
  },
  {
    id: 'sp_capital_surge',
    code: 'CAPITAL_SURGE',
    name: 'Capital Surge',
    description: 'Deploy 35 Strategy Points (SP) to stimulate market demand and inject $150 venture capital into treasury.',
    category: 'investment',
    spCost: 35,
    cooldownTurns: 2,
    requiresTarget: false,
    actionHandlerKey: 'capital_surge',
  },
  {
    id: 'sp_market_scan',
    code: 'MARKET_SCAN',
    name: 'Market Intelligence Scan',
    description: 'Use 25 Strategy Points (SP) to analyze economic indicators and draw an advantageous Market Event.',
    category: 'offensive',
    spCost: 25,
    cooldownTurns: 2,
    requiresTarget: false,
    actionHandlerKey: 'market_scan',
  },
];

for (const act of DEFAULT_SP_ACTIONS) {
  spActionRegistry.registerAction(act);
}

