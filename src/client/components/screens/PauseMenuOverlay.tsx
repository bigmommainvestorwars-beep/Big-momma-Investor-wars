import React from 'react';
import { motion } from 'motion/react';
import { Play, Settings, Book, LogOut, X, Music, Volume2, VolumeX, Pause as PauseIcon } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useGame } from '../../context/GameContext';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';

export const PauseMenuOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { navigate } = useNavigation();
  const { leaveMatch } = useGame();
  const { musicState, togglePlay, toggleMute, setVolume } = useBackgroundMusic();

  const handleExit = async () => {
    try {
      await leaveMatch();
      navigate('HOME');
    } catch {
      navigate('HOME');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-100">MATCH PAUSED</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button 
            onClick={onClose}
            className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-colors cursor-pointer"
          >
            <Play className="w-5 h-5" />
            Resume Match
          </button>

          {/* Background Music Card */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {musicState.title} <span className="text-[10px] text-slate-400 font-mono font-normal">• {musicState.artist}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 font-mono">
                    Non-Stop Background Soundtrack
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title={musicState.isMuted ? 'Unmute BGM' : 'Mute BGM'}
                >
                  {musicState.isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title={musicState.isPlaying ? 'Pause BGM' : 'Play BGM'}
                >
                  {musicState.isPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono text-slate-400 w-10">Vol:</span>
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
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="text-[10px] font-mono text-cyan-400 w-8 text-right">
                {musicState.isMuted ? '0%' : `${Math.round(musicState.volume * 100)}%`}
              </span>
            </div>
          </div>

          <button 
            onClick={() => { onClose(); navigate('SETTINGS'); }}
            className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>

          <button 
            className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-colors opacity-50 cursor-not-allowed"
          >
            <Book className="w-5 h-5" />
            Rules (Coming Soon)
          </button>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button 
              onClick={handleExit}
              className="w-full py-4 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-400 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Abandon Match
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-3 font-mono">
              The server match will continue without you.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
