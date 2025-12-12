import React, { useEffect, useState } from 'react';
import { Sprout, Flower, TreeDeciduous, Droplets } from 'lucide-react';

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
    const timer = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(timer);
  }, [waterCount]);

  let Icon = Sprout;
  let colorClass = "text-green-500";
  let stageName = "Seedling";
  let size = 64;

  if (waterCount < 5) {
    Icon = Sprout;
    colorClass = "text-green-400";
    stageName = "Seed";
    size = 48;
  } else if (waterCount < 10) {
    Icon = Flower;
    colorClass = "text-pink-400";
    stageName = "Sprout";
    size = 64;
  } else if (waterCount < 20) {
    Icon = TreeDeciduous;
    colorClass = "text-green-600";
    stageName = "Small Tree";
    size = 80;
  } else {
    Icon = TreeDeciduous;
    colorClass = "text-emerald-700";
    stageName = "Mighty Tree";
    size = 96;
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 ${isOwner ? 'bg-white shadow-xl border-2 border-blue-100 transform scale-105 z-10' : 'bg-white/60 border border-transparent blur-[0.5px]'}`}>
      <h3 className={`text-lg font-bold mb-2 ${isOwner ? 'text-gray-800' : 'text-gray-500'}`}>{label}</h3>
      
      <div className={`relative h-32 w-32 flex items-center justify-center mb-4 transition-transform ${animate ? 'animate-pop' : ''}`}>
        <div className="absolute inset-0 bg-blue-50 rounded-full opacity-50 scale-90"></div>
        <Icon size={size} className={`${colorClass} relative z-10 transition-all duration-500`} />
        {/* Little water droplets decoration */}
        <div className="absolute top-2 right-2 text-blue-400 opacity-20">
          <Droplets size={16} />
        </div>
      </div>

      <div className="text-center">
        <span className="block text-3xl font-bold text-blue-600">{waterCount}</span>
        <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">{stageName}</span>
      </div>
    </div>
  );
};

export default PlantStage;
