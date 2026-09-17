import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Wand2,
  Layers,
  Dices,
} from 'lucide-react';
import {
  DiceSkinId,
  DiceSkinMetadata,
  DICE_SKINS,
  DICE_SKIN_LIST,
  DiceSkinManager,
} from '../../../../services/cosmetics/diceSkins';
import { ThreeDiceScene } from './ThreeDiceScene';
import { diceAudio } from './diceAudio';

interface DeveloperDiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkinEquipped?: (skinId: DiceSkinId) => void;
}

export const DeveloperDiceStudioModal: React.FC<DeveloperDiceStudioModalProps> = ({
  isOpen,
  onClose,
  onSkinEquipped,
}) => {
  const [selectedSkinId, setSelectedSkinId] = useState<DiceSkinId>(() => {
    return DiceSkinManager.getEffectiveSkin();
  });
  const [isDevMode, setIsDevMode] = useState<boolean>(DiceSkinManager.isDeveloperMode());
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<[number, number]>([6, 6]);
  const [die1Choice, setDie1Choice] = useState<number>(6);
  const [die2Choice, setDie2Choice] = useState<number>(6);
  const [sfxMuted, setSfxMuted] = useState<boolean>(diceAudio.getMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSkinId(DiceSkinManager.getEffectiveSkin());
    setIsDevMode(DiceSkinManager.isDeveloperMode());
    setSfxMuted(diceAudio.getMuted());
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  if (!isOpen) return null;

  const currentMeta: DiceSkinMetadata = DICE_SKINS[selectedSkinId] || DICE_SKINS['obsidian-gold'];
  const isUnlocked = DiceSkinManager.isSkinUnlocked(selectedSkinId);
  const isCurrentlyEquipped = DiceSkinManager.getEquippedSkin() === selectedSkinId;

  const handleRollTest = (target1?: number, target2?: number) => {
    if (isRolling) return;
    const r1 = target1 ?? (Math.floor(Math.random() * 6) + 1);
    const r2 = target2 ?? (Math.floor(Math.random() * 6) + 1);
    setLastRoll([r1, r2]);
    setIsRolling(true);
  };

  const handleAnimationComplete = () => {
    setIsRolling(false);
  };

  const handleSelectSkin = (skinId: DiceSkinId) => {
    setSelectedSkinId(skinId);
    DiceSkinManager.setPreviewSkin(skinId);
    showToast(`Previewing ${DICE_SKINS[skinId].name}`);
  };

  const handleEquipSkin = () => {
    const res = DiceSkinManager.equipSkin(selectedSkinId);
    if (res.success) {
      DiceSkinManager.setPreviewSkin(null);
      showToast(`Equipped ${currentMeta.name} for gameplay!`);
      if (onSkinEquipped) onSkinEquipped(selectedSkinId);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleToggleDevMode = () => {
    const next = !isDevMode;
    setIsDevMode(next);
    DiceSkinManager.setDeveloperMode(next);
    showToast(next ? '⚡ Dev Mode Enabled: All Themes Unlocked' : 'Dev Mode Disabled');
  };

  const handleUnlockAll = () => {
    DiceSkinManager.unlockAllSkins();
    showToast('Unlocked all 5 themes in storage!');
  };

  const handleResetDefaults = () => {
    DiceSkinManager.resetToDefaults();
    setSelectedSkinId('obsidian-gold');
    DiceSkinManager.setPreviewSkin(null);
    showToast('Dice themes reset to default (Obsidian & Ivory)');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wider uppercase text-white">
                  Developer Dice Theme Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  DEV TOOL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                PBR physically based rendering, lighting, caustics, and physics inspection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleDevMode}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors flex items-center gap-1.5 border cursor-pointer ${
                isDevMode
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle developer bypass of unlock requirements"
            >
              {isDevMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>DEV BYPASS: {isDevMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: 3D Stage & Test Roll Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* 3D Scene Viewport */}
            <div className="relative w-full h-72 sm:h-80 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-end">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="text-xl">{currentMeta.badgeIcon}</span>
                <div>
                  <div className="text-xs font-black tracking-wide text-white flex items-center gap-2">
                    {currentMeta.name}
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase"
                      style={{
                        backgroundColor: `${currentMeta.rarityColor}25`,
                        color: currentMeta.rarityColor,
                        border: `1px solid ${currentMeta.rarityColor}40`,
                      }}
                    >
                      {currentMeta.rarity}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentMeta.tagline}
                  </div>
                </div>
              </div>

              {/* 3D Canvas */}
              <div className="absolute inset-0">
                <ThreeDiceScene
                  lastRoll={lastRoll}
                  isRolling={isRolling}
                  canRoll={!isRolling}
                  onRoll={() => handleRollTest()}
                  onAnimationComplete={handleAnimationComplete}
                  equippedSkin={selectedSkinId}
                  hideStudioModal={true}
                />
              </div>

              {/* Bottom Stage Overlay Info */}
              <div className="relative z-10 px-3 py-2 bg-slate-950/80 backdrop-blur-sm border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span>Last Roll:</span>
                  <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                    [{lastRoll[0]}, {lastRoll[1]}] = {lastRoll[0] + lastRoll[1]}
                  </span>
                  {lastRoll[0] === lastRoll[1] && (
                    <span className="text-amber-400 font-bold uppercase text-[10px]">
                      (DOUBLES!)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = !sfxMuted;
                      setSfxMuted(next);
                      diceAudio.setMuted(next);
                    }}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title={sfxMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">Click canvas or buttons to roll</span>
                </div>
              </div>
            </div>

            {/* Test Roll Controls */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Physics Test Triggers
                </span>
                <span className="text-[10px] font-mono text-slate-500">Authoritative target orientation</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleRollTest()}
                  disabled={isRolling}
                  className="py-2 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50 cursor-pointer text-center"
                >
                  🎲 Random Roll
                </button>
                <button
                  onClick={() => handleRollTest(1, 1)}
                  disabled={isRolling}
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer text-center"
                >
                  Snake Eyes (1,1)
                </button>
                <button
                  onClick={() => handleRollTest(3, 4)}
                  disabled={isRolling}
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer text-center"
                >
                  Lucky 7 (3,4)
                </button>
                <button
                  onClick={() => handleRollTest(6, 6)}
                  disabled={isRolling}
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer text-center"
                >
                  Boxcars (6,6)
                </button>
              </div>

              {/* Custom Target Face Roll */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-mono">Custom Target:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono">Die 1</span>
                    <select
                      value={die1Choice}
                      onChange={(e) => setDie1Choice(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-1 font-mono outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono">Die 2</span>
                    <select
                      value={die2Choice}
                      onChange={(e) => setDie2Choice(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-1 font-mono outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => handleRollTest(die1Choice, die2Choice)}
                  disabled={isRolling}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Wand2 className="w-3 h-3 text-cyan-400" />
                  <span>Roll Target [{die1Choice}, {die2Choice}]</span>
                </button>
              </div>
            </div>

            {/* Audio Pipeline Diagnostics */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-mono">Audio Pipeline: Synthesized Casino Clacks & Resonant Chimes</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => diceAudio.playCubeTumbleSound()}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Test Clack
                </button>
                <button
                  onClick={() => diceAudio.playFinalLandingImpact()}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Test Landing
                </button>
                <button
                  onClick={() => diceAudio.playResultSuccessSound(12)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Test Chime
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Theme Selector & Material Specs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Theme Selector List */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Available Themes (5)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {isDevMode ? 'All Unlocked (Dev Mode)' : 'Standard Rules'}
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {DICE_SKIN_LIST.map((skin) => {
                  const isSkinSelected = skin.id === selectedSkinId;
                  const isSkinEquipped = DiceSkinManager.getEquippedSkin() === skin.id;
                  const skinUnlocked = DiceSkinManager.isSkinUnlocked(skin.id);

                  return (
                    <button
                      key={skin.id}
                      onClick={() => handleSelectSkin(skin.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSkinSelected
                          ? 'bg-slate-800/90 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-xl">{skin.badgeIcon}</span>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100 truncate">
                              {skin.name}
                            </span>
                            <span
                              className="text-[9px] px-1 py-0.2 rounded font-mono uppercase"
                              style={{
                                backgroundColor: `${skin.rarityColor}20`,
                                color: skin.rarityColor,
                              }}
                            >
                              {skin.rarity}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {skin.tagline}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSkinEquipped && (
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                            EQUIPPED
                          </span>
                        )}
                        {!skinUnlocked && !isDevMode && (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons for Selected Theme */}
              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <button
                  onClick={handleEquipSkin}
                  disabled={!isUnlocked && !isDevMode}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isCurrentlyEquipped ? 'Currently Equipped' : 'Equip This Skin'}</span>
                </button>

                <button
                  onClick={() => {
                    DiceSkinManager.setPreviewSkin(null);
                    setSelectedSkinId(DiceSkinManager.getEquippedSkin());
                    showToast('Reverted preview to equipped skin');
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                  title="Revert preview"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Material & Physical Specs Inspector */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  PBR Shading Specs
                </span>
                <span className="text-[10px] font-mono text-cyan-400">{selectedSkinId}</span>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Finish:</span>
                  <span className="text-slate-200 text-right truncate max-w-[200px]">
                    {currentMeta.materialStats.finish}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Reflectivity / Bloom:</span>
                  <span className="text-slate-200 text-right truncate max-w-[200px]">
                    {currentMeta.materialStats.reflectivity}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Pip Infill:</span>
                  <span className="text-slate-200 text-right truncate max-w-[200px]">
                    {currentMeta.materialStats.pips}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-400">Bevel & Trim:</span>
                  <span className="text-slate-200 text-right truncate max-w-[200px]">
                    {currentMeta.materialStats.trim}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Unlock Condition:</span>
                  <span className="text-amber-400 text-right text-[10px] truncate max-w-[200px]">
                    {currentMeta.unlockRequirement}
                  </span>
                </div>
              </div>
            </div>

            {/* Developer Fast Actions */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">Developer Storage:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUnlockAll}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                >
                  ⚡ Unlock All
                </button>
                <button
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-800/95 border border-slate-700 shadow-2xl text-xs font-mono font-semibold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
