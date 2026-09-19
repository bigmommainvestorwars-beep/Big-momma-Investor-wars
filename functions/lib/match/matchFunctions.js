"use strict";
/**
 * Production Match Callable Functions
 * Handles lifecycle of matches with strict server-side validation and state versioning.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeBotPlayer = exports.addBotPlayer = exports.reconnectMatch = exports.getMatchState = exports.startMatch = exports.leaveMatch = exports.joinMatch = exports.joinMatchByAccessCode = exports.findOrCreateQuickMatch = exports.createMatch = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const auth_1 = require("../system/security/auth");
const appCheck_1 = require("../system/security/appCheck");
const rateLimiter_1 = require("../system/rateLimit/rateLimiter");
const idempotencyService_1 = require("../system/idempotency/idempotencyService");
const gameEngine_1 = require("../internal/gameEngine");
const errorWrapper_1 = require("../system/errorWrapper");
const testRoomConfig_1 = require("../config/testRoomConfig");
const contracts_1 = require("../types/contracts");
const db = (0, firebaseAdmin_1.getAdminFirestore)();
/**
 * 1. createMatch
 */
exports.createMatch = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'createMatch');
    let { matchId, requestId, payload } = request.data;
    if (!matchId) {
        if (payload?.accessCode === testRoomConfig_1.TEST_ROOM_CODE || (testRoomConfig_1.IS_TEST_ROOM_MODE && payload?.isPrivate)) {
            matchId = testRoomConfig_1.TEST_MATCH_ID;
        }
        else {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_TIMING, 'matchId is required.');
        }
    }
    const isTestRoom = matchId === testRoomConfig_1.TEST_MATCH_ID ||
        payload?.accessCode === testRoomConfig_1.TEST_ROOM_CODE ||
        (testRoomConfig_1.IS_TEST_ROOM_MODE && payload?.isPrivate && !payload?.accessCode);
    const generatedAccessCode = isTestRoom
        ? testRoomConfig_1.TEST_ROOM_CODE
        : (payload?.accessCode || `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    const targetMatchId = isTestRoom ? testRoomConfig_1.TEST_MATCH_ID : matchId;
    const matchRef = db.collection('matches').doc(targetMatchId);
    const existing = await matchRef.get();
    const hostPlayer = {
        id: auth.userId,
        userId: auth.userId,
        displayName: auth.email ? auth.email.split('@')[0] : 'Host',
        currentSpaceIndex: 0,
        status: 'active',
        turnOrder: 0,
        netWorth: 1500,
        cash: 1500,
        specialPoints: 50,
        ownedSpaceIds: [],
        companyShareIds: [],
        modifierIds: [],
        connected: true,
        lastActiveAt: Date.now(),
    };
    if (existing.exists && !isTestRoom) {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match already exists.');
    }
    const initialMatch = {
        matchId: targetMatchId,
        boardId: payload?.boardId || 'default-standard-board',
        rulesetVersion: payload?.rulesetVersion || '1.0.0',
        status: 'waiting_for_players',
        currentPhase: 'LOBBY',
        currentPlayerId: null,
        turnNumber: 0,
        roundNumber: 0,
        stateVersion: existing.exists ? ((existing.data()?.stateVersion || 1) + 1) : 1,
        participantUserIds: [auth.userId],
        hostUserId: auth.userId,
        winnerId: null,
        isPrivate: isTestRoom ? true : (payload?.isPrivate || false),
        accessCode: generatedAccessCode,
        createdAt: existing.exists ? (existing.data()?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
    };
    await db.runTransaction(async (t) => {
        t.set(matchRef, initialMatch);
        t.set(matchRef.collection('players').doc(hostPlayer.id), hostPlayer);
    });
    const response = {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: initialMatch.stateVersion,
        data: initialMatch,
    };
    return response;
}));
/**
 * 1b. findOrCreateQuickMatch
 */
exports.findOrCreateQuickMatch = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'findOrCreateQuickMatch');
    const { requestId, payload } = request.data;
    const matchesRef = db.collection('matches');
    const openQuery = await matchesRef
        .where('status', '==', 'waiting_for_players')
        .where('isPrivate', '==', false)
        .limit(10)
        .get();
    const targetMatchDoc = openQuery.docs.find((doc) => {
        const data = doc.data();
        return (data.participantUserIds?.length || 0) < 4;
    });
    if (targetMatchDoc) {
        const matchId = targetMatchDoc.id;
        const matchRef = matchesRef.doc(matchId);
        const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'findOrCreateQuickMatch_join', async (t) => {
            const snap = await t.get(matchRef);
            if (!snap.exists) {
                throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
            }
            const match = snap.data();
            if (match.status !== 'waiting_for_players') {
                throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match already started.');
            }
            if (match.participantUserIds.includes(auth.userId)) {
                const playerSnap = await t.get(matchRef.collection('players').doc(auth.userId));
                return { matchId, isNew: false, accessCode: match.accessCode || '', player: playerSnap.data(), stateVersion: match.stateVersion };
            }
            const playersSnap = await t.get(matchRef.collection('players'));
            if (playersSnap.size >= 4) {
                throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Lobby is full.');
            }
            const newPlayer = {
                id: auth.userId,
                userId: auth.userId,
                displayName: payload?.displayName || auth.email?.split('@')[0] || `Investor ${playersSnap.size + 1}`,
                currentSpaceIndex: 0,
                status: 'active',
                turnOrder: playersSnap.size,
                netWorth: 1500,
                cash: 1500,
                specialPoints: 50,
                ownedSpaceIds: [],
                companyShareIds: [],
                modifierIds: [],
                connected: true,
                lastActiveAt: Date.now(),
            };
            match.participantUserIds.push(auth.userId);
            const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
            t.update(matchRef, { participantUserIds: match.participantUserIds });
            t.set(matchRef.collection('players').doc(newPlayer.id), newPlayer);
            return { matchId, isNew: false, accessCode: match.accessCode || '', player: newPlayer, stateVersion: newVersion };
        });
        return {
            success: true,
            requestId,
            serverTime: Date.now(),
            stateVersion: result.stateVersion || 1,
            data: result,
        };
    }
    else {
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const matchRef = matchesRef.doc(matchId);
        const accessCode = `BM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const initialMatch = {
            matchId,
            boardId: 'default-standard-board',
            rulesetVersion: '1.0.0',
            status: 'waiting_for_players',
            currentPhase: 'LOBBY',
            currentPlayerId: null,
            turnNumber: 0,
            roundNumber: 0,
            stateVersion: 1,
            participantUserIds: [auth.userId],
            hostUserId: auth.userId,
            winnerId: null,
            isPrivate: false,
            accessCode,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const hostPlayer = {
            id: auth.userId,
            userId: auth.userId,
            displayName: payload?.displayName || auth.email?.split('@')[0] || 'Host',
            currentSpaceIndex: 0,
            status: 'active',
            turnOrder: 0,
            netWorth: 1500,
            cash: 1500,
            specialPoints: 50,
            ownedSpaceIds: [],
            companyShareIds: [],
            modifierIds: [],
            connected: true,
            lastActiveAt: Date.now(),
        };
        await db.runTransaction(async (t) => {
            t.set(matchRef, initialMatch);
            t.set(matchRef.collection('players').doc(hostPlayer.id), hostPlayer);
        });
        return {
            success: true,
            requestId,
            serverTime: Date.now(),
            stateVersion: 1,
            data: { matchId, isNew: true, accessCode, player: hostPlayer },
        };
    }
}));
/**
 * 1c. joinMatchByAccessCode
 */
