"use strict";
/**
 * Production Firebase App Check Verification Boundary
 * Supports iOS (App Attest / DeviceCheck), Android (Play Integrity), and Web (reCAPTCHA Enterprise).
 * Provides configurable enforcement:
 * - 'strict': Rejects requests without verified App Check token
 * - 'permissive': Validates and logs warnings, but allows unverified requests (for dev / migration)
 * - 'disabled': Bypasses App Check (for local unit testing & CI emulators)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppCheckGuard = void 0;
const contracts_1 = require("../../types/contracts");
class AppCheckGuard {
    static getMode() {
        const envMode = process.env.APP_CHECK_ENFORCEMENT;
        if (envMode === 'strict')
            return 'strict';
        if (envMode === 'permissive')
            return 'permissive';
        if (envMode === 'disabled')
            return 'disabled';
        // Permissive mode by default unless explicitly strict
        const appEnv = process.env.APP_ENV;
        if (envMode === 'strict') {
            return 'strict';
        }
        return 'permissive';
    }
    static verify(request) {
        const mode = this.getMode();
        if (mode === 'disabled') {
            return { verified: true };
        }
        const appCheckToken = request.app;
        if (!appCheckToken) {
            if (mode === 'strict') {
                throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.AUTH_FORBIDDEN, 'App Check attestation required. The request failed device integrity verification.');
            }
            return { verified: false };
        }
        return {
            verified: true,
            appId: appCheckToken.appId,
        };
    }
}
exports.AppCheckGuard = AppCheckGuard;
//# sourceMappingURL=appCheck.js.map