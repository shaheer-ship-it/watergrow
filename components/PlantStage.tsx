import React, { useEffect, useState } from 'react';
import { Sprout, Flower, TreeDeciduous, Leaf, Crown, CircleDashed } from 'lucide-react';

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
  let colorClass = "text-emerald-600";
  let stageName = "Germination";
  let size = 56;
  
  // Stages logic
  if (waterCount < 5) {
    Icon = Sprout;
    colorClass = "text-emerald-500";
    stageName = "Germination";
    size = 48;
  } else if (waterCount < 10) {
    Icon = Flower;
    colorClass = "text-emerald-600";
    stageName = "Seedling";
    size = 64;
  } else if (waterCount < 20) {
    Icon = TreeDeciduous;
    colorClass = "text-emerald-700";
    stageName = "Vegetation";
    size = 80;
  } else {
    Icon = TreeDeciduous;
    colorClass = "text-emerald-800";
    stageName = "Canopy";
    size = 96;
  }

  return (
    <div className={`flex flex-col items-center transition-all duration-500 ${isOwner ? 'scale-100 opacity-100' : 'scale-95 opacity-90'}`}>
      
      {/* Bio-dome Container */}
      <div className={`relative w-64 h-64 rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-inner flex items-center justify-center mb-6 transition-all duration-500 ${isOwner ? 'shadow-xl ring-1 ring-slate-100' : ''}`}>
        
        {/* Technical Ring */}
        <div className="absolute inset-2 rounded-full border border-dashed border-slate-200 opacity-50"></div>
        
        {/* Label Badge */}
        <div className="absolute -top-3 px-4 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold tracking-wider text-slate-500 shadow-sm uppercase">
          {isOwner && <Crown size={12} className="inline mr-1 text-amber-500 mb-0.5" />}
          {label}
        </div>

        {/* The Plant Icon */}
        <div className={`relative z-10 transition-transform duration-500 ease-out ${animate ? 'scale-110' : 'scale-100'}`}>
           <div className={`p-4 rounded-full ${isOwner ? 'bg-emerald-50/50' : 'bg-transparent'}`}>
            <Icon 
                size={size} 
                strokeWidth={1.5} 
                className={`${colorClass} drop-shadow-sm`} 
            />
           </div>
        </div>
        
        {/* Ground Line */}
        <div className="absolute bottom-10 w-24 h-1 bg-slate-100 rounded-full"></div>
      </div>

      {/* Stats Panel */}
      <div className="w-full max-w-[200px] flex flex-col gap-2">
        <div className="flex justify-between items-end px-1">
          <div className="text-3xl font-bold text-slate-800 tracking-tighter tabular-nums leading-none">
            {waterCount}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {stageName}
          </div>
        </div>

        {/* Technical Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
             className="h-full bg-slate-800 transition-all duration-500 ease-out" 
             style={{ width: `${Math.min((waterCount % 10) * 10 || 10, 100)}%` }}
          ></div>
        </div>
      </div>

    </div>
  );
};

export default PlantStage;