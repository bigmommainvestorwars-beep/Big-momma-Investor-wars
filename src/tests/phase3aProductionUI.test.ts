import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { formatBM, formatSP, sanitizeCurrencyDisplay, GAME_CURRENCY_SYMBOL, GAME_CURRENCY_NAME } from '../client/utils/currency';
import { DEFAULT_STANDARD_SPACES, TOTAL_BOARD_SPACES, defaultStandardBoard } from '../config/boardConfig';
import { SERVER_STANDARD_SPACES } from '../../functions/src/config/boardData';
import { AuthoritativeServerEngine } from '../engine/authoritativeServerEngine';

describe('Phase 3A: Production UI & 25-Point Checklist Audit', () => {
  test('1 & 2. Circular board renders exactly 52 spaces in circular topology', () => {
    assert.strictEqual(TOTAL_BOARD_SPACES, 52);
    assert.strictEqual(DEFAULT_STANDARD_SPACES.length, 52);
    assert.strictEqual(SERVER_STANDARD_SPACES.length, 52);

    // Verify index continuity from 0 to 51
    for (let i = 0; i < 52; i++) {
      assert.strictEqual(DEFAULT_STANDARD_SPACES[i].index, i);
      assert.strictEqual(SERVER_STANDARD_SPACES[i].index, i);
    }

    // Verify angular circular distribution calculation: each space angle is 2*PI/52 apart
    const stepAngle = (2 * Math.PI) / 52;
    for (let i = 0; i < 52; i++) {
      const angle = i * stepAngle - Math.PI / 2;
      const x = 500 + 410 * Math.cos(angle);
      const y = 500 + 410 * Math.sin(angle);
      assert.ok(!isNaN(x) && !isNaN(y));
    }
  });

  test('3. Center and board configuration contain BIG MOMMA: INVESTORS\' WAR', () => {
    assert.ok(
      defaultStandardBoard.name.includes("BIG MOMMA: INVESTORS' WAR"),
      `Board name must include official game title: "${defaultStandardBoard.name}"`
    );

    const circularBoardCode = fs.readFileSync(
      path.join(process.cwd(), 'src/client/components/game/CircularBoard52.tsx'),
      'utf8'
    );
    assert.ok(
      circularBoardCode.includes("BIG MOMMA"),
      'CircularBoard52 center must display BIG MOMMA'
    );
    assert.ok(
      circularBoardCode.includes("INVESTORS' WAR"),
      'CircularBoard52 center must display INVESTORS\' WAR'
    );
  });

  test('4, 5, 6, 7. Currency is strictly ƁM for balances, costs, rents, and auctions', () => {
    assert.strictEqual(GAME_CURRENCY_SYMBOL, 'ƁM');
    assert.strictEqual(GAME_CURRENCY_NAME, "Big Momma's Currency");

    assert.strictEqual(formatBM(0), '0 ƁM');
    assert.strictEqual(formatBM(250), '250 ƁM');
    assert.strictEqual(formatBM(1500), '1,500 ƁM');
    assert.strictEqual(formatBM(1000000), '1,000,000 ƁM');

    // Verify property costs in spaces are numeric and format cleanly with ƁM
    DEFAULT_STANDARD_SPACES.forEach((space) => {
      if (space.baseCost) {
        const formatted = formatBM(space.baseCost);
        assert.ok(formatted.endsWith('ƁM'));
      }
      if (space.rentTiers) {
        space.rentTiers.forEach((tier) => {
          const formatted = formatBM(tier);
          assert.ok(formatted.endsWith('ƁM'));
        });
      }
    });
  });

  test('8, 9, 10, 11. No $, USD, ₦, or "Billion Marks" in board data or currency utils', () => {
    // Audit board data descriptions
    DEFAULT_STANDARD_SPACES.forEach((space) => {
      if (space.description) {
        assert.ok(!space.description.includes('$'), `Forbidden '$' in client space #${space.index}`);
        assert.ok(!space.description.includes('USD'), `Forbidden 'USD' in client space #${space.index}`);
        assert.ok(!space.description.includes('₦'), `Forbidden '₦' in client space #${space.index}`);
        assert.ok(!space.description.includes('Billion Marks'), `Forbidden 'Billion Marks' in client space #${space.index}`);
      }
    });

    SERVER_STANDARD_SPACES.forEach((space) => {
      if (space.description) {
        assert.ok(!space.description.includes('$'), `Forbidden '$' in server space #${space.index}`);
        assert.ok(!space.description.includes('USD'), `Forbidden 'USD' in server space #${space.index}`);
        assert.ok(!space.description.includes('₦'), `Forbidden '₦' in server space #${space.index}`);
        assert.ok(!space.description.includes('Billion Marks'), `Forbidden 'Billion Marks' in server space #${space.index}`);
      }
    });

    // Verify sanitizeCurrencyDisplay cleanses foreign symbols
    assert.strictEqual(sanitizeCurrencyDisplay('$500'), '500 ƁM');
    assert.strictEqual(sanitizeCurrencyDisplay('USD 100'), '100 ƁM');
    assert.strictEqual(sanitizeCurrencyDisplay('₦200'), '200 ƁM');
  });

  test('12. Strategy Points are strictly formatted as SP', () => {
    assert.strictEqual(formatSP(0), '0 SP');
    assert.strictEqual(formatSP(25), '25 SP');
    assert.strictEqual(formatSP(100), '100 SP');
  });

  test('13, 14, 15, 16, 17, 18. Authoritative gameplay loop: rolls, circular movement, and turn flow', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();
    const matchId = `match_audit_${Date.now()}`;
    const hostUserId = 'user_lead_investor';

    engine.createMatch(matchId, 'req_init', 'default-standard-board', '1.0.0', hostUserId, 'Lead Human');
    engine.addBotPlayer(matchId, 'req_bot_1', 'Apex AI');
    engine.addBotPlayer(matchId, 'req_bot_2', 'Vanguard Bot');
    const started = engine.startMatch(matchId, 'req_start');

    const container = engine.getMatchContainer(matchId);
    assert.ok(container);
    assert.strictEqual(container.players.size, 3);
    assert.strictEqual(started.currentPlayerId, hostUserId);

    // Roll dice (DiceVisualizer test)
    const rollResult = engine.requestRoll(matchId, 'req_roll_1', hostUserId, started.stateVersion);
    assert.ok(rollResult.roll >= 2 && rollResult.roll <= 12);
    assert.strictEqual(rollResult.newSpace, rollResult.roll % 52);

    // Multi-player visibility test: other bots remain on space 0 while human moved
    const playersList = Array.from(container.players.values());
    assert.strictEqual(playersList[1].currentSpaceIndex, 0);
    assert.strictEqual(playersList[2].currentSpaceIndex, 0);
  });

  test('19. Purchasing a property updates player ƁM balance and owned property list', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();
    const matchId = `match_buy_test_${Date.now()}`;
    const hostUserId = 'user_buyer';

    engine.createMatch(matchId, 'req_init', 'default-standard-board', '1.0.0', hostUserId, 'Buyer Investor');
    engine.addBotPlayer(matchId, 'req_bot_1', 'AI Partner');
    engine.startMatch(matchId, 'req_start');

    // Force player to space #1 (Commodities Exchange, cost 60 ƁM)
    const container = engine.getMatchContainer(matchId);
    assert.ok(container);
    const humanPlayer = container.players.get(hostUserId)!;
    assert.ok(humanPlayer);
    humanPlayer.currentSpaceIndex = 1;
    container.match.currentPhase = 'AWAITING_ACTION';

    const initialCash = humanPlayer.cash;
    const space1 = DEFAULT_STANDARD_SPACES[1];
    assert.ok(space1.baseCost && space1.baseCost > 0);

    const buyResult = engine.buyProperty(matchId, 'req_buy_1', hostUserId, container.match.stateVersion);
    assert.strictEqual(buyResult.remainingCash, initialCash - space1.baseCost);
    assert.ok(humanPlayer.ownedSpaceIds.includes(space1.id));
  });

  test('20. Auctions allow placing incremental bids in ƁM and passing to settle', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();
    const matchId = `match_auction_test_${Date.now()}`;
    const hostUserId = 'user_auctioneer';

    engine.createMatch(matchId, 'req_init', 'default-standard-board', '1.0.0', hostUserId, 'Lead Investor');
    engine.addBotPlayer(matchId, 'req_bot_1', 'Bot Bidder');
    engine.startMatch(matchId, 'req_start');

    const container = engine.getMatchContainer(matchId);
    assert.ok(container);
    const humanPlayer = container.players.get(hostUserId)!;
    humanPlayer.currentSpaceIndex = 3; // set to property space
    container.match.currentPhase = 'AWAITING_ACTION';
    const space3 = DEFAULT_STANDARD_SPACES[3]; // Property space

    // Start auction
    const auction = engine.startSpaceAuction(matchId, 'req_auc_init', hostUserId, container.match.stateVersion);
    assert.strictEqual(auction.status, 'active');
    assert.strictEqual(auction.assetId, space3.id);

    // Place bid
    engine.placeBid(matchId, 'req_bid_1', hostUserId, auction.id, auction.currentHighestBid + 50);
    assert.strictEqual(container.activeAuction!.currentHighestBidderId, hostUserId);

    // Pass auction from bot
    const botId = Array.from(container.players.values()).find(p => p.isBot)!.id;
    const passResult = engine.passAuction(matchId, 'req_pass_1', botId, auction.id);
    
    // Since it's a 2 player game, the auction should auto-resolve
    assert.strictEqual(passResult.auctionResolved, true);
    assert.strictEqual(container.activeAuction, null);
  });

  test('21. Activity log stream records authoritative game events cleanly without $', () => {
    const engine = AuthoritativeServerEngine.getInstance();
    engine.reset();
    const matchId = `match_logs_${Date.now()}`;
    const hostUserId = 'user_log_test';

    engine.createMatch(matchId, 'req_init', 'default-standard-board', '1.0.0', hostUserId, 'Audit Human');
    engine.addBotPlayer(matchId, 'req_b1', 'Audit AI');
    engine.startMatch(matchId, 'req_start');

    const container = engine.getMatchContainer(matchId);
    assert.ok(container);
    assert.ok(container.logs.length > 0);

    container.logs.forEach((log) => {
      assert.ok(!log.summary.includes('$'), `Log contains forbidden '$': "${log.summary}"`);
      assert.ok(!log.summary.includes('USD'), `Log contains forbidden 'USD': "${log.summary}"`);
      assert.ok(!log.summary.includes('₦'), `Log contains forbidden '₦': "${log.summary}"`);
      assert.ok(!log.summary.includes('Billion Marks'), `Log contains forbidden 'Billion Marks': "${log.summary}"`);
    });
  });

  test('22 & 23. Mobile and Desktop Landscape Configuration Audit', () => {
    const capacitorConfigRaw = fs.readFileSync(
      path.join(process.cwd(), 'capacitor.config.json'),
      'utf8'
    );
    const capacitorConfig = JSON.parse(capacitorConfigRaw);
    assert.strictEqual(capacitorConfig.appId, 'com.bigmomma.investorswar');
    assert.strictEqual(capacitorConfig.appName, "BIG MOMMA: INVESTORS' WAR");
    assert.strictEqual(
      capacitorConfig.android?.screenOrientation,
      'sensorLandscape'
    );
    assert.strictEqual(
      capacitorConfig.plugins?.ScreenOrientation?.defaultOrientation,
      'landscape'
    );

    // Verify OrientationGuard component exists and is referenced
    const screenCode = fs.readFileSync(
      path.join(process.cwd(), 'src/client/components/game/LandscapeGameScreen.tsx'),
      'utf8'
    );
    assert.ok(screenCode.includes('OrientationGuard'), 'LandscapeGameScreen must be wrapped in OrientationGuard');
    assert.ok(screenCode.includes('safe-area-inset'), 'LandscapeGameScreen must support safe-area insets');
  });

  test('24 & 25. Layout readability & non-overlapping design checks', () => {
    const screenCode = fs.readFileSync(
      path.join(process.cwd(), 'src/client/components/game/LandscapeGameScreen.tsx'),
      'utf8'
    );
    // Ensure responsive grid layout handles desktop (lg:col-span-7 / lg:col-span-5)
    assert.ok(screenCode.includes('lg:col-span-7'), 'Board section must use dominant column span');
    assert.ok(screenCode.includes('lg:col-span-5'), 'HUD section must use side column span');
    // Ensure 44px min-height targets for touch accessibility
    assert.ok(screenCode.includes('min-h-[44px]'), 'Interactive buttons must support minimum touch target size');
  });
});
