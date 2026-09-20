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
    if (isAuthLoading || !isFirebaseConfigured) {
      if (currentScreen !== 'SPLASH') navigate('SPLASH');
      return;
    }

    // 2. Auth checking
    if (!user) {
      if (currentScreen !== 'AUTH' && currentScreen !== 'SPLASH') {
        setHistory(['AUTH']); // Reset history to AUTH if logged out
      } else if (currentScreen === 'SPLASH') {
        setHistory(['AUTH']);
      }
      return;
    }

    // 3. Authenticated logic: immediately route from AUTH or SPLASH to HOME or active match
    if (user && (currentScreen === 'SPLASH' || currentScreen === 'AUTH')) {
      // Check if we have an active match in progress
      if (activeMatchId && match) {
        if (match.status === 'completed') {
          setHistory(['HOME', 'GAME_OVER']);
        } else if (match.status === 'waiting_for_players') {
          setHistory(['HOME', 'LOBBY']);
        } else if (match.status === 'in_progress' || match.status === 'active') {
          setHistory(['HOME', 'GAMEPLAY']);
        } else {
          setHistory(['HOME']);
        }
      } else {
        setHistory(['HOME']);
      }
    }
    
    // 4. Force transitions based on authoritative match state if we are in game flow
    if (activeMatchId && match) {
      if (match.status === 'completed' && currentScreen !== 'GAME_OVER' && currentScreen !== 'RESULTS') {
        navigate('GAME_OVER');
      } else if ((match.status === 'in_progress' || match.status === 'active') && (currentScreen === 'LOBBY' || currentScreen === 'MATCH_SETUP')) {
        navigate('GAMEPLAY');
      }
    } else if (!activeMatchId && currentScreen === 'GAMEPLAY') {
      // Match was destroyed or left while actively in gameplay
      setHistory(['HOME']);
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
