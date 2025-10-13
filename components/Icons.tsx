
import React from 'react';

export const BrainCircuitIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 1.28.93 2.35 2.17 2.49" />
    <path d="M12 2a2.5 2.5 0 0 1 2.5 2.5c0 1.28-.93 2.35-2.17 2.49" />
    <path d="M12 10a2.5 2.5 0 0 0-2.5 2.5c0 1.28.93 2.35 2.17 2.49" />
    <path d="M12 10a2.5 2.5 0 0 1 2.5 2.5c0 1.28-.93 2.35-2.17 2.49" />
    <path d="M12 17.5a2.5 2.5 0 0 0-2.5 2.5c0 1.28.93 2.35 2.17 2.49" />
    <path d="M12 17.5a2.5 2.5 0 0 1 2.5 2.5c0 1.28-.93 2.35-2.17 2.49" />
    <path d="M20 9.5a2.5 2.5 0 0 0-2.5 2.5c0 1.28.93 2.35 2.17 2.49" />
    <path d="M4 9.5a2.5 2.5 0 0 1 2.5 2.5c0 1.28-.93 2.35-2.17 2.49" />
    <path d="M10 2.83V7" />
    <path d="M14 2.83V7" />
    <path d="M10 17v4.17" />
    <path d="M14 17v4.17" />
    <path d="M17.5 12H20" />
    <path d="M4 12h2.5" />
    <path d="M6.33 7.5 4 9.5" />
    <path d="M17.67 7.5 20 9.5" />
    <path d="M6.33 16.5 4 14.5" />
    <path d="M17.67 16.5 20 14.5" />
  </svg>
);

export const BackspaceIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
        <line x1="18" y1="9" x2="12" y2="15"></line>
        <line x1="12" y1="9" x2="18" y2="15"></line>
    </svg>
);

export const IncreaseDifficultyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>
    </svg>
);

export const SkipIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
);