import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useGame } from './GameContext';

export type Screen = 
  | 'SPLASH' 
  | 'AUTH' 
  | 'HOME' 
  | 'GAME_MODE' 
  | 'MATCH_SETUP' 
  | 'LOBBY' 
  | 'GAMEPLAY' 
  | 'PAUSE_OVERLAY'
  | 'GAME_OVER' 
  | 'RESULTS' 
  | 'PROFILE' 
  | 'SETTINGS'
  | 'RANKED'
  | 'SOCIAL'
  | 'STORE'
  | 'RECOVERY'
  | 'ERROR';

interface NavigationContextValue {
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  history: Screen[];
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isFirebaseConfigured, isLoading: isAuthLoading } = useAuth();
  const { match, activeMatchId } = useGame();
  
  const [history, setHistory] = useState<Screen[]>(['SPLASH']);
  
  const currentScreen = history[history.length - 1];

  const navigate = useCallback((screen: Screen) => {
    setHistory((prev) => {
      // Prevent duplicate consecutive navigation
      if (prev[prev.length - 1] === screen) return prev;
      return [...prev, screen];
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  // Root Navigation Controller (Auth & Active Match observer)
  useEffect(() => {
    // 1. Initial boot / splash logic
    if (isAuthLoading) {
      if (currentScreen !== 'SPLASH') navigate('SPLASH');
      return;
    }

    // 2. Auth checking
    if (!user) {
      if (currentScreen !== 'AUTH' && currentScreen !== 'SPLASH') {
        setHistory(['AUTH']); // Reset history to AUTH if logged out
      } else if (currentScreen === 'SPLASH') {
        navigate('AUTH');
      }
      return;
    }

    // 3. Authenticated logic on initial SPLASH mount
    if (user && currentScreen === 'SPLASH') {
      // Check if we have a persisted active match from storage or memory
      const persistedMatchId = activeMatchId || (typeof window !== 'undefined' ? localStorage.getItem('bigmomma_active_match_id') : null);
      if (persistedMatchId && match) {
        if (match.status === 'completed') {
          setHistory(['HOME', 'GAME_OVER']);
        } else if (match.status === 'waiting_for_players') {
          setHistory(['HOME', 'RECOVERY']);
        } else {
          setHistory(['HOME', 'RECOVERY']);
        }
      } else {
        setHistory(['HOME']);
      }
    }
    
    // 4. Force transitions based on authoritative match state
    if (activeMatchId && match) {
      if (match.status === 'completed' && currentScreen !== 'GAME_OVER' && currentScreen !== 'RESULTS') {
        navigate('GAME_OVER');
      } else if (match.status === 'in_progress' && (currentScreen === 'LOBBY' || currentScreen === 'MATCH_SETUP')) {
        navigate('GAMEPLAY');
      }
    }

  }, [user, isFirebaseConfigured, isAuthLoading, activeMatchId, match?.status, currentScreen, navigate]);

  return (
    <NavigationContext.Provider value={{ currentScreen, navigate, goBack, history }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
};
