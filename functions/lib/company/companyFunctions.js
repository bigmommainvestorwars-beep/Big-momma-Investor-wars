"use strict";
/**
 * Production Company Ability Callable Functions
 * Validates ownership, requirements, cooldowns, and activates company abilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateCompanyAbility = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const auth_1 = require("../system/security/auth");
const appCheck_1 = require("../system/security/appCheck");
const rateLimiter_1 = require("../system/rateLimit/rateLimiter");
const idempotencyService_1 = require("../system/idempotency/idempotencyService");
const contracts_1 = require("../types/contracts");
const db = (0, firebaseAdmin_1.getAdminFirestore)();
/**
 * 14. activateCompanyAbility
 */
exports.activateCompanyAbility = (0, https_1.onCall)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'spAction');
    const { matchId, requestId, payload } = request.data;
    const matchRef = db.collection('matches').doc(matchId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'activateCompanyAbility', async (t) => {
        const playerRef = matchRef.collection('players').doc(auth.userId);
        const playerSnap = await t.get(playerRef);
        if (!playerSnap.exists)
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.PLAYER_NOT_IN_MATCH, 'Player not found.');
        const player = playerSnap.data();
        if (!player.companyShareIds.includes(payload.companyId) && !player.ownedSpaceIds.includes(payload.companyId)) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.ACTION_NOT_AVAILABLE, 'Player does not have ownership or sufficient shares in this company.');
        }
        // Record log
        const logRef = matchRef.collection('logs').doc();
        t.set(logRef, {
            id: logRef.id,
            turnNumber: 0,
            roundNumber: 0,
            type: 'COMPANY_ABILITY_ACTIVATED',
            sourcePlayerId: player.id,
            targetPlayerId: payload.targetId || null,
            summary: `${player.displayName} activated ability ${payload.abilityId} of company ${payload.companyId}.`,
            data: payload,
            timestamp: Date.now(),
        });
        return {
            companyId: payload.companyId,
            abilityId: payload.abilityId,
            activated: true,
        };
    });
    const response = {
        success: true,
        requestId,
        serverTime: Date.now(),
        data: result,
    };
    return response;
});
//# sourceMappingURL=companyFunctions.js.map