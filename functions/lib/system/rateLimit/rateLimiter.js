"use strict";
/**
 * Production Rate Limiter for Cloud Functions
 * Provides configurable rate limiting per user / IP and action category.
 * Prevents DDoS, brute-force spamming, and automation cheating.
 *
 * ARCHITECTURAL NOTICE / PRODUCTION HARDENING REQUIREMENT:
 * This in-memory sliding-window rate limiter is instance-local (per Cloud Function container).
 * In multi-instance auto-scaling environments, it serves as a zero-latency first defensive line
 * against single-client rapid-fire abuse and spam within the same container.
 * It MUST NOT be treated as the sole production-wide rate-limit mechanism across horizontally
 * scaled instances. Shared/distributed rate limiting (e.g. via Cloud Armor, Redis / Google Cloud Memorystore,
 * or atomic distributed token buckets) is documented as a production deployment hardening requirement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const contracts_1 = require("../../types/contracts");
const DEFAULT_RATE_LIMITS = {
    auth: { windowMs: 60000, maxRequests: 10 },
    createMatch: { windowMs: 60000, maxRequests: 5 },
    rollDice: { windowMs: 5000, maxRequests: 3 },
    placeBid: { windowMs: 5000, maxRequests: 10 },
    spAction: { windowMs: 5000, maxRequests: 5 },
    marketChoice: { windowMs: 5000, maxRequests: 5 },
    accountDeletion: { windowMs: 300000, maxRequests: 3 },
    default: { windowMs: 10000, maxRequests: 30 },
};
const inMemoryStore = new Map();
class RateLimiter {
    static check(userIdOrIp, actionCategory) {
        const config = DEFAULT_RATE_LIMITS[actionCategory] || DEFAULT_RATE_LIMITS.default;
        const now = Date.now();
        const windowStart = now - config.windowMs;
        const key = `${userIdOrIp}:${actionCategory}`;
        let entry = inMemoryStore.get(key);
        if (!entry) {
            entry = { timestamps: [] };
            inMemoryStore.set(key, entry);
        }
        // Filter out expired timestamps
        entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
        if (entry.timestamps.length >= config.maxRequests) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.RATE_LIMITED, `Rate limit exceeded for action '${actionCategory}'. Please wait before retrying.`, true, {
                actionCategory,
                retryAfterMs: Math.max(0, entry.timestamps[0] + config.windowMs - now),
            });
        }
        entry.timestamps.push(now);
    }
    static resetForTesting() {
        inMemoryStore.clear();
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map