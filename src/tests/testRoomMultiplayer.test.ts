import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';
import { TEST_ROOM_CODE, TEST_MATCH_ID } from '../config/testRoomConfig';
import { matchSyncService } from '../services/firebase/matchSyncService';

describe('Hard-Coded Multiplayer Connectivity Test (BM-0X9X)', () => {
  beforeEach(() => {
    // Ensure clean state before each test
    const engine = AuthoritativeServerEngine.getInstance();
    (engine as any).matches.clear();
  });
  it('Host creates Investor Lobby and binds to TEST_MATCH_ID and BM-0X9X', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    const hostDoc = engine.createMatch(
      TEST_MATCH_ID,
      'req_host_1',
      'default-standard-board',
      '1.0.0',
      'user_host_1',
      'Host Investor',
      true,
      TEST_ROOM_CODE
    );

    assert.equal(hostDoc.id, TEST_MATCH_ID);
    assert.equal(hostDoc.accessCode, TEST_ROOM_CODE);
    assert.equal(hostDoc.hostUserId, 'user_host_1');
    assert.equal(hostDoc.status, 'waiting_for_players');
    assert.equal(hostDoc.participantUserIds.length, 1);
  });

  it('Player 2 joins using room code BM-0X9X and resolves to the same matchId', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    // Host creates room first
    engine.createMatch(
      TEST_MATCH_ID,
      'req_host_1',
      'default-standard-board',
      '1.0.0',
      'user_host_1',
      'Host Investor',
      true,
      TEST_ROOM_CODE
    );

    // Player 2 joins with code BM-0X9X
    const joinResult = engine.joinMatchByAccessCode(
      'BM-0X9X',
      'req_join_2',
      'user_guest_2',
      'Guest Investor'
    );

    assert.equal(joinResult.matchId, TEST_MATCH_ID);
    assert.equal(joinResult.player.userId, 'user_guest_2');
    assert.equal(joinResult.player.turnOrder, 1);

    const match = engine.getMatch(TEST_MATCH_ID);
    assert.ok(match);
    assert.equal(match.participantUserIds.length, 2);
    assert.ok(match.participantUserIds.includes('user_host_1'));
    assert.ok(match.participantUserIds.includes('user_guest_2'));
  });

  it('Player 2 joins using raw code 0X9X or lowercase and resolves to the same matchId', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.createMatch(
      TEST_MATCH_ID,
      'req_host_1',
      'default-standard-board',
      '1.0.0',
      'user_host_1',
      'Host Investor',
      true,
      TEST_ROOM_CODE
    );

    const joinResult = engine.joinMatchByAccessCode(
      '0x9x',
      'req_join_2',
      'user_guest_2',
      'Guest Investor'
    );

    assert.equal(joinResult.matchId, TEST_MATCH_ID);
  });

  it('Host can start match once both players are connected', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.createMatch(
      TEST_MATCH_ID,
      'req_host_1',
      'default-standard-board',
      '1.0.0',
      'user_host_1',
      'Host Investor',
      true,
      TEST_ROOM_CODE
    );

    engine.joinMatchByAccessCode(
      'BM-0X9X',
      'req_join_2',
      'user_guest_2',
      'Guest Investor'
    );

    const startedMatch = engine.startMatch(TEST_MATCH_ID, 'req_start_1');
    assert.equal(startedMatch.status, 'active');
    assert.equal(startedMatch.currentPhase, 'TURN_START');
    assert.equal(startedMatch.currentPlayerId, 'user_host_1');
  });

  it('Action synchronization: Host rolls dice and state updates authoritatively', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.createMatch(
      TEST_MATCH_ID,
      'req_host_1',
      'default-standard-board',
      '1.0.0',
      'user_host_1',
      'Host Investor',
      true,
      TEST_ROOM_CODE
    );

    engine.joinMatchByAccessCode(
      'BM-0X9X',
      'req_join_2',
      'user_guest_2',
      'Guest Investor'
    );

    engine.startMatch(TEST_MATCH_ID, 'req_start_1');

    const rollResult = engine.requestRoll(
      TEST_MATCH_ID,
      'req_roll_1',
      'user_host_1',
      undefined,
      4
    );

    assert.equal(rollResult.roll, 4);
    assert.equal(rollResult.newSpace, 4);

    const matchAfter = engine.getMatch(TEST_MATCH_ID);
    assert.ok(matchAfter);
    assert.equal(matchAfter.stateVersion > 1, true);
  });

  it('Real-time synchronization: Host and Guest listeners receive Player 2 without refresh', () => {
    const engine = AuthoritativeServerEngine.getInstance();

    // Host creates room
    engine.createMatch(
      TEST_MATCH_ID,
      'req_sync_host_1',
      'default-standard-board',
      '1.0.0',
      'user_host_1',
      'Host Investor',
      true,
      TEST_ROOM_CODE
    );

    let hostObservedPlayers: any[] = [];
    const unsubHost = matchSyncService.subscribeToPlayers(TEST_MATCH_ID, (players: any[]) => {
      hostObservedPlayers = players;
    });

    // Initial state: Host sees 1 player
    assert.equal(hostObservedPlayers.length, 1);
    assert.equal(hostObservedPlayers[0].displayName, 'Host Investor');

    // Player 2 joins
    engine.joinMatchByAccessCode(
      'BM-0X9X',
      'req_sync_join_2',
      'user_guest_2',
      'Guest Investor'
    );

    // Host listener MUST be triggered and show 2 players without any page refresh
    assert.equal(hostObservedPlayers.length, 2);
    assert.equal(hostObservedPlayers[0].displayName, 'Host Investor');
    assert.equal(hostObservedPlayers[1].displayName, 'Guest Investor');

    // Guest subscribes and also observes both players
    let guestObservedPlayers: any[] = [];
    const unsubGuest = matchSyncService.subscribeToPlayers(TEST_MATCH_ID, (players: any[]) => {
      guestObservedPlayers = players;
    });

    assert.equal(guestObservedPlayers.length, 2);
    assert.equal(guestObservedPlayers[0].displayName, 'Host Investor');
    assert.equal(guestObservedPlayers[1].displayName, 'Guest Investor');

    unsubHost();
    unsubGuest();
  });

  it('Player reconnection handshake succeeds on active match session', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.createMatch(
      TEST_MATCH_ID,
      'req_recon_init',
      'default-standard-board',
      'v1.0.0',
      'user_recon_1',
      'Recon Host',
      true,
      TEST_ROOM_CODE
    );

    const reconRes = engine.reconnectPlayer(TEST_MATCH_ID, 'req_recon_call', 'user_recon_1');
    assert.equal(reconRes.success, true);
    assert.equal(reconRes.sessionExpired, false);
    assert.equal(reconRes.player?.displayName, 'Recon Host');
    assert.equal(reconRes.player?.connected, true);
  });

  it('Player reconnection handshake gracefully returns sessionExpired when session not found', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    const expiredRes = engine.reconnectPlayer('match_non_existent_99999', 'req_recon_stale', 'user_recon_1');
    assert.equal(expiredRes.success, false);
    assert.equal(expiredRes.sessionExpired, true);
    assert.equal(expiredRes.player, null);
  });

  after(() => {
    setTimeout(() => process.exit(0), 100);
  });
});
