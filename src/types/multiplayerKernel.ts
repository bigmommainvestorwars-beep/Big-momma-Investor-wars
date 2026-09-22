/**
 * Authoritative Types for Clean Phase 1 Multiplayer Kernel
 */

export type MultiplayerRoomStatus = 'waiting' | 'active' | 'closed';

export interface MultiplayerRoom {
  roomId: string;
  roomCode: string;
  hostUid: string;
  status: MultiplayerRoomStatus;
  playerUids: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MultiplayerPlayer {
  uid: string;
  displayName: string;
  joinedAt: number;
  online: boolean;
}

export type MultiplayerConnectionState = 'idle' | 'authenticating' | 'ready' | 'connecting' | 'connected' | 'error';
