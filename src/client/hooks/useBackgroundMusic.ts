import { useState, useEffect } from 'react';
import { backgroundMusic, BackgroundMusicState } from '../services/backgroundMusic';

export function useBackgroundMusic(): {
  musicState: BackgroundMusicState;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
} {
  const [musicState, setMusicState] = useState<BackgroundMusicState>(backgroundMusic.getState());

  useEffect(() => {
    const unsubscribe = backgroundMusic.subscribe((state) => {
      setMusicState(state);
    });
    return unsubscribe;
  }, []);

  return {
    musicState,
    play: () => backgroundMusic.play(),
    pause: () => backgroundMusic.pause(),
    togglePlay: () => backgroundMusic.togglePlay(),
    toggleMute: () => backgroundMusic.toggleMute(),
    setMuted: (muted: boolean) => backgroundMusic.setMuted(muted),
    setVolume: (volume: number) => backgroundMusic.setVolume(volume),
  };
}
