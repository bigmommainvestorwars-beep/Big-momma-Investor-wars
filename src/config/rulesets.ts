/**
 * Production Configuration Boundary: Game Rules & Ruleset Versioning
 */

export interface GameRulesConfig {
  rulesetVersion: string;
  name: string;
  maxPlayers: number;
  minPlayers: number;
  turnTimeoutSeconds: number;
  startingCash: number;
  startingSP: number;
  passGoSalary: number;
  bankruptcyThreshold: number;
  maxAuctionDurationSeconds: number;
  features: {
    enableAuctions: boolean;
    enableMarketEvents: boolean;
    enableSPActions: boolean;
    enableCompanyShares: boolean;
  };
}

export interface RulesetRegistry {
  getRuleset(rulesetVersion: string): GameRulesConfig | undefined;
  registerRuleset(rules: GameRulesConfig): void;
}

class DefaultRulesetRegistry implements RulesetRegistry {
  private rulesets = new Map<string, GameRulesConfig>();

  public registerRuleset(rules: GameRulesConfig): void {
    this.rulesets.set(rules.rulesetVersion, rules);
  }

  public getRuleset(rulesetVersion: string): GameRulesConfig | undefined {
    return this.rulesets.get(rulesetVersion);
  }
}

export const rulesetRegistry = new DefaultRulesetRegistry();
