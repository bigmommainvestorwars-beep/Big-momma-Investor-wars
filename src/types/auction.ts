/**
 * Production TypeScript Foundation: Auction & Bid Contracts
 */

export type AuctionStatus = 'pending' | 'active' | 'passed' | 'completed' | 'cancelled';
export type AuctionItemType = 'asset' | 'shares' | 'special_card' | 'debt_relief';

export interface Bid {
  bidId: string;
  auctionId: string;
  playerId: string;
  amount: number;
  timestamp: number;
}

export interface Auction {
  id: string;
  gameId: string;
  itemType: AuctionItemType;
  targetItemId: string;
  startingPrice: number;
  currentHighestBid: number;
  currentLeaderPlayerId: string | null;
  status: AuctionStatus;
  bids: Bid[];
  eligiblePlayerIds: string[];
  passedPlayerIds: string[];
  turnExpiryTimestamp: number;
  createdAt: number;
  resolvedAt: number | null;
}
