import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Sparkles, Zap } from 'lucide-react';
import { ThreeDiceScene, type DiceMaterialType, type DiceSkinId } from './dice/ThreeDiceScene';

export interface DiceVisualizerProps {
  lastRoll?: [number, number] | null;
  isRolling?: boolean;
  canRoll?: boolean;
  onRoll?: () => void;
  disabledReason?: string;
  onAnimationComplete?: (result: number) => void;
  initialMaterial?: DiceMaterialType;
  equippedSkin?: DiceSkinId;
  onSkinChange?: (skin: DiceSkinId) => void;
}

/**
 * True 3D Physical Dice Visualizer with 16-Step Animation Support:
 * 1. Button press effect with tactile feedback & active scale
 * 2. Camera zooms slightly
 * 3. Dice lifts from platform
 * 4. Dice begins rotating rapidly
 * 5. Multi-axial rotation (X, Y, Z simultaneously)
 * 6. Reveals every face during rotation
 * 7. Reveals every edge
 * 8. Reveals every corner
 * 9. Realistic momentum conservation
 * 10. Slight bounce on ground contact
 * 11. Easing deceleration
 * 12. Dice slows down naturally
 * 13. Dice lands
 * 14. Final face displayed equals generated result
 * 15. Result glow effect appears
 * 16. Movement system begins
 */
export const DiceVisualizer: React.FC<DiceVisualizerProps> = ({
  lastRoll: controlledLastRoll,
  isRolling: controlledIsRolling,
  canRoll = true,
  onRoll,
  disabledReason,
  onAnimationComplete,
  initialMaterial = 'glossy-plastic',
  equippedSkin,
  onSkinChange,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [internalRoll, setInternalRoll] = useState<[number, number] | null>(null);
  const [internalRolling, setInternalRolling] = useState(false);

  const effectiveIsRolling = controlledIsRolling !== undefined ? controlledIsRolling : internalRolling;
  const effectiveLastRoll = controlledLastRoll !== undefined ? controlledLastRoll : internalRoll;

  const handleButtonClick = () => {
    if (!canRoll || effectiveIsRolling) return;
    // Step 1: Button press tactile effect
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);

    if (onRoll) {
      onRoll();
    } else {
      // Local fallback for interactive standalone roll
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setInternalRoll([d1, d2]);
      setInternalRolling(true);
    }
  };

  const handleAnimationComplete = (result: number) => {
    if (controlledIsRolling === undefined) {
      setInternalRolling(false);
    }
    onAnimationComplete?.(result);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* 3D Physical Dice Arena Stage */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-[#050b14] to-slate-950 border border-slate-800/80 shadow-[inset_0_2px_16px_rgba(0,0,0,0.85)] select-none touch-manipulation ${
          canRoll && !effectiveIsRolling ? 'cursor-pointer hover:border-emerald-500/50 transition-colors active:scale-[0.99]' : ''
        }`}
        onClick={() => {
          if (canRoll && !effectiveIsRolling) {
            handleButtonClick();
          }
        }}
      >
        {/* Ambient Subtle Backdrop Grid Glow */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Step 15: Glowing Pedestal Flare / Atmosphere */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            effectiveIsRolling
              ? 'opacity-100 bg-gradient-to-t from-emerald-500/15 via-cyan-500/10 to-transparent'
              : effectiveLastRoll
              ? 'opacity-80 bg-gradient-to-t from-emerald-500/10 to-transparent'
              : 'opacity-0'
          }`}
        />

        {/* Real Three.js & React Three Fiber 3D Canvas */}
        <div className="relative w-full z-10">
          <ThreeDiceScene
            lastRoll={effectiveLastRoll}
            isRolling={effectiveIsRolling}
            canRoll={canRoll}
            onRoll={handleButtonClick}
            onAnimationComplete={handleAnimationComplete}
            initialMaterial={initialMaterial}
            equippedSkin={equippedSkin}
            onSkinChange={onSkinChange}
          />
        </div>

        {/* Step 15: Dynamic Result Glow Effect & Badge */}
        <AnimatePresence>
          {effectiveLastRoll && !effectiveIsRolling && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-2.5 right-2.5 z-20 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black font-mono shadow-[0_0_25px_rgba(16,185,129,0.8)] border border-emerald-200 flex items-center gap-1.5 pointer-events-none"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Rolled: {effectiveLastRoll[0] + effectiveLastRoll[1]}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Touch/Click prompt overlay */}
        {canRoll && !effectiveIsRolling && (
          <div className="absolute top-2 left-3 z-20 pointer-events-none flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-400/80 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Tap to Roll</span>
          </div>
        )}
      </div>

      {/* Step 1: Authoritative Roll Action Button with Tactile Press Effect */}
      <motion.button
        type="button"
        id="btn-roll-dice"
        onClick={handleButtonClick}
        disabled={!canRoll || effectiveIsRolling}
        whileTap={canRoll && !effectiveIsRolling ? { scale: 0.94 } : undefined}
        title={disabledReason || 'Roll physical 3D dice to advance your turn'}
        className={`relative overflow-hidden w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg min-h-[48px] ${
          canRoll && !effectiveIsRolling
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-950/70 ring-2 ring-emerald-400/50 cursor-pointer active:scale-95'
            : 'bg-slate-800/60 border border-slate-700/60 text-slate-500 cursor-not-allowed opacity-70'
        } ${isPressed ? 'brightness-125 scale-95 shadow-[0_0_20px_rgba(16,185,129,0.8)]' : ''}`}
      >
        {/* Dynamic button shimmer highlight */}
        {canRoll && !effectiveIsRolling && (
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-shimmer pointer-events-none" />
        )}

        <Dices className={`w-4 h-4 ${effectiveIsRolling ? 'animate-spin' : isPressed ? 'scale-125' : ''}`} />
        <span>
          {effectiveIsRolling ? 'Rolling 3D Dice...' : canRoll ? 'Roll Dice' : (disabledReason || 'Waiting')}
        </span>
        {canRoll && !effectiveIsRolling && <Zap className="w-3.5 h-3.5 text-slate-950 fill-current opacity-80" />}
      </motion.button>
    </div>
  );
};
