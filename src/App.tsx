/**
 * Production Application Entry Point
 * Wires up foundational providers and the Phase 4B Navigation Architecture.
 */

import React from 'react';
import { ErrorBoundary } from './client/components/ErrorBoundary';
import { AuthProvider } from './client/context/AuthContext';
import { GameProvider } from './client/context/GameContext';
import { NavigationProvider } from './client/context/NavigationContext';
import { AppRouter } from './client/components/navigation/AppRouter';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GameProvider>
          <NavigationProvider>
            <AppRouter />
          </NavigationProvider>
        </GameProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
