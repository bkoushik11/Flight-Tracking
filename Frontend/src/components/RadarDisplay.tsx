import React from 'react';
import { Plane } from 'lucide-react';

interface RadarDisplayProps {
  rotation: number;
}

const RadarDisplay: React.FC<RadarDisplayProps> = ({ rotation }) => {
  return (
    <div className="relative w-80 h-80 sm:w-96 sm:h-96 mx-auto flex-shrink-0">
      {/* Metallic Frame */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-600 via-zinc-400 to-zinc-600 p-1">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800 p-2">
          <div className="relative w-full h-full rounded-full bg-black overflow-hidden">
            {/* Radar Background */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(0, 50, 0, 0.3) 0%, rgba(0, 20, 0, 0.8) 100%)`,
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease-in-out'
              }}
            >
              {/* Concentric Circles */}
              {[1, 2, 3, 4].map((ring) => (
                <div
                  key={ring}
                  className="absolute rounded-full border border-green-500/30"
                  style={{
                    width: `${ring * 25}%`,
                    height: `${ring * 25}%`,
                    top: `${50 - (ring * 12.5)}%`,
                    left: `${50 - (ring * 12.5)}%`,
                  }}
                />
              ))}
              
              {/* Grid Lines */}
              <div className="absolute inset-0">
                {/* Horizontal Line */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-green-500/20" />
                {/* Vertical Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500/20" />
                {/* Diagonal Lines */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-full h-px bg-green-500/10 transform rotate-45" />
                  <div className="absolute w-full h-px bg-green-500/10 transform -rotate-45" />
                </div>
              </div>
              
              {/* Radar Sweep */}
              <div 
                className="absolute inset-0 rounded-full opacity-60"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, rgba(74, 222, 128, 0.4) 30deg, transparent 60deg)`
                }}
              />
              
              {/* Compass Markers */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-green-400 text-xs font-mono">N</div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-green-400 text-xs font-mono">S</div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-green-400 text-xs font-mono">W</div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-400 text-xs font-mono">E</div>
            </div>
            
            {/* Center Aircraft Icon */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <Plane 
                  className="w-12 h-12 text-green-400"
                  style={{ 
                    transform: 'rotate(-45deg)',
                    filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.5))'
                  }}
                />
                {/* Pulsing dot at center */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Flight Label */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-10 z-10">
              <span className="text-green-400 text-xs font-mono">FLIGHT 747</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Frame Screws */}
      <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600" />
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600" />
      <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600" />
      <div className="absolute bottom-4 right-4 w-2 h-2 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600" />
    </div>
  );
};

export default RadarDisplay;