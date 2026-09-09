"use strict";
/**
 * Production Authoritative Internal Game Functions (Non-Callable)
 * Executed solely inside secure server transactions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngineInternal = void 0;
const contracts_1 = require("../types/contracts");
class GameEngineInternal {
    /**
     * Asserts and advances match state version inside a transaction
     */
    static incrementStateVersion(transaction, matchRef, currentMatch, expectedVersion) {
        if (expectedVersion !== undefined && currentMatch.stateVersion !== expectedVersion) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.STALE_STATE, `Match state is stale. Expected version ${expectedVersion}, but current version is ${currentMatch.stateVersion}.`, true, { currentVersion: currentMatch.stateVersion, expectedVersion });
        }
        const newVersion = currentMatch.stateVersion + 1;
        transaction.update(matchRef, {
            stateVersion: newVersion,
            updatedAt: Date.now(),
        });
        return newVersion;
    }
    /**
     * Internal: advanceTurn
     */
    static advanceTurn(currentMatch, players) {
        const activePlayers = players
            .filter((p) => p.status === 'active')
            .sort((a, b) => a.turnOrder - b.turnOrder);
        if (activePlayers.length === 0) {
            throw new contracts_1.ServerFunctionError(contracts_1.SERVER_ERROR_CODES.INVALID_STATE_TRANSITION, 'No active players remaining in match.');
        }
        const currentIndex = activePlayers.findIndex((p) => p.id === currentMatch.currentPlayerId);
        let nextIndex = currentIndex + 1;
        let nextRoundNumber = currentMatch.roundNumber;
        if (nextIndex >= activePlayers.length) {
            nextIndex = 0;
            nextRoundNumber += 1;
        }
        return {
            nextPlayerId: activePlayers[nextIndex].id,
            nextTurnNumber: currentMatch.turnNumber + 1,
            nextRoundNumber,
        };
    }
    /**
     * Internal: calculateNetWorth
     */
    static calculateNetWorth(player, assetValues = {}) {
        let assetsTotal = 0;
        for (const spaceId of player.ownedSpaceIds) {
            assetsTotal += assetValues[spaceId] || 0;
        }
        return player.cash + assetsTotal;
    }
    /**
     * Internal: transferOwnership
     */
    static transferOwnership(fromPlayer, toPlayer, assetId) {
        fromPlayer.ownedSpaceIds = fromPlayer.ownedSpaceIds.filter((id) => id !== assetId);
        if (!toPlayer.ownedSpaceIds.includes(assetId)) {
            toPlayer.ownedSpaceIds.push(assetId);
        }
    }
    /**
     * Internal: handleBankruptcy
     */
    static handleBankruptcy(player, creditor) {
        player.status = 'bankrupt';
        player.cash = 0;
        player.specialPoints = 0;
        if (creditor) {
            // Transfer assets to creditor
            creditor.ownedSpaceIds.push(...player.ownedSpaceIds);
        }
        player.ownedSpaceIds = [];
    }
    /**
     * Internal: completeMatch
     */
    static completeMatch(match, winnerPlayerId) {
        match.status = 'completed';
        match.winnerId = winnerPlayerId;
        match.updatedAt = Date.now();
    }
}
exports.GameEngineInternal = GameEngineInternal;
//# sourceMappingURL=gameEngine.js.map