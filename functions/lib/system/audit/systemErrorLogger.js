"use strict";
/**
 * Production System Error Logger
 * Records server errors to systemErrors/{errorId}.
 * Keeps internal stack traces on the server while returning sanitized errors to clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemErrorLogger = void 0;
const firebaseAdmin_1 = require("../../config/firebaseAdmin");
class SystemErrorLogger {
    static async logError(params) {
        const db = (0, firebaseAdmin_1.getAdminFirestore)();
        const errorRef = db.collection('systemErrors').doc();
        const timestamp = Date.now();
        const record = {
            errorId: errorRef.id,
            severity: params.severity || 'MEDIUM',
            function: params.functionName,
            errorCode: params.errorCode,
            message: params.message,
            matchId: params.matchId || null,
            userId: params.userId || null,
            requestId: params.requestId || null,
            stateVersion: params.stateVersion || null,
            stackTrace: params.stackTrace || null,
            resolved: false,
            timestamp,
        };
        console.error(`[SYSTEM ERROR - ${record.severity}] ${params.functionName}: ${params.message}`, JSON.stringify(record));
        try {
            await errorRef.set(record);
        }
        catch (err) {
            console.error('Failed to persist system error to Firestore:', err);
        }
        return errorRef.id;
    }
}
exports.SystemErrorLogger = SystemErrorLogger;
//# sourceMappingURL=systemErrorLogger.js.map