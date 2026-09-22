import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrientationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile device (width <= 768) and portrait orientation
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

  return (
    <>
      <div className={isPortrait ? 'hidden' : 'contents'}>
        {children}
      </div>

      <AnimatePresence>
        {isPortrait && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              animate={{ rotate: 90 }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 1.5,
                ease: "easeInOut" 
              }}
              className="mb-8 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-emerald-400"
            >
              <Smartphone className="w-16 h-16" />
            </motion.div>
            
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wider mb-4">
              Please Rotate Device
            </h2>
            <p className="text-slate-400 max-w-sm font-medium">
              This game requires landscape orientation for the best experience. 
              Please rotate your device sideways to continue playing.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
