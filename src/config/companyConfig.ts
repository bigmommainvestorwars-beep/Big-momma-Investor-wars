/**
 * Production Configuration Boundary: Companies Configuration
 */

import { CompanyTier } from '../types/company';

export interface CompanyTemplateConfig {
  id: string;
  name: string;
  sector: string;
  tier: CompanyTier;
  initialTotalShares: number;
  initialSharePrice: number;
  baseDividendYield: number;
  volatility: number;
  description: string;
}

export interface CompanyConfigRegistry {
  getCompanyTemplate(id: string): CompanyTemplateConfig | undefined;
  listCompanyTemplates(): CompanyTemplateConfig[];
  registerCompanyTemplate(template: CompanyTemplateConfig): void;
}

class DefaultCompanyRegistry implements CompanyConfigRegistry {
  private templates = new Map<string, CompanyTemplateConfig>();

  public registerCompanyTemplate(template: CompanyTemplateConfig): void {
    this.templates.set(template.id, template);
  }

  public getCompanyTemplate(id: string): CompanyTemplateConfig | undefined {
    return this.templates.get(id);
  }

  public listCompanyTemplates(): CompanyTemplateConfig[] {
    return Array.from(this.templates.values());
  }
}

export const companyRegistry = new DefaultCompanyRegistry();
