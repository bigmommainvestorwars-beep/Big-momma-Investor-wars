/**
 * Production TypeScript Foundation: GameEvent Contracts
 */

export type GameEventType =
  | 'game_created'
  | 'player_joined'
  | 'game_started'
  | 'turn_started'
  | 'dice_rolled'
  | 'player_moved'
  | 'space_landed'
  | 'asset_bought'
  | 'rent_paid'
  | 'auction_started'
  | 'bid_placed'
  | 'auction_resolved'
  | 'shares_transacted'
  | 'sp_action_cast'
  | 'market_event_triggered'
  | 'player_bankrupt'
  | 'game_ended';

export interface GameEvent {
  id: string;
  gameId: string;
  turnNumber: number;
  roundNumber: number;
  type: GameEventType;
  actorPlayerId: string | null;
  payload: Record<string, unknown>;
  timestamp: number;
}
