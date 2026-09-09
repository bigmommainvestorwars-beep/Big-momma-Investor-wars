/**
 * Production TypeScript Foundation: Player Contracts
 */

export type PlayerStatus =
  | 'active'
  | 'bankrupt'
  | 'eliminated'
  | 'disconnected'
  | 'spectating';

export interface PlayerInventory {
  cash: number;
  specialPoints: number; // SP balance
  ownedSpaceIds: string[];
  companyShareIds: string[];
  modifierIds: string[];
}

export interface Player {
  id: string; // playerId
  userId: string; // associated User uid
  displayName: string;
  avatarId: string;
  colorHex: string;
  currentSpaceIndex: number;
  status: PlayerStatus;
  inventory: PlayerInventory;
  turnOrder: number;
  netWorth: number;
  isBot: boolean;
  connected: boolean;
  lastActiveAt: number;
}
