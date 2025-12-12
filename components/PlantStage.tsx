import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';

interface PlantStageProps {
  waterCount: number;
  label: string;
  isOwner: boolean;
}

// --- Shared Pot SVG Component ---
const PotBase = () => (
  <>
    <defs>
      <linearGradient id="potGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#d97706" /> {/* Amber 600 */}
        <stop offset="50%" stopColor="#f59e0b" /> {/* Amber 500 */}
        <stop offset="100%" stopColor="#d97706" /> {/* Amber 600 */}
      </linearGradient>
      <filter id="shadow" x="-50%" y="-20%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="4" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    
    {/* Shadow under pot */}
    <ellipse cx="100" cy="175" rx="55" ry="10" fill="#000" opacity="0.1" />

    {/* Pot Body */}
    <path 
      d="M70 170 L60 120 L140 120 L130 170 Q 100 180 70 170 Z" 
      fill="url(#potGrad)" 
      filter="url(#shadow)"
    />
    
    {/* Pot Rim */}
    <path 
      d="M55 120 L145 120 L145 110 L55 110 Z" 
      fill="#b45309" /* Amber 700 */
    />
    
    {/* Soil Surface */}
    <ellipse cx="100" cy="110" rx="40" ry="10" fill="#5D4037" />
  </>
);

// --- Plant Stages ---

const SeedSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm origin-bottom animate-sway">
    <PotBase />
    {/* Seedling */}
    <g transform="translate(100, 110)">
       <path d="M0 0 Q -5 -15 -10 -20" stroke="#84cc16" strokeWidth="4" strokeLinecap="round" />
       <path d="M0 0 Q 5 -15 10 -20" stroke="#84cc16" strokeWidth="4" strokeLinecap="round" />
       <circle cx="0" cy="0" r="3" fill="#65a30d" />
    </g>
  </svg>
);

const SproutSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md origin-bottom animate-sway">
    <PotBase />
    <g transform="translate(100, 110)">
      {/* Stem */}
      <path d="M0 0 Q 2 -20 0 -40" stroke="#65a30d" strokeWidth="5" strokeLinecap="round" fill="none"/>
      
      {/* Left Leaf */}
      <path d="M0 -40 Q -20 -50 -30 -30 Q -10 -20 0 -40" fill="#84cc16" />
      <path d="M0 -40 Q -20 -50 -30 -30" stroke="#4d7c0f" strokeWidth="1" fill="none" opacity="0.3"/>

      {/* Right Leaf */}
      <path d="M0 -40 Q 20 -50 30 -30 Q 10 -20 0 -40" fill="#84cc16" />
      <path d="M0 -40 Q 20 -50 30 -30" stroke="#4d7c0f" strokeWidth="1" fill="none" opacity="0.3"/>
    </g>
  </svg>
);

const SaplingSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md origin-bottom animate-sway">
    <PotBase />
    <g transform="translate(100, 110)">
      {/* Main Stem */}
      <path d="M0 0 C 5 -30 -5 -60 0 -90" stroke="#65a30d" strokeWidth="6" strokeLinecap="round" fill="none"/>
      
      {/* Lower Leaves */}
      <g transform="translate(2, -30) scale(0.8)">
        <path d="M0 0 Q 25 -10 35 10 Q 10 15 0 0" fill="#65a30d" />
      </g>
      <g transform="translate(-2, -45) scale(0.8) scale(-1, 1)">
        <path d="M0 0 Q 25 -10 35 10 Q 10 15 0 0" fill="#65a30d" />
      </g>

      {/* Upper Leaves */}
      <g transform="translate(0, -90)">
        <path d="M0 0 Q -20 -20 -25 5 Q -5 10 0 0" fill="#84cc16" />
        <path d="M0 0 Q 20 -20 25 5 Q 5 10 0 0" fill="#84cc16" />
        <path d="M0 0 Q 0 -30 0 -35" stroke="#84cc16" strokeWidth="3" />
        <ellipse cx="0" cy="-35" rx="5" ry="8" fill="#a3e635" />
      </g>
    </g>
  </svg>
);

const TreeSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl origin-bottom animate-sway">
    <PotBase />
    <g transform="translate(100, 110)">
      {/* Trunk */}
      <path d="M0 0 L 0 -60" stroke="#78350f" strokeWidth="10" strokeLinecap="round" />
      <path d="M0 -30 L 20 -50" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
      <path d="M0 -40 L -20 -55" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />

      {/* Lush Canopy */}
      <g transform="translate(0, -90)">
        <circle cx="-25" cy="10" r="25" fill="#15803d" />
        <circle cx="25" cy="10" r="25" fill="#15803d" />
        <circle cx="0" cy="-15" r="30" fill="#16a34a" />
        <circle cx="-20" cy="-5" r="20" fill="#22c55e" opacity="0.8" />
        <circle cx="20" cy="-5" r="20" fill="#22c55e" opacity="0.8" />
        
        {/* Flowers */}
        <circle cx="-15" cy="0" r="6" fill="#f472b6" />
        <circle cx="-15" cy="0" r="2" fill="#fff" />
        
        <circle cx="25" cy="-10" r="5" fill="#f472b6" />
        <circle cx="25" cy="-10" r="1.5" fill="#fff" />
        
        <circle cx="0" cy="-25" r="7" fill="#fb7185" />
        <circle cx="0" cy="-25" r="2.5" fill="#fff" />
      </g>
    </g>
  </svg>
);

const PlantStage: React.FC<PlantStageProps> = ({ waterCount, label, isOwner }) => {
  const [animate, setAnimate] = useState(false);

  // Trigger jelly animation on water update
  useEffect(() => {
    // Only animate if waterCount > 0 to avoid initial jelly on load (optional preference)
    if (waterCount > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600); // Sync with CSS duration
      return () => clearTimeout(timer);
    }
  }, [waterCount]);

  let StageComponent = SeedSVG;
  let stageName = "Seed";
  let progress = 0;
  
  // Stages logic
  if (waterCount < 5) {
    StageComponent = SeedSVG;
    stageName = "Seed";
    progress = Math.min((waterCount / 5) * 100, 100);
  } else if (waterCount < 15) {
    StageComponent = SproutSVG;
    stageName = "Sprout";
    progress = Math.min(((waterCount - 5) / 10) * 100, 100);
  } else if (waterCount < 30) {
    StageComponent = SaplingSVG;
    stageName = "Sapling";
    progress = Math.min(((waterCount - 15) / 15) * 100, 100);
  } else {
    StageComponent = TreeSVG;
    stageName = "Bloom";
    progress = 100;
  }

  return (
    <div className={`flex flex-col items-center transition-all duration-700 ${isOwner ? 'opacity-100' : 'opacity-90'}`}>
      
      {/* Glass Bio-dome Container */}
      <div className={`relative w-64 h-64 rounded-full border border-slate-200 bg-gradient-to-b from-blue-50/50 to-white shadow-inner flex items-center justify-center mb-6 transition-all duration-500 overflow-hidden ${isOwner ? 'shadow-2xl ring-4 ring-white' : 'grayscale-[0.2]'}`}>
        
        {/* Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/20 via-transparent to-blue-100/20"></div>
        
        {/* Label Badge */}
        <div className={`absolute top-6 px-3 py-1 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full text-[10px] font-bold tracking-widest text-slate-500 shadow-sm uppercase z-20 flex items-center gap-1`}>
          {isOwner && <Crown size={12} className="text-amber-500 fill-amber-500" />}
          {label}
        </div>

        {/* The Plant Graphic with Animations */}
        <div className={`relative z-10 w-52 h-52 mt-6 ${animate ? 'animate-jelly' : ''}`}>
           <StageComponent />
        </div>
        
        {/* Floor Reflection */}
        <div className="absolute bottom-0 w-32 h-2 bg-black/5 rounded-full blur-md"></div>
      </div>

      {/* Stats Panel */}
      <div className="w-full max-w-[160px] flex flex-col gap-2">
        <div className="flex justify-between items-end px-1">
          <div className="text-4xl font-extrabold text-slate-800 tabular-nums leading-none tracking-tight">
            {waterCount}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
             <div className={`w-2 h-2 rounded-full ${isOwner ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
             {stageName}
          </div>
        </div>

        {/* Modern Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
          <div 
             className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out rounded-full" 
             style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

    </div>
  );
};

export default PlantStage;