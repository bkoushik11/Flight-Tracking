import React, { useState } from "react";
import { useMap } from "react-leaflet";
import L, { GeoJSON } from "leaflet";
import { Globe } from 'lucide-react';

// Define the borders layer type
interface BordersLayer extends L.GeoJSON {
  _leaflet_id?: number;
}

const BordersControl: React.FC = () => {
  const map = useMap();
  const [bordersLayer, setBordersLayer] = useState<BordersLayer | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Simple GeoJSON for country borders (simplified for demo)
  // In a real application, you would load this from a proper GeoJSON source
  const countryBorders: GeoJSON.FeatureCollection = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [68.1766451354, 7.96553477623],
              [68.1766451354, 35.4940095077],
              [97.4025614764, 35.4940095077],
              [97.4025614764, 7.96553477623],
              [68.1766451354, 7.96553477623]
            ]
          ]
        }
      }
    ]
  };

  // Toggle borders visibility
  const toggleBorders = () => {
    if (isVisible) {
      // Remove borders from map
      if (bordersLayer) {
        map.removeLayer(bordersLayer);
        setBordersLayer(null);
      }
      setIsVisible(false);
    } else {
      // Add borders to map
      const layer = L.geoJSON(countryBorders, {
        style: {
          color: "#FFD700", // Yellow color
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1
        }
      }) as BordersLayer;
      
      layer.addTo(map);
      setBordersLayer(layer);
      setIsVisible(true);
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ position: 'relative', zIndex: 1001, top: '120px' }}>
      <div className="leaflet-control leaflet-bar bg-white rounded-lg shadow-lg">
        <button
          onClick={toggleBorders}
          className={`p-2 ${isVisible ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700'} hover:bg-yellow-100 transition-all rounded-lg`}
          aria-label={isVisible ? "Hide borders" : "Show borders"}
        >
          <Globe className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default BordersControl;