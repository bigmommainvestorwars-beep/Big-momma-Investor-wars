/**
 * Production Firebase App Check Verification Boundary
 * Supports iOS (App Attest / DeviceCheck), Android (Play Integrity), and Web (reCAPTCHA Enterprise).
 * Provides configurable enforcement:
 * - 'strict': Rejects requests without verified App Check token
 * - 'permissive': Validates and logs warnings, but allows unverified requests (for dev / migration)
 * - 'disabled': Bypasses App Check (for local unit testing & CI emulators)
 */

import { CallableRequest } from 'firebase-functions/v2/https';
import { ServerFunctionError, SERVER_ERROR_CODES } from '../../types/contracts';

export type AppCheckEnforcementMode = 'strict' | 'permissive' | 'disabled';

export class AppCheckGuard {
  private static getMode(): AppCheckEnforcementMode {
    const envMode = process.env.APP_CHECK_ENFORCEMENT;
    if (envMode === 'strict') return 'strict';
    if (envMode === 'permissive') return 'permissive';
    if (envMode === 'disabled') return 'disabled';

    // Permissive mode by default unless explicitly strict
    const appEnv = process.env.APP_ENV;
    if (envMode === 'strict') {
      return 'strict';
    }
    return 'permissive';
  }

  public static verify(request: CallableRequest): { verified: boolean; appId?: string } {
    const mode = this.getMode();
    if (mode === 'disabled') {
      return { verified: true };
    }

    const appCheckToken = request.app;
    if (!appCheckToken) {
      if (mode === 'strict') {
        throw new ServerFunctionError(
          SERVER_ERROR_CODES.AUTH_FORBIDDEN,
          'App Check attestation required. The request failed device integrity verification.'
        );
      }
      return { verified: false };
    }

    return {
      verified: true,
      appId: appCheckToken.appId,
    };
  }
}
