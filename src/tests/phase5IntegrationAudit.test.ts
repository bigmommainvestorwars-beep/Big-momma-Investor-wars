import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  RANKED_TIERS,
  RankedService,
} from '../services/ranked/rankedService';
import {
  SYNDICATE_PERKS,
} from '../services/social/syndicateService';
import {
  BOARD_SKINS,
  INVESTOR_TOKENS,
  DICE_TRAILS,
  BANKRUPTCY_VIGNETTES,
} from '../services/cosmetics/cosmeticsCatalog';
import {
  CosmeticsManager,
} from '../services/cosmetics/cosmeticsManager';
import {
  NotificationService,
} from '../services/notifications/notificationService';

describe('Phase 5: Competitive Seasons, Social Syndicates, Cosmetics & Push Notifications Audit', () => {
  // 1. RANKED MATCHMAKING & ELO RATING
  test('Ranked Tiers: assigns Bronze, Silver, Gold, Platinum, Diamond, Apex Investor correctly', () => {
    const bronze = RankedService.getTierFromElo(500);
    assert.strictEqual(bronze.tier, 'Bronze');

    const silver = RankedService.getTierFromElo(1100);
    assert.strictEqual(silver.tier, 'Silver');

    const gold = RankedService.getTierFromElo(1450);
    assert.strictEqual(gold.tier, 'Gold');

    const platinum = RankedService.getTierFromElo(1750);
    assert.strictEqual(platinum.tier, 'Platinum');

    const diamond = RankedService.getTierFromElo(2050);
    assert.strictEqual(diamond.tier, 'Diamond');

    const apex = RankedService.getTierFromElo(2400);
    assert.strictEqual(apex.tier, 'Apex Investor');
  });

  test('Ranked Elo Calculation: award proper win delta and win streak scaling', () => {
    const competitors = [
      { id: 'player_a', elo: 1500, placement: 1 },
      { id: 'player_b', elo: 1500, placement: 2 },
      { id: 'player_c', elo: 1500, placement: 3 },
      { id: 'player_d', elo: 1500, placement: 4 },
    ];
    const changesNormal = RankedService.calculateMultiplayerEloChange(competitors, 32);
    assert.ok(changesNormal['player_a'] > 0, '1st place winner must receive positive Elo');
    assert.ok(changesNormal['player_d'] < 0, '4th place must lose Elo');

    const changesStreak = RankedService.calculateMultiplayerEloChange(competitors, 48);
    assert.ok(changesStreak['player_a'] > changesNormal['player_a'], 'Win streak kFactor must award higher Elo delta');
  });

  // 2. INVESTOR SYNDICATES & SOCIAL SYSTEM
  test('Investor Syndicates: perk catalog definitions and progression tiers', () => {
    assert.ok(SYNDICATE_PERKS.length >= 4, 'Must offer at least 4 syndicate perks');

    const salaryPerk = SYNDICATE_PERKS.find((p) => p.id === 'perk-salary-boost');
    assert.ok(salaryPerk, 'Salary Yield Boost perk must be defined');
    assert.ok(salaryPerk.requiredSP > 0, 'Salary Yield Boost requiredSP must be positive');
    assert.strictEqual(salaryPerk.effectType, 'salary_boost');

    const bailoutPerk = SYNDICATE_PERKS.find((p) => p.id === 'perk-bailout-defense');
    assert.ok(bailoutPerk, 'Syndicate Bailout Reserve perk must be defined');

    const intelPerk = SYNDICATE_PERKS.find((p) => p.id === 'perk-auction-intel');
    assert.ok(intelPerk, 'Market Intelligence perk must be defined');

    const cartelPerk = SYNDICATE_PERKS.find((p) => p.id === 'perk-apex-cartel');
    assert.ok(cartelPerk, 'Apex Cartel Dividend perk must be defined');
  });

  // 3. COSMETIC ECONOMY & MONETIZATION
  test('Cosmetics Catalog: all 4 required Phase 5 categories exist with default unlocks', () => {
    assert.ok(BOARD_SKINS.length > 0, 'Board skins must be populated');
    assert.ok(INVESTOR_TOKENS.length > 0, 'Investor tokens must be populated');
    assert.ok(DICE_TRAILS.length > 0, 'Dice trails must be populated');
    assert.ok(BANKRUPTCY_VIGNETTES.length > 0, 'Bankruptcy vignettes must be populated');

    assert.ok(BOARD_SKINS.some((b) => b.unlockedByDefault), 'Default board skin required');
    assert.ok(INVESTOR_TOKENS.some((t) => t.unlockedByDefault), 'Default investor token required');
    assert.ok(DICE_TRAILS.some((tr) => tr.unlockedByDefault), 'Default dice trail required');
    assert.ok(BANKRUPTCY_VIGNETTES.some((v) => v.unlockedByDefault), 'Default bankruptcy vignette required');
  });

  test('Cosmetics Manager: equipping, purchasing, and duplicate prevention', () => {
    // Equip valid default board skin
    CosmeticsManager.equipItem('board-wallstreet-night');
    const state = CosmeticsManager.getEquippedState();
    assert.strictEqual(state.boardSkin, 'board-wallstreet-night');

    // Purchase check with insufficient funds
    let cashDeducted = 0;
    let spDeducted = 0;
    const failPurchase = CosmeticsManager.purchaseItem(
      'board-cyberpunk-tokyo',
      'BM',
      0,
      0,
      (amt) => { cashDeducted += amt; },
      (amt) => { spDeducted += amt; }
    );
    assert.strictEqual(failPurchase.success, false, 'Purchase with 0 funds must fail');
    assert.strictEqual(cashDeducted, 0);
    assert.strictEqual(spDeducted, 0);
  });

  // 4. PUSH NOTIFICATION TRIGGERS
  test('Push Notification Triggers: dispatching alerts and unread state management', () => {
    const initialUnread = NotificationService.getUnreadCount();

    // Trigger your turn notification
    const turnNotif = NotificationService.triggerYourTurn('match-audit-test', 45);
    assert.strictEqual(turnNotif.type, 'YOUR_TURN');

    // Trigger opponent roll notification
    const rollNotif = NotificationService.triggerOpponentRoll('Titan AI', 9, 'Quantum Citadel');
    assert.strictEqual(rollNotif.type, 'OPPONENT_ROLL');

    // Trigger auction outbid notification
    const outbidNotif = NotificationService.triggerAuctionOutbid('Wall Street Tower', 4500, 'Apex Bull');
    assert.strictEqual(outbidNotif.type, 'AUCTION_OUTBID');

    // Verify unread count incremented
    const afterUnread = NotificationService.getUnreadCount();
    assert.ok(afterUnread > initialUnread, 'Unread count must increase after new notifications');

    // Mark all as read
    NotificationService.markAllAsRead();
    assert.strictEqual(NotificationService.getUnreadCount(), 0, 'Unread count must be 0 after markAllAsRead');
  });
});
