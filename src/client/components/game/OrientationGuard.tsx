import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface OrientationGuardProps {
  children: React.ReactNode;
}

/**
 * Orientation Guard for Mobile/Tablet Devices
 * Detects if the device is held in portrait mode on mobile/touch screens
 * and presents a branded "Rotate Device to Landscape" overlay to enforce
 * the landscape-first gameplay experience.
 */
export const OrientationGuard: React.FC<OrientationGuardProps> = ({ children }) => {
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width < height AND screen width is mobile/tablet size (e.g. <= 900px)
      const isPortrait = window.innerHeight > window.innerWidth;
      const isTouchOrSmall = window.innerWidth <= 900 || ('ontouchstart' in window && window.innerWidth < 1024);

      setIsPortraitMobile(isPortrait && isTouchOrSmall);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (isPortraitMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
        {/* Ambient Glow */}
        <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-xs space-y-5">
          {/* Animated Rotate Device Icon */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <Smartphone className="w-9 h-9 text-emerald-400 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-cyan-500 text-slate-950 shadow-md animate-spin" style={{ animationDuration: '4s' }}>
              <RotateCw className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono tracking-[0.25em] text-emerald-400 uppercase font-black mb-1">
              BIG MOMMA: INVESTORS' WAR
            </div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
              Rotate Device
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This financial strategy board game is designed for <strong>landscape orientation</strong>. Please turn your device horizontally to enter the arena.
            </p>
          </div>

          <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono text-cyan-300">
            Landscape Mode Required
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
