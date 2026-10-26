import React from 'react';

export const LeafIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-[#588157]',
  size = 20,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M19.5 4.5C14.5 4 6 7 4.5 15.5C8 14 15 12 19.5 4.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 15.5C4 18 5 20.5 7.5 21C7 18 8.5 15 11.5 13"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MindfulPlantIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-sm">
      {/* Gentle Pot */}
      <path
        d="M36 68L40 90H60L64 68H36Z"
        fill="#E7DFCE"
        stroke="#C9BFAC"
        strokeWidth="2"
      />
      <rect
        x="33"
        y="64"
        width="34"
        height="6"
        rx="3"
        fill="#D9D0BD"
        stroke="#BDB29D"
        strokeWidth="2"
      />
      {/* Central Stem */}
      <path
        d="M50 64V25"
        stroke="#4A6B53"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Left Leaf 1 */}
      <path
        d="M50 50C38 48 30 40 32 30C42 32 48 42 50 50Z"
        fill="#84A98C"
        stroke="#2D4A36"
        strokeWidth="1.5"
      />
      {/* Right Leaf 1 */}
      <path
        d="M50 42C62 40 70 32 68 22C58 24 52 34 50 42Z"
        fill="#52796F"
        stroke="#2D4A36"
        strokeWidth="1.5"
      />
      {/* Top Sprout */}
      <path
        d="M50 25C44 18 46 10 50 8C54 10 56 18 50 25Z"
        fill="#A3B18A"
        stroke="#2D4A36"
        strokeWidth="1.5"
      />
    </svg>
  </div>
);

export const WellnessBannerWatermark: React.FC<{ className?: string }> = ({
  className = 'opacity-10',
}) => (
  <svg
    viewBox="0 0 200 120"
    fill="currentColor"
    className={`absolute pointer-events-none select-none text-[#2D4A36] ${className}`}
  >
    <path d="M120 10C80 30 60 70 50 110C90 95 130 65 170 20C155 12 135 9 120 10Z" />
    <path d="M70 40C45 55 30 85 20 115C50 100 80 80 105 50C95 44 80 41 70 40Z" />
  </svg>
);
