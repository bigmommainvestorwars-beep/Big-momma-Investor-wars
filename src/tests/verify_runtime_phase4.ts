import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';
import { formatBM } from '../client/utils/currency';
import { defaultStandardBoard } from '../config/boardConfig';

describe('Real Runtime Verification - Phase 4', () => {
  test('Phase 4 Full Simulation', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    
    // Simulate MainMenu: start 3 bot match
    const matchId = `phase4_match_${Date.now()}`;
    const hostId = 'user_123';
    engine.createMatch(matchId, 'req1', 'default-standard-board', '1.0.0', hostId, 'Human');
    engine.addBotPlayer(matchId, 'reqbot1', 'Bot A');
    engine.addBotPlayer(matchId, 'reqbot2', 'Bot B');
    engine.addBotPlayer(matchId, 'reqbot3', 'Bot C');
    const started = engine.startMatch(matchId, 'reqstart');
    
    const container = engine.getMatchContainer(matchId);
    
    // Board config
    assert.strictEqual(container!.match.boardId, 'default-standard-board');
    assert.strictEqual(defaultStandardBoard.spaces.length, 52);
    assert.ok(defaultStandardBoard.name.includes("BIG MOMMA: INVESTORS' WAR"));
    assert.strictEqual(formatBM(100), '100 ƁM');
    
    // Roll
    const rollResult = engine.requestRoll(matchId, 'reqroll', hostId, started.stateVersion);
    assert.ok(rollResult.newSpace >= 1 && rollResult.newSpace <= 6);
    
    console.log('Phase 4 runtime logic validated.');
  });
});
