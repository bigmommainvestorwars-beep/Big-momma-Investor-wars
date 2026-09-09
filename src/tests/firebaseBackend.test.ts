/**
 * Production Firebase Backend Provisioning Test Suite (Step 2)
 * Tests client config validation, security assertions, auth guards, admin authorization,
 * idempotency, rate limiting, state versioning, App Check, error logging, and health check.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { terminate } from 'firebase/firestore';
import { getFirebaseFirestore } from '../services/firebase/config';
import { validateFirebaseClientConfig, ClientEnvConfig } from '../config/env';
import { AuthGuard } from '../../functions/src/system/security/auth';
import { AppCheckGuard } from '../../functions/src/system/security/appCheck';
import { RateLimiter } from '../../functions/src/system/rateLimit/rateLimiter';
import { GameEngineInternal, MatchState } from '../../functions/src/internal/gameEngine';
import { ServerFunctionError, SERVER_ERROR_CODES } from '../../functions/src/types/contracts';
import { runBackendHealthCheck } from '../services/monitoring/healthCheck';
import { SystemErrorLogger } from '../../functions/src/system/audit/systemErrorLogger';

after(async () => {
  try {
    const db = getFirebaseFirestore();
    await terminate(db);
  } catch {
    // ignore
  }
});

describe('Step 2: Firebase Client Configuration & Validation', () => {
  it('should pass validation with complete valid Firebase configuration', () => {
    const validConfig: ClientEnvConfig = {
      appEnv: 'development',
      appUrl: 'http://localhost:3000',
      isProduction: false,
      isStaging: false,
      isDevelopment: true,
      useEmulator: false,
      firebase: {
        apiKey: 'AIzaSyAValidApiKeyForTesting12345',
        authDomain: 'bigmomma-investor-wars.firebaseapp.com',
        projectId: 'bigmomma-investor-wars',
        storageBucket: 'bigmomma-investor-wars.appspot.com',
        messagingSenderId: '123456789012',
        appId: '1:123456789012:web:abcdef123456',
        firestoreDatabaseId: '(default)',
      },
    };

    const result = validateFirebaseClientConfig(validConfig);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should fail validation when required Firebase variables are missing', () => {
    const invalidConfig: ClientEnvConfig = {
      appEnv: 'development',
      appUrl: 'http://localhost:3000',
      isProduction: false,
      isStaging: false,
      isDevelopment: true,
      useEmulator: false,
      firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      },
    };

    const result = validateFirebaseClientConfig(invalidConfig);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((err) => err.includes('VITE_FIREBASE_API_KEY')));
    assert.ok(result.errors.some((err) => err.includes('VITE_FIREBASE_PROJECT_ID')));
  });

  it('should reject and throw if private key material is detected in client configuration', () => {
    const leakConfig: ClientEnvConfig = {
      appEnv: 'development',
      appUrl: 'http://localhost:3000',
      isProduction: false,
      isStaging: false,
      isDevelopment: true,
      useEmulator: false,
      firebase: {
        apiKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...',
        authDomain: 'bigmomma-investor-wars.firebaseapp.com',
        projectId: 'bigmomma-investor-wars',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      },
    };

    assert.throws(
      () => validateFirebaseClientConfig(leakConfig),
      /CRITICAL SECURITY VIOLATION/
    );
  });

  it('should reject configuration when a Realtime Database URL is supplied as firestoreDatabaseId', () => {
    const rtdbConfig: ClientEnvConfig = {
      appEnv: 'development',
      appUrl: 'http://localhost:3000',
      isProduction: false,
      isStaging: false,
      isDevelopment: true,
      useEmulator: false,
      firebase: {
        apiKey: 'AIzaSyAValidApiKeyForTesting12345',
        authDomain: 'bigmomma-investor-wars.firebaseapp.com',
        projectId: 'bigmomma-investor-wars',
        storageBucket: 'bigmomma-investor-wars.appspot.com',
        messagingSenderId: '123456789012',
        appId: '1:123456789012:web:abcdef123456',
        firestoreDatabaseId: 'https://bigmomma-investor-wars-default-rtdb.firebaseio.com/',
      },
    };

    const result = validateFirebaseClientConfig(rtdbConfig);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((err) => err.includes('Realtime Database URL')));
  });
});

describe('Step 2: Server Security & Auth Guards', () => {
  it('should reject unauthenticated callable request with AUTH_REQUIRED', () => {
    const unauthenticatedRequest: any = {
      auth: null,
      data: {},
    };

    assert.throws(
      () => AuthGuard.assertAuthenticated(unauthenticatedRequest),
      (err: any) => err instanceof ServerFunctionError && err.code === SERVER_ERROR_CODES.AUTH_REQUIRED
    );
  });

  it('should extract verified userId and reject client-provided userId spoofing', () => {
    const authenticatedRequest: any = {
      auth: {
        uid: 'verified_user_123',
        token: { email: 'investor@example.com' },
      },
      data: {
        userId: 'spoofed_user_999', // should be ignored by AuthGuard
      },
    };

    const verified = AuthGuard.assertAuthenticated(authenticatedRequest);
    assert.strictEqual(verified.userId, 'verified_user_123');
    assert.strictEqual(verified.email, 'investor@example.com');
    assert.strictEqual(verified.isAdmin, false);
  });

  it('should reject non-admin users attempting to invoke admin functions', () => {
    const regularUserRequest: any = {
      auth: {
        uid: 'regular_user',
        token: { admin: false },
      },
      data: {},
    };

    assert.throws(
      () => AuthGuard.assertAdmin(regularUserRequest),
      (err: any) => err instanceof ServerFunctionError && err.code === SERVER_ERROR_CODES.AUTH_FORBIDDEN
    );
  });

  it('should allow verified admin users with custom claims', () => {
    const adminUserRequest: any = {
      auth: {
        uid: 'admin_user',
        token: { admin: true },
      },
      data: {},
    };

    const auth = AuthGuard.assertAdmin(adminUserRequest);
    assert.strictEqual(auth.isAdmin, true);
    assert.strictEqual(auth.userId, 'admin_user');
  });
});

describe('Step 2: App Check Enforcement Boundary', () => {
  it('should allow bypass when App Check mode is disabled', () => {
    process.env.APP_CHECK_ENFORCEMENT = 'disabled';
    const req: any = { app: null };
    const result = AppCheckGuard.verify(req);
    assert.strictEqual(result.verified, true);
  });

  it('should reject unverified requests when App Check mode is strict', () => {
    process.env.APP_CHECK_ENFORCEMENT = 'strict';
    const req: any = { app: null };
    assert.throws(
      () => AppCheckGuard.verify(req),
      (err: any) => err instanceof ServerFunctionError && err.code === SERVER_ERROR_CODES.AUTH_FORBIDDEN
    );
  });

  it('should permit verified tokens under strict mode', () => {
    process.env.APP_CHECK_ENFORCEMENT = 'strict';
    const req: any = { app: { appId: 'com.bigmomma.app' } };
    const result = AppCheckGuard.verify(req);
    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.appId, 'com.bigmomma.app');
  });
});

describe('Step 2: Rate Limiting Engine', () => {
  it('should allow requests within threshold and block on threshold breach', () => {
    RateLimiter.resetForTesting();
    const testUserId = 'test_user_rate_limit';

    // dice roll limit is 3 requests per 5 seconds
    assert.doesNotThrow(() => RateLimiter.check(testUserId, 'rollDice'));
    assert.doesNotThrow(() => RateLimiter.check(testUserId, 'rollDice'));
    assert.doesNotThrow(() => RateLimiter.check(testUserId, 'rollDice'));

    // 4th request must throw RATE_LIMITED
    assert.throws(
      () => RateLimiter.check(testUserId, 'rollDice'),
      (err: any) => err instanceof ServerFunctionError && err.code === SERVER_ERROR_CODES.RATE_LIMITED
    );
  });
});

describe('Step 2: State Versioning & Transactions', () => {
  it('should detect stale state versions and throw STALE_STATE', () => {
    const currentMatch: MatchState = {
      matchId: 'match_v_01',
      boardId: 'default',
      rulesetVersion: '1.0.0',
      status: 'in_progress',
      currentPhase: 'TURN_START',
      currentPlayerId: 'player_1',
      turnNumber: 5,
      roundNumber: 2,
      stateVersion: 5, // currently at version 5
      participantUserIds: ['player_1', 'player_2'],
      hostUserId: 'player_1',
      winnerId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mockTransaction: any = {
      update: () => {},
    };
    const mockRef: any = {};

    // Expecting version 4 when match is already at 5 must throw STALE_STATE
    assert.throws(
      () => GameEngineInternal.incrementStateVersion(mockTransaction, mockRef, currentMatch, 4),
      (err: any) => err instanceof ServerFunctionError && err.code === SERVER_ERROR_CODES.STALE_STATE
    );

    // Expecting version 5 succeeds and advances to 6
    const newVersion = GameEngineInternal.incrementStateVersion(mockTransaction, mockRef, currentMatch, 5);
    assert.strictEqual(newVersion, 6);
  });
});

describe('Step 2: System Error & Logging Hygiene', () => {
  it('should construct sanitized error responses without leaking server stack traces', () => {
    const internalErr = new ServerFunctionError(
      SERVER_ERROR_CODES.TRANSACTION_FAILED,
      'Atomic transaction failed due to conflict',
      true,
      { details: 'Firestore lock timeout' }
    );

    const responseErr = internalErr.toResponseError();
    assert.strictEqual(responseErr.code, SERVER_ERROR_CODES.TRANSACTION_FAILED);
    assert.strictEqual(responseErr.retryable, true);
    // Ensure stack trace property is not present in response error
    assert.strictEqual((responseErr as any).stack, undefined);
  });
});

describe('Step 2: Backend Health Check', () => {
  it('should produce a structured health report across all subsystems', async () => {
    const report = await runBackendHealthCheck();
    assert.ok(report.timestamp > 0);
    assert.ok(['healthy', 'degraded', 'unhealthy'].includes(report.overallStatus));
    assert.ok(report.services.auth);
    assert.ok(report.services.firestore);
    assert.ok(report.services.functions);
    assert.ok(report.services.monitoring);
    assert.strictEqual(report.services.monitoring.status, 'healthy');
  });
});

describe('Step 2: Server Turn & Game Logic Contracts', () => {
  it('should simulate turn advancement correctly', () => {
    const match: MatchState = {
      matchId: 'match_test_turn',
      boardId: 'default',
      rulesetVersion: '1.0.0',
      status: 'in_progress',
      currentPhase: 'TURN_START',
      currentPlayerId: 'p1',
      turnNumber: 1,
      roundNumber: 1,
      stateVersion: 1,
      participantUserIds: ['p1', 'p2', 'bot_1'],
      hostUserId: 'p1',
      winnerId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const players = [
      { id: 'p1', userId: 'p1', displayName: 'Player 1', currentSpaceIndex: 0, status: 'active', turnOrder: 0, netWorth: 1500, cash: 1500, specialPoints: 50, ownedSpaceIds: [], companyShareIds: [], modifierIds: [], connected: true, lastActiveAt: Date.now() },
      { id: 'p2', userId: 'p2', displayName: 'Player 2', currentSpaceIndex: 0, status: 'active', turnOrder: 1, netWorth: 1500, cash: 1500, specialPoints: 50, ownedSpaceIds: [], companyShareIds: [], modifierIds: [], connected: true, lastActiveAt: Date.now() },
      { id: 'bot_1', userId: 'bot_1', displayName: 'Apex (AI)', currentSpaceIndex: 0, status: 'active', turnOrder: 2, netWorth: 1500, cash: 1500, specialPoints: 50, ownedSpaceIds: [], companyShareIds: [], modifierIds: [], isBot: true, connected: true, lastActiveAt: Date.now() },
    ] as any[];

    const nextTurn = GameEngineInternal.advanceTurn(match, players);
    assert.strictEqual(nextTurn.nextPlayerId, 'p2');
    assert.strictEqual(nextTurn.nextTurnNumber, 2);
    assert.strictEqual(nextTurn.nextRoundNumber, 1);
  });
});