exports.joinMatchByAccessCode = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'joinMatchByAccessCode');
    const { requestId, payload } = request.data;
    if (!payload?.accessCode) {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_TIMING, 'accessCode is required.');
    }
    const cleanCode = payload.accessCode.trim().toUpperCase();
    const rawCode = cleanCode.replace(/^BM-/, '');
    const bmCode = `BM-${rawCode}`;
    const matchesRef = db.collection('matches');
    const isTestCode = cleanCode === testRoomConfig_1.TEST_ROOM_CODE ||
        rawCode === '0X9X' ||
        cleanCode.includes('0X9X') ||
        cleanCode === testRoomConfig_1.TEST_MATCH_ID.toUpperCase();
    let matchId = isTestCode ? testRoomConfig_1.TEST_MATCH_ID : undefined;
    if (!matchId) {
        // 1. Query by accessCode field (cleanCode, bmCode, rawCode)
        const accessCodeQueries = [
            matchesRef.where('accessCode', '==', cleanCode).limit(1).get(),
            matchesRef.where('accessCode', '==', bmCode).limit(1).get(),
            matchesRef.where('accessCode', '==', rawCode).limit(1).get(),
        ];
        const results = await Promise.all(accessCodeQueries);
        for (const snap of results) {
            if (!snap.empty && snap.docs[0]) {
                matchId = snap.docs[0].id;
                break;
            }
        }
    }
    // 2. Query by direct document ID
    if (!matchId) {
        const candidates = [cleanCode, bmCode, rawCode, payload.accessCode];
        for (const candidate of candidates) {
            if (!candidate)
                continue;
            const directDoc = await matchesRef.doc(candidate).get();
            if (directDoc.exists) {
                matchId = directDoc.id;
                break;
            }
        }
    }
    // 3. Fallback scan of open waiting lobbies (supports matchId suffix matching)
    if (!matchId) {
        const openLobbiesSnap = await matchesRef
            .where('status', '==', 'waiting_for_players')
            .limit(20)
            .get();
        for (const docSnap of openLobbiesSnap.docs) {
            const data = docSnap.data();
            const docAccessCode = (data.accessCode || '').toUpperCase();
            const docRawCode = docAccessCode.replace(/^BM-/, '');
            const idUpper = docSnap.id.toUpperCase();
            if (docAccessCode === cleanCode ||
                docAccessCode === bmCode ||
                docRawCode === rawCode ||
                idUpper === cleanCode ||
                idUpper.endsWith(rawCode) ||
                idUpper.endsWith(cleanCode)) {
                matchId = docSnap.id;
                break;
            }
        }
    }
    if (!matchId) {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, `No open lobby found for match code "${cleanCode}".`);
    }
    const matchRef = matchesRef.doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'joinMatchByAccessCode', async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
            if (isTestCode) {
                // Concurrency fallback for test room: if joiner joins before host creates, create the initial test lobby
                const initialMatch = {
                    matchId: testRoomConfig_1.TEST_MATCH_ID,
                    boardId: 'default-standard-board',
                    rulesetVersion: '1.0.0',
                    status: 'waiting_for_players',
                    currentPhase: 'LOBBY',
                    currentPlayerId: null,
                    turnNumber: 0,
                    roundNumber: 0,
                    stateVersion: 1,
                    participantUserIds: [auth.userId],
                    hostUserId: auth.userId,
                    winnerId: null,
                    isPrivate: true,
                    accessCode: testRoomConfig_1.TEST_ROOM_CODE,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                const firstPlayer = {
                    id: auth.userId,
                    userId: auth.userId,
                    displayName: payload?.displayName || auth.email?.split('@')[0] || 'Player 1',
                    currentSpaceIndex: 0,
                    status: 'active',
                    turnOrder: 0,
                    netWorth: 1500,
                    cash: 1500,
                    specialPoints: 50,
                    ownedSpaceIds: [],
                    companyShareIds: [],
                    modifierIds: [],
                    connected: true,
                    lastActiveAt: Date.now(),
                };
                t.set(matchRef, initialMatch);
                t.set(matchRef.collection('players').doc(firstPlayer.id), firstPlayer);
                return { matchId: testRoomConfig_1.TEST_MATCH_ID, player: firstPlayer, stateVersion: 1 };
            }
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }
        const match = snap.data();
        if (match.status !== 'waiting_for_players') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match has already started.');
        }
        if (match.participantUserIds.includes(auth.userId)) {
            const playerSnap = await t.get(matchRef.collection('players').doc(auth.userId));
            return { matchId, player: playerSnap.data(), stateVersion: match.stateVersion };
        }
        const playersSnap = await t.get(matchRef.collection('players'));
        if (playersSnap.size >= 4) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Lobby is full (max 4 players).');
        }
        const newPlayer = {
            id: auth.userId,
            userId: auth.userId,
            displayName: payload?.displayName || auth.email?.split('@')[0] || `Player ${playersSnap.size + 1}`,
            currentSpaceIndex: 0,
            status: 'active',
            turnOrder: playersSnap.size,
            netWorth: 1500,
            cash: 1500,
            specialPoints: 50,
            ownedSpaceIds: [],
            companyShareIds: [],
            modifierIds: [],
            connected: true,
            lastActiveAt: Date.now(),
        };
        match.participantUserIds.push(auth.userId);
        const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.set(matchRef.collection('players').doc(newPlayer.id), newPlayer);
        return { matchId, player: newPlayer, stateVersion: newVersion };
    });
    return {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: result.stateVersion || 1,
        data: result,
    };
}));
/**
 * 2. joinMatch
 */
