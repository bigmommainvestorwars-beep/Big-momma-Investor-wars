import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';
import { TEST_ROOM_CODE, TEST_MATCH_ID } from '../config/testRoomConfig';

describe('Hard-Coded Multiplayer Connectivity Test (BM-0X9X)', () => {
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
    assert.equal(startedMatch.status, 'in_progress');
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
});
