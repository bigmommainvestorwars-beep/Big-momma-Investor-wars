/**
 * Production Foundation Tests: Types, GameState Invariants, and Security Bounds
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameState } from '../types/game';
import { ActionRequest } from '../types/request';
import { validateGameStateInvariants } from '../validation/gameStateValidator';
import { validateActionRequest } from '../validation/requestValidator';
import { SecurityGuard } from '../backend/securityBoundaries';
import { IdempotencyManager } from '../engine/idempotency';
import { rulesetRegistry } from '../config/rulesets';
import { boardRegistry } from '../config/boardConfig';
import { errorHandler } from '../services/monitoring/errorHandler';
import { logger } from '../services/monitoring/logger';

describe('Production Foundation - GameState & Validation', () => {
  it('should validate a valid GameState', () => {
    const validState: GameState = {
      gameId: 'game_001',
      boardId: 'standard_board_v1',
      rulesetVersion: '1.0.0',
      status: 'in_progress',
      currentPhase: 'turn_start',
      currentPlayerId: 'player_1',
      turnNumber: 1,
      roundNumber: 1,
      stateVersion: 1,
      players: {
        player_1: {
          id: 'player_1',
          userId: 'user_1',
          displayName: 'Investor 1',
          avatarId: 'avatar_1',
          colorHex: '#3b82f6',
          currentSpaceIndex: 0,
          status: 'active',
          inventory: {
            cash: 1500,
            specialPoints: 10,
            ownedSpaceIds: [],
            companyShareIds: [],
            modifierIds: [],
          },
          turnOrder: 1,
          netWorth: 1500,
          isBot: false,
          connected: true,
          lastActiveAt: Date.now(),
        },
      },
      activeAuction: null,
      activeMarketEvents: [],
      activeModifiers: [],
      pendingChoices: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    assert.doesNotThrow(() => validateGameStateInvariants(validState));
  });

  it('should reject invalid GameState without gameId', () => {
    assert.throws(() => {
      validateGameStateInvariants({
        boardId: 'board_1',
        rulesetVersion: '1.0.0',
      });
    });
  });
});

describe('Production Foundation - Request & Idempotency', () => {
  it('should validate valid ActionRequest', () => {
    const validReq: ActionRequest = {
      requestId: 'req_12345',
      gameId: 'game_001',
      playerId: 'player_1',
      actionType: 'END_TURN',
      payload: {},
      clientTimestamp: Date.now(),
    };

    assert.doesNotThrow(() => validateActionRequest(validReq));
  });

  it('should reject ActionRequest missing requestId', () => {
    const invalidReq = {
      gameId: 'game_001',
      playerId: 'player_1',
      actionType: 'END_TURN',
      clientTimestamp: Date.now(),
    };

    assert.throws(() => validateActionRequest(invalidReq));
  });

  it('should prevent duplicate request execution in IdempotencyManager', async () => {
    const manager = new IdempotencyManager();
    const request: ActionRequest = {
      requestId: 'req_unique_001',
      gameId: 'game_001',
      playerId: 'player_1',
      actionType: 'ACTION_A',
      payload: {},
      clientTimestamp: Date.now(),
    };

    // First acquisition succeeds
    await manager.acquireLock(request);

    // Duplicate acquisition in flight must throw
    await assert.rejects(async () => {
      await manager.acquireLock(request);
    });

    // Mark completed
    await manager.markCompleted(request.requestId, { success: true });

    // Completed acquisition must throw duplicate completed
    await assert.rejects(async () => {
      await manager.acquireLock(request);
    });
  });
});

describe('Production Foundation - Security Boundary', () => {
  it('should block client requests attempting to inject authoritative cash or dice state', () => {
    const maliciousRequest: ActionRequest = {
      requestId: 'req_hack_01',
      gameId: 'game_001',
      playerId: 'player_1',
      actionType: 'END_TURN',
      payload: {
        newCash: 9999999, // Forbidden client state injection
      },
      clientTimestamp: Date.now(),
    };

    assert.throws(() => {
      SecurityGuard.assertClientPayloadSanity(maliciousRequest);
    });
  });

  it('should strictly reject all 12 authoritative mutation keys in client payloads', () => {
    const authoritativeFields = [
      'cash',
      'reservedCash',
      'strategyPoints',
      'position',
      'ownership',
      'diceResult',
      'auctionWinner',
      'modifiers',
      'eventActivation',
      'bankruptcy',
      'turnTransitions',
      'netWorth',
    ];

    for (const field of authoritativeFields) {
      const malicious: ActionRequest = {
        requestId: `req_test_${field}`,
        gameId: 'game_001',
        playerId: 'player_1',
        actionType: 'SUBMIT_ACTION',
        payload: { [field]: 'arbitrary_client_value' },
        clientTimestamp: Date.now(),
      };

      assert.throws(
        () => SecurityGuard.assertClientPayloadSanity(malicious),
        (err: any) => err.errorCode === 'SECURITY_INTEGRITY_VIOLATION',
        `Expected ${field} injection to be blocked by SecurityGuard`
      );
    }
  });

  it('should allow legitimate client intention payloads', () => {
    const legitimateRequest: ActionRequest = {
      requestId: 'req_legit_01',
      gameId: 'game_001',
      playerId: 'player_1',
      actionType: 'BID_AUCTION',
      payload: {
        bidAmount: 150,
      },
      clientTimestamp: Date.now(),
    };

    assert.doesNotThrow(() => {
      SecurityGuard.assertClientPayloadSanity(legitimateRequest);
    });
  });
});

describe('Production Foundation - Configuration Registries', () => {
  it('should register and retrieve a ruleset configuration', () => {
    rulesetRegistry.registerRuleset({
      rulesetVersion: 'standard_v1',
      name: 'Standard Production Ruleset',
      minPlayers: 2,
      maxPlayers: 6,
      turnTimeoutSeconds: 60,
      startingCash: 1500,
      startingSP: 10,
      passGoSalary: 200,
      bankruptcyThreshold: 0,
      maxAuctionDurationSeconds: 45,
      features: {
        enableAuctions: true,
        enableMarketEvents: true,
        enableSPActions: true,
        enableCompanyShares: true,
      },
    });

    const retrieved = rulesetRegistry.getRuleset('standard_v1');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.startingCash, 1500);
  });
});

describe('Production Foundation - Monitoring & Logging', () => {
  it('should record errors with standardized structure', () => {
    const record = errorHandler.capture(new Error('Sample test error'), {
      errorCode: 'TEST_ERROR',
      gameId: 'game_001',
      action: 'test_action',
    });

    assert.strictEqual(record.errorCode, 'TEST_ERROR');
    assert.strictEqual(record.gameId, 'game_001');
    assert.strictEqual(record.action, 'test_action');
    assert.ok(record.id.startsWith('err_'));
  });

  it('should log structured events across multiple categories', () => {
    const entry = logger.log('game_event', 'info', 'Game created', {
      gameId: 'game_001',
      metadata: { playerCount: 4 },
    });

    assert.strictEqual(entry.category, 'game_event');
    assert.strictEqual(entry.severity, 'info');
    assert.strictEqual(entry.gameId, 'game_001');
  });
});
