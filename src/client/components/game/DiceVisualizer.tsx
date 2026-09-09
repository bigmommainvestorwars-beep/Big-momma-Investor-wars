import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Sparkles, Zap } from 'lucide-react';

interface DiceVisualizerProps {
  lastRoll: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  disabledReason?: string;
}

/**
 * High-Tech Tactile Dice Visualizer
 * - CSS 3D isometric cube with authentic pip geometry
 * - Dynamic tumbling state during roll
 * - Authoritative roll number displayed on landing
 * - Strict 60fps performance without heavy WebGL bundles
 */
export const DiceVisualizer: React.FC<DiceVisualizerProps> = ({
  lastRoll,
  isRolling,
  canRoll,
  onRoll,
  disabledReason,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(lastRoll || 1);
  const [animating, setAnimating] = useState<boolean>(false);

  useEffect(() => {
    if (isRolling) {
      setAnimating(true);
      const interval = setInterval(() => {
        setDisplayValue((prev) => (prev % 6) + 1);
      }, 75);

      return () => clearInterval(interval);
    } else {
      if (lastRoll) {
        setDisplayValue(lastRoll);
      }
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isRolling, lastRoll]);

  // Pip patterns for standard D6 (1 to 6)
  const renderPips = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full p-2 flex justify-between">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] self-start" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] self-end" />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full p-2 flex justify-between">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] self-start" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] self-center" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] self-end" />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full p-2 grid grid-cols-2 gap-2 place-items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full p-1.5 grid grid-cols-3 grid-rows-3 place-items-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] col-start-1 row-start-1" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] col-start-3 row-start-1" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] col-start-2 row-start-2" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] col-start-1 row-start-3" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] col-start-3 row-start-3" />
          </div>
        );
      case 6:
      default:
        return (
          <div className="w-full h-full p-1.5 grid grid-cols-2 grid-rows-3 gap-1 place-items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* 3D Dice Stage */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Glow backdrop */}
        <div 
          className={`absolute inset-0 rounded-2xl transition-all duration-500 blur-xl ${
            animating || isRolling
              ? 'bg-cyan-500/40 scale-125 animate-pulse'
              : lastRoll
              ? 'bg-emerald-500/20 scale-100'
              : 'bg-slate-800/10'
          }`} 
        />

        {/* Isometric Cube Visual */}
        <motion.div
          animate={
            animating || isRolling
              ? {
                  rotateX: [0, 180, 360, 540, 720],
                  rotateY: [0, 90, 270, 450, 720],
                  rotateZ: [0, 45, 135, 270, 360],
                  scale: [1, 1.15, 0.95, 1.1, 1],
                }
              : {
                  rotateX: 0,
                  rotateY: 0,
                  rotateZ: 0,
                  scale: 1,
                }
          }
          transition={
            animating || isRolling
              ? { repeat: Infinity, duration: 0.6, ease: 'easeInOut' }
              : { duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }
          }
          className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 border-cyan-500/50 shadow-[0_8px_24px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-pointer select-none"
          onClick={() => canRoll && !isRolling && onRoll()}
        >
          {/* Subtle circuit line watermark */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Current Pips */}
          <div className="relative z-10 w-12 h-12">
            {renderPips(displayValue)}
          </div>
        </motion.div>

        {/* Value Tag Badge on Landing */}
        {lastRoll && !isRolling && (
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black font-mono shadow-md border border-emerald-300 flex items-center gap-0.5"
          >
            <span>+{lastRoll}</span>
          </motion.div>
        )}
      </div>

      {/* Roll Action Button */}
      <button
        type="button"
        id="btn-roll-dice"
        onClick={onRoll}
        disabled={!canRoll || isRolling}
        title={disabledReason || 'Roll the dice to advance your turn'}
        className={`w-full py-3 px-4 rounded-xl font-black text-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-lg min-h-[48px] ${
          canRoll && !isRolling
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-950/60 ring-2 ring-emerald-400/40 active:scale-95 cursor-pointer'
            : 'bg-slate-800/60 border border-slate-700/60 text-slate-500 cursor-not-allowed opacity-70'
        }`}
      >
        <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
        <span>{isRolling ? 'Rolling...' : canRoll ? 'Roll Dice' : (disabledReason || 'Waiting')}</span>
      </button>
    </div>
  );
};
