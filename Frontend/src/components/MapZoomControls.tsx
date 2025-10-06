import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const MapZoomControls: React.FC = () => {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(1); // Set default zoom level to 1 instead of NaN

  useEffect(() => {
    // Update zoom level once map is available
    const initialZoom = map.getZoom();
    if (!isNaN(initialZoom)) {
      setZoomLevel(initialZoom);
    }

    const updateZoomLevel = () => {
      const currentZoom = map.getZoom();
      if (!isNaN(currentZoom)) {
        setZoomLevel(currentZoom);
      }
    };

    map.on('zoomend', updateZoomLevel);
    
    return () => {
      map.off('zoomend', updateZoomLevel);
    };
  }, [map]);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      {/* Container with background to group all controls */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-lg p-1 shadow-lg flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-transparent hover:bg-cyan-500/20 rounded-md flex items-center justify-center text-cyan-300 transition-all"
          aria-label="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Zoom Level Indicator */}
        <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-400/30 rounded-md flex items-center justify-center text-cyan-300">
          <span className="text-xs font-mono font-bold">
            {Math.round(zoomLevel)}
          </span>
        </div>
        
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-transparent hover:bg-cyan-500/20 rounded-md flex items-center justify-center text-cyan-300 transition-all"
          aria-label="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};