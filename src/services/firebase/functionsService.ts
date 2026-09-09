/**
 * Production Cloud Functions Service Layer
 * Dispatches ActionRequests to the authoritative server mutation layer.
 */

import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, isFirebaseConfigured } from './config';
import { ActionRequest } from '../../types/request';
import { errorHandler } from '../monitoring/errorHandler';
import { logger } from '../monitoring/logger';

export interface ActionResponse<TResult = unknown> {
  success: boolean;
  requestId: string;
  stateVersion?: number;
  result?: TResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface IFunctionsService {
  isConfigured(): boolean;
  dispatchAction<TPayload, TResult>(
    request: ActionRequest<TPayload>
  ): Promise<ActionResponse<TResult>>;
}

class ProductionFunctionsService implements IFunctionsService {
  public isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  public async dispatchAction<TPayload, TResult>(
    request: ActionRequest<TPayload>
  ): Promise<ActionResponse<TResult>> {
    const functions = getFirebaseFunctions();
    if (!functions) {
      const errorMsg = 'Cloud Functions service is not configured.';
      errorHandler.capture(new Error(errorMsg), {
        errorCode: 'FUNCTIONS_NOT_CONFIGURED',
        requestId: request.requestId,
        gameId: request.gameId,
        action: request.actionType,
      });
      return {
        success: false,
        requestId: request.requestId,
        error: {
          code: 'FUNCTIONS_NOT_CONFIGURED',
          message: errorMsg,
        },
      };
    }

    try {
      logger.log('network', 'info', `Dispatching action ${request.actionType}`, {
        requestId: request.requestId,
        gameId: request.gameId,
        playerId: request.playerId,
      });

      const callable = httpsCallable<ActionRequest<TPayload>, ActionResponse<TResult>>(
        functions,
        'dispatchGameAction'
      );
      const res = await callable(request);
      return res.data;
    } catch (error) {
      errorHandler.capture(error, {
        errorCode: 'ACTION_DISPATCH_FAILED',
        requestId: request.requestId,
        gameId: request.gameId,
        action: request.actionType,
      });
      return {
        success: false,
        requestId: request.requestId,
        error: {
          code: 'ACTION_DISPATCH_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

export const functionsService = new ProductionFunctionsService();
