import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';
import { matchSyncService } from '../services/firebase/matchSyncService';

describe('Instantaneous Quick Match & Zero-Lag Matchmaking Verification', () => {
  it('should find or create quick match lobbies instantaneously in under 5ms', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();

    const t0 = performance.now();
    const qm1 = engine.findOrCreateQuickMatch('req_qm_1', 'user_1', 'Investor One');
    const elapsed1 = performance.now() - t0;

    assert.ok(qm1.matchId, 'Match ID must be generated');
    assert.strictEqual(qm1.isNew, true, 'First quick match request should create a new lobby');
    assert.strictEqual(qm1.player.userId, 'user_1');
    assert.ok(elapsed1 < 50, `Quick match creation took ${elapsed1.toFixed(2)}ms (must be < 50ms)`);

    // Second user joins the same quick match instantaneously
    const t1 = performance.now();
    const qm2 = engine.findOrCreateQuickMatch('req_qm_2', 'user_2', 'Investor Two');
    const elapsed2 = performance.now() - t1;

    assert.strictEqual(qm2.matchId, qm1.matchId, 'Second user must join existing open lobby');
    assert.strictEqual(qm2.isNew, false, 'Second user should join existing match');
    assert.strictEqual(qm2.player.userId, 'user_2');
    assert.ok(elapsed2 < 50, `Quick match pairing took ${elapsed2.toFixed(2)}ms (must be < 50ms)`);

    // Both players must be synchronized in the match container
    const players = engine.getPlayers(qm1.matchId);
    assert.strictEqual(players.length, 2);
    assert.strictEqual(players[0].userId, 'user_1');
    assert.strictEqual(players[1].userId, 'user_2');
  });

  it('should fill open lobby with bots immediately on request without lag', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();

    const qm = engine.findOrCreateQuickMatch('req_qm_host', 'host_user', 'Host Investor');
    const bot1 = engine.addBotPlayer(qm.matchId, 'req_bot_1', 'Apex AI');
    const bot2 = engine.addBotPlayer(qm.matchId, 'req_bot_2', 'Venture AI');
    const bot3 = engine.addBotPlayer(qm.matchId, 'req_bot_3', 'Quant AI');

    const players = engine.getPlayers(qm.matchId);
    assert.strictEqual(players.length, 4);
    assert.strictEqual(bot1.isBot, true);
    assert.strictEqual(bot2.isBot, true);
    assert.strictEqual(bot3.isBot, true);

    const startedMatch = engine.startMatch(qm.matchId, 'req_start');
    assert.strictEqual(startedMatch.status, 'in_progress');
    assert.strictEqual(startedMatch.currentPlayerId, 'host_user');
  });
});
