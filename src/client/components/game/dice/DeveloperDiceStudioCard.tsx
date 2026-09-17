import React, { useState, useEffect } from 'react';
import {
  Dices,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  CheckCircle2,
  Wand2,
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

export const DeveloperDiceStudioCard: React.FC = () => {
  const [selectedSkinId, setSelectedSkinId] = useState<DiceSkinId>(() => {
    return DiceSkinManager.getEffectiveSkin();
  });
  const [isDevMode, setIsDevMode] = useState<boolean>(DiceSkinManager.isDeveloperMode());
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<[number, number]>([6, 6]);
  const [sfxMuted, setSfxMuted] = useState<boolean>(diceAudio.getMuted());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSkinId(DiceSkinManager.getEffectiveSkin());
    setIsDevMode(DiceSkinManager.isDeveloperMode());
    setSfxMuted(diceAudio.getMuted());

    const unsub = DiceSkinManager.subscribe((newSkin) => {
      setSelectedSkinId(newSkin);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const handleSelectSkin = (skinId: DiceSkinId) => {
    setSelectedSkinId(skinId);
    DiceSkinManager.setPreviewSkin(skinId);
    showToast(`Previewing ${DICE_SKINS[skinId].name}`);
  };

  const handleEquipSkin = () => {
    const res = DiceSkinManager.equipSkin(selectedSkinId);
    if (res.success) {
      DiceSkinManager.setPreviewSkin(null);
      showToast(`Equipped ${currentMeta.name}!`);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleToggleDevMode = () => {
    const next = !isDevMode;
    setIsDevMode(next);
    DiceSkinManager.setDeveloperMode(next);
    showToast(next ? '⚡ Dev Mode Enabled (All Skins Unlocked)' : 'Dev Mode Disabled');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Developer Dice Theme Studio & 3D Physics Rig
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
            PBR Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleDevMode}
            className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition-colors flex items-center gap-1.5 border cursor-pointer ${
              isDevMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title="Bypass all skin unlocks"
          >
            {isDevMode ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-slate-500" />}
            <span>DEV BYPASS: {isDevMode ? 'ACTIVE' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* 3D Preview Canvas (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-3">
          <div className="relative w-full h-56 sm:h-64 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-end">
            <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2">
              <span className="text-lg">{currentMeta.badgeIcon}</span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {currentMeta.name}
                  <span
                    className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase"
                    style={{
                      backgroundColor: `${currentMeta.rarityColor}30`,
                      color: currentMeta.rarityColor,
                    }}
                  >
                    {currentMeta.rarity}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {currentMeta.materialStats.finish}
                </div>
              </div>
            </div>

            <div className="absolute inset-0">
              <ThreeDiceScene
                lastRoll={lastRoll}
                isRolling={isRolling}
                canRoll={!isRolling}
                onRoll={() => handleRollTest()}
                onAnimationComplete={() => setIsRolling(false)}
                equippedSkin={selectedSkinId}
                hideStudioModal={true}
              />
            </div>

            {/* Bottom bar */}
            <div className="relative z-10 px-3 py-1.5 bg-slate-950/80 backdrop-blur-sm border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>Result:</span>
                <span className="font-bold text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                  [{lastRoll[0]}, {lastRoll[1]}] = {lastRoll[0] + lastRoll[1]}
                </span>
                {lastRoll[0] === lastRoll[1] && (
                  <span className="text-amber-400 font-bold uppercase text-[9px]">DOUBLES</span>
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
                  {sfxMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                </button>
                <span className="text-[10px] text-slate-400 font-mono">Click canvas to roll</span>
              </div>
            </div>
          </div>

          {/* Test Roll Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRollTest()}
              disabled={isRolling}
              className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50 cursor-pointer"
            >
              🎲 Roll Random
            </button>
            <button
              onClick={() => handleRollTest(1, 1)}
              disabled={isRolling}
              className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Snake Eyes (1,1)
            </button>
            <button
              onClick={() => handleRollTest(3, 4)}
              disabled={isRolling}
              className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Lucky 7 (3,4)
            </button>
            <button
              onClick={() => handleRollTest(6, 6)}
              disabled={isRolling}
              className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Boxcars (6,6)
            </button>
          </div>
        </div>

        {/* Theme List & Controls (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Dice Themes
            </span>
            <span className="text-[10px] font-mono text-slate-400">Click to Preview</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {DICE_SKIN_LIST.map((skin) => {
              const isSelected = skin.id === selectedSkinId;
              const isEquipped = DiceSkinManager.getEquippedSkin() === skin.id;
              const unlocked = DiceSkinManager.isSkinUnlocked(skin.id);

              return (
                <button
                  key={skin.id}
                  onClick={() => handleSelectSkin(skin.id)}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-400 text-amber-950 font-medium'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{skin.badgeIcon}</span>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{skin.name}</span>
                        {isEquipped && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            EQUIPPED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {skin.materialStats.pips}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {!unlocked && !isDevMode && (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Equip Action */}
          <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
            <button
              onClick={handleEquipSkin}
              disabled={!isUnlocked && !isDevMode}
              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCurrentlyEquipped ? 'Currently Active Skin' : 'Equip for Game'}</span>
            </button>
            <button
              onClick={() => {
                DiceSkinManager.unlockAllSkins();
                showToast('Unlocked all 5 skins!');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium transition-colors cursor-pointer"
              title="Unlock all skins in local storage"
            >
              Unlock All
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="px-4 py-2 bg-slate-900 text-slate-200 text-xs font-mono flex items-center justify-between border-t border-slate-800">
          <span>✓ {toastMessage}</span>
        </div>
      )}
    </div>
  );
};
