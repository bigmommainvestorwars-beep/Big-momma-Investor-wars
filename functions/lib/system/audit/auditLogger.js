"use strict";
/**
 * Production Security Audit Logger
 * Authoritatively records security events in securityEvents/{eventId}.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const firebaseAdmin_1 = require("../../config/firebaseAdmin");
class AuditLogger {
    static async logSecurityEvent(event) {
        const db = (0, firebaseAdmin_1.getAdminFirestore)();
        const eventRef = db.collection('securityEvents').doc();
        const timestamp = Date.now();
        const record = {
            eventId: eventRef.id,
            ...event,
            timestamp,
        };
        console.warn(`[SECURITY AUDIT - ${event.severity.toUpperCase()}] ${event.eventType}`, JSON.stringify(record));
        try {
            await eventRef.set(record);
        }
        catch (err) {
            console.error('Failed to persist security event to Firestore:', err);
        }
        return eventRef.id;
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=auditLogger.js.map