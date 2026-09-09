import React from 'react';

/**
 * Futuristic Financial City Background
 * High-performance vector atmosphere featuring:
 * - Deep midnight financial district palette (#030712 to #0a1128)
 * - Layered high-rise and mid-rise skyscrapers with illuminated windows
 * - Smaller corporate buildings and urban skywalks
 * - City lights and beacons with glowing cyan and emerald conduits
 * - Green vegetation, parks, landscaped tree canopies
 * - Water/stream elements and shoreline reflection
 * - Surrounding urban walkways and promenade
 * Optimized to run at 60fps without heavy canvas or 3D overhead.
 */
export const CitySkylineBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Deep Midnight Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02050f] via-[#050b1d] to-[#030614]" />

      {/* Ambient Atmospheric Glow Beams */}
      <div className="absolute top-0 left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[140px]" />
      <div className="absolute top-[15%] right-[8%] w-[520px] h-[520px] rounded-full bg-cyan-500/5 blur-[150px]" />
      <div className="absolute bottom-[20%] left-[40%] w-[600px] h-[400px] rounded-full bg-indigo-500/5 blur-[160px]" />

      {/* Distant Skyscrapers Layer (SVG) */}
      <svg
        className="absolute bottom-20 inset-x-0 w-full h-72 opacity-30"
        preserveAspectRatio="none"
        viewBox="0 0 1920 360"
      >
        <defs>
          <linearGradient id="towerGradFar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Far Left Towers */}
        <rect x="20" y="60" width="60" height="300" fill="url(#towerGradFar)" />
        <rect x="90" y="30" width="80" height="330" fill="url(#towerGradFar)" />
        <line x1="130" y1="10" x2="130" y2="30" stroke="#06b6d4" strokeWidth="2" />
        <circle cx="130" cy="8" r="3" fill="#06b6d4" />

        <rect x="180" y="90" width="70" height="270" fill="url(#towerGradFar)" />
        <rect x="260" y="50" width="95" height="310" fill="url(#towerGradFar)" />
        <rect x="365" y="110" width="80" height="250" fill="url(#towerGradFar)" />

        {/* Far Center Towers */}
        <rect x="780" y="130" width="65" height="230" fill="url(#towerGradFar)" />
        <rect x="855" y="80" width="85" height="280" fill="url(#towerGradFar)" />
        <rect x="950" y="100" width="75" height="260" fill="url(#towerGradFar)" />
        <rect x="1035" y="60" width="90" height="300" fill="url(#towerGradFar)" />
        <line x1="1080" y1="35" x2="1080" y2="60" stroke="#10b981" strokeWidth="2" />
        <circle cx="1080" cy="33" r="3" fill="#10b981" />

        {/* Far Right Towers */}
        <rect x="1460" y="50" width="85" height="310" fill="url(#towerGradFar)" />
        <rect x="1555" y="100" width="70" height="260" fill="url(#towerGradFar)" />
        <rect x="1635" y="40" width="95" height="320" fill="url(#towerGradFar)" />
        <line x1="1682" y1="15" x2="1682" y2="40" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="1682" cy="13" r="3" fill="#38bdf8" />
        <rect x="1740" y="80" width="85" height="280" fill="url(#towerGradFar)" />
        <rect x="1835" y="60" width="75" height="300" fill="url(#towerGradFar)" />
      </svg>

      {/* Midground Skyline with Illuminated Windows & Skywalks */}
      <svg
        className="absolute bottom-8 inset-x-0 w-full h-80 opacity-45"
        preserveAspectRatio="none"
        viewBox="0 0 1920 420"
      >
        <defs>
          <linearGradient id="bldgMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="skywalkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Left Sector: Apex Cyber Towers */}
        <g>
          {/* Spire Tower with illuminated windows */}
          <polygon points="100,420 100,140 135,90 170,140 170,420" fill="url(#bldgMid)" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.5" />
          <line x1="135" y1="45" x2="135" y2="90" stroke="#06b6d4" strokeWidth="2" />
          <circle cx="135" cy="42" r="4" fill="#06b6d4" />
          {/* Window grids */}
          <rect x="115" y="150" width="10" height="12" fill="#38bdf8" opacity="0.8" />
          <rect x="145" y="150" width="10" height="12" fill="#38bdf8" opacity="0.6" />
          <rect x="115" y="175" width="10" height="12" fill="#38bdf8" opacity="0.4" />
          <rect x="145" y="175" width="10" height="12" fill="#38bdf8" opacity="0.9" />
          <rect x="115" y="200" width="10" height="12" fill="#38bdf8" opacity="0.7" />
          <rect x="145" y="200" width="10" height="12" fill="#38bdf8" opacity="0.5" />

          {/* Smaller Adjacent Office Complex */}
          <rect x="185" y="210" width="90" height="210" fill="url(#bldgMid)" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
          <rect x="200" y="230" width="12" height="10" fill="#34d399" opacity="0.7" />
          <rect x="220" y="230" width="12" height="10" fill="#34d399" opacity="0.5" />
          <rect x="245" y="230" width="12" height="10" fill="#34d399" opacity="0.8" />
          <rect x="200" y="255" width="12" height="10" fill="#34d399" opacity="0.6" />
          <rect x="220" y="255" width="12" height="10" fill="#34d399" opacity="0.9" />
          <rect x="245" y="255" width="12" height="10" fill="#34d399" opacity="0.4" />

          {/* Stepped Corporate Tower */}
          <rect x="290" y="170" width="110" height="250" fill="url(#bldgMid)" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
          <rect x="310" y="130" width="70" height="40" fill="url(#bldgMid)" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="345" cy="125" r="3" fill="#38bdf8" />
          {/* Glass Skywalk connecting buildings */}
          <rect x="260" y="240" width="40" height="12" fill="url(#skywalkGrad)" opacity="0.6" />
        </g>

        {/* Right Sector: Global Financial Citadel */}
        <g>
          {/* Big Momma Headquarters Pyramid Apex */}
          <polygon points="1460,420 1460,110 1540,65 1620,110 1620,420" fill="url(#bldgMid)" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.6" />
          <line x1="1540" y1="20" x2="1540" y2="65" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="1540" cy="18" r="5" fill="#10b981" />
          {/* Crown golden rim */}
          <line x1="1465" y1="112" x2="1615" y2="112" stroke="#f59e0b" strokeWidth="2.5" strokeOpacity="0.9" />
          {/* Windows inside pyramid */}
          <rect x="1510" y="130" width="14" height="14" fill="#fbbf24" opacity="0.8" />
          <rect x="1555" y="130" width="14" height="14" fill="#fbbf24" opacity="0.7" />
          <rect x="1490" y="160" width="14" height="14" fill="#34d399" opacity="0.8" />
          <rect x="1530" y="160" width="14" height="14" fill="#38bdf8" opacity="0.9" />
          <rect x="1575" y="160" width="14" height="14" fill="#34d399" opacity="0.7" />

          {/* Twin Commercial Towers with High Bridge */}
          <rect x="1650" y="140" width="80" height="280" fill="url(#bldgMid)" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" />
          <rect x="1750" y="160" width="80" height="260" fill="url(#bldgMid)" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" />
          {/* Skybridge */}
          <rect x="1725" y="220" width="30" height="14" fill="url(#skywalkGrad)" opacity="0.7" />

          {/* Smaller Waterfront pavilion */}
          <polygon points="1845,420 1845,290 1890,270 1915,290 1915,420" fill="url(#bldgMid)" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" />
        </g>
      </svg>

      {/* Urban Green Vegetation, Parks & Tree Canopies */}
      <div className="absolute inset-x-0 bottom-14 h-16 pointer-events-none opacity-40 flex justify-between px-10 items-end">
        {/* Left Park Strip */}
        <div className="flex items-end gap-2">
          <div className="w-12 h-8 rounded-t-full bg-gradient-to-t from-emerald-950 via-emerald-800 to-emerald-600/80 border-t border-emerald-400/40 shadow-[0_0_10px_#10b981]" />
          <div className="w-16 h-10 rounded-t-full bg-gradient-to-t from-emerald-950 via-emerald-800 to-emerald-600/80 border-t border-emerald-400/40 shadow-[0_0_12px_#10b981]" />
          <div className="w-10 h-6 rounded-t-full bg-gradient-to-t from-teal-950 via-teal-800 to-teal-600/80 border-t border-teal-400/40" />
          <div className="w-8 h-4 rounded-t-full bg-emerald-700/60" />
        </div>

        {/* Center Promenade Trees */}
        <div className="hidden sm:flex items-end gap-3 opacity-30">
          <div className="w-10 h-7 rounded-t-full bg-emerald-800/70 border-t border-emerald-400/30" />
          <div className="w-14 h-9 rounded-t-full bg-emerald-700/70 border-t border-emerald-400/30" />
          <div className="w-10 h-7 rounded-t-full bg-emerald-800/70 border-t border-emerald-400/30" />
        </div>

        {/* Right Park Strip */}
        <div className="flex items-end gap-2">
          <div className="w-8 h-5 rounded-t-full bg-emerald-700/60" />
          <div className="w-14 h-10 rounded-t-full bg-gradient-to-t from-emerald-950 via-emerald-800 to-emerald-600/80 border-t border-emerald-400/40 shadow-[0_0_12px_#10b981]" />
          <div className="w-12 h-7 rounded-t-full bg-gradient-to-t from-emerald-950 via-emerald-800 to-emerald-600/80 border-t border-emerald-400/40" />
        </div>
      </div>

      {/* Water / Stream Elements & Shimmering Marina Canal */}
      <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none">
        {/* River/Water Base */}
        <div className="w-full h-full bg-gradient-to-t from-[#02101f] via-[#041d33] to-[#020b17] border-t border-cyan-500/30" />
        {/* Shimmering Water Waves / Stream conduits */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(6, 182, 212, 0.4) 4px, rgba(6, 182, 212, 0.4) 6px)',
          }}
        />
        {/* Waterfront Promenade Walkway line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500/40 via-emerald-400/60 to-cyan-500/40 shadow-[0_0_8px_#22d3ee]" />
      </div>

      {/* Radial vignette for central board focus and readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.15) 0%, rgba(2, 6, 23, 0.65) 65%, rgba(2, 6, 23, 0.95) 100%)',
        }}
      />
    </div>
  );
};