exports.joinMatch = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'joinMatch');
    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'joinMatch', async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }
        const match = snap.data();
        if (match.status !== 'waiting_for_players') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_ACTIVE, 'Match has already started.');
        }
        if (match.participantUserIds.includes(auth.userId)) {
            return match;
        }
        const playersSnap = await t.get(matchRef.collection('players'));
        if (playersSnap.size >= 4) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match is at maximum player capacity.');
        }
        const newPlayer = {
            id: auth.userId,
            userId: auth.userId,
            displayName: payload?.displayName || auth.email?.split('@')[0] || `Player ${playersSnap.size + 1}`,
            currentSpaceIndex: 0,
            status: 'active',
            turnOrder: playersSnap.size,
            netWorth: 1500,
            cash: 1500,
            specialPoints: 50,
            ownedSpaceIds: [],
            companyShareIds: [],
            modifierIds: [],
            connected: true,
            lastActiveAt: Date.now(),
        };
        match.participantUserIds.push(auth.userId);
        const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;
        t.update(matchRef, {
            participantUserIds: match.participantUserIds,
        });
        t.set(matchRef.collection('players').doc(newPlayer.id), newPlayer);
        return match;
    });
    const response = {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: result.stateVersion,
        data: result,
    };
    return response;
}));
/**
 * 3. leaveMatch
 */
