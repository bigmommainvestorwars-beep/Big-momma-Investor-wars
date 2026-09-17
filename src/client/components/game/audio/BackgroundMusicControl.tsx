import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Music, Play, Pause } from 'lucide-react';
import { useBackgroundMusic } from '../../../hooks/useBackgroundMusic';

export const BackgroundMusicControl: React.FC = () => {
  const { musicState, togglePlay, toggleMute, setVolume } = useBackgroundMusic();
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowVolumePopup(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isEffectivelyPlaying = musicState.isPlaying && !musicState.isMuted && musicState.volume > 0;

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Primary Track Button */}
      <button
        id="bgm-control-btn"
        type="button"
        onClick={() => togglePlay()}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowVolumePopup((prev) => !prev);
        }}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all min-h-[36px] cursor-pointer ${
          isEffectivelyPlaying
            ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-950/50'
            : musicState.isPlaying && musicState.isMuted
            ? 'bg-amber-950/60 border border-amber-600/50 text-amber-300'
            : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
        }`}
        title={`${musicState.isPlaying ? 'Pause' : 'Play'} Background Music: ${musicState.title} - ${musicState.artist} (Right-click or tap slider for volume)`}
      >
        {/* Animated Equalizer Waveform when playing, or icon */}
        {isEffectivelyPlaying ? (
          <div className="flex items-end gap-0.5 h-3.5 w-3.5 pb-0.5 justify-center">
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite] h-2.5" />
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_0.2s] h-3.5" />
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.9s_infinite_0.4s] h-2" />
          </div>
        ) : musicState.isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-amber-400" />
        ) : musicState.isPlaying ? (
          <Pause className="w-3.5 h-3.5 text-slate-300" />
        ) : (
          <Music className="w-3.5 h-3.5 text-slate-400" />
        )}

        <div className="flex items-center gap-1">
          <span className="hidden sm:inline whitespace-nowrap">
            {isEffectivelyPlaying ? 'Free Mind' : musicState.isMuted ? 'Muted' : 'Music'}
          </span>
          <span className="hidden md:inline text-[9px] opacity-75 font-normal">
            {isEffectivelyPlaying ? '• Tems' : ''}
          </span>
        </div>
      </button>

      {/* Quick Volume Trigger */}
      <button
        type="button"
        onClick={() => setShowVolumePopup((prev) => !prev)}
        className="p-1.5 ml-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="BGM Volume & Options"
      >
        {musicState.isMuted ? (
          <VolumeX className="w-3 h-3 text-amber-400" />
        ) : (
          <Volume2 className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {/* Floating Volume and Track Info Popover */}
      {showVolumePopup && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>{musicState.title}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {musicState.artist} • Non-Stop OST
              </div>
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className={`p-1.5 rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition-colors ${
                musicState.isPlaying
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
              }`}
              title={musicState.isPlaying ? 'Pause music' : 'Resume music'}
            >
              {musicState.isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="hover:text-white transition-colors"
                >
                  {musicState.isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
                <span>Volume</span>
              </span>
              <span className="text-cyan-400 font-bold">
                {musicState.isMuted ? '0%' : `${Math.round(musicState.volume * 100)}%`}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicState.isMuted ? 0 : musicState.volume}
              onChange={(e) => {
                if (musicState.isMuted) toggleMute();
                setVolume(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Loop: Seamless</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
              Playing Non-Stop
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
