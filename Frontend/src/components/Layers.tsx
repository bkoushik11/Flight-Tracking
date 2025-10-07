import React, { useState, createContext, useContext } from 'react';
import { TileLayer } from 'react-leaflet';
import { Layers as LayersIcon } from 'lucide-react';
import { useMapContext } from '../contexts/MapContext';

// Define map layer types
export interface MapLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

// Define available map layers
export const MAP_LAYERS: MapLayer[] = [
  {
    id: 'carto-voyager',
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  {
    id: 'carto-dark',
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  {
    id: 'open-topo',
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17
  },
  {
    id: 'esri-world-imagery',
    name: 'ESRI World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  }
];

// Create context for map layer state
interface MapLayerContextType {
  activeLayer: MapLayer;
  setActiveLayer: (layer: MapLayer) => void;
}

const MapLayerContext = createContext<MapLayerContextType | undefined>(undefined);

// Provider component
export const MapLayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeLayer, setActiveLayer] = useState<MapLayer>(MAP_LAYERS[0]); // Default to Carto Voyager

  return (
    <MapLayerContext.Provider value={{ activeLayer, setActiveLayer }}>
      {children}
    </MapLayerContext.Provider>
  );
};

// Hook to use map layer context
export const useMapLayer = () => {
  const context = useContext(MapLayerContext);
  if (!context) {
    throw new Error('useMapLayer must be used within a MapLayerProvider');
  }
  return context;
};

// Component to render the active tile layer
export const ActiveTileLayer: React.FC = () => {
  const { activeLayer } = useMapLayer();
  
  return (
    <TileLayer
      url={activeLayer.url}
      attribution={activeLayer.attribution}
      maxZoom={activeLayer.maxZoom}
      // Add performance optimizations
      keepBuffer={2}
    />
  );
};

export const Layers: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeLayer, setActiveLayer } = useMapLayer();
  const { showIndiaBorders, showStateBorders, toggleIndiaBorders, toggleStateBorders } = useMapContext();

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayer(layer);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Layer control button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20 transition-all rounded-lg"
          aria-label="Map layers"
        >
          <LayersIcon className="h-5 w-5" />
        </button>

        {/* Layer selection dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-slate-900/95 backdrop-blur-md border border-cyan-400/40 rounded-lg shadow-lg z-[1001]">
            <div className="p-2 border-b border-cyan-400/20">
              <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Map Layers</h3>
            </div>
            <div className="py-1">
              {MAP_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => handleLayerChange(layer)}
                  className={`w-full text-left px-3 py-2 hover:bg-cyan-500/20 transition-all flex items-center justify-between ${
                    activeLayer.id === layer.id 
                      ? 'bg-cyan-500/30 border-r-2 border-cyan-400' 
                      : ''
                  }`}
                >
                  <span className="text-sm text-white truncate">{layer.name}</span>
                  {activeLayer.id === layer.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
              {/* Border toggles */}
              <div className="border-t border-cyan-400/20 mt-1 pt-1">
                <button
                  onClick={toggleIndiaBorders}
                  className={`w-full text-left px-3 py-2 hover:bg-cyan-500/20 transition-all flex items-center justify-between ${
                    showIndiaBorders ? 'bg-cyan-500/30 border-r-2 border-cyan-400' : ''
                  }`}
                >
                  <span className="text-sm text-white">India Border</span>
                  {showIndiaBorders && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={toggleStateBorders}
                  className={`w-full text-left px-3 py-2 hover:bg-cyan-500/20 transition-all flex items-center justify-between ${
                    showStateBorders ? 'bg-cyan-500/30 border-r-2 border-cyan-400' : ''
                  }`}
                >
                  <span className="text-sm text-white">State Border</span>
                  {showStateBorders && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};