/**
 * Production TypeScript Foundation: Game, GameState, & GamePhase Contracts
 */

import { Player } from './player';
import { Auction } from './auction';
import { MarketEvent } from './marketEvent';
import { Modifier } from './modifier';

export type GameStatus =
  | 'lobby'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'abandoned';

export type GamePhase =
  | 'waiting_for_players'
  | 'turn_start'
  | 'awaiting_roll'
  | 'moving'
  | 'space_resolution'
  | 'awaiting_action'
  | 'auction_in_progress'
  | 'market_event_resolution'
  | 'turn_end'
  | 'game_over';

export interface PendingChoice {
  choiceId: string;
  targetPlayerId: string;
  choiceType: string; // e.g. 'BUY_OR_PASS', 'SELECT_TARGET', 'AUCTION_BID'
  options: Array<{
    key: string;
    label: string;
    value?: unknown;
    disabled?: boolean;
  }>;
  expiresAt: number | null;
  createdAt: number;
}

export interface GameState {
  gameId: string;
  boardId: string;
  rulesetVersion: string;
  status: GameStatus;
  currentPhase: GamePhase;
  currentPlayerId: string | null;
  turnNumber: number;
  roundNumber: number;
  stateVersion: number;
  players: Record<string, Player>;
  activeAuction: Auction | null;
  activeMarketEvents: MarketEvent[];
  activeModifiers: Modifier[];
  pendingChoices: PendingChoice[];
  createdAt: number;
  updatedAt: number;
}

export interface GameMetadata {
  id: string;
  hostUserId: string;
  title: string;
  boardId: string;
  rulesetVersion: string;
  maxPlayers: number;
  currentPlayersCount: number;
  isPrivate: boolean;
  accessCode?: string;
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
}
