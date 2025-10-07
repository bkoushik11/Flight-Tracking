import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapContext } from '../contexts/MapContext';

// Import the India border data
import indiaBorderData from '../Data/india-border.json';

const StateBorders: React.FC = () => {
  const map = useMap();
  const borderLayerRef = useRef<L.GeoJSON | null>(null);
  const { showStateBorders } = useMapContext();

  useEffect(() => {
    // Remove existing border layer if it exists
    if (borderLayerRef.current) {
      map.removeLayer(borderLayerRef.current);
      borderLayerRef.current = null;
    }

    // Create border layer with yellow color only if showStateBorders is true
    if (showStateBorders) {
      // Filter to show only state borders (ADM1 type)
      const stateBorderFeatures: any = {
        ...indiaBorderData,
        features: (indiaBorderData as any).features.filter(
          (feature: any) => feature.properties.shapeType === "ADM1" && feature.properties.shapeName !== "India"
        )
      };

      const borderLayer = L.geoJSON(stateBorderFeatures as GeoJSON.GeoJsonObject, {
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
  }, [showStateBorders, map]);

  return null;
};

export default StateBorders;