/**
 * Production Bot Decision Service
 * Authoritative decision boundary for bots:
 * 1. Inspects the full authoritative state (phase, cash, SP, position, auction, pending choice).
 * 2. Computes the exact set of legal actions permissible under current rules.
 * 3. Delegates evaluation to the bot's configured strategy.
 * 4. Ensures the selected decision is strictly legal before returning.
 */

import {
  BotDecision,
  BotDecisionContext,
  BotLegalAction,
  BotProfile,
  PRESET_BOT_PROFILES,
} from './botTypes';
import { botStrategyRegistry } from './botStrategies';
import { FirestoreMatchDoc, FirestorePlayerDoc, FirestoreAuctionDoc } from '../services/firebase/matchSyncService';
import { DEFAULT_STANDARD_SPACES } from '../config/boardConfig';
import { BoardSpace } from '../types/board';

export class BotDecisionService {
  /**
   * Resolves the configured profile for a given bot player
   */
  public static getBotProfile(botPlayer: FirestorePlayerDoc): BotProfile {
    const matched = PRESET_BOT_PROFILES.find(
      (p) => p.displayName.toLowerCase() === botPlayer.displayName.toLowerCase() || p.id === botPlayer.id
    );
    if (matched) return matched;

    // Fallback profile derived from player data
    return {
      id: botPlayer.id,
      displayName: botPlayer.displayName,
      personality: 'balanced',
      avatarId: botPlayer.avatarId || 'bot-default',
      riskTolerance: 0.5,
      minReserveCash: 120,
      maxAuctionMultiplier: 1.2,
      spPreference: 'growth',
    };
  }

  /**
   * Evaluates and returns the strictly legal actions available to the bot in the current state
   */
  public static getLegalActions(
    match: FirestoreMatchDoc,
    botPlayer: FirestorePlayerDoc,
    allPlayers: FirestorePlayerDoc[],
    currentSpace: BoardSpace | null,
    activeAuction: FirestoreAuctionDoc | null
  ): BotLegalAction[] {
    const legalActions: BotLegalAction[] = [];

    // Phase: TURN_START or AWAITING_ROLL
    if (match.currentPhase === 'TURN_START' || match.currentPhase === 'AWAITING_ROLL') {
      legalActions.push({
        actionType: 'ROLL_DICE',
        description: 'Roll dice to move forward on the board.',
      });

      // If bot has SP, check if SP action is legal
      if (botPlayer.specialPoints >= 30) {
        legalActions.push({
          actionType: 'EXECUTE_SP_ACTION',
          description: 'Deploy strategy point power.',
          cost: 30,
        });
      }
      return legalActions;
    }

    // Phase: AWAITING_ACTION (landed on an unowned property/company)
    if (match.currentPhase === 'AWAITING_ACTION') {
      if (currentSpace && (currentSpace.type === 'property' || currentSpace.type === 'company')) {
        const cost = currentSpace.baseCost || 100;
        const isOwned = allPlayers.some((p) => p.ownedSpaceIds?.includes(currentSpace.id));

        if (!isOwned) {
          if (botPlayer.cash >= cost) {
            legalActions.push({
              actionType: 'BUY_PROPERTY',
              description: `Acquire ${currentSpace.name} for $${cost}.`,
              cost,
            });
          }

          legalActions.push({
            actionType: 'START_SPACE_AUCTION',
            description: `Put ${currentSpace.name} up for public auction.`,
          });

          legalActions.push({
            actionType: 'PASS_PROPERTY',
            description: `Decline purchasing ${currentSpace.name} and end turn.`,
          });
        }
      }

      // If no other action taken or space isn't buyable, can complete turn
      legalActions.push({
        actionType: 'COMPLETE_TURN',
        description: 'Finalize current turn.',
      });
      return legalActions;
    }

    // Phase: AUCTION_IN_PROGRESS
    if (match.currentPhase === 'AUCTION_IN_PROGRESS' && activeAuction) {
      const hasPassed = activeAuction.passedPlayerIds?.includes(botPlayer.id);
      const isCurrentLeader = activeAuction.currentHighestBidderId === botPlayer.id;

      if (!hasPassed && !isCurrentLeader) {
        const nextMinBid = activeAuction.currentHighestBid + 10;
        if (botPlayer.cash >= nextMinBid) {
          legalActions.push({
            actionType: 'PLACE_BID',
            description: `Bid $${nextMinBid} for ${activeAuction.assetName || 'asset'}.`,
            cost: nextMinBid,
          });
        }
      }

      legalActions.push({
        actionType: 'PASS_AUCTION',
        description: 'Pass on the active auction.',
      });
      return legalActions;
    }

    // Phase: AWAITING_MARKET_CHOICE
    if (match.currentPhase === 'AWAITING_MARKET_CHOICE') {
      legalActions.push({
        actionType: 'SUBMIT_MARKET_CHOICE',
        description: 'Ratify boardroom market directive.',
      });
      return legalActions;
    }

    // Phase: TURN_END or default
    legalActions.push({
      actionType: 'COMPLETE_TURN',
      description: 'End the current turn.',
    });

    return legalActions;
  }

  /**
   * Evaluates the optimal legal decision for the bot using its strategy profile
   */
  public static evaluateDecision(
    match: FirestoreMatchDoc,
    botPlayer: FirestorePlayerDoc,
    allPlayers: FirestorePlayerDoc[],
    activeAuction: FirestoreAuctionDoc | null
  ): BotDecision {
    const currentSpace = DEFAULT_STANDARD_SPACES[botPlayer.currentSpaceIndex] || null;
    const profile = this.getBotProfile(botPlayer);
    const legalActions = this.getLegalActions(match, botPlayer, allPlayers, currentSpace, activeAuction);
    const strategy = botStrategyRegistry.getStrategy(profile.personality);

    const context: BotDecisionContext = {
      match,
      botPlayer,
      allPlayers,
      currentSpace,
      boardSpaces: DEFAULT_STANDARD_SPACES,
      activeAuction,
      legalActions,
      profile,
    };

    let decision: BotDecision;

    if (match.currentPhase === 'AUCTION_IN_PROGRESS') {
      decision = strategy.evaluateAuctionAction(context);
    } else if (match.currentPhase === 'AWAITING_MARKET_CHOICE') {
      // Choose option based on profile risk tolerance
      const isAggressive = profile.personality === 'aggressive' || profile.riskTolerance > 0.6;
      decision = {
        actionType: 'SUBMIT_MARKET_CHOICE',
        confidence: 0.9,
        rationale: isAggressive
          ? 'Selected aggressive capital allocation directive to maximize upside.'
          : 'Selected conservative reserve directive to protect working capital.',
        payload: {
          choiceIndex: isAggressive ? 0 : 1,
        },
      };
    } else {
      decision = strategy.evaluateTurnAction(context);
    }

    // Critical sanity check: verify that the chosen action is in legalActions
    const isLegal = legalActions.some((a) => a.actionType === decision.actionType);
    if (!isLegal) {
      // Fallback safely to first legal action to prevent illegal submissions
      const safeFallback = legalActions[0] || { actionType: 'COMPLETE_TURN' };
      return {
        actionType: safeFallback.actionType,
        payload: {},
        rationale: `${profile.displayName} defaulted to ${safeFallback.actionType} to uphold legal constraints.`,
        confidence: 0.5,
      };
    }

    return decision;
  }
}
