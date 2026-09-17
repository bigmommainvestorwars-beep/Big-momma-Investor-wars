import React, { useState, useEffect } from 'react';
import {
  Building2,
  Trees,
  Camera,
  Layers,
  Eye,
} from 'lucide-react';
import { SCENERY_PRESETS, SceneryPreset } from './sceneryData';
import { HDSceneryModal } from './HDSceneryModal';
import { CosmeticsManager, EquippedCosmeticsState } from '../../../../services/cosmetics/cosmeticsManager';

interface BoardEnvironmentSurroundProps {
  children: React.ReactNode;
}

// Map board skin ID to corresponding scenery preset index (0: Default Central Park, 1: Metropolitan Financial Plaza)
function getPresetIndexForBoardSkin(skinId: string): number {
  switch (skinId) {
    case 'board-metropolitan':
    case 'board-classic-emerald':
    case 'board-sovereign-gold':
      return 1; // Metropolitan Financial Plaza & Gardens
    case 'board-wallstreet-night':
    default:
      return 0; // Default Background: Central Park High-Rises & Green Canopy
  }
}

export const BoardEnvironmentSurround: React.FC<BoardEnvironmentSurroundProps> = ({
  children,
}) => {
  const [activePresetIndex, setActivePresetIndex] = useState<number>(() => {
    const skin = CosmeticsManager.getEquippedState().boardSkin;
    return getPresetIndexForBoardSkin(skin);
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [intensity, setIntensity] = useState<'vivid' | 'balanced' | 'subtle'>('vivid');

  // Keep scenery synchronized whenever user equips a different board skin in the Store or Settings
  useEffect(() => {
    const unsub = CosmeticsManager.subscribe((equipped: EquippedCosmeticsState) => {
      const targetIdx = getPresetIndexForBoardSkin(equipped.boardSkin);
      setActivePresetIndex(targetIdx);
    });
    return unsub;
  }, []);

  const currentPreset: SceneryPreset = SCENERY_PRESETS[activePresetIndex] || SCENERY_PRESETS[0];

  const handleNextPreset = () => {
    setActivePresetIndex((prev) => (prev + 1) % SCENERY_PRESETS.length);
  };

  const opacityClass =
    intensity === 'vivid'
      ? 'opacity-95'
      : intensity === 'balanced'
      ? 'opacity-85'
      : 'opacity-70';

  return (
    <div className="relative w-full flex flex-col items-center justify-center">
      {/* Surround Atmosphere Header & Controls */}
      <div className="w-full max-w-xl mb-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center justify-between text-xs shadow-md z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-emerald-400">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <Trees className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="font-mono text-[11px] text-slate-300 font-bold hidden sm:inline">
            Board Scenery:
          </span>
          <span className="text-[11px] font-mono text-emerald-300 font-semibold truncate max-w-[170px] sm:max-w-[240px]">
            {currentPreset.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Cycle Preset Button */}
          <button
            type="button"
            onClick={handleNextPreset}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-colors"
            title="Cycle scenery atmosphere"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Theme</span>
          </button>

          {/* Intensity Toggle */}
          <button
            type="button"
            onClick={() =>
              setIntensity((prev) =>
                prev === 'vivid' ? 'balanced' : prev === 'balanced' ? 'subtle' : 'vivid'
              )
            }
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-colors"
            title="Toggle scenery brightness & blend"
          >
            <Eye className="w-3 h-3 text-amber-400" />
            <span className="capitalize">{intensity}</span>
          </button>

          {/* Open HD Modal */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 font-black text-[10px] font-mono flex items-center gap-1 shadow-sm transition-all"
            title="Inspect HD Image in 4K resolution"
          >
            <Camera className="w-3 h-3 fill-slate-950" />
            <span>HD View</span>
          </button>
        </div>
      </div>

      {/* Main Relative Container Enclosing the Board & Surrounding Scenery */}
      <div className="relative w-full flex items-center justify-center p-2 sm:p-4 rounded-3xl overflow-hidden">
        
        {/* Realistic High-Definition Photographic Background of Skyscrapers & Trees */}
        <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-700 ${opacityClass}`}>
          <img
            src={currentPreset.imageUrl}
            alt={currentPreset.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter saturate-[1.25] contrast-[1.15]"
          />
          {/* Subtle outer vignette to seamlessly frame the board while keeping the skyscrapers and trees vivid */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/40 via-transparent to-[#030712]/40" />
        </div>

        {/* FOREGROUND: The Actual Game Board */}
        <div className="relative z-10 w-full flex justify-center items-center">
          {children}
        </div>
      </div>

      {/* HD Scenery Inspector Modal */}
      <HDSceneryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activePresetId={currentPreset.id}
        onSelectPreset={(presetId) => {
          const idx = SCENERY_PRESETS.findIndex((p) => p.id === presetId);
          if (idx !== -1) setActivePresetIndex(idx);
        }}
      />
    </div>
  );
};
