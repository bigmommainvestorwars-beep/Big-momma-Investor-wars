import React, { useState } from 'react';
import { ChevronLeft, Volume2, VolumeX, Music, Settings as SettingsIcon, Monitor } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { diceAudio } from '../game/dice/diceAudio';

export const SettingsScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const { musicState, setVolume: setBgmVolume, toggleMute: toggleBgmMute } = useBackgroundMusic();
  const [sfxVolume, setSfxVolume] = useState<number>(0.85);
  const [sfxMuted, setSfxMuted] = useState<boolean>(diceAudio.getMuted());

  const handleSfxChange = (val: number) => {
    setSfxVolume(val);
    diceAudio.setMasterVolume(val);
  };

  const handleToggleSfxMute = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    diceAudio.setMuted(next);
  };

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center gap-4">
        <button 
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">SYSTEM SETTINGS</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-900 to-[#030712]">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Audio Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Audio Preferences
              </h3>
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 divide-y divide-slate-800/50">
                {/* Background Music Volume */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <Music className="w-4 h-4 text-emerald-400" />
                      <span>Background Soundtrack</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {musicState.title} - {musicState.artist} (Non-Stop)
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-56">
                    <button
                      type="button"
                      onClick={toggleBgmMute}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={musicState.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {musicState.isMuted ? (
                        <VolumeX className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={musicState.isMuted ? 0 : musicState.volume}
                      onChange={(e) => {
                        if (musicState.isMuted) toggleBgmMute();
                        setBgmVolume(parseFloat(e.target.value));
                      }}
                      className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <span className="text-xs font-mono text-cyan-400 w-10 text-right">
                      {musicState.isMuted ? '0%' : `${Math.round(musicState.volume * 100)}%`}
                    </span>
                  </div>
                </div>

                {/* Sound Effects Volume */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-200">Dice & UI Sound Effects</span>
                    <div className="text-xs text-slate-400 font-mono">
                      Tactile 3D physical rolls, clacks, and bells
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-56">
                    <button
                      type="button"
                      onClick={handleToggleSfxMute}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                    >
                      {sfxMuted ? (
                        <VolumeX className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={sfxMuted ? 0 : sfxVolume}
                      onChange={(e) => {
                        if (sfxMuted) handleToggleSfxMute();
                        handleSfxChange(parseFloat(e.target.value));
                      }}
                      className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <span className="text-xs font-mono text-cyan-400 w-10 text-right">
                      {sfxMuted ? '0%' : `${Math.round(sfxVolume * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Display Configuration
              </h3>
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 divide-y divide-slate-800/50">
                <div className="p-4 flex items-center justify-between">
                  <span className="font-bold text-slate-300">Visual Quality</span>
                  <select className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none">
                    <option>High (Default)</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="font-bold text-slate-300">Show Safe Area Guides</span>
                  <div className="w-10 h-6 bg-slate-700 rounded-full relative">
                    <div className="w-4 h-4 bg-slate-400 rounded-full absolute left-1 top-1" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* About */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                About
              </h3>
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 text-sm text-slate-400 font-mono">
                <div className="flex justify-between mb-2">
                  <span>Version</span>
                  <span className="text-slate-300">1.0.0-phase4</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Environment</span>
                  <span className="text-slate-300">Production</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
