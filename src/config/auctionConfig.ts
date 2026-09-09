/**
 * Production Configuration Boundary: Auctions Configuration
 */

export interface AuctionConfig {
  minBidIncrement: number;
  bidTimeoutSeconds: number;
  antiSnipeExtensionSeconds: number;
  reservePricePercent: number; // Percent of asset/item value
  maxRounds?: number;
}

export const defaultAuctionConfig: AuctionConfig = {
  minBidIncrement: 10,
  bidTimeoutSeconds: 30,
  antiSnipeExtensionSeconds: 15,
  reservePricePercent: 50,
};
