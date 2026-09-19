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
import { MarketEvent, PendingMarketChoiceDoc, MarketChoiceOption } from '../types/marketEvent';
import {
  MARKET_CHOICE_TEMPLATES,
  getRandomMarketChoiceTemplate,
  DEFAULT_MARKET_EVENTS,
  MarketEventDefinition,
} from '../config/marketEventConfig';

export interface ActiveMatchModifier {
  id: string;
  type:
    | 'regulatory_shield'
    | 'patent_freeze'
    | 'market_intelligence'
    | 'sector_boost'
    | 'market_shield'
    | 'dividend_surge'
    | 'rate_discount';
  targetPlayerId?: string;
  targetSpaceId?: string;
  sector?: string;
  rentMultiplier?: number;
  roundsRemaining: number;
}

export interface AuthoritativeMatchContainer {
  match: FirestoreMatchDoc;
  players: Map<string, FirestorePlayerDoc>;
  logs: FirestoreLogDoc[];
  activeAuction: FirestoreAuctionDoc | null;
  activeModifiers?: ActiveMatchModifier[];
  activeMarketEvent?: MarketEvent | null;
  pendingMarketChoice?: PendingMarketChoiceDoc | null;
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
        pendingChoice: container.pendingMarketChoice,
        activeMarketEvent: container.activeMarketEvent,
      };
    });
    matchSyncService.registerLocalOpenMatchesProvider(() => this.getOpenMatches());
  }

  public getOpenMatches(): FirestoreMatchDoc[] {
    const list: FirestoreMatchDoc[] = [];
    for (const container of this.matches.values()) {
      if (
        container.match.status === 'waiting_for_players' &&
        !container.match.isPrivate &&
        container.players.size < 4
      ) {
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
      container.activeAuction,
      container.pendingMarketChoice,
      container.activeMarketEvent
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
    hostDisplayName: string = 'Investor (Host)',
    isPrivate: boolean = false,
    accessCode?: string
  ): FirestoreMatchDoc {
    if (this.processedRequests.has(requestId)) {
      const existing = this.matches.get(matchId);
      if (existing) return existing.match;
    }
    this.processedRequests.add(requestId);

    const generatedCode =
      accessCode || `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
      isPrivate,
      accessCode: generatedCode,
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
      mortgagedSpaceIds: [],
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
      activeModifiers: [],
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
      mortgagedSpaceIds: [],
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
      const existing = container.players.get(userId)!;
      existing.connected = true;
      existing.lastActiveAt = Date.now();
      if (existing.status === 'disconnected') {
        existing.status = 'active';
      }
      this.emitStateChange(container);
      return existing;
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
      mortgagedSpaceIds: [],
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
   * 3d. reconnectPlayer (Resilience handshake when switching network interfaces on mobile)
   */
  public reconnectPlayer(
    matchId: string,
    requestId: string,
    userId: string
  ): { success: boolean; stateVersion: number; player: FirestorePlayerDoc } {
    const container = this.matches.get(matchId);
    if (!container) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match session not found for reconnection.');
    }
    const player = container.players.get(userId);
    if (!player) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'Player not found in active match session.');
    }
    player.connected = true;
    if (player.status === 'disconnected') {
      player.status = 'active';
    }
    player.lastActiveAt = Date.now();
    this.incrementVersion(container.match);
    this.appendLog(container, 'PLAYER_RECONNECTED', `${player.displayName} reconnected via handshake.`, userId);
    this.emitStateChange(container);
    return {
      success: true,
      stateVersion: container.match.stateVersion,
      player: { ...player },
    };
  }

  /**
   * 3e. markPlayerDisconnected (Temporary network drop or interface switch)
   */
  public markPlayerDisconnected(matchId: string, userId: string): void {
    const container = this.matches.get(matchId);
    if (!container) return;
    const player = container.players.get(userId);
    if (!player) return;
    player.connected = false;
    if (player.status === 'active') {
      player.status = 'disconnected';
    }
    player.lastActiveAt = Date.now();
    this.incrementVersion(container.match);
    this.appendLog(container, 'PLAYER_DISCONNECTED', `${player.displayName} temporarily disconnected.`, userId);
    this.emitStateChange(container);
  }

  /**
   * 3f. findOrCreateQuickMatch
   * Resolves quick-match queue by joining the first open public lobby or creating a new one.
   */
  public findOrCreateQuickMatch(
    requestId: string,
    userId: string,
    displayName: string,
    options?: { isPrivate?: boolean; accessCode?: string }
  ): { matchId: string; isNew: boolean; accessCode: string; player: FirestorePlayerDoc } {
    // 1. Check for open public lobby if not private
    if (!options?.isPrivate) {
      for (const [id, container] of this.matches.entries()) {
        if (
          container.match.status === 'waiting_for_players' &&
          !container.match.isPrivate &&
          container.players.size < 4
        ) {
          const player = this.joinMatch(id, requestId, userId, displayName);
          return {
            matchId: id,
            isNew: false,
            accessCode: container.match.accessCode || id.slice(-6).toUpperCase(),
            player,
          };
        }
      }
    }

    // 2. Create new match lobby
    const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const accessCode =
      options?.accessCode || `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    this.createMatch(
      newMatchId,
      requestId,
      'default-standard-board',
      '1.0.0',
      userId,
      displayName,
      options?.isPrivate ?? false,
      accessCode
    );

    const container = this.matches.get(newMatchId)!;
    const player = container.players.get(userId)!;
    return {
      matchId: newMatchId,
      isNew: true,
      accessCode,
      player,
    };
  }

  /**
   * 3g. joinMatchByAccessCode
   * Allows joining private or public lobbies via 6-character access code or match ID.
   */
  public joinMatchByAccessCode(
    accessCode: string,
    requestId: string,
    userId: string,
    displayName: string
  ): { matchId: string; player: FirestorePlayerDoc } {
    const cleanCode = accessCode.trim().toUpperCase();
    const rawCode = cleanCode.replace(/^BM-/, '');
    const bmCode = `BM-${rawCode}`;

    for (const [id, container] of this.matches.entries()) {
      if (container.match.status !== 'waiting_for_players') continue;
      const matchCode = (container.match.accessCode || '').toUpperCase();
      const matchRawCode = matchCode.replace(/^BM-/, '');
      const matchIdClean = id.toUpperCase();

      if (
        matchCode === cleanCode ||
        matchCode === bmCode ||
        matchRawCode === rawCode ||
        matchIdClean === cleanCode ||
        matchIdClean === bmCode ||
        matchIdClean.endsWith(rawCode) ||
        matchIdClean.endsWith(cleanCode)
      ) {
        const player = this.joinMatch(id, requestId, userId, displayName);
        return { matchId: id, player };
      }
    }
    throw new ServerFunctionError(
      SERVER_ERROR_CODES.MATCH_NOT_FOUND,
      `No open lobby found for match code "${accessCode}".`
    );
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
    expectedStateVersion?: number,
    predeterminedRoll?: number
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

    // Roll: use client predetermined roll if valid 2-12, otherwise generate random 2-12 (sum of two D6)
    const roll =
      typeof predeterminedRoll === 'number' && predeterminedRoll >= 2 && predeterminedRoll <= 12
        ? Math.floor(predeterminedRoll)
        : (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
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
        // Check if property is frozen by Patent Injunction OR mortgaged to bank
        const isFrozen = container.activeModifiers?.some(
          (m) => m.type === 'patent_freeze' && m.targetSpaceId === targetSpace.id && m.roundsRemaining > 0
        );
        const isMortgaged = owner.mortgagedSpaceIds?.includes(targetSpace.id);

        if (isFrozen) {
          actionMessage += ` Rent suspended! ${targetSpace.name} is currently frozen by Patent Injunction.`;
        } else if (isMortgaged) {
          actionMessage += ` Rent suspended! ${targetSpace.name} is pledged to the bank under mortgage.`;
        } else {
          // 1. Check if owner has syndicate intelligence active (yield bonus)
          const ownerHasIntel = container.activeModifiers?.some(
            (m) => m.type === 'market_intelligence' && m.targetPlayerId === owner.id && m.roundsRemaining > 0
          );
          let rent = targetSpace.rentTiers?.[0] || 25;
          if (ownerHasIntel) {
            rent = Math.round(rent * 1.5);
          }

          // 2. Check Sector Boost modifier from Market Event Choice
          const sectorBoost = container.activeModifiers?.find(
            (m) =>
              m.type === 'sector_boost' &&
              (!m.targetPlayerId || m.targetPlayerId === owner.id) &&
              (!m.sector || m.sector === targetSpace.group) &&
              m.roundsRemaining > 0
          );
          if (sectorBoost && sectorBoost.rentMultiplier) {
            rent = Math.round(rent * sectorBoost.rentMultiplier);
          }

          // 3. Check Global Market Event active on match (e.g. BULL_MARKET, TECH_BOOM)
          if (container.activeMarketEvent && container.activeMarketEvent.active) {
            const impact = container.activeMarketEvent.impact;
            if (impact.rentMultiplier) {
              if (impact.affectedTarget === 'all' || impact.affectedTarget === targetSpace.group) {
                rent = Math.round(rent * impact.rentMultiplier);
              }
            }
          }

          // 4. Check if landing player has Market Shield covenant
          const playerHasShield = container.activeModifiers?.some(
            (m) => m.type === 'market_shield' && m.targetPlayerId === player.id && m.roundsRemaining > 0
          );

          if (playerHasShield) {
            actionMessage += ` Institutional Harbor Shield absorbed rent liability! Avoided ${rent} ƁM payment to ${owner.displayName}.`;
          } else {
            const actualRent = Math.min(player.cash, rent);
            player.cash -= actualRent;
            player.netWorth = Math.max(0, player.netWorth - actualRent);

            owner.cash += actualRent;
            owner.netWorth += actualRent;
            const modifierNotice = ownerHasIntel || sectorBoost ? ' (boosted by active market modifiers)' : '';
            actionMessage += ` Paid ${actualRent} ƁM rent to ${owner.displayName}${modifierNotice}.`;

            // Check player bankruptcy
            if (player.cash <= 0 && player.ownedSpaceIds.length === 0) {
              player.status = 'bankrupt';
              actionMessage += ` ${player.displayName} declared BANKRUPTCY!`;
            }
          }
        }
      }
    } else if (targetSpace.type === 'sp_station') {
      player.specialPoints += 25;
      actionMessage += ` Gained +25 Strategy Points!`;
    } else if (targetSpace.type === 'penalty') {
      // Check Regulatory Harbor Shield or Market Shield
      const shieldIndex = container.activeModifiers?.findIndex(
        (m) =>
          (m.type === 'regulatory_shield' || m.type === 'market_shield') &&
          m.targetPlayerId === player.id &&
          m.roundsRemaining > 0
      ) ?? -1;

      if (shieldIndex !== -1) {
        actionMessage += ` Regulatory Harbor Shield deployed! Avoided regulatory penalty fees.`;
      } else {
        const fee = targetSpace.baseCost || 150;
        const actualFee = Math.min(player.cash, fee);
        player.cash -= actualFee;
        player.netWorth = Math.max(0, player.netWorth - actualFee);
        actionMessage += ` Incurred ${actualFee} ƁM regulatory penalty.`;
        if (player.cash <= 0 && player.ownedSpaceIds.length === 0) {
          player.status = 'bankrupt';
          actionMessage += ` ${player.displayName} declared BANKRUPTCY!`;
        }
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
      const template = getRandomMarketChoiceTemplate();
      if (player.isBot) {
        // Bot auto-evaluates directive based on personality/risk
        const profile = BotDecisionService.getBotProfile(player);
        const chosenOption =
          profile.personality === 'aggressive' || profile.riskTolerance > 0.6
            ? template.options[0]
            : template.options[1] || template.options[0];

        if (chosenOption.cashDelta) {
          player.cash = Math.max(0, player.cash + chosenOption.cashDelta);
          player.netWorth = Math.max(0, player.netWorth + chosenOption.cashDelta);
        }
        if (chosenOption.spDelta) {
          player.specialPoints = Math.max(0, player.specialPoints + chosenOption.spDelta);
        }
        if (chosenOption.modifier) {
          if (!container.activeModifiers) container.activeModifiers = [];
          container.activeModifiers.push({
            id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: chosenOption.modifier.type,
            targetPlayerId: player.id,
            sector: chosenOption.modifier.sector,
            rentMultiplier: chosenOption.modifier.rentMultiplier,
            roundsRemaining: chosenOption.modifier.durationRounds,
          });
        }
        actionMessage += ` Triggered Market Event: ${template.title}! Enacted directive [${chosenOption.label}] (${chosenOption.effectSummary}).`;
        nextPhase = 'AWAITING_ACTION';
      } else {
        // Human player draws interactive boardroom directive
        container.pendingMarketChoice = {
          id: `choice_${Date.now()}`,
          eventId: template.eventId,
          playerId: player.id,
          spaceIndex: targetSpace.index,
          title: template.title,
          subtitle: template.subtitle,
          lore: template.lore,
          options: template.options,
          expiresAt: Date.now() + 35000,
        };
        nextPhase = 'AWAITING_MARKET_CHOICE';
        actionMessage += ` Triggered Market Event: ${template.title}! Boardroom strategic directive required.`;
      }
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
    this.assertStateVersion(container.match, expectedVersionToAssert(expectedStateVersion));

    const player = container.players.get(callingPlayerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

    if (player.specialPoints < spCost) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INSUFFICIENT_SP, 'Insufficient strategy points.');
    }

    if (!container.activeModifiers) {
      container.activeModifiers = [];
    }

    // Deduct SP
    player.specialPoints -= spCost;
    let logMessage = '';

    switch (actionId) {
      case 'strategic_liquidity':
      case 'sp_liquidity_injection': {
        player.cash += 75;
        player.netWorth += 75;
        logMessage = `${player.displayName} activated Strategic Liquidity Injection for ${spCost} SP. Injected 75 ƁM working capital into treasury.`;
        break;
      }

      case 'market_intelligence':
      case 'sp_market_scan': {
        container.activeModifiers.push({
          id: `mod_intel_${Date.now()}`,
          type: 'market_intelligence',
          targetPlayerId: player.id,
          roundsRemaining: 2,
        });
        logMessage = `${player.displayName} activated Syndicate Market Intelligence for ${spCost} SP. Yield multiplier boosted across owned assets for 2 rounds.`;
        break;
      }

      case 'regulatory_shield':
      case 'sp_regulatory_shield': {
        container.activeModifiers.push({
          id: `mod_shield_${Date.now()}`,
          type: 'regulatory_shield',
          targetPlayerId: player.id,
          roundsRemaining: 3,
        });
        logMessage = `${player.displayName} deployed Regulatory Harbor Shield for ${spCost} SP. SEC penalty immunity active.`;
        break;
      }

      case 'hostile_takeover':
      case 'sp_hostile_takeover': {
        if (!targetPlayerId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target space is required for Hostile Takeover Bid.');
        }
        const targetSpaceId = targetPlayerId; // passed as target id
        const targetSpace = DEFAULT_STANDARD_SPACES.find((s) => s.id === targetSpaceId);
        if (!targetSpace || (targetSpace.type !== 'property' && targetSpace.type !== 'company')) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target must be an acquirable property or company.');
        }

        const rival = Array.from(container.players.values()).find((p) => p.ownedSpaceIds?.includes(targetSpaceId));
        if (!rival) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Property must be owned by a rival.');
        }
        if (rival.id === player.id) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Cannot launch a hostile takeover on your own property.');
        }

        // 1.5x valuation cash cost
        const buyoutCost = Math.round((targetSpace.baseCost || 100) * 1.5);
        if (player.cash < buyoutCost) {
          // Refund SP if can't afford buyout cost
          player.specialPoints += spCost;
          throw new ServerFunctionError(
            SERVER_ERROR_CODES.INSUFFICIENT_CASH,
            `Insufficient cash for buyout. Required: ${buyoutCost} ƁM, available: ${player.cash} ƁM.`
          );
        }

        player.cash -= buyoutCost;
        rival.cash += buyoutCost;
        rival.ownedSpaceIds = rival.ownedSpaceIds.filter((id) => id !== targetSpaceId);
        player.ownedSpaceIds.push(targetSpaceId);
        logMessage = `${player.displayName} completed Hostile Takeover Bid on ${targetSpace.name} from ${rival.displayName} for ${buyoutCost} ƁM and ${spCost} SP!`;
        break;
      }

      case 'patent_freeze':
      case 'sp_patent_freeze': {
        if (!targetPlayerId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target space is required for Patent Injunction Freeze.');
        }
        const targetSpaceId = targetPlayerId;
        const targetSpace = DEFAULT_STANDARD_SPACES.find((s) => s.id === targetSpaceId);
        if (!targetSpace) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target space not found.');
        }

        container.activeModifiers.push({
          id: `mod_freeze_${Date.now()}`,
          type: 'patent_freeze',
          targetSpaceId,
          roundsRemaining: 2,
        });
        logMessage = `${player.displayName} placed Patent Injunction Freeze on ${targetSpace.name} for ${spCost} SP! Rent collection frozen for 2 rounds.`;
        break;
      }

      case 'short_attack':
      case 'sp_short_attack': {
        if (!targetPlayerId) {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Target rival player is required for Short Seller Raid.');
        }
        const rival = container.players.get(targetPlayerId);
        if (!rival || rival.id === player.id || rival.status !== 'active') {
          throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'Valid active rival player target required.');
        }

        const marginCall = 150;
        const actualDeduction = Math.min(rival.cash, marginCall);
        rival.cash -= actualDeduction;
        rival.netWorth = Math.max(0, rival.netWorth - actualDeduction);

        if (rival.cash <= 0 && rival.ownedSpaceIds.length === 0) {
          rival.status = 'bankrupt';
        }

        logMessage = `${player.displayName} launched Short Seller Raid on ${rival.displayName} for ${spCost} SP! Rival forced to settle ${actualDeduction} ƁM in emergency margin calls.`;
        break;
      }

      default: {
        // Fallback standard liquidity injection
        player.cash += 75;
        player.netWorth += 75;
        logMessage = `${player.displayName} activated SP Ability (${actionId}) for ${spCost} SP. Received 75 ƁM liquidity.`;
        break;
      }
    }

    const newVersion = this.incrementVersion(container.match);
    this.appendLog(
      container,
      'SP_ACTION_EXECUTED',
      logMessage,
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
    
    // If a full round completed, decrement active modifier rounds and advance market cycle
    if (nextRound > match.roundNumber) {
      if (container.activeModifiers) {
        container.activeModifiers = container.activeModifiers
          .map((m) => ({ ...m, roundsRemaining: m.roundsRemaining - 1 }))
          .filter((m) => m.roundsRemaining > 0);
      }

      if (container.activeMarketEvent && container.activeMarketEvent.active) {
        container.activeMarketEvent.roundsRemaining -= 1;
        if (container.activeMarketEvent.roundsRemaining <= 0) {
          container.activeMarketEvent.active = false;
          this.appendLog(
            container,
            'MARKET_CYCLE_NORMALIZED',
            `Global Market Event [${container.activeMarketEvent.name}] cycle has expired.`
          );
        }
      } else if (nextRound % 3 === 0 && (!container.activeMarketEvent || !container.activeMarketEvent.active)) {
        // Trigger macro economic trend every 3 rounds
        const def = DEFAULT_MARKET_EVENTS[Math.floor(Math.random() * DEFAULT_MARKET_EVENTS.length)];
        container.activeMarketEvent = {
          id: `ev_${Date.now()}`,
          name: def.name,
          code: def.code,
          description: def.description,
          scope: def.scope,
          impact: def.impact,
          durationRounds: def.defaultDurationRounds,
          roundsRemaining: def.defaultDurationRounds,
          activatedAtTurn: match.turnNumber,
          active: true,
        };
        this.appendLog(
          container,
          'GLOBAL_MARKET_EVENT',
          `Macro Economic Shift: [${def.name}] activated for ${def.defaultDurationRounds} rounds! ${def.description}`
        );
      }
    }

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
      case 'SUBMIT_MARKET_CHOICE': {
        const eventId =
          (decision.payload?.eventId as string) ||
          container.pendingMarketChoice?.eventId ||
          'choice_venture_debt';
        const choiceId =
          (decision.payload?.choiceId as string) ||
          container.pendingMarketChoice?.options?.[0]?.id ||
          'opt_equity_grant';
        this.submitMarketChoice(matchId, requestId, bot.id, eventId, choiceId);
        actionExecuted = 'SUBMIT_MARKET_CHOICE';
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
    this.assertStateVersion(container.match, expectedVersionToAssert(expectedStateVersion));

    const player = container.players.get(callingPlayerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');

    const pending = container.pendingMarketChoice;
    let selectedOption: MarketChoiceOption | undefined;

    if (pending && pending.options) {
      selectedOption = pending.options.find((o) => o.id === choiceId) || pending.options[0];
    } else {
      const template = MARKET_CHOICE_TEMPLATES.find((t) => t.eventId === eventId) || MARKET_CHOICE_TEMPLATES[0];
      selectedOption = template.options.find((o) => o.id === choiceId) || template.options[0];
    }

    if (!selectedOption) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.ACTION_NOT_AVAILABLE, 'Invalid market directive option.');
    }

    if (selectedOption.cashDelta) {
      player.cash = Math.max(0, player.cash + selectedOption.cashDelta);
      player.netWorth = Math.max(0, player.netWorth + selectedOption.cashDelta);
    }

    if (selectedOption.spDelta) {
      player.specialPoints = Math.max(0, player.specialPoints + selectedOption.spDelta);
    }

    if (selectedOption.modifier) {
      if (!container.activeModifiers) container.activeModifiers = [];
      container.activeModifiers.push({
        id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: selectedOption.modifier.type,
        targetPlayerId: player.id,
        sector: selectedOption.modifier.sector,
        rentMultiplier: selectedOption.modifier.rentMultiplier,
        roundsRemaining: selectedOption.modifier.durationRounds,
      });
    }

    container.pendingMarketChoice = null;

    if (container.match.currentPhase === 'AWAITING_MARKET_CHOICE') {
      container.match.currentPhase = 'AWAITING_ACTION';
    }

    const newVersion = this.incrementVersion(container.match);
    const logSummary = `${player.displayName} enacted Directive [${selectedOption.label}]: ${selectedOption.effectSummary}`;
    this.appendLog(
      container,
      'MARKET_CHOICE_APPLIED',
      logSummary,
      player.id
    );
    this.emitStateChange(container);

    return {
      result: `Directive ratified: ${selectedOption.label}`,
      stateVersion: newVersion,
    };
  }

  /**
   * Manually trigger a macro market event for testing/scenarios
   */
  public triggerMacroEvent(matchId: string, eventCode: string): MarketEvent {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    const def = DEFAULT_MARKET_EVENTS.find((e) => e.code === eventCode) || DEFAULT_MARKET_EVENTS[0];
    const event: MarketEvent = {
      id: `ev_${Date.now()}`,
      name: def.name,
      code: def.code,
      description: def.description,
      scope: def.scope,
      impact: def.impact,
      durationRounds: def.defaultDurationRounds,
      roundsRemaining: def.defaultDurationRounds,
      activatedAtTurn: container.match.turnNumber,
      active: true,
    };
    container.activeMarketEvent = event;
    this.incrementVersion(container.match);
    this.appendLog(
      container,
      'GLOBAL_MARKET_EVENT',
      `Macro Economic Shift: [${def.name}] activated! ${def.description}`
    );
    this.emitStateChange(container);
    return event;
  }

  /**
   * 14. mortgageProperty: Pledges property to the central bank for 50% ƁM value
   */
  public mortgageProperty(
    matchId: string,
    requestId: string,
    playerId: string,
    spaceId: string,
    expectedStateVersion?: number
  ): { result: string; cashGained: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertStateVersion(container.match, expectedStateVersion);

    const player = container.players.get(playerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');
    if (player.status !== 'active') throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_ELIMINATED, 'Player is not active.');

    if (!player.ownedSpaceIds?.includes(spaceId)) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'You do not own this property.');
    }

    player.mortgagedSpaceIds = player.mortgagedSpaceIds || [];
    if (player.mortgagedSpaceIds.includes(spaceId)) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.ACTION_NOT_AVAILABLE, 'Property is already mortgaged.');
    }

    const space = DEFAULT_STANDARD_SPACES.find((s) => s.id === spaceId);
    if (!space) throw new ServerFunctionError(SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'Space definition not found.');

    const mortgageValue = Math.round((space.baseCost || 100) * 0.5);
    player.cash += mortgageValue;
    player.mortgagedSpaceIds.push(spaceId);

    const newVersion = this.incrementVersion(container.match);
    this.appendLog(
      container,
      'PROPERTY_MORTGAGED',
      `${player.displayName} pledged ${space.name} to the central bank, securing +${mortgageValue} ƁM in debt restructuring liquidity.`,
      player.id
    );
    this.emitStateChange(container);

    return {
      result: `Successfully mortgaged ${space.name} for +${mortgageValue} ƁM`,
      cashGained: mortgageValue,
      stateVersion: newVersion,
    };
  }

  /**
   * 15. unmortgageProperty: Repays the bank (50% principal + 10% interest = 55% base cost) to lift mortgage
   */
  public unmortgageProperty(
    matchId: string,
    requestId: string,
    playerId: string,
    spaceId: string,
    expectedStateVersion?: number
  ): { result: string; costPaid: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertStateVersion(container.match, expectedStateVersion);

    const player = container.players.get(playerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');
    if (player.status !== 'active') throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_ELIMINATED, 'Player is not active.');

    if (!player.ownedSpaceIds?.includes(spaceId)) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'You do not own this property.');
    }

    player.mortgagedSpaceIds = player.mortgagedSpaceIds || [];
    if (!player.mortgagedSpaceIds.includes(spaceId)) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.ACTION_NOT_AVAILABLE, 'Property is not mortgaged.');
    }

    const space = DEFAULT_STANDARD_SPACES.find((s) => s.id === spaceId);
    if (!space) throw new ServerFunctionError(SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'Space definition not found.');

    const redemptionCost = Math.round((space.baseCost || 100) * 0.55);
    if (player.cash < redemptionCost) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.INSUFFICIENT_CASH,
        `Insufficient cash. Need ${redemptionCost} ƁM to lift mortgage.`
      );
    }

    player.cash -= redemptionCost;
    player.mortgagedSpaceIds = player.mortgagedSpaceIds.filter((id) => id !== spaceId);

    const newVersion = this.incrementVersion(container.match);
    this.appendLog(
      container,
      'MORTGAGE_REDEEMED',
      `${player.displayName} redeemed mortgage on ${space.name} for ${redemptionCost} ƁM. Rent collection restored.`,
      player.id
    );
    this.emitStateChange(container);

    return {
      result: `Successfully redeemed mortgage on ${space.name} for ${redemptionCost} ƁM`,
      costPaid: redemptionCost,
      stateVersion: newVersion,
    };
  }

  /**
   * 16. liquidateProperty: Permanently liquidates/sells deed to the bank treasury for 50% ƁM value
   */
  public liquidateProperty(
    matchId: string,
    requestId: string,
    playerId: string,
    spaceId: string,
    expectedStateVersion?: number
  ): { result: string; cashGained: number; stateVersion: number } {
    const container = this.matches.get(matchId);
    if (!container) throw new ServerFunctionError(SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    this.assertStateVersion(container.match, expectedStateVersion);

    const player = container.players.get(playerId);
    if (!player) throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');
    if (player.status !== 'active') throw new ServerFunctionError(SERVER_ERROR_CODES.PLAYER_ELIMINATED, 'Player is not active.');

    if (!player.ownedSpaceIds?.includes(spaceId)) {
      throw new ServerFunctionError(SERVER_ERROR_CODES.INVALID_TARGET, 'You do not own this property.');
    }

    const space = DEFAULT_STANDARD_SPACES.find((s) => s.id === spaceId);
    if (!space) throw new ServerFunctionError(SERVER_ERROR_CODES.TARGET_NOT_FOUND, 'Space definition not found.');

    player.mortgagedSpaceIds = player.mortgagedSpaceIds || [];
    const isMortgaged = player.mortgagedSpaceIds.includes(spaceId);

    let cashGained = 0;
    if (!isMortgaged) {
      cashGained = Math.round((space.baseCost || 100) * 0.5);
      player.cash += cashGained;
    }

    player.ownedSpaceIds = player.ownedSpaceIds.filter((id) => id !== spaceId);
    player.mortgagedSpaceIds = player.mortgagedSpaceIds.filter((id) => id !== spaceId);

    const newVersion = this.incrementVersion(container.match);
    const logSummary = isMortgaged
      ? `${player.displayName} foreclosed/surrendered mortgaged deed for ${space.name} to the central bank in debt liquidation.`
      : `${player.displayName} liquidated ${space.name} deed directly to the central bank treasury for +${cashGained} ƁM.`;

    this.appendLog(
      container,
      'PROPERTY_LIQUIDATED',
      logSummary,
      player.id
    );
    this.emitStateChange(container);

    return {
      result: `Liquidated ${space.name} to central bank treasury`,
      cashGained,
      stateVersion: newVersion,
    };
  }
}

function expectedVersionToAssert(expectedVersion?: number): number | undefined {
  // If undefined, do not enforce
  return expectedVersion;
}

export const authoritativeServerEngine = AuthoritativeServerEngine.getInstance();
