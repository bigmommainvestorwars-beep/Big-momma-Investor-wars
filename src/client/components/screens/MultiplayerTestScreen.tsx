/**
 * Diagnostic Multiplayer Test Screen (Phase 1 Kernel Only)
 * 
 * Verifies that two physical devices can:
 * 1. Authenticate with Firebase anonymously & receive authentic Firebase Auth UID.
 * 2. Create an authoritative room in Firestore.
 * 3. Join the same room using room code from another device.
 * 4. See real-time presence & player list via direct onSnapshot() listeners.
 * 5. Leave the room cleanly with listener unsubscribes.
 */

import React, { useState } from 'react';
import { useMultiplayerKernel } from '../../context/MultiplayerKernelContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  Users,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  LogOut,
  PlusCircle,
  LogIn,
  AlertTriangle,
  Server,
  UserCheck,
} from 'lucide-react';

export const MultiplayerTestScreen: React.FC = () => {
  const {
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
  } = useMultiplayerKernel();

  const { navigate } = useNavigation();

  const [inputCode, setInputCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreate = async () => {
    await createRoom(displayName || undefined);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    await joinRoom(inputCode.trim(), displayName || undefined);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('HOME')}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Main Menu
            </button>
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase text-emerald-400 flex items-center gap-2">
                <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
                Multiplayer Kernel — Diagnostic Console
              </h1>
              <p className="text-xs text-slate-400 font-mono">Phase 1: Real-Time Firebase Auth & Firestore Synchronization</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                connectionState === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : connectionState === 'connecting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : connectionState === 'ready'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : connectionState === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : connectionState === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : connectionState === 'ready'
                    ? 'bg-cyan-400'
                    : 'bg-rose-400'
                }`}
              />
              State: {connectionState}
            </span>
          </div>
        </div>

        {/* Error Alert Box */}
        {rawError && (
          <div className="p-4 bg-rose-950/60 border border-rose-600/50 rounded-xl flex items-start justify-between gap-3 text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-rose-300">Firestore / Auth Diagnostic Error</div>
                <div className="font-mono text-xs mt-1 break-all select-all">{rawError}</div>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-xs text-rose-400 hover:text-white px-2 py-1 rounded bg-rose-900/50 border border-rose-700/50 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Grid: Auth Status & Device Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Firebase Auth Identity */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tracking-wider uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Firebase Auth Identity
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md ${
                  authReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {authReady ? 'AUTHENTICATED' : 'NOT READY'}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="text-slate-400">auth.currentUser.uid:</div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-emerald-300 select-all break-all">
                {authReady && firebaseUid ? firebaseUid : <span className="text-slate-500 italic">Connecting to multiplayer...</span>}
              </div>
            </div>

            {!authReady && (
              <button
                onClick={ensureAuth}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Firebase Auth Connection
              </button>
            )}
          </div>

          {/* Box 2: Player Profile / Display Name */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tracking-wider uppercase">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              Local Device Player Label
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Display Name (stored on player doc):</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={firebaseUid ? `Player_${firebaseUid.slice(0, 5)}` : 'Enter player name...'}
                disabled={Boolean(room)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500">
                {room ? 'In active room. Leave room to edit.' : 'Default: Player_ + first 5 chars of Firebase UID'}
              </p>
            </div>
          </div>
        </div>

        {/* Room Controls (When Not in a Room) */}
        {!room && (
          <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-6">
            <div className="text-sm font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
              <Server className="w-4 h-4 text-indigo-400" />
              Multiplayer Room Actions
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Create Room */}
              <div className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Host New Room</div>
                  <p className="text-xs text-slate-400">
                    Creates an authoritative room document on Firestore & registers your Firebase UID as host.
                  </p>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!authReady || isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  {isLoading ? 'Creating Room...' : 'CREATE ROOM'}
                </button>
              </div>

              {/* Option B: Join Room */}
              <form onSubmit={handleJoin} className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-cyan-400 uppercase tracking-wide">Join Existing Room</div>
                  <p className="text-xs text-slate-400">
                    Enter room code shown on host device to register your Firebase UID in real-time.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-char Room Code"
                    maxLength={10}
                    className="w-full px-3.5 py-3 bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold tracking-widest text-center uppercase text-base rounded-xl focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!authReady || !inputCode.trim() || isLoading}
                    className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    {isLoading ? 'Joining...' : 'JOIN ROOM'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Room Active Display (When in a Room) */}
        {room && (
          <div className="space-y-6">
            {/* Room Document State */}
            <div className="p-6 bg-slate-900/90 border border-emerald-500/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Authoritative Room State (/multiplayerRooms/{room.roomId})
                  </span>
                </div>
                <button
                  onClick={leaveRoom}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  LEAVE ROOM
                </button>
              </div>

              {/* Room Code Showcase */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Share this Room Code with Device 2:</div>
                  <div className="text-3xl font-black font-mono tracking-widest text-emerald-300 mt-1">{room.roomCode}</div>
                </div>
                <button
                  onClick={() => handleCopyCode(room.roomCode)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? 'COPIED!' : 'COPY CODE'}
                </button>
              </div>

              {/* Room Document Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase">Room ID</div>
                  <div className="text-slate-300 truncate select-all mt-1">{room.roomId}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase">Host UID</div>
                  <div className="text-slate-300 truncate select-all mt-1">
                    {room.hostUid === firebaseUid ? `${room.hostUid} (YOU)` : room.hostUid}
                  </div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase">Status</div>
                  <div className="text-emerald-400 font-bold uppercase mt-1">{room.status}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase">Participant UIDs Count</div>
                  <div className="text-cyan-300 font-bold mt-1">{room.playerUids?.length || 0} Player(s)</div>
                </div>
              </div>
            </div>

            {/* Players Subcollection Real-Time Presence */}
            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 tracking-wider uppercase">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Real-Time Players Collection (/players) — Direct onSnapshot()
                </div>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  {players.length} Active Connected
                </span>
              </div>

              {players.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  Listening for players through onSnapshot()...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {players.map((p, idx) => {
                    const isCurrentUser = p.uid === firebaseUid;
                    const isHost = p.uid === room.hostUid;

                    return (
                      <div
                        key={p.uid}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrentUser
                            ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-950/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center font-mono border border-slate-700">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {p.displayName}
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                                    YOU
                                  </span>
                                )}
                                {isHost && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                    HOST
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 select-all truncate max-w-[200px]">
                                {p.uid}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                p.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            <span
                              className={`text-[10px] font-mono font-bold uppercase ${
                                p.online ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {p.online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>Joined:</span>
                          <span>{new Date(p.joinedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
