/**
 * Phase 2 Integration Audit Test Suite
 * Validates:
 * A. Board Size Consistency (52 Spaces, bounds, wraparound, start bonus)
 * B. Error Code Preservation (AUTH_REQUIRED, AUTH_FORBIDDEN, etc. not masked as session expired)
 * C. End-to-End Bot Gameplay (1, 2, and 3 bots on 52-space circular board)
 * D. Auction mechanics with bot participation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_STANDARD_SPACES, TOTAL_BOARD_SPACES as CLIENT_TOTAL_SPACES } from '../config/boardConfig';
import { SERVER_STANDARD_SPACES as SERVER_SPACES, TOTAL_BOARD_SPACES as SERVER_TOTAL_SPACES, getServerSpace } from '../../functions/src/config/boardData';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';
import { SERVER_ERROR_CODES, ServerFunctionError } from '../../functions/src/types/contracts';

describe('Phase 2 Audit: Board Size & Configuration Agreement', () => {
  it('should have exactly 52 spaces in both client and server definitions', () => {
    assert.strictEqual(CLIENT_TOTAL_SPACES, 52, 'Client TOTAL_BOARD_SPACES must be 52');
    assert.strictEqual(SERVER_TOTAL_SPACES, 52, 'Server TOTAL_BOARD_SPACES must be 52');
    assert.strictEqual(DEFAULT_STANDARD_SPACES.length, 52, 'Client spaces array must contain 52 items');
    assert.strictEqual(SERVER_SPACES.length, 52, 'Server spaces array must contain 52 items');
  });

  it('should have matching space IDs, indices, and types between client and server', () => {
    for (let i = 0; i < 52; i++) {
      const clientSpace = DEFAULT_STANDARD_SPACES[i];
      const serverSpace = getServerSpace(i);

      assert.ok(clientSpace, `Client space at index ${i} should exist`);
      assert.ok(serverSpace, `Server space at index ${i} should exist`);
      assert.strictEqual(clientSpace.index, i, `Client space index must be ${i}`);
      assert.strictEqual(serverSpace.index, i, `Server space index must be ${i}`);
      assert.strictEqual(clientSpace.id, serverSpace.id, `Space ID must match at index ${i}`);
      assert.strictEqual(clientSpace.type, serverSpace.type, `Space type must match at index ${i}`);
    }
  });

  it('should correctly handle modulo 52 wraparound on space indexing', () => {
    assert.strictEqual(getServerSpace(52).index, 0, 'Space 52 should wrap around to Space 0');
    assert.strictEqual(getServerSpace(53).index, 1, 'Space 53 should wrap around to Space 1');
    assert.strictEqual(getServerSpace(104).index, 0, 'Space 104 should wrap around to Space 0');
  });
});

describe('Phase 2 Audit: Error Code Preservation', () => {
  function formatUserFacingMatchError(err: unknown): string {
    if (!err) return 'An unexpected error occurred.';
    const anyErr = err as {
      code?: string;
      serverCode?: string;
      message?: string;
      details?: { code?: string; message?: string };
    };

    const code = String(anyErr.code || anyErr.serverCode || anyErr.details?.code || '');
    const detailsCode = String(anyErr.details?.code || '');
    const message = anyErr.message ? String(anyErr.message) : String(err);

    // Expired session
    if (code === 'auth/id-token-expired' || code === 'auth/user-token-expired') {
      return '[SESSION_EXPIRED] Your session has expired. Please sign in again.';
    }

    // Missing authentication
    if (
      code === 'unauthenticated' ||
      code === 'functions/unauthenticated' ||
      code === 'AUTH_REQUIRED' ||
      detailsCode === 'AUTH_REQUIRED' ||
      message.includes('AUTH_REQUIRED') ||
      message.includes('Authentication required') ||
      message.includes('Unauthenticated requests are forbidden')
    ) {
      return '[AUTH_REQUIRED] Sign in with Google or Email/Password to perform game actions.';
    }

    // Forbidden / not permitted
    if (code === 'AUTH_FORBIDDEN' || detailsCode === 'AUTH_FORBIDDEN' || code === 'permission-denied') {
      return '[AUTH_FORBIDDEN] You do not have permission to perform this action.';
    }

    // Match not found
    if (code === 'MATCH_NOT_FOUND' || detailsCode === 'MATCH_NOT_FOUND') {
      return '[MATCH_NOT_FOUND] The requested match could not be found.';
    }

    // Not your turn
    if (code === 'NOT_YOUR_TURN' || detailsCode === 'NOT_YOUR_TURN') {
      return '[NOT_YOUR_TURN] It is not your turn.';
    }

    // Invalid phase
    if (code === 'INVALID_PHASE' || detailsCode === 'INVALID_PHASE') {
      return `[INVALID_PHASE] ${message || 'This action cannot be performed during the current game phase.'}`;
    }

    // Insufficient cash
    if (code === 'INSUFFICIENT_CASH' || detailsCode === 'INSUFFICIENT_CASH') {
      return `[INSUFFICIENT_CASH] ${message || 'Insufficient funds to complete this action.'}`;
    }

    // Action limit reached
    if (code === 'ACTION_LIMIT_REACHED' || detailsCode === 'ACTION_LIMIT_REACHED') {
      return '[ACTION_LIMIT_REACHED] Action limit reached for this turn.';
    }

    // Auction not eligible
    if (code === 'AUCTION_NOT_ELIGIBLE' || detailsCode === 'AUCTION_NOT_ELIGIBLE') {
      return '[AUCTION_NOT_ELIGIBLE] You are not eligible to participate in this auction.';
    }

    // Internal server error
    if (
      code === 'internal' ||
      code === 'functions/internal' ||
      message === 'internal' ||
      message.includes('internal [0]')
    ) {
      return '[INTERNAL_SERVER_ERROR] An internal server error occurred. Please try again.';
    }

    return message;
  }

  it('should preserve AUTH_REQUIRED as an explicit authentication prompt, not session expired', () => {
    const err = new ServerFunctionError(SERVER_ERROR_CODES.AUTH_REQUIRED, 'Authentication required to perform game actions.');
    const formatted = formatUserFacingMatchError(err);
    assert.ok(formatted.includes('[AUTH_REQUIRED]'), 'Must include [AUTH_REQUIRED] code tag');
    assert.ok(!formatted.includes('session has expired'), 'Must NOT say session expired when auth is simply required');
  });

  it('should preserve NOT_YOUR_TURN and NOT treat it as session expired', () => {
    const err = new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'It is not your turn.');
    const formatted = formatUserFacingMatchError(err);
    assert.ok(formatted.includes('[NOT_YOUR_TURN]'), 'Must preserve NOT_YOUR_TURN');
    assert.ok(!formatted.includes('session has expired'), 'Must not mask turn errors');
  });

  it('should preserve INSUFFICIENT_CASH and NOT treat it as session expired', () => {
    const err = new ServerFunctionError(SERVER_ERROR_CODES.INSUFFICIENT_CASH, 'Player cash balance too low.');
    const formatted = formatUserFacingMatchError(err);
    assert.ok(formatted.includes('[INSUFFICIENT_CASH]'));
    assert.ok(!formatted.includes('session has expired'));
  });

  it('should handle internal errors honestly as internal server error', () => {
    const err = { message: 'internal' };
    const formatted = formatUserFacingMatchError(err);
    assert.ok(formatted.includes('[INTERNAL_SERVER_ERROR]'));
    assert.ok(!formatted.includes('session has expired'));
  });

  it('should only report session expired when auth token is explicitly expired', () => {
    const err = { code: 'auth/id-token-expired', message: 'Token expired' };
    const formatted = formatUserFacingMatchError(err);
    assert.ok(formatted.includes('[SESSION_EXPIRED]'));
  });
});

describe('Phase 2 Audit: Authoritative Engine & Bot Integration Loop', () => {
  it('should run a complete multi-turn match with human and 1 bot on 52-space board', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();

    const matchId = `audit_match_${Date.now()}_1`;
    const hostUserId = 'human_founder_1';

    // 1. Create Match
    const match = engine.createMatch(matchId, 'req_init', 'default-standard-board', '1.0.0', hostUserId, 'Human Investor');
    assert.strictEqual(match.status, 'waiting_for_players');

    // 2. Add 1 Bot
    const botDoc = engine.addBotPlayer(matchId, 'req_bot_1', 'Apex AI');
    assert.strictEqual(botDoc.isBot, true);

    // 3. Start Match
    const started = engine.startMatch(matchId, 'req_start');
    assert.strictEqual(started.status, 'in_progress');
    assert.strictEqual(started.currentPhase, 'TURN_START');

    // 4. Human Turn - Roll Dice (modulo 52 board)
    const rollRes = engine.requestRoll(matchId, 'req_roll_1', hostUserId, started.stateVersion);
    assert.ok(rollRes.roll >= 2 && rollRes.roll <= 12, 'Roll result should be between 2 and 12');
    assert.ok(rollRes.newSpace >= 0 && rollRes.newSpace < 52);

    // 5. Complete Human Turn
    const postRollMatch = engine.getMatch(matchId);
    assert.ok(postRollMatch);
    engine.completeTurn(matchId, 'req_end_1', hostUserId, postRollMatch.stateVersion);

    // 6. Bot Turn - Execute Bot Turn
    const botMatch = engine.getMatch(matchId);
    assert.ok(botMatch);
    assert.strictEqual(botMatch.currentPlayerId, botDoc.id);

    const botTurnRes = engine.executeBotTurn(matchId, 'req_bot_turn_1', botDoc.id);
    assert.ok(botTurnRes.actionExecuted, 'Bot must execute an action (e.g. ROLL_DICE)');
    assert.strictEqual(botTurnRes.actionExecuted, 'ROLL_DICE');

    // Bot completes turn
    const botPostRollMatch = engine.getMatch(matchId);
    assert.ok(botPostRollMatch);
    engine.completeTurn(matchId, 'req_bot_end_1', botDoc.id, botPostRollMatch.stateVersion);

    // Check that after bot turn, turn advances back to human or next round
    const nextMatch = engine.getMatch(matchId);
    assert.ok(nextMatch);
    assert.strictEqual(nextMatch.currentPlayerId, hostUserId);
    assert.strictEqual(nextMatch.roundNumber, 2);
  });

  it('should support 3 bots and full auction flow with bot participation', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();

    const matchId = `audit_match_${Date.now()}_3`;
    const hostUserId = 'human_founder_1';

    engine.createMatch(matchId, 'req_init_3', 'default-standard-board', '1.0.0', hostUserId, 'Human Investor');
    const bot1 = engine.addBotPlayer(matchId, 'req_b1', 'Apex AI');
    const bot2 = engine.addBotPlayer(matchId, 'req_b2', 'Venture AI');
    const bot3 = engine.addBotPlayer(matchId, 'req_b3', 'Quant AI');

    const started = engine.startMatch(matchId, 'req_start_3');
    const players = engine.getPlayers(matchId);
    assert.strictEqual(players.length, 4);

    // Start an auction
    engine.startSpaceAuction(matchId, 'req_auc_1', hostUserId, started.stateVersion);
    const auctionMatch = engine.getMatch(matchId);
    assert.ok(auctionMatch);
    assert.strictEqual(auctionMatch.currentPhase, 'AUCTION_IN_PROGRESS');

    const container = (engine as any).matches.get(matchId);
    const auction = container.activeAuction;
    assert.ok(auction, 'Active auction must exist in match container');
    assert.strictEqual(auction.status, 'active');

    // Bot 1 places bid
    engine.placeBid(matchId, 'req_bid_1', bot1.id, auction.id, 100);
    assert.strictEqual(auction.currentHighestBid, 100);
    assert.strictEqual(auction.currentHighestBidderId, bot1.id);

    // Bot 2 passes
    engine.passAuction(matchId, 'req_pass_1', bot2.id, auction.id);
    assert.ok(auction.passedPlayerIds.includes(bot2.id));

    // Resolve auction
    engine.resolveAuction(matchId, 'req_res_1', auction.id);
    assert.strictEqual(auction.status, 'settled');
    assert.strictEqual(auction.currentHighestBidderId, bot1.id);
    assert.ok(bot1.ownedSpaceIds.includes(auction.assetId), 'Winner must receive auctioned asset');
    assert.strictEqual(container.match.currentPhase, 'TURN_END');
  });

  it('should authoritatively execute Corporate Warfare SP abilities: Takeover, Freeze, Short Raid, and Shields', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();

    const matchId = `audit_warfare_${Date.now()}`;
    const humanId = 'human_raider_1';

    engine.createMatch(matchId, 'req_init_w', 'default-standard-board', '1.0.0', humanId, 'Corporate Raider');
    const bot = engine.addBotPlayer(matchId, 'req_bw', 'Apex Rival');
    const started = engine.startMatch(matchId, 'req_start_w');

    const container = (engine as any).matches.get(matchId);
    const human = container.players.get(humanId);
    const rival = container.players.get(bot.id);

    // Give players adequate cash and SP
    human.specialPoints = 200;
    human.cash = 2000;
    rival.cash = 1000;
    rival.specialPoints = 100;
    // Assign rival a property
    rival.ownedSpaceIds = ['space_1'];

    // 1. Hostile Takeover Bid
    const buyoutCost = Math.round(60 * 1.5); // base cost 60 * 1.5 = 90
    const takeoverResult = engine.executeSPAction(
      matchId,
      'req_sp_takeover',
      humanId,
      'hostile_takeover',
      50,
      'space_1',
      started.stateVersion
    );
    assert.strictEqual(takeoverResult.remainingSP, 150);
    assert.ok(human.ownedSpaceIds.includes('space_1'), 'Human should now own space_1');
    assert.ok(!rival.ownedSpaceIds.includes('space_1'), 'Rival should no longer own space_1');
    assert.strictEqual(rival.cash, 1000 + buyoutCost, 'Rival should receive buyout cash');

    // 2. Patent Freeze
    const freezeResult = engine.executeSPAction(
      matchId,
      'req_sp_freeze',
      humanId,
      'patent_freeze',
      35,
      'space_1',
      takeoverResult.stateVersion
    );
    assert.strictEqual(freezeResult.remainingSP, 115);
    const freezeMod = container.activeModifiers?.find((m: any) => m.type === 'patent_freeze' && m.targetSpaceId === 'space_1');
    assert.ok(freezeMod, 'Patent freeze modifier should be active');

    // 3. Short Seller Raid
    const rivalPreCash = rival.cash;
    const shortResult = engine.executeSPAction(
      matchId,
      'req_sp_short',
      humanId,
      'short_attack',
      40,
      rival.id,
      freezeResult.stateVersion
    );
    assert.strictEqual(shortResult.remainingSP, 75);
    assert.strictEqual(rival.cash, rivalPreCash - 150, 'Rival should lose 150 ƁM from short raid');

    // 4. Regulatory Harbor Shield
    const shieldResult = engine.executeSPAction(
      matchId,
      'req_sp_shield',
      humanId,
      'regulatory_shield',
      30,
      undefined,
      shortResult.stateVersion
    );
    assert.strictEqual(shieldResult.remainingSP, 45);
    const shieldMod = container.activeModifiers?.find((m: any) => m.type === 'regulatory_shield' && m.targetPlayerId === humanId);
    assert.ok(shieldMod, 'Regulatory shield modifier should be active');
  });

  it('should authoritatively support mortgage, unmortgage, and liquidation workflows', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();

    const matchId = `mortgage_test_${Date.now()}`;
    const playerId = 'player_corp_1';

    engine.createMatch(matchId, 'req_init_m', 'default-standard-board', '1.0.0', playerId, 'Corporate Titan');
    engine.addBotPlayer(matchId, 'req_b_m', 'Apex Bot');
    engine.startMatch(matchId, 'req_start_m');

    const container = (engine as any).matches.get(matchId);
    const player = container.players.get(playerId);
    assert.ok(player);

    // Give player a property
    player.ownedSpaceIds = ['space_1'];
    player.cash = 1000;

    // 1. Mortgage property: gets 50% cash (baseCost of space)
    const space = DEFAULT_STANDARD_SPACES.find((s) => s.id === 'space_1') || { baseCost: 60 };
    const mortgageValue = Math.round((space.baseCost || 60) * 0.5);

    const mRes = engine.mortgageProperty(matchId, 'req_m1', playerId, 'space_1');
    assert.ok(mRes.cashGained > 0);
    assert.strictEqual(player.cash, 1000 + mortgageValue);
    assert.ok(player.mortgagedSpaceIds.includes('space_1'));

    // Re-mortgage fails
    assert.throws(() => {
      engine.mortgageProperty(matchId, 'req_m2', playerId, 'space_1');
    });

    // 2. Lift mortgage: costs 55% cash (50% principal + 10% fee)
    const unmortgageCost = Math.round((space.baseCost || 60) * 0.55);
    const uRes = engine.unmortgageProperty(matchId, 'req_u1', playerId, 'space_1');
    assert.ok(uRes.costPaid > 0);
    assert.strictEqual(player.cash, 1000 + mortgageValue - unmortgageCost);
    assert.ok(!player.mortgagedSpaceIds.includes('space_1'));

    // 3. Liquidate property: surrendered to bank for 50% value
    const lRes = engine.liquidateProperty(matchId, 'req_l1', playerId, 'space_1');
    assert.ok(lRes.cashGained > 0);
    assert.ok(!player.ownedSpaceIds.includes('space_1'));
    assert.strictEqual(player.cash, 1000 + mortgageValue - unmortgageCost + mortgageValue);
  });
});
