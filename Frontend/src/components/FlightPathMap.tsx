import React, { useRef, useEffect, useMemo, memo, useState } from 'react';
import { MapContainer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { INDIAN_AIRPORTS } from './IndianAirports';
import { ActiveTileLayer, useMapLayer } from './Layers';

// Component to handle map events
const MapEvents: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  useMapEvents({
    click: () => {
      onClick?.();
    },
  });
  return null;
};

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FlightPathMapProps {
  selectedFlight: any;
  onPathClick?: () => void;
}

const VIEW_STORAGE_KEY = 'flightPathMap:view';

// Helper to read initial view for path map
const getInitialView = (): { center: [number, number]; zoom: number } => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as { lat: number; lng: number; zoom: number };
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) && Number.isFinite(parsed.zoom)) {
        return { center: [parsed.lat, parsed.lng], zoom: parsed.zoom };
      }
    }
  } catch {}
  return { center: [20.5937, 78.9629], zoom: 7 };
};

// Persist view across interactions
const PersistView: React.FC = () => {
  const map = useMap();
  const saveRef = useRef<number | null>(null);

  useEffect(() => {
    const handle = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (saveRef.current) window.clearTimeout(saveRef.current);
      saveRef.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem(
            VIEW_STORAGE_KEY,
            JSON.stringify({ lat: center.lat, lng: center.lng, zoom })
          );
        } catch {}
      }, 150);
    };

    map.on('moveend', handle);
    map.on('zoomend', handle);
    return () => {
      map.off('moveend', handle);
      map.off('zoomend', handle);
      if (saveRef.current) window.clearTimeout(saveRef.current);
    };
  }, [map]);

  return null;
};

// Center/fit map to the selected flight and follow it as it moves
const FitToSelection: React.FC<{ selectedFlight: any; routePath: [number, number][] }> = ({ selectedFlight, routePath }) => {
  const map = useMap();
  const lastIdRef = useRef<string | null>(null);
  const lastPositionRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const currId = String(selectedFlight?.id ?? '');
    
    // If flight ID changed, fit to the entire route
    if (currId !== lastIdRef.current) {
      lastIdRef.current = currId;
      lastPositionRef.current = null;
      
      try {
        // Use the routePath which already includes current position
        if (routePath.length >= 2) {
          const bounds = L.latLngBounds(routePath.map(p => L.latLng(p[0], p[1])));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        } else if (routePath.length === 1) {
          map.setView(routePath[0] as any, 9);
        } else if (Number.isFinite(selectedFlight?.latitude) && Number.isFinite(selectedFlight?.longitude)) {
          // Fallback to current position if no path
          map.setView([selectedFlight.latitude, selectedFlight.longitude] as any, 9);
        }
      } catch {}
    }
    
    // If flight position changed, follow the flight (keep it centered)
    if (Number.isFinite(selectedFlight?.latitude) && Number.isFinite(selectedFlight?.longitude)) {
      const currentPos: [number, number] = [selectedFlight.latitude, selectedFlight.longitude];
      
      // Check if position has changed significantly
      if (!lastPositionRef.current || 
          Math.abs(lastPositionRef.current[0] - currentPos[0]) > 0.0001 || 
          Math.abs(lastPositionRef.current[1] - currentPos[1]) > 0.0001) {
        
        try {
          // Keep flight centered as it moves
          map.setView(currentPos, map.getZoom(), { animate: true });
          lastPositionRef.current = currentPos;
        } catch {}
      }
    }
  }, [selectedFlight?.id, selectedFlight?.latitude, selectedFlight?.longitude, routePath]);

  return null;
};

// Create airplane icon using Unicode symbol (without background)
const createAirplaneIcon = (heading: number, isSelected?: boolean) => {
  const color = isSelected ? '#10b981' : '#06b6d4'; // Green for selected, blue for others
  return L.divIcon({
    className: 'custom-airplane-icon',
    html: `
      <div style="
        width: 24px; 
        height: 24px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        transform: rotate(${heading}deg);
      ">
        <div style="
          font-size: 24px;
          color: ${color};
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">✈</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Create general airport icon with name
const createGeneralAirportIcon = (airportName: string) => {
  return L.divIcon({
    className: 'custom-airport-icon',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          width: 12px; 
          height: 12px; 
          background: #3b82f6; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 0 3px rgba(0,0,0,0.5);
        ">
        </div>
        <div style="
          margin-top: 1px;
          padding: 1px 3px;
          background: #3b82f6;
          color: white;
          font-size: 9px;
          font-weight: bold;
          border-radius: 2px;
          white-space: nowrap;
          max-width: 60px;
          text-align: center;
          line-height: 1.1;
        ">${airportName}</div>
      </div>
    `,
    iconSize: [16, 25],
    iconAnchor: [8, 20],
  });
};

// Default center is handled by getInitialView fallback

export const FlightPathMapInner: React.FC<FlightPathMapProps> = ({ selectedFlight, onPathClick }) => {
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const { activeLayer } = useMapLayer();

  const initialView = useMemo(() => getInitialView(), []);

  return (
    <MapContainer
      center={initialView.center}
      zoom={initialView.zoom}
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
    >
      <MapEvents onClick={onPathClick} />
      <ActiveTileLayer key={activeLayer.id} />
      <PersistView />
      <FitToSelection selectedFlight={selectedFlight} routePath={routePath} />
      {routePath.length > 1 && <Polyline positions={routePath} color="#10b981" opacity={0.7} weight={3} />}
      {selectedFlight && (
        <Marker
          position={[selectedFlight.latitude, selectedFlight.longitude]}
          icon={createAirplaneIcon(selectedFlight.heading, true)}
        />
      )}
      {INDIAN_AIRPORTS.map((airport, index) => (
        <Marker
          key={index}
          position={[airport.lat, airport.lng]}
          icon={createGeneralAirportIcon(airport.name)}
        />
      ))}
    </MapContainer>
  );
};

// Export FlightPathMapInner without the MapLayerProvider wrapper
const FlightPathMapWrapper: React.FC<FlightPathMapProps> = ({ selectedFlight, onPathClick }) => {
  return (
    <FlightPathMapInner 
      selectedFlight={selectedFlight} 
      onPathClick={onPathClick}
    />
  );
};

export default memo(FlightPathMapWrapper, (prevProps: { selectedFlight: any; onPathClick?: () => void }, nextProps: { selectedFlight: any; onPathClick?: () => void }) => {
  // Only re-render if the selected flight has changed
  return prevProps.selectedFlight === nextProps.selectedFlight && prevProps.onPathClick === nextProps.onPathClick;
});