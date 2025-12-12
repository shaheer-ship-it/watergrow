import React, { useEffect, useState } from 'react';
import { Sprout, Flower, TreeDeciduous, Leaf, Crown, Sparkles } from 'lucide-react';

interface PlantStageProps {
  waterCount: number;
  label: string;
  isOwner: boolean;
}

const PlantStage: React.FC<PlantStageProps> = ({ waterCount, label, isOwner }) => {
  const [animate, setAnimate] = useState(false);

  // Trigger animation when waterCount changes
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 400);
    return () => clearTimeout(timer);
  }, [waterCount]);

  let Icon = Leaf;
  let colorClass = "text-emerald-500";
  let stageName = "Baby Seed";
  let size = 64;
  let glowColor = "bg-emerald-400";

  if (waterCount < 5) {
    Icon = Sprout;
    colorClass = "text-emerald-500";
    stageName = "Lil Sprout";
    size = 64;
    glowColor = "bg-emerald-400";
  } else if (waterCount < 10) {
    Icon = Flower;
    colorClass = "text-fuchsia-500";
    stageName = "Blooming";
    size = 88;
    glowColor = "bg-fuchsia-400";
  } else if (waterCount < 20) {
    Icon = TreeDeciduous;
    colorClass = "text-green-600";
    stageName = "Growing Up";
    size = 100;
    glowColor = "bg-green-500";
  } else {
    Icon = TreeDeciduous;
    colorClass = "text-teal-600";
    stageName = "Main Character";
    size = 120;
    glowColor = "bg-teal-400";
  }

  return (
    <div className={`relative flex flex-col items-center justify-end transition-all duration-500 ${isOwner ? 'scale-100 z-10' : 'scale-95 opacity-80'}`}>
      
      {/* Label Tag - Sticker Style */}
      <div className={`absolute -top-20 z-20 ${
        isOwner ? 'animate-float' : ''
      }`}>
        <div className={`px-5 py-2 rounded-full border-2 text-sm font-bold shadow-[4px_4px_0px_rgba(0,0,0,0.05)] backdrop-blur-md uppercase tracking-wide flex items-center gap-2 ${
          isOwner 
            ? 'bg-white/80 border-white text-slate-800' 
            : 'bg-white/40 border-white/40 text-slate-600'
        }`}>
          {isOwner && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}
          {label}
        </div>
      </div>

      {/* The Plant Scene */}
      <div className="relative w-56 h-56 flex items-end justify-center mb-4">
        
        {/* Aura Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-40 transition-colors duration-1000 ${glowColor} ${isOwner ? 'animate-pulse' : ''}`}></div>

        {/* The Plant Icon */}
        <div className={`relative z-10 origin-bottom transition-all duration-300 drop-shadow-2xl ${animate ? 'animate-pop' : ''}`}>
          <Icon 
            size={size} 
            strokeWidth={1.8} 
            className={`${colorClass} filter drop-shadow-lg`} 
          />
          {/* Particle Effects on growth */}
          {animate && (
            <>
              <Sparkles className="absolute -top-4 -right-4 text-yellow-400 animate-ping" size={24} />
              <Sparkles className="absolute top-1/2 -left-8 text-blue-400 animate-pulse" size={16} />
            </>
          )}
        </div>

        {/* Ground/Pot Graphic */}
        <div className="absolute bottom-6 w-32 h-8 bg-black/5 rounded-[100%] blur-sm"></div>
      </div>

      {/* Stats Pill */}
      <div className={`flex flex-col items-center glass-panel px-6 py-4 rounded-3xl w-full max-w-[160px] transition-all duration-300 ${isOwner ? 'border-2 border-white/80 shadow-xl' : 'border border-white/30'}`}>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className={`text-4xl font-extrabold tracking-tight ${isOwner ? 'text-slate-800' : 'text-slate-600'}`}>
              {waterCount}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase">Sips</span>
          </div>
          
          {/* Custom Progress Bar */}
          <div className="w-full bg-slate-200/50 h-3 rounded-full mt-1 p-0.5 overflow-hidden">
             <div 
               className={`h-full rounded-full bg-gradient-to-r from-blue-400 to-fuchsia-400 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]`} 
               style={{ width: `${Math.min((waterCount % 10) * 10 || 5, 100)}%` }}
             ></div>
          </div>
          
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-3 opacity-75">
            {stageName}
          </span>
      </div>

    </div>
  );
};

export default PlantStage;