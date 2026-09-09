/**
 * Production TypeScript Foundation: Transaction Contracts
 */

export type TransactionType =
  | 'start_bonus'
  | 'property_purchase'
  | 'rent_payment'
  | 'share_purchase'
  | 'share_sale'
  | 'auction_payment'
  | 'penalty_fee'
  | 'sp_purchase'
  | 'dividend_payout'
  | 'market_impact'
  | 'admin_adjustment';

export interface Transaction {
  id: string;
  gameId: string;
  turnNumber: number;
  type: TransactionType;
  fromPlayerId: string | null; // null for system/bank
  toPlayerId: string | null; // null for system/bank
  cashAmount: number;
  spAmount?: number;
  relatedAssetId?: string;
  relatedCompanyId?: string;
  description: string;
  timestamp: number;
}
