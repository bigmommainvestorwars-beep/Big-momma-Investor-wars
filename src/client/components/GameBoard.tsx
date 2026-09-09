/**
 * Production GameBoard Component (Phase 3A)
 * Exports the LandscapeGameScreen as the primary gameplay interface.
 */

import React from 'react';
import { LandscapeGameScreen } from './game/LandscapeGameScreen';

export const GameBoard: React.FC = () => {
  return <LandscapeGameScreen />;
};

export default GameBoard;
