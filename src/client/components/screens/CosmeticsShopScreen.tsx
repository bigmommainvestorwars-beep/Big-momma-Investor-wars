import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ShoppingBag,
  ChevronLeft,
  Check,
  Lock,
  Layers,
  Award,
  Zap,
  Tag,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import {
  CosmeticsManager,
  EquippedCosmeticsState,
} from '../../../services/cosmetics/cosmeticsManager';
import {
  ALL_COSMETICS,
  CosmeticItem,
  CosmeticCategory,
} from '../../../services/cosmetics/cosmeticsCatalog';
import {
  DiceSkinManager,
  DICE_SKIN_LIST,
  DiceSkinId,
} from '../../../services/cosmetics/diceSkins';

export const CosmeticsShopScreen: React.FC = () => {
  const { goBack } = useNavigation();
  const { user } = useAuth();

  // Local simulated player balances
  const [cashBM, setCashBM] = useState<number>(() => {
    const raw = localStorage.getItem('bm_player_cash_balance');
    return raw ? parseInt(raw, 10) : 45000;
  });
  const [pointsSP, setPointsSP] = useState<number>(() => {
    const raw = localStorage.getItem('bm_player_sp_balance');
    return raw ? parseInt(raw, 10) : 1250;
  });

  const [equippedState, setEquippedState] = useState<EquippedCosmeticsState>(() =>
    CosmeticsManager.getEquippedState()
  );
  const [unlockedCosmetics, setUnlockedCosmetics] = useState<string[]>(() =>
    CosmeticsManager.getUnlockedArray()
  );
  const [equippedDiceSkin, setEquippedDiceSkin] = useState<DiceSkinId>(() =>
    DiceSkinManager.getEquippedSkin()
  );

  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory | 'all' | 'dice'>('all');
  const [inspectItem, setInspectItem] = useState<CosmeticItem | null>(null);
  const [shopNotice, setShopNotice] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    const unsub = CosmeticsManager.subscribe((equipped, unlocked) => {
      setEquippedState(equipped);
      setUnlockedCosmetics(unlocked);
    });
    const unsubDice = DiceSkinManager.subscribe((skin) => {
      setEquippedDiceSkin(skin);
    });
    return () => {
      unsub();
      unsubDice();
    };
  }, []);

  const saveBalances = (newBM: number, newSP: number) => {
    setCashBM(newBM);
    setPointsSP(newSP);
    localStorage.setItem('bm_player_cash_balance', newBM.toString());
    localStorage.setItem('bm_player_sp_balance', newSP.toString());
  };

  const handlePurchase = (item: CosmeticItem, currency: 'BM' | 'SP') => {
    const res = CosmeticsManager.purchaseItem(
      item.id,
      currency,
      cashBM,
      pointsSP,
      (deductBM) => saveBalances(cashBM - deductBM, pointsSP),
      (deductSP) => saveBalances(cashBM, pointsSP - deductSP)
    );

    if (res.success) {
      setShopNotice({ text: res.message });
      setInspectItem(null);
    } else {
      setShopNotice({ text: res.message, error: true });
    }
    setTimeout(() => setShopNotice(null), 3500);
  };

  const handleEquip = (item: CosmeticItem) => {
    const res = CosmeticsManager.equipItem(item.id);
    if (res.success) {
      setShopNotice({ text: `Equipped ${item.name}!` });
      setInspectItem(null);
    } else {
      setShopNotice({ text: res.message, error: true });
    }
    setTimeout(() => setShopNotice(null), 3000);
  };

  const isEquipped = (item: CosmeticItem) => {
    switch (item.category) {
      case 'board':
        return equippedState.boardSkin === item.id;
      case 'token':
        return equippedState.token === item.id;
      case 'trail':
        return equippedState.trail === item.id;
      case 'vignette':
        return equippedState.vignette === item.id;
      default:
        return false;
    }
  };

  const filteredItems = ALL_COSMETICS.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="absolute inset-0 bg-[#030712] text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                Cosmetics & Token Store
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Phase 5 Economy
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Board Themes • 3D Tokens • Custom Roll Trails • Bankruptcy Vignettes
            </div>
          </div>
        </div>

        {/* Currency Pill Displays */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400">
            <span>ƁM</span>
            <span>{cashBM.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs font-mono font-bold text-amber-400">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{pointsSP.toLocaleString()} SP</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Notice Banner */}
        <AnimatePresence>
          {shopNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                shopNotice.error
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{shopNotice.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'board', label: 'Board Themes' },
            { id: 'token', label: '3D Tokens' },
            { id: 'trail', label: 'Roll Trails' },
            { id: 'vignette', label: 'Bankruptcy Vignettes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Store Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const owned = CosmeticsManager.isUnlocked(item.id);
            const active = isEquipped(item);

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border bg-slate-900/60 backdrop-blur-md flex flex-col justify-between transition-all ${
                  active
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-950/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Badge & Rarity */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{item.badgeIcon}</span>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase"
                      style={{
                        color: item.rarityColor,
                        borderColor: `${item.rarityColor}55`,
                        backgroundColor: `${item.rarityColor}15`,
                      }}
                    >
                      {item.rarity}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div className="text-base font-bold text-white mb-0.5">
                    {item.name}
                  </div>
                  <div className="text-xs font-mono text-cyan-400 mb-2">
                    {item.tagline}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                    {item.description}
                  </p>

                  {/* Gradient Preview Card */}
                  <div
                    className={`h-16 rounded-xl bg-gradient-to-r ${item.previewGradient} border border-white/10 flex items-center justify-center p-3 mb-4`}
                  >
                    <div className="text-[10px] font-mono text-slate-300/80 text-center truncate">
                      {Object.entries(item.previewDetails)
                        .slice(0, 1)
                        .map(([k, v]) => `${k}: ${v}`)}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  {/* Price Tag or Unlock Requirement */}
                  <div>
                    {owned ? (
                      <span className="text-xs font-mono font-bold text-slate-400">
                        OWNED
                      </span>
                    ) : item.costBM ? (
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        {item.costBM.toLocaleString()} ƁM
                      </div>
                    ) : item.costSP ? (
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {item.costSP} SP
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-slate-400">
                        Rank Exclusive
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectItem(item)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Inspect Cosmetic Specs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {active ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Equipped
                      </span>
                    ) : owned ? (
                      <button
                        onClick={() => handleEquip(item)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                      >
                        Equip
                      </button>
                    ) : (
                      <button
                        onClick={() => setInspectItem(item)}
                        className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-950/40"
                      >
                        Unlock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspect / Purchase Modal */}
      <AnimatePresence>
        {inspectItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{inspectItem.badgeIcon}</span>
                  <div>
                    <h3 className="text-base font-bold uppercase text-white">
                      {inspectItem.name}
                    </h3>
                    <div className="text-xs font-mono text-cyan-400">
                      {inspectItem.tagline}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setInspectItem(null)}
                  className="text-slate-500 hover:text-white cursor-pointer text-xs font-mono"
                >
                  ✕
                </button>
              </div>

              <div
                className={`h-28 rounded-2xl bg-gradient-to-r ${inspectItem.previewGradient} border border-white/10 flex items-center justify-center p-4`}
              >
                <div className="text-center">
                  <span className="text-4xl block mb-1">{inspectItem.badgeIcon}</span>
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-0.5 rounded border uppercase"
                    style={{
                      color: inspectItem.rarityColor,
                      borderColor: `${inspectItem.rarityColor}55`,
                      backgroundColor: `${inspectItem.rarityColor}20`,
                    }}
                  >
                    {inspectItem.rarity}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {inspectItem.description}
              </p>

              {/* Technical Specifications */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
                {Object.entries(inspectItem.previewDetails).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-slate-400">
                    <span>{key}:</span>
                    <span className="text-slate-200 font-bold">{val}</span>
                  </div>
                ))}
              </div>

              {/* Purchase or Equip Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setInspectItem(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold uppercase cursor-pointer"
                >
                  Close
                </button>

                {CosmeticsManager.isUnlocked(inspectItem.id) ? (
                  <button
                    onClick={() => handleEquip(inspectItem)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Equip to Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {inspectItem.costBM && (
                      <button
                        onClick={() => handlePurchase(inspectItem, 'BM')}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                      >
                        Buy for {inspectItem.costBM.toLocaleString()} ƁM
                      </button>
                    )}
                    {inspectItem.costSP && (
                      <button
                        onClick={() => handlePurchase(inspectItem, 'SP')}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                      >
                        Buy for {inspectItem.costSP} SP
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
