/**
 * Production Application Entry Point
 * Wires up foundational providers and the Phase 4B Navigation Architecture.
 */

import React from 'react';
import { AuthProvider } from './client/context/AuthContext';
import { GameProvider } from './client/context/GameContext';
import { NavigationProvider } from './client/context/NavigationContext';
import { MultiplayerKernelProvider } from './client/context/MultiplayerKernelContext';
import { AppRouter } from './client/components/navigation/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <MultiplayerKernelProvider>
        <GameProvider>
          <NavigationProvider>
            <AppRouter />
          </NavigationProvider>
        </GameProvider>
      </MultiplayerKernelProvider>
    </AuthProvider>
  );
}
