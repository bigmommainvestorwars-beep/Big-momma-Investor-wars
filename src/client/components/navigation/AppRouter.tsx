import React from 'react';
import { useNavigation, Screen } from '../../context/NavigationContext';

// Import Screens
import { SplashBootScreen } from '../screens/SplashBootScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MatchSetupScreen } from '../screens/MatchSetupScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GameOverScreen } from '../screens/GameOverScreen';
import { RecoveryScreen } from '../screens/RecoveryScreen';
import { RankedScreen } from '../screens/RankedScreen';
import { SocialSyndicateScreen } from '../screens/SocialSyndicateScreen';
import { CosmeticsShopScreen } from '../screens/CosmeticsShopScreen';

// We reuse the existing gameplay screen
import { LandscapeGameScreen } from '../game/LandscapeGameScreen';

// Network & Matchmaking Overlays
import { NetworkStatusBanner } from '../network/NetworkStatusBanner';
import { MatchmakingQueueOverlay } from '../network/MatchmakingQueueOverlay';

export const AppRouter: React.FC = () => {
  const { currentScreen } = useNavigation();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'SPLASH':
        return <SplashBootScreen />;
      case 'AUTH':
        return <AuthScreen />;
      case 'HOME':
        return <HomeScreen />;
      case 'GAME_MODE':
      case 'MATCH_SETUP':
        return <MatchSetupScreen />;
      case 'LOBBY':
        return <LobbyScreen />;
      case 'GAMEPLAY':
      case 'PAUSE_OVERLAY':
        return <LandscapeGameScreen />;
      case 'GAME_OVER':
        return <GameOverScreen />;
      case 'PROFILE':
        return <ProfileScreen />;
      case 'SETTINGS':
        return <SettingsScreen />;
      case 'RANKED':
        return <RankedScreen />;
      case 'SOCIAL':
        return <SocialSyndicateScreen />;
      case 'STORE':
        return <CosmeticsShopScreen />;
      case 'RECOVERY':
        return <RecoveryScreen />;
      case 'ERROR':
        return <div className="text-white p-4">Error or Recovery State</div>;
      default:
        return <SplashBootScreen />;
    }
  };

  return (
    <>
      <NetworkStatusBanner />
      <MatchmakingQueueOverlay />
      {renderScreen()}
    </>
  );
};

