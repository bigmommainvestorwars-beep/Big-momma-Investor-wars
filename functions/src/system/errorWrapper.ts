import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

export function withErrorHandling<T, Req = any>(
  handler: (request: CallableRequest<Req>) => Promise<T>
): (request: CallableRequest<Req>) => Promise<T> {
  return async (request: CallableRequest<Req>) => {
    try {
      return await handler(request);
    } catch (err: any) {
      if (err?.name === 'ServerFunctionError' || err?.code) {
        throw new HttpsError('failed-precondition', err.message, err.toResponseError ? err.toResponseError() : { code: err.code, message: err.message });
      }
      if (err instanceof HttpsError) {
        throw err;
      }
      console.error('Unhandled internal error in Cloud Function:', err);
      throw new HttpsError('internal', 'An internal server error occurred.');
    }
  };
}
