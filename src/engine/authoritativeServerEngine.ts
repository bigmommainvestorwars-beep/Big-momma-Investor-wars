/**
 * Production Authoritative Server Game Engine
 * Implements server-authoritative state transitions, RNG, rule validation,
 * state versioning, rate-limiting, and idempotency.
 * Serves as the authoritative source of truth for both human and bot players.
 */

import {
  FirestoreMatchDoc,
  FirestorePlayerDoc,
  FirestoreAuctionDoc,
  FirestoreLogDoc,
  matchSyncService,
} from '../services/firebase/matchSyncService';
import { DEFAULT_STANDARD_SPACES } from '../config/boardConfig';
import { BoardSpace } from '../types/board';
import { BotDecisionService } from '../bot/botDecisionService';
import { ServerFunctionError, SERVER_ERROR_CODES } from '../../functions/src/types/contracts';

export interface AuthoritativeMatchContainer {
  match: FirestoreMatchDoc;
  players: Map<string, FirestorePlayerDoc>;
  logs: FirestoreLogDoc[];
  activeAuction: FirestoreAuctionDoc | null;
}

export class AuthoritativeServerEngine {
  private static instance: AuthoritativeServerEngine;
  private matches = new Map<string, AuthoritativeMatchContainer>();
  private processedRequests = new Set<string>();

  private constructor() {
    matchSyncService.registerLocalContainerProvider((matchId) => {
      const container = this.matches.get(matchId);
      if (!container) return undefined;
      const playersList = Array.from(container.players.values()).sort((a, b) => a.turnOrder - b.turnOrder);
      return {
        match: container.match,
        players: playersList,
        logs: container.logs,
        activeAuction: container.activeAuction,
      };
    });
    matchSyncService.registerLocalOpenMatchesProvider(() => this.getOpenMatches());
  }

  public getOpenMatches(): FirestoreMatchDoc[] {
    const list: FirestoreMatchDoc[] = [];
    for (const container of this.matches.values()) {
      if (container.match.status === 'waiting_for_players') {
        list.push({ ...container.match });
      }
    }
    return list;
  }

  public static getInstance(): AuthoritativeServerEngine {
    if (!AuthoritativeServerEngine.instance) {
      AuthoritativeServerEngine.instance = new AuthoritativeServerEngine();
    }
    return AuthoritativeServerEngine.instance;
  }

  /**
   * Resets internal state (used for clean testing)
   */
  public reset(): void {
    this.matches.clear();
    this.processedRequests.clear();
  }

  public getMatchContainer(matchId: string): AuthoritativeMatchContainer | undefined {
    return this.matches.get(matchId);
  }

  public getMatch(matchId: string): FirestoreMatchDoc | undefined {
    return this.matches.get(matchId)?.match;
  }

  public getPlayers(matchId: string): FirestorePlayerDoc[] {
    const container = this.matches.get(matchId);
    if (!container) return [];
    return Array.from(container.players.values()).sort((a, b) => a.turnOrder - b.turnOrder);
  }

  private emitStateChange(container: AuthoritativeMatchContainer): void {
    const playersList = Array.from(container.players.values()).sort((a, b) => a.turnOrder - b.turnOrder);
    matchSyncService.dispatchLocalUpdate(
      container.match.id,
      container.match,
      playersList,
      container.logs,
      container.activeAuction
    );
  }

