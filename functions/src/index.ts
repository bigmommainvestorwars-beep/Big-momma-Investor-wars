/**
 * Production Firebase Cloud Functions Entry Point
 * All callable functions exported here for deployment.
 */

// Match functions
export {
  createMatch,
  findOrCreateQuickMatch,
  joinMatchByAccessCode,
  joinMatch,
  leaveMatch,
  startMatch,
  getMatchState,
  reconnectMatch,
  reconnectPlayer,
  markPlayerDisconnected,
  addBotPlayer,
  removeBotPlayer,
} from './match/matchFunctions';

// Turn & movement functions
export {
  requestRoll,
  submitMovementDecision,
  executeSPAction,
  completeTurn,
  buyProperty,
  startSpaceAuction,
  executeBotTurn,
} from './turn/turnFunctions';

// Auction functions
export {
  createAuction,
  placeBid,
  passAuction,
  resolveAuction,
} from './auction/auctionFunctions';

// Market functions
export {
  submitMarketChoice,
} from './market/marketFunctions';

// Company functions
export {
  activateCompanyAbility,
} from './company/companyFunctions';

// Auth & account functions
export {
  getAccountState,
  requestAccountDeletion,
  recoverAccount,
} from './auth/accountFunctions';

// Admin & diagnostics functions
export {
  setAdminClaim,
  getSystemHealth,
} from './admin/adminFunctions';
