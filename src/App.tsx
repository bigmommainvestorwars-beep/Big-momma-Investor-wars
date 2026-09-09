/**
 * Production Application Entry Point
 * Wires up foundational providers and the Phase 3A Landscape Gameplay Screen.
 */

import React from 'react';
import { AuthProvider } from './client/context/AuthContext';
import { GameProvider } from './client/context/GameContext';
import { LandscapeGameScreen } from './client/components/game/LandscapeGameScreen';

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <LandscapeGameScreen />
      </GameProvider>
    </AuthProvider>
  );
}
