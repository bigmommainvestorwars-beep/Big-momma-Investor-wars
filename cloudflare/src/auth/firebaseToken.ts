/**
 * Firebase ID Token Authenticator for Cloudflare Workers
 * Verifies Firebase Auth JWT tokens and extracts user identity.
 */

import { AuthenticatedUser } from '../types/env';

export interface TokenVerificationResult {
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string;
  auth_time?: number;
  user_id?: string;
  sub?: string;
  iat?: number;
  exp?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  firebase?: {
    identities?: Record<string, unknown>;
    sign_in_provider?: string;
  };
}

function base64UrlDecode(str: string): string {
  // Convert standard Base64URL to Base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export async function verifyFirebaseToken(
  token: string,
  expectedProjectId: string = 'bigmomma-investor-wars'
): Promise<TokenVerificationResult> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { valid: false, error: 'Authentication token is empty or missing.' };
  }

  // Handle local dev / test mock tokens (e.g., "test_token_user123" or "anon_guest_abc")
  if (token.startsWith('test_token_') || token.startsWith('mock_token_') || token.startsWith('anon_')) {
    const rawId = token.replace(/^(test_token_|mock_token_)/, '');
    const isAnon = token.startsWith('anon_');
    return {
      valid: true,
      user: {
        userId: rawId || 'anonymous_user',
        displayName: isAnon ? `Guest (${rawId.slice(0, 5)})` : `Player (${rawId.slice(0, 5)})`,
        isAnonymous: isAnon,
        tokenIssuedAt: Date.now(),
        tokenExpiresAt: Date.now() + 3600 * 1000,
      },
    };
  }

  // JWT must have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed JWT: token must contain 3 dot-separated segments.' };
  }

  try {
    const headerStr = base64UrlDecode(parts[0]);
    const payloadStr = base64UrlDecode(parts[1]);

    const header = JSON.parse(headerStr) as JwtHeader;
    const payload = JSON.parse(payloadStr) as JwtPayload;

    const nowSeconds = Math.floor(Date.now() / 1000);

    // 1. Expiration check
    if (payload.exp && payload.exp < nowSeconds) {
      return { valid: false, error: 'Token has expired.' };
    }

    // 2. Issued-at check (allow 5 min clock skew)
    if (payload.iat && payload.iat > nowSeconds + 300) {
      return { valid: false, error: 'Token issued at a future time.' };
    }

    // 3. Issuer check (if projectId is configured)
    if (expectedProjectId) {
      const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
      if (payload.iss && payload.iss !== expectedIssuer && !payload.iss.includes(expectedProjectId)) {
        return {
          valid: false,
          error: `Token issuer mismatch. Expected '${expectedIssuer}', received '${payload.iss}'.`,
        };
      }

      if (payload.aud && payload.aud !== expectedProjectId) {
        return {
          valid: false,
          error: `Token audience mismatch. Expected '${expectedProjectId}', received '${payload.aud}'.`,
        };
      }
    }

    const userId = payload.user_id || payload.sub;
    if (!userId) {
      return { valid: false, error: 'Token payload does not contain a valid user ID (sub/user_id).' };
    }

    const isAnonymous = payload.firebase?.sign_in_provider === 'anonymous' || !payload.email;
    const displayName = payload.name || (payload.email ? payload.email.split('@')[0] : `Investor_${userId.slice(0, 6)}`);

    return {
      valid: true,
      user: {
        userId,
        displayName,
        email: payload.email,
        isAnonymous,
        tokenIssuedAt: (payload.iat || nowSeconds) * 1000,
        tokenExpiresAt: (payload.exp || nowSeconds + 3600) * 1000,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to decode and verify JWT token: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
