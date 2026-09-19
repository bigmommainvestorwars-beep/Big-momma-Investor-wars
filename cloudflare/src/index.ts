/**
 * Cloudflare Worker WebSocket Gateway
 * Routes, authenticates, and upgrades WebSocket connections to match-specific Durable Objects.
 */

import { Env } from './types/env';
import { MatchRoom } from './matchRoom';
import { verifyFirebaseToken } from './auth/firebaseToken';
import { WsErrorCode } from './protocol/errors';

export { MatchRoom };

const MATCH_ID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health check endpoint
    if (path === '/health' || path === '/') {
      return Response.json({
        service: 'bigmomma-cloudflare-ws',
        status: 'healthy',
        protocolVersion: env.PROTOCOL_VERSION || '1.0.0',
        environment: env.ENVIRONMENT || 'production',
      });
    }

    // 2. Match WebSocket Route: /ws/match/:matchId
    const matchRoutePrefix = '/ws/match/';
    if (!path.startsWith(matchRoutePrefix)) {
      return new Response('Not Found', { status: 404 });
    }

    const matchId = path.slice(matchRoutePrefix.length).split('/')[0];

    // Validate matchId structure
    if (!matchId || !MATCH_ID_REGEX.test(matchId)) {
      return Response.json(
        {
          error: {
            code: WsErrorCode.INVALID_MATCH_ID,
            message: `Invalid matchId '${matchId}'. Must be 3-64 alphanumeric characters, dashes, or underscores.`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Upgrade Validation: Check for WebSocket upgrade header
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return Response.json(
        {
          error: {
            code: WsErrorCode.INVALID_UPGRADE,
            message: "Expected 'Upgrade: websocket' header for match connection.",
          },
        },
        { status: 426 }
      );
    }

    // 4. Authentication Extraction & Verification
    let token: string | null = null;

    // Method A: Authorization: Bearer <token>
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    // Method B: Query Parameter ?token=<token>
    if (!token) {
      token = url.searchParams.get('token');
    }

    // Method C: Sec-WebSocket-Protocol (often used in browser WebSockets to pass token)
    if (!token) {
      const secProtocol = request.headers.get('Sec-WebSocket-Protocol');
      if (secProtocol) {
        // May contain "bearer, <token>" or direct token
        const parts = secProtocol.split(',').map((s) => s.trim());
        token = parts.find((p) => p !== 'bearer' && p.length > 5) || parts[0];
      }
    }

    if (!token) {
      return Response.json(
        {
          error: {
            code: WsErrorCode.UNAUTHORIZED,
            message: 'Authentication token required. Provide via Authorization header or ?token query param.',
          },
        },
        { status: 401 }
      );
    }

    const verification = await verifyFirebaseToken(
      token,
      env.FIREBASE_PROJECT_ID || 'bigmomma-investor-wars'
    );

    if (!verification.valid || !verification.user) {
      return Response.json(
        {
          error: {
            code: WsErrorCode.UNAUTHORIZED,
            message: verification.error || 'Invalid or expired Firebase authentication token.',
          },
        },
        { status: 401 }
      );
    }

    const authenticatedUser = verification.user;

    // 5. Route to MatchRoom Durable Object
    const doId = env.MATCH_ROOMS.idFromName(matchId);
    const roomStub = env.MATCH_ROOMS.get(doId);

    // Forward the upgrade request to the Durable Object with authenticated metadata headers
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-player-id', authenticatedUser.userId);
    forwardedHeaders.set('x-display-name', authenticatedUser.displayName);
    forwardedHeaders.set('x-is-anonymous', String(authenticatedUser.isAnonymous));
    forwardedHeaders.set('x-match-id', matchId);

    const forwardedRequest = new Request(request.url, {
      method: request.method,
      headers: forwardedHeaders,
    });

    return roomStub.fetch(forwardedRequest);
  },
};
