import React, { useEffect, useRef } from 'react';
import { MapContainer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Flight } from '../types/flight';
import IndianAirports, { INDIAN_AIRPORTS } from './IndianAirports';
import { MapZoomControls } from './MapZoomControls';
import { ActiveTileLayer, useMapLayer } from './Layers';
import IndiaBorders from './IndiaBorders';
import StateBorders from './StateBorders';
import PastTrackLayer, { Position as PastTrackPosition } from './PastTrackLayer';
import DrawControl from './DrawControl';
import CentreFlight from './CentreFlight';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FlightMapProps {
  flights: Flight[];
  onFlightClick: (flight: Flight) => void;
  onMapClick?: () => void;
  onMouseMove?: (lat: number, lng: number) => void;
  selectedFlight: Flight | null;
  pastTrack?: { positions: PastTrackPosition[]; isVisible: boolean; flightId: string; currentIndex?: number };
  onRectangleDrawn?: (bounds: L.LatLngBounds) => void;
  showLeftPanel?: boolean;
  onBackToMap?: () => void;
}

// Component to handle map events
const MapEvents: React.FC<{ onMouseMove?: (lat: number, lng: number) => void; onMapClick?: () => void }> = ({ onMouseMove, onMapClick }) => {
  useMapEvents({
    mousemove: (e) => {
      onMouseMove?.(e.latlng.lat, e.latlng.lng);
    },
    click: () => {
      onMapClick?.();
    },
  });
  return null;
};

// Component to persist map view - only fit bounds once on first load
const PersistView: React.FC = () => {
  const map = useMap();
  const hasFittedOnce = useRef(false);

  useEffect(() => {
    // Only set the initial view once
    if (!hasFittedOnce.current) {
      try {
        // Set initial view to India
        map.setView([20.5937, 78.9629], 5);
        hasFittedOnce.current = true;
      } catch (error) {
        console.warn('Could not set initial view:', error);
      }
    }
  }, []); // Remove dependencies to ensure this only runs once

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

// Check if flight is near an airport
const isFlightNearAirport = (flight: Flight) => {
  const threshold = 0.01; // Approximately 1km
  for (const airport of INDIAN_AIRPORTS) {
    const distance = Math.sqrt(
      Math.pow(flight.latitude - airport.lat, 2) + 
      Math.pow(flight.longitude - airport.lng, 2)
    );
    if (distance < threshold) {
      return { isNear: true, airport };
    }
  }
  return { isNear: false, airport: null };
};

// Individual Flight Marker Component - memoized to prevent re-renders
const FlightMarker: React.FC<{ flight: Flight; onClick: (flight: Flight) => void; selectedFlightId?: string }> = React.memo(({ flight, onClick, selectedFlightId }) => {
  if (!flight.latitude || !flight.longitude) return null;
  
  const { isNear, airport } = isFlightNearAirport(flight);
  const isSelected = !!(selectedFlightId && flight.id === selectedFlightId);
  
  return (
    <>
      <Marker
        key={`${flight.id}-${flight.latitude}-${flight.longitude}`}
        position={[flight.latitude, flight.longitude]}
        icon={createAirplaneIcon(flight.heading || 0, isSelected)}
        eventHandlers={{
          click: () => onClick(flight),
        }}
      >
        {isNear && (
          <Popup>
            <div className="text-sm">
              <div className={`font-bold ${isSelected ? 'text-green-500' : 'text-blue-600'}`}>{flight.flightNumber}</div>
              <div>At {airport?.name} ({airport?.city})</div>
            </div>
          </Popup>
        )}
      </Marker>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if there are actual changes in flight data
  const prev = prevProps.flight;
  const next = nextProps.flight;
  
  return (
    prev.id === next.id &&
    Math.abs(prev.latitude - next.latitude) < 0.005 &&
    Math.abs(prev.longitude - next.longitude) < 0.005 &&
    Math.abs(prev.altitude - next.altitude) < 10 &&
    Math.abs(prev.speed - next.speed) < 5 &&
    Math.abs(prev.heading - next.heading) < 1 &&
    prevProps.selectedFlightId === nextProps.selectedFlightId
  );
});

// Separate component for flight markers to allow independent updates
const FlightMarkers: React.FC<{ 
  flights: Flight[]; 
  onFlightClick: (flight: Flight) => void;
  selectedFlightId?: string;
}> = React.memo(({ flights, onFlightClick, selectedFlightId }) => {
  return (
    <>
      {flights.map(flight => (
        <FlightMarker 
          key={`${flight.id}-${flight.latitude}-${flight.longitude}`} 
          flight={flight} 
          onClick={onFlightClick} 
          selectedFlightId={selectedFlightId}
        />
      ))}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if there are actual changes in flight data
  if (prevProps.flights.length !== nextProps.flights.length) return false;
  
  return prevProps.flights.every((prevFlight, index) => {
    const nextFlight = nextProps.flights[index];
    if (!nextFlight) return false;
    
    return (
      prevFlight.id === nextFlight.id &&
      Math.abs(prevFlight.latitude - nextFlight.latitude) < 0.005 &&
      Math.abs(prevFlight.longitude - nextFlight.longitude) < 0.005 &&
      Math.abs(prevFlight.altitude - nextFlight.altitude) < 10 &&
      Math.abs(prevFlight.speed - nextFlight.speed) < 5 &&
      Math.abs(prevFlight.heading - nextFlight.heading) < 1
    );
  });
});

// Main FlightMap component - memoized to prevent re-renders
const FlightMapInner: React.FC<FlightMapProps> = ({ 
  flights, 
  onFlightClick, 
  onMapClick,
  onMouseMove,
  selectedFlight,
  pastTrack,
  onRectangleDrawn,
  showLeftPanel,
  onBackToMap
}) => {
  const { activeLayer } = useMapLayer();
  
  return (
    <MapContainer 
      style={{ height: '100%', width: '100%', zIndex: 1 }}
      zoomControl={false}
      // Add performance optimizations
      preferCanvas={true}
      attributionControl={false}
      className="z-10"
    >
      <PersistView />
      <MapEvents onMouseMove={onMouseMove} onMapClick={onMapClick} />
      <MapZoomControls />
      <ActiveTileLayer key={activeLayer.id} />
      <IndiaBorders />
      <StateBorders />
      <IndianAirports />
      {pastTrack && pastTrack.isVisible && (
        <PastTrackLayer 
          positions={pastTrack.positions}
          isVisible={pastTrack.isVisible}
          flightId={pastTrack.flightId}
          showStartPlane={true}
          currentIndex={pastTrack.currentIndex}
        />
      )}
      <FlightMarkers flights={flights} onFlightClick={onFlightClick} selectedFlightId={selectedFlight?.id} />
      <CentreFlight 
        selectedFlight={selectedFlight} 
        isActive={!!selectedFlight} 
        showLeftPanel={showLeftPanel}
        onBackToMap={onBackToMap}
      />
      <DrawControl onRectangleDrawn={onRectangleDrawn} autoZoom={true} />
    </MapContainer>
  );
};

// Export FlightMapInner without the MapLayerProvider wrapper
export const FlightMap: React.FC<FlightMapProps> = FlightMapInner;