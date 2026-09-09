/**
 * Centralized Currency & Resource Formatting for BIG MOMMA: INVESTORS' WAR
 * ƁM strictly means: BIG MOMMA'S CURRENCY
 * Enforces production currency standard: ƁM (no $, USD, ₦, or "Billion Marks")
 * Strategy Points: SP
 */

export const CURRENCY_SYMBOL = 'ƁM';
export const CURRENCY_NAME = "Big Momma's Currency";
export const GAME_CURRENCY_SYMBOL = CURRENCY_SYMBOL;
export const GAME_CURRENCY_NAME = CURRENCY_NAME;
export const RESOURCE_NAME = 'Strategy Points (SP)';

export function formatBM(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 ƁM';
  }
  return `${Math.round(amount).toLocaleString()} ƁM`;
}

export function formatSP(sp: number | undefined | null): string {
  if (sp === undefined || sp === null || isNaN(sp)) {
    return '0 SP';
  }
  return `${Math.round(sp).toLocaleString()} SP`;
}

/**
 * Sanitizes legacy currency strings (e.g. "$500", "USD 100", "₦200") to standard ƁM representation
 */
export function sanitizeCurrencyDisplay(text: string): string {
  if (!text) return '0 ƁM';
  const numericStr = text.replace(/[^0-9.-]/g, '');
  const num = parseFloat(numericStr);
  if (isNaN(num)) return text;
  return formatBM(num);
}
