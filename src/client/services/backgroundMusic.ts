/**
 * Continuous Background Music Engine
 * Plays the official soundtrack ("Tems - Free Mind") non-stop during gameplay.
 * 
 * Features:
 * - Seamless non-stop looping (HTMLAudio loop + 'ended' safety fallback).
 * - Autoplay policy resilience: if browser blocks initial unmuted autoplay,
 *   it latches onto the first user interaction (click, roll, tap) and immediately resumes.
 * - Reactive state subscriptions for React components and HUD controls.
 * - Volume and mute state persistence in localStorage.
 */

export interface BackgroundMusicState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0.0 to 1.0
  isAutoplayPending: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  title: string;
  artist: string;
}

type MusicListener = (state: BackgroundMusicState) => void;

class BackgroundMusicEngine {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<MusicListener> = new Set();
  private gestureListenerAttached = false;
  private isUserPaused = false;

  private state: BackgroundMusicState = {
    isPlaying: false,
    isMuted: false,
    volume: 0.65,
    isAutoplayPending: false,
    isLoaded: false,
    currentTime: 0,
    duration: 0,
    title: 'Free Mind',
    artist: 'Tems',
  };

  constructor() {
    this.loadPreferences();
    this.initAudio();
  }

  private loadPreferences(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedMuted = localStorage.getItem('investor_wars_bgm_muted');
      if (savedMuted !== null) {
        this.state.isMuted = savedMuted === 'true';
      }
      const savedVolume = localStorage.getItem('investor_wars_bgm_volume');
      if (savedVolume !== null) {
        const parsed = parseFloat(savedVolume);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.state.volume = parsed;
        }
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private savePreferences(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('investor_wars_bgm_muted', String(this.state.isMuted));
      localStorage.setItem('investor_wars_bgm_volume', String(this.state.volume));
    } catch {
      // Ignore storage errors
    }
  }

  private initAudio(): void {
    if (typeof window === 'undefined') return;

    // Use the primary static path
    this.audio = new Audio('/audio/tems-free-mind.mp3');
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio) {
        this.state.duration = this.audio.duration || 0;
        this.state.isLoaded = true;
        this.notify();
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.state.currentTime = this.audio.currentTime;
      }
    });

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isAutoplayPending = false;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notify();
    });

    // Safety restart for non-stop infinite playback
    this.audio.addEventListener('ended', () => {
      if (!this.isUserPaused && this.audio) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
    });

    // Error recovery: fallback to secondary path if needed
    this.audio.addEventListener('error', (e) => {
      console.warn('Background audio load warning:', e);
      if (this.audio && !this.audio.src.includes('background-music.mp3')) {
        this.audio.src = '/audio/background-music.mp3';
        this.audio.load();
        if (!this.isUserPaused) {
          this.audio.play().catch(() => {});
        }
      }
    });
  }

  /**
   * Start playing the non-stop background track.
   * Handles autoplay restrictions gracefully by binding a gesture listener.
   */
  public play(): void {
    if (!this.audio) {
      this.initAudio();
    }
    if (!this.audio) return;

    this.isUserPaused = false;
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.state.isPlaying = true;
          this.state.isAutoplayPending = false;
          this.notify();
        })
        .catch((err) => {
          // Autoplay blocked by browser policy until user gesture
          if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
            this.state.isAutoplayPending = true;
            this.state.isPlaying = false;
            this.notify();
            this.attachUserGestureFallback();
          }
        });
    }
  }

  /**
   * Attaches one-time gesture listeners to immediately begin playback
   * on the player's first interaction with the game.
   */
  private attachUserGestureFallback(): void {
    if (this.gestureListenerAttached || typeof window === 'undefined') return;
    this.gestureListenerAttached = true;

    const handleFirstGesture = () => {
      this.removeUserGestureFallback();
      if (!this.isUserPaused && this.audio) {
        this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
        this.audio
          .play()
          .then(() => {
            this.state.isPlaying = true;
            this.state.isAutoplayPending = false;
            this.notify();
          })
          .catch(() => {});
      }
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
  }

  private removeUserGestureFallback(): void {
    this.gestureListenerAttached = false;
  }

  /**
   * Pause the background music.
   */
  public pause(): void {
    this.isUserPaused = true;
    if (this.audio) {
      this.audio.pause();
    }
    this.state.isPlaying = false;
    this.notify();
  }

  /**
   * Toggle between play and pause.
   */
  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Set mute status.
   */
  public setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.state.volume;
    }
    this.savePreferences();
    this.notify();
  }

  /**
   * Toggle mute status.
   */
  public toggleMute(): void {
    this.setMuted(!this.state.isMuted);
  }

  /**
   * Set playback volume (0.0 to 1.0).
   */
  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.audio && !this.state.isMuted) {
      this.audio.volume = clamped;
    }
    this.savePreferences();
    this.notify();
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error notifying music listener:', err);
      }
    });
  }

  /**
   * Subscribe to state updates.
   */
  public subscribe(listener: MusicListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): BackgroundMusicState {
    return { ...this.state };
  }
}

export const backgroundMusic = new BackgroundMusicEngine();
