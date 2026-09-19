"use strict";
/**
 * Production Firebase Cloud Functions Entry Point
 * All callable functions exported here for deployment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemHealth = exports.setAdminClaim = exports.recoverAccount = exports.requestAccountDeletion = exports.getAccountState = exports.activateCompanyAbility = exports.submitMarketChoice = exports.resolveAuction = exports.passAuction = exports.placeBid = exports.createAuction = exports.executeBotTurn = exports.startSpaceAuction = exports.buyProperty = exports.completeTurn = exports.executeSPAction = exports.submitMovementDecision = exports.requestRoll = exports.removeBotPlayer = exports.addBotPlayer = exports.reconnectMatch = exports.getMatchState = exports.startMatch = exports.leaveMatch = exports.joinMatch = exports.joinMatchByAccessCode = exports.findOrCreateQuickMatch = exports.createMatch = void 0;
// Match functions
var matchFunctions_1 = require("./match/matchFunctions");
Object.defineProperty(exports, "createMatch", { enumerable: true, get: function () { return matchFunctions_1.createMatch; } });
Object.defineProperty(exports, "findOrCreateQuickMatch", { enumerable: true, get: function () { return matchFunctions_1.findOrCreateQuickMatch; } });
Object.defineProperty(exports, "joinMatchByAccessCode", { enumerable: true, get: function () { return matchFunctions_1.joinMatchByAccessCode; } });
Object.defineProperty(exports, "joinMatch", { enumerable: true, get: function () { return matchFunctions_1.joinMatch; } });
Object.defineProperty(exports, "leaveMatch", { enumerable: true, get: function () { return matchFunctions_1.leaveMatch; } });
Object.defineProperty(exports, "startMatch", { enumerable: true, get: function () { return matchFunctions_1.startMatch; } });
Object.defineProperty(exports, "getMatchState", { enumerable: true, get: function () { return matchFunctions_1.getMatchState; } });
Object.defineProperty(exports, "reconnectMatch", { enumerable: true, get: function () { return matchFunctions_1.reconnectMatch; } });
Object.defineProperty(exports, "addBotPlayer", { enumerable: true, get: function () { return matchFunctions_1.addBotPlayer; } });
Object.defineProperty(exports, "removeBotPlayer", { enumerable: true, get: function () { return matchFunctions_1.removeBotPlayer; } });
// Turn & movement functions
var turnFunctions_1 = require("./turn/turnFunctions");
Object.defineProperty(exports, "requestRoll", { enumerable: true, get: function () { return turnFunctions_1.requestRoll; } });
Object.defineProperty(exports, "submitMovementDecision", { enumerable: true, get: function () { return turnFunctions_1.submitMovementDecision; } });
Object.defineProperty(exports, "executeSPAction", { enumerable: true, get: function () { return turnFunctions_1.executeSPAction; } });
Object.defineProperty(exports, "completeTurn", { enumerable: true, get: function () { return turnFunctions_1.completeTurn; } });
Object.defineProperty(exports, "buyProperty", { enumerable: true, get: function () { return turnFunctions_1.buyProperty; } });
Object.defineProperty(exports, "startSpaceAuction", { enumerable: true, get: function () { return turnFunctions_1.startSpaceAuction; } });
Object.defineProperty(exports, "executeBotTurn", { enumerable: true, get: function () { return turnFunctions_1.executeBotTurn; } });
// Auction functions
var auctionFunctions_1 = require("./auction/auctionFunctions");
Object.defineProperty(exports, "createAuction", { enumerable: true, get: function () { return auctionFunctions_1.createAuction; } });
Object.defineProperty(exports, "placeBid", { enumerable: true, get: function () { return auctionFunctions_1.placeBid; } });
Object.defineProperty(exports, "passAuction", { enumerable: true, get: function () { return auctionFunctions_1.passAuction; } });
Object.defineProperty(exports, "resolveAuction", { enumerable: true, get: function () { return auctionFunctions_1.resolveAuction; } });
// Market functions
var marketFunctions_1 = require("./market/marketFunctions");
Object.defineProperty(exports, "submitMarketChoice", { enumerable: true, get: function () { return marketFunctions_1.submitMarketChoice; } });
// Company functions
var companyFunctions_1 = require("./company/companyFunctions");
Object.defineProperty(exports, "activateCompanyAbility", { enumerable: true, get: function () { return companyFunctions_1.activateCompanyAbility; } });
// Auth & account functions
var accountFunctions_1 = require("./auth/accountFunctions");
Object.defineProperty(exports, "getAccountState", { enumerable: true, get: function () { return accountFunctions_1.getAccountState; } });
Object.defineProperty(exports, "requestAccountDeletion", { enumerable: true, get: function () { return accountFunctions_1.requestAccountDeletion; } });
Object.defineProperty(exports, "recoverAccount", { enumerable: true, get: function () { return accountFunctions_1.recoverAccount; } });
// Admin & diagnostics functions
var adminFunctions_1 = require("./admin/adminFunctions");
Object.defineProperty(exports, "setAdminClaim", { enumerable: true, get: function () { return adminFunctions_1.setAdminClaim; } });
Object.defineProperty(exports, "getSystemHealth", { enumerable: true, get: function () { return adminFunctions_1.getSystemHealth; } });
//# sourceMappingURL=index.js.map