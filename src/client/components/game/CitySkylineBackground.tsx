import React from 'react';

/**
 * HD City & Skyscraper Background
 * Constrained background scenery for the upper board arena, strictly terminating at the Investors Syndicate section.
 * Never spreads beyond the Investors Syndicate section into the Action Terminal or telemetry stream.
 */
export const CitySkylineBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute top-0 inset-x-0 max-h-[600px] overflow-hidden pointer-events-none select-none z-0 ${className}`}>
      {/* Deep Base Foundation */}
      <div className="absolute inset-0 bg-[#02050f]" />

      {/* High-Definition Panoramic Skyscrapers & Trees Background Image */}
      <div className="absolute inset-0 opacity-80 pointer-events-none transition-opacity duration-500">
        <img
          src="https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=2560&q=90"
          alt="Illuminated Skyscrapers and Trees Skyline"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter saturate-[1.2] contrast-[1.1]"
        />
        
        {/* Strictly dissolves to solid #02050f before the bottom of the Investors Syndicate section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02050f]/75 to-[#02050f]" />
      </div>
    </div>
  );
};

