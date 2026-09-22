/**
 * Clean Phase 1 Multiplayer Kernel Service
 * 
 * Rules & Constraints:
 * 1. Player identity is EXCLUSIVELY auth.currentUser.uid from Firebase Auth Anonymous Sign-In.
 * 2. Room documents reside authoritatively under /multiplayerRooms/{roomId}.
 * 3. Player documents reside authoritatively under /multiplayerRooms/{roomId}/players/{uid}.
 * 4. Real-time updates utilize direct Firestore onSnapshot() listeners with clean unsubscribe handlers.
 * 5. Atomic mutations via writeBatch or runTransaction.
 */

import {
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
  Unsubscribe as AuthUnsubscribe,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase/config';
import { MultiplayerPlayer, MultiplayerRoom } from '../../types/multiplayerKernel';

/**
 * Generates a short, human-friendly 6-character room code.
 * Excludes easily confusable characters (0, O, 1, I).
 */
function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class MultiplayerKernelService {
  /**
   * Subscribes to Firebase Auth state.
   */
  public onAuthChange(callback: (user: FirebaseUser | null) => void): AuthUnsubscribe {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Ensures an active Anonymous Firebase Auth session exists.
   * Returns the authentic Firebase Auth UID.
   */
  public async ensureAnonymousAuth(): Promise<string> {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      return auth.currentUser.uid;
    }

    const credential = await signInAnonymously(auth);
    if (!credential.user || !credential.user.uid) {
      throw new Error('Firebase Anonymous Authentication failed: No UID returned.');
    }
    return credential.user.uid;
  }

  /**
   * Retrieves the current authenticated Firebase UID or throws.
   */
  public getRequiredUid(): string {
    const auth = getFirebaseAuth();
    if (!auth.currentUser || !auth.currentUser.uid) {
      throw new Error('Multiplayer action rejected: Firebase Authentication is not ready.');
    }
    return auth.currentUser.uid;
  }

  /**
   * Atomically creates a multiplayer room and registers the host as the first player.
   */
  public async createRoom(customDisplayName?: string): Promise<{ room: MultiplayerRoom; player: MultiplayerPlayer }> {
    const uid = this.getRequiredUid();
    const db = getFirebaseFirestore();

    const roomCollectionRef = collection(db, 'multiplayerRooms');
    const newRoomDocRef = doc(roomCollectionRef);
    const roomId = newRoomDocRef.id;
    const roomCode = generateRoomCode();
    const now = Date.now();

    const roomData: MultiplayerRoom = {
      roomId,
      roomCode,
      hostUid: uid,
      status: 'waiting',
      playerUids: [uid],
      createdAt: now,
      updatedAt: now,
    };

    const displayName = customDisplayName?.trim() || `Player_${uid.slice(0, 5)}`;

    const hostPlayerData: MultiplayerPlayer = {
      uid,
      displayName,
      joinedAt: now,
      online: true,
    };

    const hostPlayerDocRef = doc(db, 'multiplayerRooms', roomId, 'players', uid);

    // Atomic write batch
    const batch = writeBatch(db);
    batch.set(newRoomDocRef, roomData);
    batch.set(hostPlayerDocRef, hostPlayerData);

    await batch.commit();

    return {
      room: roomData,
      player: hostPlayerData,
    };
  }

  /**
   * Joins an existing multiplayer room using its human-readable room code.
   * Resolves room, validates joinability, and atomically adds player using Firestore transaction.
   */
  public async joinRoom(roomCodeInput: string, customDisplayName?: string): Promise<{ roomId: string; player: MultiplayerPlayer }> {
    const uid = this.getRequiredUid();
    const db = getFirebaseFirestore();
    const sanitizedCode = roomCodeInput.trim().toUpperCase();

    if (!sanitizedCode) {
      throw new Error('Please enter a valid room code.');
    }

    // 1. Resolve room code
    const roomsRef = collection(db, 'multiplayerRooms');
    const q = query(roomsRef, where('roomCode', '==', sanitizedCode), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(`Room with code "${sanitizedCode}" not found.`);
    }

    const roomDocSnapshot = snapshot.docs[0];
    const roomId = roomDocSnapshot.id;
    const roomDocRef = doc(db, 'multiplayerRooms', roomId);
    const playerDocRef = doc(db, 'multiplayerRooms', roomId, 'players', uid);

    const displayName = customDisplayName?.trim() || `Player_${uid.slice(0, 5)}`;
    const now = Date.now();

    const playerData: MultiplayerPlayer = {
      uid,
      displayName,
      joinedAt: now,
      online: true,
    };

    // 2. Atomic transaction to verify room state and add player
    await runTransaction(db, async (transaction) => {
      const currentRoomDoc = await transaction.get(roomDocRef);
      if (!currentRoomDoc.exists()) {
        throw new Error('Room does not exist.');
      }

      const roomData = currentRoomDoc.data() as MultiplayerRoom;
      if (roomData.status === 'closed') {
        throw new Error('This room has been closed.');
      }

      const currentUids: string[] = Array.isArray(roomData.playerUids) ? roomData.playerUids : [];
      if (!currentUids.includes(uid)) {
        currentUids.push(uid);
      }

      transaction.update(roomDocRef, {
        playerUids: currentUids,
        updatedAt: now,
      });

      transaction.set(playerDocRef, playerData, { merge: true });
    });

    return {
      roomId,
      player: playerData,
    };
  }

  /**
   * Leaves a room cleanly.
   * Updates player's online status or removes them and cleans up room state.
   */
  public async leaveRoom(roomId: string): Promise<void> {
    const uid = this.getRequiredUid();
    const db = getFirebaseFirestore();

    const roomDocRef = doc(db, 'multiplayerRooms', roomId);
    const playerDocRef = doc(db, 'multiplayerRooms', roomId, 'players', uid);

    try {
      await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomDocRef);
        if (!roomDoc.exists()) return;

        const roomData = roomDoc.data() as MultiplayerRoom;
        const currentUids = (roomData.playerUids || []).filter((id) => id !== uid);

        // If no players remain or host leaves, room status can be closed
        const newStatus = currentUids.length === 0 ? 'closed' : roomData.status;

        transaction.update(roomDocRef, {
          playerUids: currentUids,
          status: newStatus,
          updatedAt: Date.now(),
        });

        transaction.update(playerDocRef, {
          online: false,
        });
      });
    } catch (error) {
      // If transaction failed because doc was deleted, just try setting online false
      try {
        await updateDoc(playerDocRef, { online: false });
      } catch {
        // Doc already gone or inaccessible
      }
      throw error;
    }
  }

  /**
   * Subscribes to direct authoritative room updates via onSnapshot.
   */
  public subscribeToRoom(
    roomId: string,
    onRoomUpdate: (room: MultiplayerRoom | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const db = getFirebaseFirestore();
    const roomDocRef = doc(db, 'multiplayerRooms', roomId);

    return onSnapshot(
      roomDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onRoomUpdate(null);
          return;
        }
        const data = docSnap.data() as MultiplayerRoom;
        onRoomUpdate(data);
      },
      (err) => {
        onError(err);
      }
    );
  }

  /**
   * Subscribes to the room's players subcollection in real time via onSnapshot.
   */
  public subscribeToPlayers(
    roomId: string,
    onPlayersUpdate: (players: MultiplayerPlayer[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const db = getFirebaseFirestore();
    const playersColRef = collection(db, 'multiplayerRooms', roomId, 'players');

    return onSnapshot(
      playersColRef,
      (snapshot) => {
        const players: MultiplayerPlayer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MultiplayerPlayer;
          players.push(data);
        });
        // Sort players by joinedAt timestamp ascending
        players.sort((a, b) => a.joinedAt - b.joinedAt);
        onPlayersUpdate(players);
      },
      (err) => {
        onError(err);
      }
    );
  }
}

export const multiplayerKernelService = new MultiplayerKernelService();
