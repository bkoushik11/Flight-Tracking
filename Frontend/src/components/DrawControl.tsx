import React, { useState } from "react";
import { useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import { Square, SquareSlash } from 'lucide-react';

// Extend the L namespace to include the drawLocal property
declare module 'leaflet' {
  namespace Draw {
    interface MapOptions {
      drawControlTooltips?: boolean;
      drawControl?: boolean;
    }
  }
}

const DrawControl: React.FC = () => {
  const map = useMap();
  const [drawnLayers, setDrawnLayers] = useState<L.LayerGroup | null>(null);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);

  // Initialize the layer group for drawn items
  React.useEffect(() => {
    const layerGroup = new L.LayerGroup();
    layerGroup.addTo(map);
    setDrawnLayers(layerGroup);
    
    return () => {
      layerGroup.clearLayers();
      layerGroup.removeFrom(map);
    };
  }, [map]);

  // When user creates a rectangle
  const onCreated = (e: any) => {
    const layer = e.layer;
    if (drawnLayers) {
      // Add the new layer to our layer group
      drawnLayers.addLayer(layer);
      
      // If it's a rectangle or polygon, zoom to its bounds
      if (layer.getBounds) {
        const bounds = layer.getBounds();
        map.fitBounds(bounds);
      }
    }
  };

  // Clear all drawn layers
  const clearDrawings = () => {
    if (drawnLayers) {
      drawnLayers.clearLayers();
    }
  };

  // Toggle drawing mode
  const toggleDrawing = () => {
    setIsDrawingEnabled(!isDrawingEnabled);
    if (!isDrawingEnabled) {
      clearDrawings();
    }
  };

  return (
    <>
      {/* Drawing Control Button */}
      <div className="leaflet-top leaflet-right" style={{ position: 'relative', zIndex: 1001 }}>
        <div className="leaflet-control leaflet-bar bg-white rounded-lg shadow-lg">
          <button
            onClick={toggleDrawing}
            className={`p-2 ${isDrawingEnabled ? 'bg-cyan-500 text-white' : 'bg-white text-gray-700'} hover:bg-cyan-100 transition-all rounded-lg`}
            aria-label={isDrawingEnabled ? "Disable drawing" : "Enable drawing"}
          >
            {isDrawingEnabled ? (
              <SquareSlash className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>
          
          {isDrawingEnabled && (
            <button
              onClick={clearDrawings}
              className="p-2 bg-white text-gray-700 hover:bg-red-100 transition-all rounded-lg mt-1"
              aria-label="Clear drawings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Edit Control - only shown when drawing is enabled */}
      {isDrawingEnabled && drawnLayers && (
        <EditControl
          position="topright"
          onCreated={onCreated}
          draw={{
            rectangle: true,
            polygon: true,
            circle: false,
            polyline: false,
            marker: false,
            circlemarker: false,
          }}
          edit={{
            featureGroup: drawnLayers,
            remove: true,
          }}
        />
      )}
    </>
  );
};

export default DrawControl;