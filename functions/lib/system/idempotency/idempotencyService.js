"use strict";
/**
 * Production Idempotency Engine
 * Atomic Firestore-based transaction idempotency guard.
 * Path: matches/{matchId}/idempotency/{requestId}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
const firebaseAdmin_1 = require("../../config/firebaseAdmin");
const contracts_1 = require("../../types/contracts");
class IdempotencyService {
    /**
     * Executes a mutation within an atomic idempotency lock.
     * If the request is already completed, returns the cached response.
     * If in-flight, rejects concurrent duplicate execution.
     */
    static async executeWithIdempotency(matchId, requestId, playerId, actionType, mutationFn) {
        if (!requestId || requestId.trim() === '') {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_TIMING, 'A valid requestId is required for all state mutations.');
        }
        const db = (0, firebaseAdmin_1.getAdminFirestore)();
        const idempotencyRef = db
            .collection('matches')
            .doc(matchId)
            .collection('idempotency')
            .doc(requestId);
        // 1. First transaction: check or claim the idempotency lock
        let cachedResult;
        await db.runTransaction(async (t) => {
            const docSnap = await t.get(idempotencyRef);
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data.status === 'completed') {
                    cachedResult = data.responsePayload;
                    return;
                }
                if (data.status === 'in_flight') {
                    throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.DUPLICATE_REQUEST, `Request ${requestId} is currently being processed. Please await response.`, true);
                }
            }
            // Claim lock
            t.set(idempotencyRef, {
                requestId,
                gameId: matchId,
                playerId,
                actionType,
                status: 'in_flight',
                createdAt: Date.now(),
            });
        });
        if (cachedResult !== undefined) {
            return cachedResult;
        }
        // 2. Execute mutation in transaction
        try {
            const result = await db.runTransaction(async (t) => {
                return await mutationFn(t);
            });
            // 3. Mark completed
            await idempotencyRef.update({
                status: 'completed',
                completedAt: Date.now(),
                responsePayload: result !== undefined ? result : null,
            });
            return result;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            try {
                await idempotencyRef.update({
                    status: 'failed',
                    completedAt: Date.now(),
                    errorMessage: message,
                });
            }
            catch {
                // Ignore failure update errors
            }
            throw err;
        }
    }
}
exports.IdempotencyService = IdempotencyService;
//# sourceMappingURL=idempotencyService.js.map