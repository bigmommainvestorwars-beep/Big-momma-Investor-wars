/**
 * Production Bot Decision Strategies
 * Implements configurable strategy boundaries for different bot personalities.
 * Strictly picks only from verified legal actions.
 */

import {
  IBotStrategy,
  BotDecision,
  BotDecisionContext,
  BotPersonality,
} from './botTypes';

/**
 * Balanced Strategy:
 * Balances property accumulation with a prudent cash buffer.
 * Bids on high-value properties within reasonable bounds.
 */
export class BalancedBotStrategy implements IBotStrategy {
  public personality: BotPersonality = 'balanced';

  public evaluateTurnAction(context: BotDecisionContext): BotDecision {
    const { match, botPlayer, currentSpace, legalActions, profile } = context;

    // 1. If we must roll
    if (match.currentPhase === 'TURN_START' || match.currentPhase === 'AWAITING_ROLL') {
      const rollAction = legalActions.find((a) => a.actionType === 'ROLL_DICE');
      if (rollAction) {
        return {
          actionType: 'ROLL_DICE',
          payload: {},
          rationale: `${profile.displayName} initiates turn roll.`,
          confidence: 1.0,
        };
      }
    }

    // 2. If awaiting action on an unowned property
    if (match.currentPhase === 'AWAITING_ACTION' && currentSpace) {
      const buyAction = legalActions.find((a) => a.actionType === 'BUY_PROPERTY');
      const auctionAction = legalActions.find((a) => a.actionType === 'START_SPACE_AUCTION');
      const passAction = legalActions.find((a) => a.actionType === 'PASS_PROPERTY' || a.actionType === 'COMPLETE_TURN');

      const cost = currentSpace.baseCost || 100;
      const canAffordWithBuffer = botPlayer.cash - cost >= profile.minReserveCash;

      if (buyAction && canAffordWithBuffer) {
        return {
          actionType: 'BUY_PROPERTY',
          payload: {},
          rationale: `${profile.displayName} purchases ${currentSpace.name} for $${cost} while maintaining $${botPlayer.cash - cost} cash buffer.`,
          confidence: 0.9,
        };
      }

      // If cannot afford with reserve buffer, but asset is attractive, send to auction
      if (auctionAction && botPlayer.cash >= cost * 0.4) {
        return {
          actionType: 'START_SPACE_AUCTION',
          payload: {},
          rationale: `${profile.displayName} reserves cash and sends ${currentSpace.name} to auction.`,
          confidence: 0.75,
        };
      }

      if (passAction) {
        return {
          actionType: passAction.actionType,
          payload: passAction.payload || {},
          rationale: `${profile.displayName} passes on acquiring ${currentSpace.name}.`,
          confidence: 0.8,
        };
      }
    }

    // 3. If turn can be completed
    const completeAction = legalActions.find((a) => a.actionType === 'COMPLETE_TURN');
    if (completeAction) {
      return {
        actionType: 'COMPLETE_TURN',
        payload: {},
        rationale: `${profile.displayName} completes turn.`,
        confidence: 1.0,
      };
    }

    // Fallback to first legal action
    const fallback = legalActions[0];
    return {
      actionType: fallback?.actionType || 'COMPLETE_TURN',
      payload: fallback?.payload || {},
      rationale: `${profile.displayName} executing default action.`,
      confidence: 0.5,
    };
  }

