"use strict";
/**
 * Production Authentication & Authorization Guard
 * Enforces that user identity is derived strictly from verified Firebase Auth context.
 * Guards against client-provided userId spoofing and unauthorized admin access.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const contracts_1 = require("../../types/contracts");
class AuthGuard {
    /**
     * Asserts request has a verified Firebase Auth token.
     * Client-provided user IDs are strictly rejected.
     */
    static assertAuthenticated(request) {
        if (!request.auth || !request.auth.uid) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_REQUIRED, 'Authentication required. Unauthenticated requests are forbidden.');
        }
        const isAdmin = Boolean(request.auth.token && request.auth.token.admin === true);
        return {
            userId: request.auth.uid,
            email: request.auth.token.email || null,
            isAdmin,
        };
    }
    /**
     * Asserts verified user has server-granted administrator custom claim.
     * Client-provided flags (like body.isAdmin) are strictly disregarded.
     */
    static assertAdmin(request) {
        const auth = this.assertAuthenticated(request);
        if (!auth.isAdmin) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'Access denied. Administrator privileges required.');
        }
        return auth;
    }
}
exports.AuthGuard = AuthGuard;
//# sourceMappingURL=auth.js.map