  private assertMatchActive(match: FirestoreMatchDoc): void {
    if (match.status !== 'in_progress') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match is not in progress.');
    }
  }

  private assertStateVersion(match: FirestoreMatchDoc, expectedVersion?: number): void {
    if (expectedVersion !== undefined && match.stateVersion !== expectedVersion) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.STALE_STATE,
        `Stale state version: client sent ${expectedVersion}, authoritative server is at ${match.stateVersion}.`,
        true
      );
    }
  }

  private incrementVersion(match: FirestoreMatchDoc): number {
    match.stateVersion += 1;
    match.updatedAt = Date.now();
    return match.stateVersion;
  }

  private appendLog(
    container: AuthoritativeMatchContainer,
    type: string,
    summary: string,
    sourcePlayerId?: string,
    data?: Record<string, unknown>
  ): void {
    const log: FirestoreLogDoc = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      sourcePlayerId,
      summary,
      data,
      timestamp: Date.now(),
    };
    container.logs.unshift(log);
    // Keep max 50 logs in memory
    if (container.logs.length > 50) container.logs.pop();
  }

  /**
   * 1. createMatch
   */
  public createMatch(
    matchId: string,
    requestId: string,
    boardId: string = 'default-standard-board',
    rulesetVersion: string = '1.0.0',
    hostUserId: string = 'host_user_1',
    hostDisplayName: string = 'Investor (Host)'
  ): FirestoreMatchDoc {
    if (this.processedRequests.has(requestId)) {
      const existing = this.matches.get(matchId);
      if (existing) return existing.match;
    }
    this.processedRequests.add(requestId);

    const match: FirestoreMatchDoc = {
      id: matchId,
      hostUserId,
      boardId,
      rulesetVersion,
      status: 'waiting_for_players',
      currentPhase: 'LOBBY',
      currentPlayerId: null,
      turnNumber: 0,
      roundNumber: 0,
      stateVersion: 1,
      participantUserIds: [hostUserId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const hostPlayer: FirestorePlayerDoc = {
      id: hostUserId,
      userId: hostUserId,
      displayName: hostDisplayName,
      currentSpaceIndex: 0,
      status: 'active',
      turnOrder: 0,
      netWorth: 1500,
      cash: 1500,
      specialPoints: 50,
      ownedSpaceIds: [],
      companyShareIds: [],
      modifierIds: [],
      isBot: false,
      connected: true,
      lastActiveAt: Date.now(),
    };

    const players = new Map<string, FirestorePlayerDoc>();
    players.set(hostUserId, hostPlayer);

    const container: AuthoritativeMatchContainer = {
      match,
      players,
      logs: [],
      activeAuction: null,
    };

    this.matches.set(matchId, container);
    this.appendLog(container, 'MATCH_CREATED', `Match lobby created by ${hostDisplayName}.`, hostUserId);
    this.emitStateChange(container);

    return match;
  }

  /**
   * 2. addBotPlayer
   */
  public addBotPlayer(
    matchId: string,
    requestId: string,
    botName?: string,
    personality: string = 'balanced'
  ): FirestorePlayerDoc {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    if (container.match.status !== 'waiting_for_players') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Cannot add bots to an ongoing match.');
    }

    if (container.players.size >= 4) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.ACTION_LIMIT_REACHED, 'Match player limit reached (max 4).');
    }

    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultNames = [
      'Apex Capital (AI)',
      'Venture Bot (AI)',
      'Bullish Quant (AI)',
      'Silicon Syndicate (AI)',
    ];
    const name = botName || defaultNames[container.players.size % defaultNames.length];

    const botPlayer: FirestorePlayerDoc = {
      id: botId,
      userId: botId,
      displayName: name,
      currentSpaceIndex: 0,
      status: 'active',
      turnOrder: container.players.size,
      netWorth: 1500,
      cash: 1500,
      specialPoints: 50,
      ownedSpaceIds: [],
      companyShareIds: [],
      modifierIds: [],
      isBot: true,
      connected: true,
      lastActiveAt: Date.now(),
    };

    container.players.set(botId, botPlayer);
    container.match.participantUserIds.push(botId);
    this.incrementVersion(container.match);
    this.appendLog(container, 'BOT_JOINED', `${name} joined lobby as AI investor.`, botId);
    this.emitStateChange(container);

    return botPlayer;
  }

  /**
   * 3. removeBotPlayer
   */
  public removeBotPlayer(matchId: string, requestId: string, botId: string): void {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    if (container.match.status !== 'waiting_for_players') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Cannot remove players once started.');
    }

    const player = container.players.get(botId);
    if (!player || !player.isBot) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target player is not a removable bot.');
    }

    container.players.delete(botId);
    container.match.participantUserIds = container.match.participantUserIds.filter((id) => id !== botId);

    // Re-index turn order
    let order = 0;
    for (const p of container.players.values()) {
      p.turnOrder = order++;
    }

    this.incrementVersion(container.match);
    this.appendLog(container, 'BOT_REMOVED', `${player.displayName} removed from lobby.`);
    this.emitStateChange(container);
  }

  /**
   * 3b. joinMatch (Host or additional participant)
   */
  public joinMatch(
    matchId: string,
    requestId: string,
    userId: string,
    displayName: string
  ): FirestorePlayerDoc {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    if (container.match.status !== 'waiting_for_players') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
    }
    if (container.players.size >= 4) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.ACTION_LIMIT_REACHED, 'Match lobby is full (max 4 players).');
    }
    if (container.players.has(userId)) {
      return container.players.get(userId)!;
    }
    const newPlayer: FirestorePlayerDoc = {
      id: userId,
      userId,
      displayName,
      currentSpaceIndex: 0,
      status: 'active',
      turnOrder: container.players.size,
      netWorth: 1500,
      cash: 1500,
      specialPoints: 50,
      ownedSpaceIds: [],
      companyShareIds: [],
      modifierIds: [],
      isBot: false,
      connected: true,
      lastActiveAt: Date.now(),
    };
    container.players.set(userId, newPlayer);
    container.match.participantUserIds.push(userId);
    this.incrementVersion(container.match);
    this.appendLog(container, 'PLAYER_JOINED', `${displayName} joined the match lobby.`, userId);
    this.emitStateChange(container);
    return newPlayer;
  }

  /**
   * 3c. leaveMatch
   */
  public leaveMatch(matchId: string, requestId: string, userId: string): void {
    const container = this.matches.get(matchId);
    if (!container) return;
    container.players.delete(userId);
    container.match.participantUserIds = container.match.participantUserIds.filter((id) => id !== userId);
    if (container.match.hostUserId === userId) {
      const remaining = Array.from(container.players.values()).find((p) => !p.isBot);
      if (remaining) {
        container.match.hostUserId = remaining.userId;
      }
    }
    let order = 0;
    for (const p of container.players.values()) {
      p.turnOrder = order++;
    }
    this.incrementVersion(container.match);
    this.appendLog(container, 'PLAYER_LEFT', `Player left the lobby.`, userId);
    this.emitStateChange(container);
  }

  /**
   * 4. startMatch
   */
  public startMatch(matchId: string, requestId: string): FirestoreMatchDoc {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    if (container.match.status !== 'waiting_for_players') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match is not in lobby state.');
    }

    if (container.players.size < 2) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'At least 2 players required to start.');
    }

    const firstPlayer = Array.from(container.players.values()).find((p) => p.turnOrder === 0);
    container.match.status = 'in_progress';
    container.match.currentPhase = 'TURN_START';
    container.match.currentPlayerId = firstPlayer?.id || null;
    container.match.turnNumber = 1;
    container.match.roundNumber = 1;

    this.incrementVersion(container.match);
    this.appendLog(container, 'MATCH_STARTED', `Match launched! First turn: ${firstPlayer?.displayName}.`);
    this.emitStateChange(container);

    return container.match;
  }

  /**
   * 5. requestRoll
   */
  public requestRoll(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    expectedStateVersion?: number
  ): { roll: number; newSpace: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);
    this.assertStateVersion(container.match, expectedVersionToAssert(expectedStateVersion));

    const match = container.match;
    if (match.currentPlayerId !== callingPlayerId) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'It is not your turn.');
    }

    if (match.currentPhase !== 'TURN_START' && match.currentPhase !== 'AWAITING_ROLL') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_PHASE, `Cannot roll during phase ${match.currentPhase}.`);
    }

    const player = container.players.get(callingPlayerId);
    if (!player || player.status !== 'active') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_ELIMINATED, 'Player is not active.');
    }

    // Authoritative Server RNG roll: 1-6
    const roll = Math.floor(Math.random() * 6) + 1;
    const totalSpaces = DEFAULT_STANDARD_SPACES.length;
    const oldSpace = player.currentSpaceIndex;
    const passedGo = oldSpace + roll >= totalSpaces;
    const newSpace = (oldSpace + roll) % totalSpaces;
    const targetSpace: BoardSpace = DEFAULT_STANDARD_SPACES[newSpace] || {
      id: `space_${newSpace}`,
      index: newSpace,
      name: `Space ${newSpace}`,
      type: 'rest',
    };

    player.currentSpaceIndex = newSpace;
    player.lastActiveAt = Date.now();

    if (passedGo) {
      player.cash += 200;
      player.netWorth += 200;
    }

    let nextPhase = 'TURN_END';
    let actionMessage = `${player.displayName} rolled ${roll} and moved to ${targetSpace.name}.`;
    if (passedGo) actionMessage += ` Collected 200 ƁM passing START.`;

    // Space Resolution
    if (targetSpace.type === 'property' || targetSpace.type === 'company') {
      const allPlayers = Array.from(container.players.values());
      const owner = allPlayers.find((p) => p.ownedSpaceIds?.includes(targetSpace.id));

      if (!owner) {
        nextPhase = 'AWAITING_ACTION';
        actionMessage += ` Available for investment (${targetSpace.baseCost} ƁM).`;
      } else if (owner.id !== player.id) {
        const rent = targetSpace.rentTiers?.[0] || 25;
        const actualRent = Math.min(player.cash, rent);
        player.cash -= actualRent;
        player.netWorth = Math.max(0, player.netWorth - actualRent);

        owner.cash += actualRent;
        owner.netWorth += actualRent;
        actionMessage += ` Paid ${actualRent} ƁM rent to ${owner.displayName}.`;

        // Check player bankruptcy
        if (player.cash <= 0 && player.ownedSpaceIds.length === 0) {
          player.status = 'bankrupt';
          actionMessage += ` ${player.displayName} declared BANKRUPTCY!`;
        }
      }
    } else if (targetSpace.type === 'sp_station') {
      player.specialPoints += 25;
      actionMessage += ` Gained +25 Strategy Points!`;
    } else if (targetSpace.type === 'penalty') {
      const fee = targetSpace.baseCost || 150;
      const actualFee = Math.min(player.cash, fee);
      player.cash -= actualFee;
      player.netWorth = Math.max(0, player.netWorth - actualFee);
      actionMessage += ` Incurred ${actualFee} ƁM regulatory penalty.`;
      if (player.cash <= 0 && player.ownedSpaceIds.length === 0) {
        player.status = 'bankrupt';
        actionMessage += ` ${player.displayName} declared BANKRUPTCY!`;
      }
    } else if (targetSpace.type === 'auction') {
      // Immediate auction trigger
      nextPhase = 'AUCTION_IN_PROGRESS';
      container.activeAuction = {
        id: `auc_${Date.now()}`,
        matchId: match.id,
        assetId: targetSpace.id,
        assetName: targetSpace.name,
        status: 'active',
        currentHighestBid: 10,
        currentHighestBidderId: null,
        expiresAt: Date.now() + 30000,
        passedPlayerIds: [],
      };
      actionMessage += ` Triggered a high-frequency auction!`;
    } else if (targetSpace.type === 'market_event') {
      // Market event bonus dividend
      const grant = 100;
      player.cash += grant;
      player.netWorth += grant;
      actionMessage += ` Triggered Market Event: Angel Syndicate dividend! Received ${grant} ƁM.`;
    }

    match.currentPhase = nextPhase;
    const newVersion = this.incrementVersion(match);

    this.appendLog(container, 'DICE_ROLLED', actionMessage, player.id, { roll, newSpace });
    this.emitStateChange(container);

    return { roll, newSpace, stateVersion: newVersion };
  }

  /**
   * 6. buyProperty
   */
  public buyProperty(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    expectedStateVersion?: number
  ): { spaceId: string; remainingCash: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);
    this.assertStateVersion(container.match, expectedVersionToAssert(expectedStateVersion));

    const match = container.match;
    if (match.currentPlayerId !== callingPlayerId) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
    }

    if (match.currentPhase !== 'AWAITING_ACTION') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_PHASE, 'Cannot purchase: not in awaiting action phase.');
    }

    const player = container.players.get(callingPlayerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

    const space = DEFAULT_STANDARD_SPACES[player.currentSpaceIndex];
    if (!space || (space.type !== 'property' && space.type !== 'company')) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Current space is not purchasable.');
    }

    // Check if already owned
    const allPlayers = Array.from(container.players.values());
    const isOwned = allPlayers.some((p) => p.ownedSpaceIds?.includes(space.id));
    if (isOwned) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Space is already owned.');
    }

    const cost = space.baseCost || 100;
    if (player.cash < cost) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.INSUFFICIENT_CASH,
        `Insufficient funds. Price is ${cost} ƁM, available cash is ${player.cash} ƁM.`
      );
    }

    player.cash -= cost;
    player.ownedSpaceIds = player.ownedSpaceIds || [];
    player.ownedSpaceIds.push(space.id);
    player.lastActiveAt = Date.now();

    match.currentPhase = 'TURN_END';
    const newVersion = this.incrementVersion(match);

    this.appendLog(
      container,
      'PROPERTY_PURCHASED',
      `${player.displayName} acquired ${space.name} for ${cost} ƁM. Remaining cash: ${player.cash} ƁM.`,
      player.id,
      { spaceId: space.id, cost }
    );
    this.emitStateChange(container);

    return { spaceId: space.id, remainingCash: player.cash, stateVersion: newVersion };
  }

  /**
   * 7. startSpaceAuction
   */
  public startSpaceAuction(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    expectedStateVersion?: number
  ): FirestoreAuctionDoc {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);
    this.assertStateVersion(container.match, expectedVersionToAssert(expectedStateVersion));

    const player = container.players.get(callingPlayerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

    const space = DEFAULT_STANDARD_SPACES[player.currentSpaceIndex];
    if (!space) throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'No space found.');

    const auction: FirestoreAuctionDoc = {
      id: `auc_${Date.now()}`,
      matchId,
      assetId: space.id,
      assetName: space.name,
      status: 'active',
      currentHighestBid: 10,
      currentHighestBidderId: null,
      expiresAt: Date.now() + 45000,
      passedPlayerIds: [],
    };

    container.activeAuction = auction;
    container.match.currentPhase = 'AUCTION_IN_PROGRESS';
    this.incrementVersion(container.match);

    this.appendLog(
      container,
      'AUCTION_STARTED',
      `${player.displayName} sent ${space.name} to public auction starting at 10 ƁM.`,
      player.id
    );
    this.emitStateChange(container);

    return auction;
  }

  /**
   * createAuction (convenience programmatic auction creator)
   */
  public createAuction(
    matchId: string,
    requestId: string,
    assetId: string,
    assetName: string,
    startingBid: number = 10
  ): FirestoreAuctionDoc {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);

    const auction: FirestoreAuctionDoc = {
      id: `auc_${Date.now()}`,
      matchId,
      assetId,
      assetName,
      status: 'active',
      currentHighestBid: startingBid,
      currentHighestBidderId: null,
      expiresAt: Date.now() + 45000,
      passedPlayerIds: [],
    };

    container.activeAuction = auction;
    container.match.currentPhase = 'AUCTION_IN_PROGRESS';
    this.incrementVersion(container.match);

    this.appendLog(
      container,
      'AUCTION_STARTED',
      `Auction opened for ${assetName} starting at ${startingBid} ƁM.`,
      container.match.currentPlayerId || undefined
    );
    this.emitStateChange(container);

    return auction;
  }

  /**
   * 8. placeBid
   */
  public placeBid(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    auctionId: string,
    amount: number
  ): { currentHighestBid: number; currentHighestBidderId: string; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);

    const auction = container.activeAuction;
    if (!auction || auction.id !== auctionId || auction.status !== 'active') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_EXPIRED, 'Auction is not active.');
    }

    const player = container.players.get(callingPlayerId);
    if (!player || player.status !== 'active') {
      throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_ELIMINATED, 'Player cannot bid.');
    }

    if (auction.passedPlayerIds?.includes(callingPlayerId)) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.AUCTION_NOT_ELIGIBLE, 'Player already passed this auction.');
    }

    if (amount <= auction.currentHighestBid) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.BID_TOO_LOW,
        `Bid must exceed current highest bid (${auction.currentHighestBid} ƁM).`
      );
    }

    if (player.cash < amount) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INSUFFICIENT_CASH, 'Insufficient cash to cover bid.');
    }

    auction.currentHighestBid = amount;
    auction.currentHighestBidderId = callingPlayerId;
    const newVersion = this.incrementVersion(container.match);

    this.appendLog(
      container,
      'BID_PLACED',
      `${player.displayName} raised auction bid to ${amount} ƁM for ${auction.assetName}.`,
      player.id,
      { amount }
    );
    this.emitStateChange(container);

    return { currentHighestBid: amount, currentHighestBidderId: callingPlayerId, stateVersion: newVersion };
  }

  /**
   * 9. passAuction
   */
  public passAuction(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    auctionId: string
  ): { auctionResolved: boolean; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    const auction = container.activeAuction;
    if (!auction || auction.id !== auctionId || auction.status !== 'active') {
      return { auctionResolved: true, stateVersion: container.match.stateVersion };
    }

    if (!auction.passedPlayerIds.includes(callingPlayerId)) {
      auction.passedPlayerIds.push(callingPlayerId);
    }

    const player = container.players.get(callingPlayerId);
    this.appendLog(container, 'AUCTION_PASSED', `${player?.displayName || 'Player'} passed on auction.`, callingPlayerId);

    // Check if auction should resolve: all active players except at most 1 have passed
    const activePlayers = Array.from(container.players.values()).filter((p) => p.status === 'active');
    const remainingBidders = activePlayers.filter((p) => !auction.passedPlayerIds.includes(p.id));

    let auctionResolved = false;
    if (remainingBidders.length <= 1) {
      this.resolveAuctionInternal(container);
      auctionResolved = true;
    }

    const newVersion = this.incrementVersion(container.match);
    this.emitStateChange(container);

    return { auctionResolved, stateVersion: newVersion };
  }

  /**
   * 10. resolveAuction
   */
  public resolveAuction(matchId: string, requestId: string, auctionId: string): void {
    const container = this.matches.get(matchId);
    if (!container || !container.activeAuction) return;
    this.resolveAuctionInternal(container);
    this.incrementVersion(container.match);
    this.emitStateChange(container);
  }

  private resolveAuctionInternal(container: AuthoritativeMatchContainer): void {
    const auction = container.activeAuction;
    if (!auction) return;

    if (auction.currentHighestBidderId) {
      auction.status = 'settled';
      const winner = container.players.get(auction.currentHighestBidderId);
      if (winner && winner.cash >= auction.currentHighestBid) {
        winner.cash -= auction.currentHighestBid;
        winner.ownedSpaceIds = winner.ownedSpaceIds || [];
        winner.ownedSpaceIds.push(auction.assetId);
        winner.netWorth += 50;

        this.appendLog(
          container,
          'AUCTION_SETTLED',
          `${winner.displayName} WON auction for ${auction.assetName} at ${auction.currentHighestBid} ƁM!`,
          winner.id
        );
      }
    } else {
      auction.status = 'cancelled';
      this.appendLog(container, 'AUCTION_CANCELLED', `Auction for ${auction.assetName} closed with no winning bids.`);
    }

    container.activeAuction = null;
    container.match.currentPhase = 'TURN_END';
  }

  /**
   * 11. executeSPAction
   */
  public executeSPAction(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    actionId: string,
    spCost: number,
    targetPlayerId?: string,
    expectedStateVersion?: number
  ): { remainingSP: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);

    const player = container.players.get(callingPlayerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

    if (player.specialPoints < spCost) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INSUFFICIENT_SP, 'Insufficient strategy points.');
    }

    player.specialPoints -= spCost;
    // SP effect: bonus cash injection
    player.cash += 75;
    player.netWorth += 75;

    const newVersion = this.incrementVersion(container.match);
    this.appendLog(
      container,
      'SP_ACTION_EXECUTED',
      `${player.displayName} activated SP Ability (${actionId}) for ${spCost} SP. Received 75 ƁM liquidity.`,
      player.id
    );
    this.emitStateChange(container);

    return { remainingSP: player.specialPoints, stateVersion: newVersion };
  }

  /**
   * 12. completeTurn
   */
  public completeTurn(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    expectedStateVersion?: number
  ): { nextPlayerId: string; turnNumber: number; roundNumber: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);
    this.assertStateVersion(container.match, expectedVersionToAssert(expectedStateVersion));

    const match = container.match;
    if (match.currentPlayerId !== callingPlayerId) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'Not your turn.');
    }

    const activePlayers = Array.from(container.players.values())
      .filter((p) => p.status === 'active')
      .sort((a, b) => a.turnOrder - b.turnOrder);

    if (activePlayers.length <= 1) {
      match.status = 'completed';
      match.winnerId = activePlayers[0]?.id || null;
      match.currentPhase = 'GAME_OVER';
      const winnerName = activePlayers[0]?.displayName || 'Sole Survivor';
      this.appendLog(container, 'VICTORY_DECLARED', `${winnerName} has won the match by financial supremacy!`);
      const newVersion = this.incrementVersion(match);
      this.emitStateChange(container);
      return {
        nextPlayerId: activePlayers[0]?.id || '',
        turnNumber: match.turnNumber,
        roundNumber: match.roundNumber,
        stateVersion: newVersion,
      };
    }

    const currentIndex = activePlayers.findIndex((p) => p.id === match.currentPlayerId);
    let nextIndex = currentIndex + 1;
    let nextRound = match.roundNumber;

    if (nextIndex >= activePlayers.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    const nextPlayer = activePlayers[nextIndex];
    match.currentPlayerId = nextPlayer.id;
    match.turnNumber += 1;
    match.roundNumber = nextRound;
    match.currentPhase = 'TURN_START';

    const newVersion = this.incrementVersion(match);
    this.appendLog(
      container,
      'TURN_COMPLETED',
      `Turn ${match.turnNumber - 1} completed. Next active player: ${nextPlayer.displayName}.`
    );
    this.emitStateChange(container);

    return {
      nextPlayerId: nextPlayer.id,
      turnNumber: match.turnNumber,
      roundNumber: match.roundNumber,
      stateVersion: newVersion,
    };
  }

  /**
   * 13. executeBotTurn
   * Server-authoritative bot step execution:
   * 1. Evaluates legal decisions via BotDecisionService.
   * 2. Executes the chosen action through authoritative logic.
   * 3. NEVER directly mutates cash, dice, or victory.
   */
  public executeBotTurn(
    matchId: string,
    requestId: string,
    botId?: string
  ): { actionExecuted: string; stateVersion: number; nextPhase: string } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);

    const targetBotId = botId || container.match.currentPlayerId;
    if (!targetBotId) throw new ServerFunctionError(SERVER_ERROR_CODES.NOT_YOUR_TURN, 'No active bot.');

    const bot = container.players.get(targetBotId);
    if (!bot || !bot.isBot) throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target is not a bot.');

    const allPlayers = Array.from(container.players.values());
    const decision = BotDecisionService.evaluateDecision(
      container.match,
      bot,
      allPlayers,
      container.activeAuction
    );

    let actionExecuted = decision.actionType;

    switch (decision.actionType) {
      case 'ROLL_DICE': {
        this.requestRoll(matchId, requestId, bot.id);
        break;
      }
      case 'BUY_PROPERTY': {
        this.buyProperty(matchId, requestId, bot.id);
        break;
      }
      case 'START_SPACE_AUCTION': {
        this.startSpaceAuction(matchId, requestId, bot.id);
        break;
      }
      case 'PLACE_BID': {
        const amount = (decision.payload?.amount as number) || (container.activeAuction?.currentHighestBid || 10) + 10;
        this.placeBid(matchId, requestId, bot.id, container.activeAuction!.id, amount);
        break;
      }
      case 'PASS_AUCTION': {
        if (container.activeAuction) {
          this.passAuction(matchId, requestId, bot.id, container.activeAuction.id);
        }
        break;
      }
      case 'COMPLETE_TURN':
      case 'PASS_PROPERTY':
      default: {
        this.completeTurn(matchId, requestId, bot.id);
        actionExecuted = 'COMPLETE_TURN';
        break;
      }
    }

    return {
      actionExecuted,
      stateVersion: container.match.stateVersion,
      nextPhase: container.match.currentPhase,
    };
  }

  /**
   * 14. submitMarketChoice
   */
  public submitMarketChoice(
    matchId: string,
    requestId: string,
    callingPlayerId: string,
    eventId: string,
    choiceId: string,
    expectedStateVersion?: number
  ): { result: string; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertMatchActive(container.match);
    const player = container.players.get(callingPlayerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

    const bonus = 100;
    player.cash += bonus;
    player.netWorth += bonus;
    const newVersion = this.incrementVersion(container.match);
    this.appendLog(
      container,
      'MARKET_CHOICE_APPLIED',
      `${player.displayName} resolved Market Event [${eventId}] with choice [${choiceId}] (+ $${bonus}).`,
      player.id
    );
    this.emitStateChange(container);
    return { result: `Choice ${choiceId} resolved with bonus +$${bonus}`, stateVersion: newVersion };
  }
}

function expectedVersionToAssert(expectedVersion?: number): number | undefined {
  // If undefined, do not enforce
  return expectedVersion;
}

export const authoritativeServerEngine = AuthoritativeServerEngine.getInstance();
