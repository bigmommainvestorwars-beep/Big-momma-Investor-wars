/**
 * Clean Phase 1 Multiplayer Kernel Context
 * 
 * Provides authentic Firebase Anonymous Auth identity and real-time
 * room / player state synchronized directly via Firestore onSnapshot().
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  MultiplayerRoom,
  MultiplayerPlayer,
  MultiplayerConnectionState,
} from '../../types/multiplayerKernel';
import { multiplayerKernelService } from '../../services/multiplayer/multiplayerKernelService';
import { Unsubscribe } from 'firebase/firestore';

interface MultiplayerKernelContextValue {
  authReady: boolean;
  firebaseUid: string | null;
  room: MultiplayerRoom | null;
  players: MultiplayerPlayer[];
  isLoading: boolean;
  connectionState: MultiplayerConnectionState;
  rawError: string | null;
  createRoom: (displayName?: string) => Promise<void>;
  joinRoom: (roomCode: string, displayName?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
  ensureAuth: () => Promise<void>;
}

const MultiplayerKernelContext = createContext<MultiplayerKernelContextValue | undefined>(undefined);

export const MultiplayerKernelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<MultiplayerConnectionState>('idle');
  const [rawError, setRawError] = useState<string | null>(null);

  const roomUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const playersUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);

  // Cleans up all active Firestore listeners
  const cleanupListeners = useCallback(() => {
    if (roomUnsubscribeRef.current) {
      roomUnsubscribeRef.current();
      roomUnsubscribeRef.current = null;
    }
    if (playersUnsubscribeRef.current) {
      playersUnsubscribeRef.current();
      playersUnsubscribeRef.current = null;
    }
    activeRoomIdRef.current = null;
  }, []);

  // Initializes real Firebase Anonymous Auth listener
  const ensureAuth = useCallback(async () => {
    try {
      setConnectionState('authenticating');
      setRawError(null);
      const uid = await multiplayerKernelService.ensureAnonymousAuth();
      setFirebaseUid(uid);
      setAuthReady(true);
      setConnectionState('ready');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRawError(`Firebase Auth Error: ${msg}`);
      setConnectionState('error');
      setAuthReady(false);
      setFirebaseUid(null);
    }
  }, []);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribeAuth = multiplayerKernelService.onAuthChange((user) => {
      if (user) {
        setFirebaseUid(user.uid);
        setAuthReady(true);
        setConnectionState((prev) => (prev === 'connected' ? 'connected' : 'ready'));
      } else {
        // Automatically request anonymous sign-in to establish authentic Firebase UID
        ensureAuth();
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupListeners();
    };
  }, [ensureAuth, cleanupListeners]);

  // Subscribes to room document and players collection in real time
  const attachRoomListeners = useCallback(
    (roomId: string) => {
      cleanupListeners();
      activeRoomIdRef.current = roomId;
      setConnectionState('connecting');

      // 1. Direct onSnapshot for room document
      const unsubRoom = multiplayerKernelService.subscribeToRoom(
        roomId,
        (updatedRoom) => {
          if (!updatedRoom) {
            setRoom(null);
            setPlayers([]);
            setConnectionState('ready');
            return;
          }
          setRoom(updatedRoom);
          setConnectionState('connected');
        },
        (err) => {
          setRawError(`Firestore Room Listener Error: ${err.message}`);
          setConnectionState('error');
        }
      );
      roomUnsubscribeRef.current = unsubRoom;

      // 2. Direct onSnapshot for players subcollection
      const unsubPlayers = multiplayerKernelService.subscribeToPlayers(
        roomId,
        (updatedPlayers) => {
          setPlayers(updatedPlayers);
        },
        (err) => {
          setRawError(`Firestore Players Listener Error: ${err.message}`);
          setConnectionState('error');
        }
      );
      playersUnsubscribeRef.current = unsubPlayers;
    },
    [cleanupListeners]
  );

  const createRoom = useCallback(
    async (displayName?: string) => {
      if (!authReady || !firebaseUid) {
        setRawError('Cannot create room: Firebase Auth is not ready.');
        return;
      }

      setIsLoading(true);
      setRawError(null);
      try {
        const { room: createdRoom } = await multiplayerKernelService.createRoom(displayName);
        attachRoomListeners(createdRoom.roomId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setRawError(`Create Room Error: ${msg}`);
        setConnectionState('error');
      } finally {
        setIsLoading(false);
      }
    },
    [authReady, firebaseUid, attachRoomListeners]
  );

  const joinRoom = useCallback(
    async (roomCode: string, displayName?: string) => {
      if (!authReady || !firebaseUid) {
        setRawError('Cannot join room: Firebase Auth is not ready.');
        return;
      }

      setIsLoading(true);
      setRawError(null);
      try {
        const { roomId } = await multiplayerKernelService.joinRoom(roomCode, displayName);
        attachRoomListeners(roomId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setRawError(`Join Room Error: ${msg}`);
        setConnectionState('error');
      } finally {
        setIsLoading(false);
      }
    },
    [authReady, firebaseUid, attachRoomListeners]
  );

  const leaveRoom = useCallback(async () => {
    const currentRoomId = activeRoomIdRef.current;
    cleanupListeners();
    setRoom(null);
    setPlayers([]);
    setConnectionState('ready');

    if (currentRoomId) {
      try {
        await multiplayerKernelService.leaveRoom(currentRoomId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setRawError(`Leave Room Notice: ${msg}`);
      }
    }
  }, [cleanupListeners]);

  const clearError = useCallback(() => {
    setRawError(null);
  }, []);

  return (
    <MultiplayerKernelContext.Provider
      value={{
        authReady,
        firebaseUid,
        room,
        players,
        isLoading,
        connectionState,
        rawError,
        createRoom,
        joinRoom,
        leaveRoom,
        clearError,
        ensureAuth,
      }}
    >
      {children}
    </MultiplayerKernelContext.Provider>
  );
};

export const useMultiplayerKernel = () => {
  const context = useContext(MultiplayerKernelContext);
  if (!context) {
    throw new Error('useMultiplayerKernel must be used within a MultiplayerKernelProvider');
  }
  return context;
};
