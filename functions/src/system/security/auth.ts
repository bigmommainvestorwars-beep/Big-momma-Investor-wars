/**
 * Production Authentication & Authorization Guard
 * Enforces that user identity is derived strictly from verified Firebase Auth context.
 * Guards against client-provided userId spoofing and unauthorized admin access.
 */

import { CallableRequest } from 'firebase-functions/v2/https';
import { ServerFunctionError, SERVER_ERROR_CODES } from '../../types/contracts';

export interface VerifiedAuthContext {
  userId: string;
  email: string | null;
  isAdmin: boolean;
}

export class AuthGuard {
  /**
   * Asserts request has a verified Firebase Auth token.
   * Client-provided user IDs are strictly rejected.
   */
  public static assertAuthenticated(request: CallableRequest): VerifiedAuthContext {
    if (!request.auth || !request.auth.uid) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.AUTH_REQUIRED,
        'Authentication required. Unauthenticated requests are forbidden.'
      );
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
  public static assertAdmin(request: CallableRequest): VerifiedAuthContext {
    const auth = this.assertAuthenticated(request);
    if (!auth.isAdmin) {
      throw new ServerFunctionError(
        SERVER_ERROR_CODES.AUTH_FORBIDDEN,
        'Access denied. Administrator privileges required.'
      );
    }
    return auth;
  }
}
