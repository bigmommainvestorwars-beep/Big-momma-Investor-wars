import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldAlert, Skull, Sparkles, X } from 'lucide-react';
import { COSMETICS_MAP, CosmeticItem } from '../../../services/cosmetics/cosmeticsCatalog';
import { formatBM } from '../../utils/currency';

interface BankruptcyVignetteOverlayProps {
  isOpen: boolean;
  vignetteId?: string;
  playerName: string;
  onClose: () => void;
}

export const BankruptcyVignetteOverlay: React.FC<BankruptcyVignetteOverlayProps> = ({
  isOpen,
  vignetteId = 'vignette-blackswan',
  playerName,
  onClose,
}) => {
  const item: CosmeticItem = COSMETICS_MAP[vignetteId] || COSMETICS_MAP['vignette-blackswan'];

  // Synthesize custom cinematic audio for the bankruptcy sequence using Web Audio API
  useEffect(() => {
    if (!isOpen) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (vignetteId === 'vignette-blackswan') {
        // Red klaxon siren
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.6);
        osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2.6);
      } else if (vignetteId === 'vignette-margin-call') {
        // Hydraulic mechanical thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (vignetteId === 'vignette-golden-parachute') {
        // High harmonic champagne pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.3);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [isOpen, vignetteId]);

  // Auto-dismiss after 6 seconds if user doesn't close manually
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden select-none">
        {/* Dynamic Vignette Atmosphere Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 bg-gradient-to-b ${item.previewGradient} opacity-90`}
        />

        {/* Ambient Grid Scanner */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(239, 68, 68, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating Particles / FX */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 18 }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                y: -50,
                opacity: 0.8,
              }}
              animate={{
                y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                rotate: Math.random() * 360,
                opacity: [0.8, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random() * 2,
                repeat: Infinity,
                delay: idx * 0.15,
                ease: 'linear',
              }}
              className="absolute text-rose-500/40 text-xl font-mono font-bold"
            >
              {vignetteId === 'vignette-golden-parachute'
                ? '🪂'
                : vignetteId === 'vignette-vault-implosion'
                ? '🌪️'
                : '📉'}
            </motion.div>
          ))}
        </div>

        {/* Main Vignette Card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="relative z-10 w-full max-w-xl bg-slate-950/95 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(225,29,72,0.5)] text-center overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge & Icon */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(244,63,94,0.4)] mb-4 animate-bounce">
            {item.badgeIcon}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-[11px] font-mono font-bold uppercase tracking-widest text-rose-400 mb-2">
            <Skull className="w-3.5 h-3.5" />
            <span>Bankrupt Liquidation Protocol</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-red-400">
            {item.name}
          </h2>

          <div className="text-sm font-mono text-slate-300 font-bold mt-1">
            Investor [{playerName}] has suffered absolute insolvency
          </div>

          <p className="text-xs text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
            {item.description}
          </p>

          {/* Holographic Stamped Box */}
          <div className="mt-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between text-left">
            <div>
              <div className="text-[10px] font-mono text-rose-300/80 uppercase">Asset Balance</div>
              <div className="text-lg font-black font-mono text-rose-400 mt-0.5">0 ƁM</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Equipped Vignette</div>
              <div className="text-xs font-bold text-amber-300 mt-0.5">{item.tagline}</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/60 cursor-pointer transition-all"
            >
              Acknowledge Insolvency
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
