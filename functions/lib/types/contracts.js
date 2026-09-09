"use strict";
/**
 * Production Server Contracts & Standard Error Codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerFunctionError = exports.SERVER_ERROR_CODES = void 0;
exports.SERVER_ERROR_CODES = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
    USER_SUSPENDED: 'USER_SUSPENDED',
    MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
    MATCH_NOT_ACTIVE: 'MATCH_NOT_ACTIVE',
    PLAYER_NOT_IN_MATCH: 'PLAYER_NOT_IN_MATCH',
    PLAYER_ELIMINATED: 'PLAYER_ELIMINATED',
    NOT_YOUR_TURN: 'NOT_YOUR_TURN',
    INVALID_PHASE: 'INVALID_PHASE',
    INVALID_TIMING: 'INVALID_TIMING',
    INVALID_TARGET: 'INVALID_TARGET',
    TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
    INSUFFICIENT_SP: 'INSUFFICIENT_SP',
    INSUFFICIENT_CASH: 'INSUFFICIENT_CASH',
    INSUFFICIENT_AVAILABLE_CASH: 'INSUFFICIENT_AVAILABLE_CASH',
    ACTION_NOT_AVAILABLE: 'ACTION_NOT_AVAILABLE',
    ACTION_COOLDOWN: 'ACTION_COOLDOWN',
    ACTION_LIMIT_REACHED: 'ACTION_LIMIT_REACHED',
    AUCTION_NOT_FOUND: 'AUCTION_NOT_FOUND',
    AUCTION_NOT_ACTIVE: 'AUCTION_NOT_ACTIVE',
    AUCTION_NOT_ELIGIBLE: 'AUCTION_NOT_ELIGIBLE',
    BID_TOO_LOW: 'BID_TOO_LOW',
    BID_ALREADY_PROCESSED: 'BID_ALREADY_PROCESSED',
    AUCTION_EXPIRED: 'AUCTION_EXPIRED',
    EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
    EVENT_NOT_ACTIVE: 'EVENT_NOT_ACTIVE',
    CHOICE_NOT_FOUND: 'CHOICE_NOT_FOUND',
    CHOICE_EXPIRED: 'CHOICE_EXPIRED',
    INVALID_CHOICE: 'INVALID_CHOICE',
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
    DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
    STALE_STATE: 'STALE_STATE',
    RATE_LIMITED: 'RATE_LIMITED',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};
class ServerFunctionError extends Error {
    code;
    retryable;
    details;
    constructor(code, message, retryable = false, details) {
        super(message);
        this.name = 'ServerFunctionError';
        this.code = code;
        this.retryable = retryable;
        this.details = details;
    }
    toResponseError() {
        return {
            code: this.code,
            message: this.message,
            retryable: this.retryable,
            details: this.details,
        };
    }
}
exports.ServerFunctionError = ServerFunctionError;
//# sourceMappingURL=contracts.js.map