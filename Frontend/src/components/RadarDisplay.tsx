import React from 'react';
import { Plane } from 'lucide-react';

interface RadarDisplayProps {
  sweepAngle: number;
  radarRotation: number;
  flightNumber?: string;
  headingAngle?: number;
}

const RadarDisplay: React.FC<RadarDisplayProps> = ({
  sweepAngle,
  radarRotation,
  headingAngle = 0
}) => {
  return (
    <div className="relative w-64 h-64 rounded-full border-2 border-green-400/30 bg-slate-900/40 backdrop-blur-xl overflow-hidden">
      
      {/* Radar Grid */}
      <div className="absolute inset-0">
        {[1, 2, 3, 4].map(ring => (
          <div
            key={ring}
            className="absolute rounded-full border border-green-400/20"
            style={{
              width: `${ring * 25}%`,
              height: `${ring * 25}%`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
        <div className="absolute w-full h-0.5 bg-green-400/20 top-1/2 transform -translate-y-1/2" />
        <div className="absolute h-full w-0.5 bg-green-400/20 left-1/2 transform -translate-x-1/2" />
      </div>

      {/* Radar Sweeps */}
      {[0, -30, -60].map(offset => (
        <div
          key={offset}
          className="absolute inset-0 transition-transform duration-75 ease-linear"
          style={{ transform: `rotate(${sweepAngle + radarRotation + offset}deg)` }}
        >
          <div className={`absolute top-1/2 left-1/2 w-0.5 h-32 origin-bottom transform -translate-x-1/2 ${
            offset === 0
              ? 'bg-gradient-to-t from-green-400 to-transparent drop-shadow-lg'
              : offset === -30
              ? 'bg-gradient-to-t from-green-400/40 to-transparent'
              : 'bg-gradient-to-t from-green-400/20 to-transparent'
          }`} />
        </div>
      ))}

      {/* Compass Markings */}
      <div className="absolute inset-0">
        {['N', 'E', 'S', 'W'].map((dir, i) => {
          const angle = i * 90;
          return (
            <div
              key={dir}
              className="absolute text-green-400 font-bold text-sm"
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${angle - radarRotation}deg) translateY(-115px) rotate(${-angle + radarRotation}deg)`
              }}
            >
              {dir}
            </div>
          );
        })}
      </div>

      {/* Center Dot */}
      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />

      {/* Flight Icon */}
      <div className="absolute top-1/2 left-1/2 w-0 h-0">
        <div
          className="relative"
          style={{ transform: `rotate(${headingAngle - radarRotation - 50}deg)` }}
        >
          <Plane className="absolute top-0 left-0 w-6 h-6 text-green-400 drop-shadow-lg transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-0 left-0 w-6 h-6 bg-green-400/20 rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
};

export default RadarDisplay;
