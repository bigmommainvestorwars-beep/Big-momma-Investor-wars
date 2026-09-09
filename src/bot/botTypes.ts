/**
 * Production Bot Foundation: Contracts & Decision Interfaces
 * Defines bot profiles, personalities, legal actions, decision contexts, and strategy contracts.
 */

import { FirestoreMatchDoc, FirestorePlayerDoc, FirestoreAuctionDoc } from '../services/firebase/matchSyncService';
import { BoardSpace } from '../types/board';

export type BotPersonality = 'balanced' | 'aggressive' | 'conservative' | 'speculative';

export interface BotProfile {
  id: string;
  displayName: string;
  personality: BotPersonality;
  avatarId: string;
  riskTolerance: number; // 0.0 (extreme risk aversion) to 1.0 (extreme risk taking)
  minReserveCash: number; // Cash buffer the bot tries to keep in hand
  maxAuctionMultiplier: number; // Maximum multiple of base property cost bot is willing to bid
  spPreference: 'defense' | 'growth' | 'hoard';
}

export type BotActionType =
  | 'ROLL_DICE'
  | 'BUY_PROPERTY'
  | 'START_SPACE_AUCTION'
  | 'PASS_PROPERTY'
  | 'PLACE_BID'
  | 'PASS_AUCTION'
  | 'SUBMIT_MARKET_CHOICE'
  | 'EXECUTE_SP_ACTION'
  | 'ACTIVATE_COMPANY_ABILITY'
  | 'COMPLETE_TURN';

export interface BotLegalAction {
  actionType: BotActionType;
  payload?: Record<string, unknown>;
  description: string;
  cost?: number;
}

export interface BotPendingChoice {
  choiceId: string;
  eventId: string;
  title: string;
  options: Array<{
    choiceId: string;
    label: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
  }>;
}

export interface BotDecisionContext {
  match: FirestoreMatchDoc;
  botPlayer: FirestorePlayerDoc;
  allPlayers: FirestorePlayerDoc[];
  currentSpace: BoardSpace | null;
  boardSpaces: BoardSpace[];
  activeAuction: FirestoreAuctionDoc | null;
  pendingChoice?: BotPendingChoice | null;
  legalActions: BotLegalAction[];
  profile: BotProfile;
}

export interface BotDecision {
  actionType: BotActionType;
  payload: Record<string, unknown>;
  rationale: string;
  confidence: number; // 0 to 1
}

export interface IBotStrategy {
  personality: BotPersonality;
  evaluateTurnAction(context: BotDecisionContext): BotDecision;
  evaluateAuctionAction(context: BotDecisionContext): BotDecision;
  evaluateChoiceAction(context: BotDecisionContext): BotDecision;
}

export const PRESET_BOT_PROFILES: BotProfile[] = [
  {
    id: 'bot_apex',
    displayName: 'Apex Capital (AI)',
    personality: 'aggressive',
    avatarId: 'bot-apex',
    riskTolerance: 0.85,
    minReserveCash: 80,
    maxAuctionMultiplier: 1.4,
    spPreference: 'growth',
  },
  {
    id: 'bot_venture',
    displayName: 'Venture Bot (AI)',
    personality: 'balanced',
    avatarId: 'bot-venture',
    riskTolerance: 0.55,
    minReserveCash: 160,
    maxAuctionMultiplier: 1.15,
    spPreference: 'growth',
  },
  {
    id: 'bot_quant',
    displayName: 'Bullish Quant (AI)',
    personality: 'speculative',
    avatarId: 'bot-quant',
    riskTolerance: 0.7,
    minReserveCash: 120,
    maxAuctionMultiplier: 1.3,
    spPreference: 'defense',
  },
  {
    id: 'bot_silicon',
    displayName: 'Silicon Syndicate (AI)',
    personality: 'conservative',
    avatarId: 'bot-silicon',
    riskTolerance: 0.25,
    minReserveCash: 280,
    maxAuctionMultiplier: 0.95,
    spPreference: 'defense',
  },
];