  public evaluateAuctionAction(context: BotDecisionContext): BotDecision {
    const { botPlayer, activeAuction, currentSpace, legalActions, profile } = context;
    if (!activeAuction) {
      return { actionType: 'PASS_AUCTION', payload: {}, rationale: 'No active auction.', confidence: 1.0 };
    }

    const passAction = legalActions.find((a) => a.actionType === 'PASS_AUCTION');
    const bidAction = legalActions.find((a) => a.actionType === 'PLACE_BID');

    // If we're already the highest bidder, do not bid against ourselves
    if (activeAuction.currentHighestBidderId === botPlayer.id) {
      return { actionType: 'PASS_AUCTION', payload: {}, rationale: 'Already highest bidder.', confidence: 1.0 };
    }

    const nextBid = activeAuction.currentHighestBid + 10;
    const baseCost = currentSpace?.baseCost || 150;
    const maxWillingBid = Math.floor(baseCost * profile.maxAuctionMultiplier);

    const canAfford = botPlayer.cash - nextBid >= profile.minReserveCash * 0.5;
    const withinValuation = nextBid <= maxWillingBid;

    if (bidAction && canAfford && withinValuation) {
      return {
        actionType: 'PLACE_BID',
        payload: { auctionId: activeAuction.id, amount: nextBid },
        rationale: `${profile.displayName} bids $${nextBid} on ${activeAuction.assetName || 'asset'} (valuation ceiling $${maxWillingBid}).`,
        confidence: 0.85,
      };
    }

    return {
      actionType: 'PASS_AUCTION',
      payload: { auctionId: activeAuction.id },
      rationale: `${profile.displayName} passes auction at $${activeAuction.currentHighestBid}.`,
      confidence: 0.95,
    };
  }

  public evaluateChoiceAction(context: BotDecisionContext): BotDecision {
    const { pendingChoice, profile } = context;
    if (!pendingChoice || pendingChoice.options.length === 0) {
      return { actionType: 'COMPLETE_TURN', payload: {}, rationale: 'No choice pending.', confidence: 1.0 };
    }

    // Balanced selects medium or low risk option
    const preferredOption =
      pendingChoice.options.find((o) => o.risk === 'low') ||
      pendingChoice.options.find((o) => o.risk === 'medium') ||
      pendingChoice.options[0];

    return {
      actionType: 'SUBMIT_MARKET_CHOICE',
      payload: { eventId: pendingChoice.eventId, choiceId: preferredOption.choiceId },
      rationale: `${profile.displayName} selects ${preferredOption.label} (${preferredOption.risk} risk).`,
      confidence: 0.85,
    };
  }
}

/**
 * Aggressive Strategy:
 * Aggressively buys properties, bids high at auctions, and keeps minimal cash reserves.
 */
export class AggressiveBotStrategy implements IBotStrategy {
  public personality: BotPersonality = 'aggressive';

  public evaluateTurnAction(context: BotDecisionContext): BotDecision {
    const { match, botPlayer, currentSpace, legalActions, profile } = context;

    if (match.currentPhase === 'TURN_START' || match.currentPhase === 'AWAITING_ROLL') {
      const rollAction = legalActions.find((a) => a.actionType === 'ROLL_DICE');
      if (rollAction) {
        return {
          actionType: 'ROLL_DICE',
          payload: {},
          rationale: `${profile.displayName} aggressive roll.`,
          confidence: 1.0,
        };
      }
    }

    if (match.currentPhase === 'AWAITING_ACTION' && currentSpace) {
      const buyAction = legalActions.find((a) => a.actionType === 'BUY_PROPERTY');
      const auctionAction = legalActions.find((a) => a.actionType === 'START_SPACE_AUCTION');

      const cost = currentSpace.baseCost || 100;
      // Aggressive buys if cash allows, leaving just $30 buffer
      if (buyAction && botPlayer.cash >= cost + 30) {
        return {
          actionType: 'BUY_PROPERTY',
          payload: {},
          rationale: `${profile.displayName} aggressively captures ${currentSpace.name} for $${cost}.`,
          confidence: 0.95,
        };
      }

      if (auctionAction) {
        return {
          actionType: 'START_SPACE_AUCTION',
          payload: {},
          rationale: `${profile.displayName} triggers auction on ${currentSpace.name} to contest ownership.`,
          confidence: 0.8,
        };
      }
    }

    const completeAction = legalActions.find((a) => a.actionType === 'COMPLETE_TURN');
    if (completeAction) {
      return {
        actionType: 'COMPLETE_TURN',
        payload: {},
        rationale: `${profile.displayName} completes turn.`,
        confidence: 1.0,
      };
    }

    const fallback = legalActions[0];
    return {
      actionType: fallback?.actionType || 'COMPLETE_TURN',
      payload: fallback?.payload || {},
      rationale: `${profile.displayName} default move.`,
      confidence: 0.5,
    };
  }