exports.leaveMatch = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const { matchId, requestId } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'leaveMatch', async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }
        const match = snap.data();
        if (match.status !== 'waiting_for_players') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Cannot voluntarily leave a match that has already commenced.');
        }
        match.participantUserIds = match.participantUserIds.filter((id) => id !== auth.userId);
        const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;
        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.delete(matchRef.collection('players').doc(auth.userId));
        return match;
    });
    return {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: result.stateVersion,
        data: result,
    };
}));
/**
 * 4. startMatch
 */
exports.startMatch = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const { matchId, requestId } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'startMatch', async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        }
        const match = snap.data();
        if (match.hostUserId !== auth.userId) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Only the host may start the match.');
        }
        if (match.status !== 'waiting_for_players') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
        }
        const playersSnap = await t.get(matchRef.collection('players'));
        if (playersSnap.size < 2) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'At least 2 players are required to start the match.');
        }
        const players = playersSnap.docs.map((d) => d.data());
        match.status = 'in_progress';
        match.currentPhase = 'TURN_START';
        match.currentPlayerId = players[0].id;
        match.turnNumber = 1;
        match.roundNumber = 1;
        const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;
        t.update(matchRef, {
            status: match.status,
            currentPhase: match.currentPhase,
            currentPlayerId: match.currentPlayerId,
            turnNumber: match.turnNumber,
            roundNumber: match.roundNumber,
        });
        return match;
    });
    return {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: result.stateVersion,
        data: result,
    };
}));
/**
 * 5. getMatchState
 */
