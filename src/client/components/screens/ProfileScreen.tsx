import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  User,
  LogOut,
  Trash2,
  Sparkles,
  Lock,
  Check,
  Trophy,
  Dices,
  Flame,
  ShieldCheck,
  Crown,
  RotateCcw,
  Edit2,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import {
  DiceSkinManager,
  type DiceSkinId,
  DICE_SKINS,
  DICE_SKIN_LIST,
  type DiceSkinMetadata,
} from '../../../services/cosmetics/diceSkins';
import { ThreeDiceScene } from '../game/dice/ThreeDiceScene';
import { RankedService, RANKED_TIERS } from '../../../services/ranked/rankedService';
import { CosmeticsManager } from '../../../services/cosmetics/cosmeticsManager';
import { ALL_COSMETICS } from '../../../services/cosmetics/cosmeticsCatalog';

export const ProfileScreen: React.FC = () => {
  const { goBack, navigate } = useNavigation();
  const { user, signOut, updateDisplayName } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setNameInput(user.displayName);
    }
  }, [user?.displayName]);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) return;
    setIsSavingName(true);
    try {
      await updateDisplayName(nameInput.trim());
      setIsEditingName(false);
      setActionNotice('Investor alias updated successfully!');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      console.warn('Failed to update name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const [equippedSkinId, setEquippedSkinId] = useState<DiceSkinId>(() =>
    DiceSkinManager.getEquippedSkin()
  );
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<DiceSkinId[]>(() =>
    DiceSkinManager.getUnlockedSkinsArray()
  );
  const [rankedProfile, setRankedProfile] = useState(() =>
    RankedService.getProfile(user?.uid || 'user_local', user?.displayName || 'Investor')
  );
  const [cosmeticsState, setCosmeticsState] = useState(() =>
    CosmeticsManager.getEquippedState()
  );
  const [testRoll, setTestRoll] = useState<[number, number] | null>([6, 6]);
  const [isTestRolling, setIsTestRolling] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Subscribe to updates
  useEffect(() => {
    const unsubDice = DiceSkinManager.subscribe((newSkin) => {
      setEquippedSkinId(newSkin);
      setUnlockedSkinIds(DiceSkinManager.getUnlockedSkinsArray());
    });
    const unsubCosmetics = CosmeticsManager.subscribe((state) => {
      setCosmeticsState(state);
    });
    return () => {
      unsubDice();
      unsubCosmetics();
    };
  }, []);

  const handleEquipSkin = (skinId: DiceSkinId) => {
    const res = DiceSkinManager.equipSkin(skinId);
    if (res.success) {
      setEquippedSkinId(skinId);
      const skinMeta = DICE_SKINS[skinId];
      setActionNotice(`Equipped ${skinMeta?.name || skinId}!`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleUnlockToggle = (skinId: DiceSkinId) => {
    const isCurrentlyUnlocked = DiceSkinManager.isSkinUnlocked(skinId);
    if (isCurrentlyUnlocked) {
      // Cannot lock default skins
      if (DICE_SKINS[skinId]?.unlockedByDefault) return;
      DiceSkinManager.lockSkin(skinId);
      setUnlockedSkinIds(DiceSkinManager.getUnlockedSkinsArray());
      setActionNotice(`Locked cosmetic reward: ${DICE_SKINS[skinId]?.name || skinId}`);
    } else {
      DiceSkinManager.unlockSkin(skinId);
      setUnlockedSkinIds(DiceSkinManager.getUnlockedSkinsArray());
      setActionNotice(`Unlocked cosmetic reward: ${DICE_SKINS[skinId]?.name || skinId}!`);
    }
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleTestRoll = () => {
    if (isTestRolling) return;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setTestRoll([d1, d2]);
    setIsTestRolling(true);
  };

  const equippedSkinMeta = DICE_SKINS[equippedSkinId] || DICE_SKINS['obsidian-gold'];

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            id="profile-back-btn"
            type="button"
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Go back to previous screen"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-100">
            INVESTOR PROFILE & COSMETIC REWARDS
          </h1>
        </div>

        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold"
          >
            {actionNotice}
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-[#040817] to-[#030712]">
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
          
          {/* Investor ID & Syndicate Status Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-2xl relative overflow-hidden">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-900 flex items-center justify-center border-2 border-amber-500/40 text-amber-300 text-3xl font-black shadow-lg shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'I'}
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter investor name"
                      className="px-3 py-1 bg-slate-950 border border-amber-500/50 rounded-xl text-slate-100 text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                      maxLength={24}
                    />
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(user?.displayName || '');
                        setIsEditingName(false);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                      <span>{user?.displayName || 'Elite Investor'}</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Edit Investor Display Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </h2>
                  </>
                )}
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  VIP High-Roller
                </span>
              </div>
              
              <div className="text-sm text-slate-400 font-mono mt-1">{user?.email || 'guest@investor.syndicate'}</div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Ranked Rating</div>
                  <div className="text-sm font-black text-amber-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                    <span>{RANKED_TIERS[rankedProfile.tier]?.icon}</span>
                    <span>{rankedProfile.elo} Elo</span>
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Tier Division</div>
                  <div
                    className="text-xs font-black truncate mt-1 uppercase"
                    style={{ color: RANKED_TIERS[rankedProfile.tier]?.color }}
                  >
                    {rankedProfile.division}
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Win Rate</div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                    {rankedProfile.matchesPlayed > 0
                      ? Math.round((rankedProfile.wins / rankedProfile.matchesPlayed) * 100)
                      : 0}
                    % ({rankedProfile.wins}W)
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Dice</div>
                  <div className="text-xs font-black text-cyan-400 truncate mt-1">
                    {equippedSkinMeta.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 5 Equipped Cosmetics Loadout */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  Equipped Board & Investor Loadout (Phase 5)
                </h3>
              </div>
              <button
                onClick={() => navigate('STORE')}
                className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Open Token Shop
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Board Skin</div>
                <div className="text-xs font-bold text-white mt-1 capitalize">
                  {cosmeticsState.boardSkin.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Investor Token</div>
                <div className="text-xs font-bold text-white mt-1 capitalize">
                  {cosmeticsState.token.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Dice Roll Trail</div>
                <div className="text-xs font-bold text-white mt-1 capitalize">
                  {cosmeticsState.trail.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Bankruptcy Vignette</div>
                <div className="text-xs font-bold text-white mt-1 capitalize">
                  {cosmeticsState.vignette.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Expanded 3D Environmental Customization: Cosmetic Dice Skins */}
          <div className="bg-slate-900/85 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Dices className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    <span>3D Dice Skins & Environmental Customization</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unlock exclusive physical PBR materials, custom pips, and glowing pedestal lighting
                  </p>
                </div>
              </div>

              {/* Reset to defaults helper button */}
              <button
                type="button"
                onClick={() => {
                  DiceSkinManager.resetToDefaults();
                  setEquippedSkinId(DiceSkinManager.getEquippedSkin());
                  setUnlockedSkinIds(DiceSkinManager.getUnlockedSkinsArray());
                  setActionNotice('Reset cosmetic skins to defaults');
                  setTimeout(() => setActionNotice(null), 2500);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 self-start sm:self-auto py-1 px-2 rounded hover:bg-slate-800 transition-colors"
                title="Reset skins to default state"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Skins</span>
              </button>
            </div>

            {/* Live 3D Interactive Dice Stage Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-[#050c18] to-slate-950 border border-slate-800 shadow-inner">
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-200">Live 3D Customizer:</span>
                <span className="font-mono text-amber-300 font-bold">{equippedSkinMeta.name}</span>
              </div>

              <div className="relative w-full h-44 sm:h-48 cursor-pointer" onClick={handleTestRoll}>
                <ThreeDiceScene
                  lastRoll={testRoll}
                  isRolling={isTestRolling}
                  canRoll={!isTestRolling}
                  onRoll={handleTestRoll}
                  onAnimationComplete={() => setIsTestRolling(false)}
                  equippedSkin={equippedSkinId}
                  onSkinChange={(newSkin) => setEquippedSkinId(newSkin)}
                />
              </div>

              <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">Click dice or preview stage to trigger tactile roll with active skin physics</span>
                <button
                  type="button"
                  onClick={handleTestRoll}
                  disabled={isTestRolling}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-bold text-[11px] uppercase tracking-wider shrink-0 transition-colors"
                >
                  {isTestRolling ? 'Rolling...' : 'Test Roll'}
                </button>
              </div>
            </div>

            {/* Cosmetic Dice Skins Roster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {DICE_SKIN_LIST.map((skin) => {
                const isEquipped = skin.id === equippedSkinId;
                const isUnlocked = unlockedSkinIds.includes(skin.id);

                return (
                  <div
                    key={skin.id}
                    className={`relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-950/30'
                        : isUnlocked
                        ? 'bg-slate-950/60 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Top bar: Badge & Rarity */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{skin.badgeIcon}</span>
                          <div>
                            <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{skin.name}</span>
                              {isEquipped && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wide">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono capitalize">
                              {skin.rarity} Cosmetic
                            </div>
                          </div>
                        </div>

                        {/* Lock / Unlock status indicator */}
                        {isUnlocked ? (
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-xs">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {skin.description}
                      </p>

                      {/* Unlock Criteria if locked */}
                      {!isUnlocked && (
                        <div className="mb-3 p-2 rounded-xl bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Unlock: {skin.unlockCriteria}</span>
                        </div>
                      )}
                    </div>

                    {/* Action footer */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipSkin(skin.id)}
                          disabled={isEquipped}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            isEquipped
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-amber-300" />
                              <span>Equipped</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Equip Skin</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUnlockToggle(skin.id)}
                          className="flex-1 py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Claim / Unlock this cosmetic reward"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Claim Reward</span>
                        </button>
                      )}

                      {/* Quick Testing Toggle for demo */}
                      {!skin.unlockedByDefault && (
                        <button
                          type="button"
                          onClick={() => handleUnlockToggle(skin.id)}
                          className="py-2 px-2.5 rounded-xl text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                          title={isUnlocked ? 'Lock skin for testing' : 'Unlock skin for testing'}
                        >
                          {isUnlocked ? 'Relock' : 'Demo'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account Management */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Account Management</h3>
            
            <button 
              type="button"
              onClick={signOut}
              className="w-full py-3.5 px-6 bg-slate-950/50 hover:bg-slate-800 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 font-bold text-sm">
                <LogOut className="w-4 h-4 text-slate-400" />
                Sign Out
              </div>
            </button>

            <button 
              type="button"
              className="w-full py-3.5 px-6 bg-rose-950/20 hover:bg-rose-950/40 rounded-xl border border-rose-900/30 flex items-center justify-between text-rose-400 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Delete Account
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
