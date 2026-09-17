import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Building2,
  Trees,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ExternalLink,
  Layers,
  Sun,
  Moon,
  ChevronRight,
  Info,
} from 'lucide-react';
import { SCENERY_PRESETS, SceneryPreset } from './sceneryData';

interface HDSceneryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export const HDSceneryModal: React.FC<HDSceneryModalProps> = ({
  isOpen,
  onClose,
  activePresetId,
  onSelectPreset,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showDetails, setShowDetails] = useState<boolean>(true);

  if (!isOpen) return null;

  const activePreset: SceneryPreset =
    SCENERY_PRESETS.find((p) => p.id === activePresetId) || SCENERY_PRESETS[0];

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.35, 2.2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.35, 0.8));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-100">
                    HD Board Scenery: Skyscrapers & Trees
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold">
                    {activePreset.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  High-definition architectural towers and lush botanical trees surrounding the arena
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                  showDetails
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
                title="Toggle details overlay"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Info</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                title="Close viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Visual Stage */}
          <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center min-h-[340px] sm:min-h-[460px]">
            {/* The HD Image */}
            <div
              className="relative w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out"
              style={{
                transform: `scale(${zoomLevel})`,
              }}
            >
              <img
                src={activePreset.imageUrl}
                alt={activePreset.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center pointer-events-none"
              />

              {/* Subtle ambient lighting vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

              {/* Simulated circular board positioning ring overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[280px] sm:w-[380px] md:w-[460px] aspect-square rounded-full border-2 border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.3),inset_0_0_30px_rgba(16,185,129,0.1)] flex items-center justify-center">
                  <div className="px-3 py-1.5 rounded-full bg-slate-950/80 border border-emerald-400/50 text-emerald-300 text-[10px] sm:text-xs font-mono tracking-wider uppercase backdrop-blur-md">
                    Central Game Board Orbit
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Zoom & Pan Controls */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-700/80 backdrop-blur-md">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-300 text-[10px] font-mono transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
            </div>

            {/* Scenery Details Card Overlay */}
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-4 z-20 max-w-sm p-4 rounded-xl bg-slate-950/90 border border-slate-700/80 backdrop-blur-md shadow-2xl text-left"
              >
                <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Active Scenery Composition
                </div>
                <h3 className="text-sm font-black text-slate-100 mb-1">
                  {activePreset.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {activePreset.description}
                </p>

                <div className="space-y-2 border-t border-slate-800/80 pt-2.5 text-[11px] font-mono">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400">Skyscrapers: </span>
                      {activePreset.skyscrapers}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Trees className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400">Surrounding Trees: </span>
                      {activePreset.trees}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-slate-400">Lighting Mood: </span>
                      <span className="text-amber-300">{activePreset.lightingMood}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Preset Selector Gallery */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
              <span>Select Environment Atmosphere:</span>
              <span className="text-emerald-400">2 HD Photographic Perspectives</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {SCENERY_PRESETS.map((preset) => {
                const isSelected = preset.id === activePreset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(preset.id);
                      setZoomLevel(1);
                    }}
                    className={`relative rounded-xl overflow-hidden border text-left p-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div className="h-16 w-full rounded-lg overflow-hidden mb-2 relative">
                      <img
                        src={preset.imageUrl}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/20" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-bold font-mono">
                          ACTIVE
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 line-clamp-1">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {preset.lightingMood}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
