/**
 * Production Configuration Boundary: Assets Configuration
 */

export interface AssetTierRule {
  level: number;
  developmentCostRatio: number; // Multiple of baseValue to upgrade
  rentMultiplier: number; // Multiplier on baseRent
}

export interface AssetConfig {
  mortgageRatio: number; // Percentage of baseValue returned on mortgage
  unmortgageInterestRatio: number; // Extra percentage to unmortgage
  maxDevelopmentLevel: number;
  tierRules: AssetTierRule[];
}

export const defaultAssetConfig: AssetConfig = {
  mortgageRatio: 0.5,
  unmortgageInterestRatio: 0.1,
  maxDevelopmentLevel: 5,
  tierRules: [
    { level: 0, developmentCostRatio: 0, rentMultiplier: 1.0 },
    { level: 1, developmentCostRatio: 0.5, rentMultiplier: 2.5 },
    { level: 2, developmentCostRatio: 0.5, rentMultiplier: 6.0 },
    { level: 3, developmentCostRatio: 0.5, rentMultiplier: 14.0 },
    { level: 4, developmentCostRatio: 0.5, rentMultiplier: 24.0 },
    { level: 5, developmentCostRatio: 1.0, rentMultiplier: 35.0 },
  ],
};