  public evaluateAuctionAction(context: BotDecisionContext): BotDecision {
    const { botPlayer, activeAuction, currentSpace, legalActions, profile } = context;
    if (!activeAuction) {
      return { actionType: 'PASS_AUCTION', payload: {}, rationale: 'No auction.', confidence: 1.0 };
    }

    if (activeAuction.currentHighestBidderId === botPlayer.id) {
      return { actionType: 'PASS_AUCTION', payload: {}, rationale: 'Already highest bidder.', confidence: 1.0 };
    }

    const bidAction = legalActions.find((a) => a.actionType === 'PLACE_BID');
    const nextBid = activeAuction.currentHighestBid + 10;
    const baseCost = currentSpace?.baseCost || 150;
    const maxWillingBid = Math.floor(baseCost * profile.maxAuctionMultiplier);

    if (bidAction && botPlayer.cash >= nextBid + 20 && nextBid <= maxWillingBid) {
      return {
        actionType: 'PLACE_BID',
        payload: { auctionId: activeAuction.id, amount: nextBid },
        rationale: `${profile.displayName} aggressively raises bid to $${nextBid}.`,
        confidence: 0.9,
      };
    }

    return {
      actionType: 'PASS_AUCTION',
      payload: { auctionId: activeAuction.id },
      rationale: `${profile.displayName} bows out of auction.`,
      confidence: 0.9,
    };
  }

  public evaluateChoiceAction(context: BotDecisionContext): BotDecision {
    const { pendingChoice, profile } = context;
    if (!pendingChoice || pendingChoice.options.length === 0) {
      return { actionType: 'COMPLETE_TURN', payload: {}, rationale: 'No choice pending.', confidence: 1.0 };
    }

    // Aggressive prefers high risk / high return option
    const preferredOption =
      pendingChoice.options.find((o) => o.risk === 'high') ||
      pendingChoice.options.find((o) => o.risk === 'medium') ||
      pendingChoice.options[0];

    return {
      actionType: 'SUBMIT_MARKET_CHOICE',
      payload: { eventId: pendingChoice.eventId, choiceId: preferredOption.choiceId },
      rationale: `${profile.displayName} opts for aggressive choice: ${preferredOption.label}.`,
      confidence: 0.9,
    };
  }
}

/**
 * Conservative Strategy:
 * Preserves high cash reserves, avoids speculative auctions, only buys high-security assets.
 */
export class ConservativeBotStrategy implements IBotStrategy {
  public personality: BotPersonality = 'conservative';

  public evaluateTurnAction(context: BotDecisionContext): BotDecision {
    const { match, botPlayer, currentSpace, legalActions, profile } = context;

    if (match.currentPhase === 'TURN_START' || match.currentPhase === 'AWAITING_ROLL') {
      const rollAction = legalActions.find((a) => a.actionType === 'ROLL_DICE');
      if (rollAction) {
        return {
          actionType: 'ROLL_DICE',
          payload: {},
          rationale: `${profile.displayName} rolls conservatively.`,
          confidence: 1.0,
        };
      }
    }

    if (match.currentPhase === 'AWAITING_ACTION' && currentSpace) {
      const buyAction = legalActions.find((a) => a.actionType === 'BUY_PROPERTY');
      const passAction = legalActions.find((a) => a.actionType === 'PASS_PROPERTY' || a.actionType === 'COMPLETE_TURN');

      const cost = currentSpace.baseCost || 100;
      // Conservative requires generous reserve buffer ($250+)
      if (buyAction && botPlayer.cash - cost >= profile.minReserveCash) {
        return {
          actionType: 'BUY_PROPERTY',
          payload: {},
          rationale: `${profile.displayName} cautiously purchases ${currentSpace.name} with healthy reserve intact.`,
          confidence: 0.85,
        };
      }

      if (passAction) {
        return {
          actionType: passAction.actionType,
          payload: passAction.payload || {},
          rationale: `${profile.displayName} conservatively preserves liquidity and passes on ${currentSpace.name}.`,
          confidence: 0.95,
        };
      }
    }

    const completeAction = legalActions.find((a) => a.actionType === 'COMPLETE_TURN');
    if (completeAction) {
      return {
        actionType: 'COMPLETE_TURN',
        payload: {},
        rationale: `${profile.displayName} completes turn.`,
        confidence: 1.0,
      };
    }

    const fallback = legalActions[0];
    return {
      actionType: fallback?.actionType || 'COMPLETE_TURN',
      payload: fallback?.payload || {},
      rationale: `${profile.displayName} safe default action.`,
      confidence: 0.5,
    };
  }

