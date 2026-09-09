import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';

describe('Bots tests', () => {
  test('2 and 3 Bots flow', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    
    // 2 Bots
    const matchId2 = `match_2bots_${Date.now()}`;
    engine.createMatch(matchId2, 'req2', 'default-standard-board', '1.0.0', 'host', 'Host');
    engine.addBotPlayer(matchId2, 'botA', 'Bot A');
    engine.addBotPlayer(matchId2, 'botB', 'Bot B');
    engine.startMatch(matchId2, 'start2');
    assert.strictEqual(engine.getMatchContainer(matchId2)!.players.size, 3);
    
    // 3 Bots
    const matchId3 = `match_3bots_${Date.now()}`;
    engine.createMatch(matchId3, 'req3', 'default-standard-board', '1.0.0', 'host', 'Host');
    engine.addBotPlayer(matchId3, 'botA', 'Bot A');
    engine.addBotPlayer(matchId3, 'botB', 'Bot B');
    engine.addBotPlayer(matchId3, 'botC', 'Bot C');
    engine.startMatch(matchId3, 'start3');
    assert.strictEqual(engine.getMatchContainer(matchId3)!.players.size, 4);
    
    console.log('Tested 2 bots and 3 bots successfully.');
  });
});
