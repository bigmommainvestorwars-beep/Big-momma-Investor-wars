"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withErrorHandling = withErrorHandling;
const https_1 = require("firebase-functions/v2/https");
function withErrorHandling(handler) {
    return async (request) => {
        try {
            return await handler(request);
        }
        catch (err) {
            if (err?.name === 'ServerFunctionError' || err?.code) {
                throw new https_1.HttpsError('failed-precondition', err.message, err.toResponseError ? err.toResponseError() : { code: err.code, message: err.message });
            }
            if (err instanceof https_1.HttpsError) {
                throw err;
            }
            console.error('Unhandled internal error in Cloud Function:', err);
            throw new https_1.HttpsError('internal', 'An internal server error occurred.');
        }
    };
}
//# sourceMappingURL=errorWrapper.js.map