  public evaluateAuctionAction(context: BotDecisionContext): BotDecision {
    const { botPlayer, activeAuction, currentSpace, legalActions, profile } = context;
    if (!activeAuction) {
      return { actionType: 'PASS_AUCTION', payload: {}, rationale: 'No auction.', confidence: 1.0 };
    }

    if (activeAuction.currentHighestBidderId === botPlayer.id) {
      return { actionType: 'PASS_AUCTION', payload: {}, rationale: 'Already highest bidder.', confidence: 1.0 };
    }

    const bidAction = legalActions.find((a) => a.actionType === 'PLACE_BID');
    const nextBid = activeAuction.currentHighestBid + 10;
    const baseCost = currentSpace?.baseCost || 150;
    const maxWillingBid = Math.floor(baseCost * profile.maxAuctionMultiplier);

    // Conservative only bids if well below base cost and with large reserve
    if (bidAction && botPlayer.cash - nextBid >= profile.minReserveCash && nextBid <= maxWillingBid) {
      return {
        actionType: 'PLACE_BID',
        payload: { auctionId: activeAuction.id, amount: nextBid },
        rationale: `${profile.displayName} places disciplined bid of $${nextBid}.`,
        confidence: 0.8,
      };
    }

    return {
      actionType: 'PASS_AUCTION',
      payload: { auctionId: activeAuction.id },
      rationale: `${profile.displayName} passes on auction to preserve capital.`,
      confidence: 1.0,
    };
  }

  public evaluateChoiceAction(context: BotDecisionContext): BotDecision {
    const { pendingChoice, profile } = context;
    if (!pendingChoice || pendingChoice.options.length === 0) {
      return { actionType: 'COMPLETE_TURN', payload: {}, rationale: 'No choice pending.', confidence: 1.0 };
    }

    // Conservative always chooses lowest risk
    const preferredOption =
      pendingChoice.options.find((o) => o.risk === 'low') ||
      pendingChoice.options[0];

    return {
      actionType: 'SUBMIT_MARKET_CHOICE',
      payload: { eventId: pendingChoice.eventId, choiceId: preferredOption.choiceId },
      rationale: `${profile.displayName} selects lowest risk option: ${preferredOption.label}.`,
      confidence: 0.95,
    };
  }
}

/**
 * Strategy Registry & Factory
 */
export class BotStrategyRegistry {
  private strategies = new Map<BotPersonality, IBotStrategy>();

  constructor() {
    this.registerStrategy(new BalancedBotStrategy());
    this.registerStrategy(new AggressiveBotStrategy());
    this.registerStrategy(new ConservativeBotStrategy());
  }

  public registerStrategy(strategy: IBotStrategy): void {
    this.strategies.set(strategy.personality, strategy);
  }

  public getStrategy(personality: BotPersonality): IBotStrategy {
    const found = this.strategies.get(personality);
    if (found) return found;
    return this.strategies.get('balanced')!;
  }
}

export const botStrategyRegistry = new BotStrategyRegistry();
