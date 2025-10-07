import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapContext } from '../contexts/MapContext';

// Import the India border data
import indiaBorderData from '../Data/India.json';

const IndiaBorders: React.FC = () => {
  const map = useMap();
  const borderLayerRef = useRef<L.GeoJSON | null>(null);
  const { showIndiaBorders } = useMapContext();

  useEffect(() => {
    // Remove existing border layer if it exists
    if (borderLayerRef.current) {
      map.removeLayer(borderLayerRef.current);
      borderLayerRef.current = null;
    }

    // Create border layer with yellow color only if showIndiaBorders is true
    if (showIndiaBorders) {
      const borderLayer = L.geoJSON(indiaBorderData as GeoJSON.GeoJsonObject, {
        style: {
          color: "#FFD700", // Yellow color
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0 // No fill, only borders
        }
      });

      borderLayer.addTo(map);
      borderLayerRef.current = borderLayer;
    }

    // Cleanup function
    return () => {
      if (borderLayerRef.current) {
        map.removeLayer(borderLayerRef.current);
      }
    };
  }, [showIndiaBorders, map]);

  return null;
};

export default IndiaBorders;