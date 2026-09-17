import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrientationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [bypassPortrait, setBypassPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile viewport and portrait orientation
      const isMobile = window.innerWidth <= 768;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && isPortraitMode);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const shouldBlock = isPortrait && !bypassPortrait;

  return (
    <>
      <div className={shouldBlock ? 'hidden' : 'contents'}>
        {children}
      </div>

      <AnimatePresence>
        {shouldBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#030712] flex flex-col items-center justify-center p-6 text-center pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)] pl-[max(env(safe-area-inset-left),16px)] pr-[max(env(safe-area-inset-right),16px)]"
          >
            <motion.div
              animate={{ rotate: 90 }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 1.5,
                ease: "easeInOut" 
              }}
              className="mb-6 p-4 bg-slate-900/90 rounded-2xl border border-cyan-500/40 text-emerald-400 shadow-[0_0_30px_rgba(6,182,212,0.25)]"
            >
              <Smartphone className="w-14 h-14 text-cyan-400" />
            </motion.div>
            
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-wider mb-2">
              Please Rotate Device
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xs font-medium mb-6 leading-relaxed">
              Big Momma: Investors' War is optimized for landscape play on iOS and Android for the full 52-space circular arena.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    if (screen.orientation && 'lock' in screen.orientation) {
                      (screen.orientation as any).lock('landscape').catch(() => {});
                    }
                  } catch {}
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
              >
                <RotateCw className="w-4 h-4" />
                <span>Rotate to Landscape</span>
              </button>

              <button
                type="button"
                onClick={() => setBypassPortrait(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono transition-colors"
              >
                <span>Continue in Portrait</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