exports.getMatchState = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const matchRef = db.collection('matches').doc(request.data.matchId);
    const snap = await matchRef.get();
    if (!snap.exists) {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
    }
    const match = snap.data();
    if (!match.participantUserIds.includes(auth.userId) && !auth.isAdmin && match.status !== 'waiting_for_players') {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Not authorized to view private match state.');
    }
    const playersSnap = await matchRef.collection('players').get();
    const players = playersSnap.docs.map((d) => d.data());
    return {
        success: true,
        requestId: `get_state_${Date.now()}`,
        serverTime: Date.now(),
        stateVersion: match.stateVersion,
        data: { match, players },
    };
}));
/**
 * 6. reconnectMatch
 */
exports.reconnectMatch = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const matchRef = db.collection('matches').doc(request.data.matchId);
    const playerRef = matchRef.collection('players').doc(auth.userId);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) {
        throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player is not registered in this match.');
    }
    await playerRef.update({
        connected: true,
        lastActiveAt: Date.now(),
    });
    return {
        success: true,
        requestId: `reconnect_${Date.now()}`,
        serverTime: Date.now(),
        data: { connected: true },
    };
}));
/**
 * 7. addBotPlayer
 */
exports.addBotPlayer = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'addBotPlayer', async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists)
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data();
        if (match.hostUserId !== auth.userId) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Only host can add AI competitors.');
        }
        if (match.status !== 'waiting_for_players') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
        }
        if (match.participantUserIds.length >= 4) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Lobby is full (max 4 players).');
        }
        const botNames = ['Apex Capital (AI)', 'Venture Bot (AI)', 'Bullish Quant (AI)', 'Silicon Syndicate (AI)'];
        const existingCount = match.participantUserIds.filter((id) => id.startsWith('bot_')).length;
        const defaultName = botNames[existingCount % botNames.length];
        const botName = payload?.botName || defaultName;
        const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const botPlayer = {
            id: botId,
            userId: botId,
            displayName: botName,
            currentSpaceIndex: 0,
            status: 'active',
            turnOrder: match.participantUserIds.length,
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
        match.participantUserIds.push(botId);
        const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;
        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.set(matchRef.collection('players').doc(botId), botPlayer);
        return { botPlayer, match };
    });
    return {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: result.match.stateVersion,
        data: result,
    };
}));
/**
 * 8. removeBotPlayer
 */
exports.removeBotPlayer = (0, https_1.onCall)((0, errorWrapper_1.withErrorHandling)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'removeBotPlayer', async (t) => {
        const snap = await t.get(matchRef);
        if (!snap.exists)
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.MATCH_NOT_FOUND, 'Match not found.');
        const match = snap.data();
        if (match.hostUserId !== auth.userId) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Only host can remove players.');
        }
        if (match.status !== 'waiting_for_players') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'Match has already started.');
        }
        match.participantUserIds = match.participantUserIds.filter((id) => id !== payload.botId);
        const newVersion = gameEngine_1.GameEngineInternal.incrementStateVersion(t, matchRef, match);
        match.stateVersion = newVersion;
        t.update(matchRef, { participantUserIds: match.participantUserIds });
        t.delete(matchRef.collection('players').doc(payload.botId));
        return { removedBotId: payload.botId, match };
    });
    return {
        success: true,
        requestId,
        serverTime: Date.now(),
        stateVersion: result.match.stateVersion,
        data: result,
    };
}));
//# sourceMappingURL=matchFunctions.js.map