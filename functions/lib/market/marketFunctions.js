"use strict";
/**
 * Production Market Choice Callable Functions
 * Validates and applies player market decisions with idempotency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitMarketChoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const auth_1 = require("../system/security/auth");
const appCheck_1 = require("../system/security/appCheck");
const rateLimiter_1 = require("../system/rateLimit/rateLimiter");
const idempotencyService_1 = require("../system/idempotency/idempotencyService");
const contracts_1 = require("../types/contracts");
const db = (0, firebaseAdmin_1.getAdminFirestore)();
/**
 * 13. submitMarketChoice
 */
exports.submitMarketChoice = (0, https_1.onCall)(async (request) => {
    const auth = auth_1.AuthGuard.assertAuthenticated(request);
    appCheck_1.AppCheckGuard.verify(request);
    rateLimiter_1.RateLimiter.check(auth.userId, 'marketChoice');
    const { matchId, requestId, payload } = request.data;
    const choiceRef = db.collection('matches').doc(matchId).collection('choices').doc(payload.choiceId);
    const result = await idempotencyService_1.IdempotencyService.executeWithIdempotency(matchId, requestId, auth.userId, 'submitMarketChoice', async (t) => {
        const choiceSnap = await t.get(choiceRef);
        if (!choiceSnap.exists) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.CHOICE_NOT_FOUND, 'Choice not found.');
        }
        const choice = choiceSnap.data();
        if (choice.playerId !== auth.userId) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Choice belongs to another player.');
        }
        if (Date.now() > choice.expiresAt) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.CHOICE_EXPIRED, 'Choice decision period has expired.');
        }
        const validOption = choice.options.find((opt) => opt.id === payload.selectedOptionId);
        if (!validOption) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_CHOICE, 'Invalid option selected.');
        }
        // Remove resolved choice
        t.delete(choiceRef);
        return {
            choiceId: choice.id,
            selectedOptionId: payload.selectedOptionId,
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
//# sourceMappingURL=marketFunctions.js.map