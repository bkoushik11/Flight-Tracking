import React, { useEffect, useRef, useMemo, memo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Flight } from '../types/flight';
import IndianAirports, { INDIAN_AIRPORTS } from './IndianAirports';
import { MapZoomControls } from './MapZoomControls';

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
  onMouseMove?: (lat: number, lng: number) => void;
  selectedFlight: Flight | null;
}

// Component to handle map events
const MapEvents: React.FC<{ onMouseMove?: (lat: number, lng: number) => void }> = ({ onMouseMove }) => {
  useMapEvents({
    mousemove: (e) => {
      onMouseMove?.(e.latlng.lat, e.latlng.lng);
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
const createAirplaneIcon = (heading: number) => {
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
          color: #06b6d4;
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
const FlightMarker = memo(({ flight, onClick }: { flight: Flight; onClick: (flight: Flight) => void }) => {
  if (!flight.latitude || !flight.longitude) return null;
  
  const { isNear, airport } = isFlightNearAirport(flight);
  
  return (
    <>
      <Marker
        position={[flight.latitude, flight.longitude]}
        icon={createAirplaneIcon(flight.heading || 0)}
        eventHandlers={{
          click: () => onClick(flight),
        }}
      >
        {isNear && flight.status === 'boarding' && (
          <Popup>
            <div className="text-sm">
              <div className="font-bold text-blue-600">{flight.flightNumber}</div>
              <div>At {airport?.name} ({airport?.city})</div>
              <div className="text-green-600">Boarding passengers</div>
            </div>
          </Popup>
        )}
      </Marker>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the flight data or onClick handler has changed
  // Use deep comparison for flight data with tolerance for position changes
  const prevFlight = prevProps.flight;
  const nextFlight = nextProps.flight;
  
  // If it's the same object reference, no need to re-render
  if (prevFlight === nextFlight) return true;
  
  // Always re-render if position has changed significantly
  const hasSignificantPositionChange = 
    Math.abs(prevFlight.latitude - nextFlight.latitude) > 0.0001 ||
    Math.abs(prevFlight.longitude - nextFlight.longitude) > 0.0001;
    
  // If position changed significantly, we must re-render
  if (hasSignificantPositionChange) {
    return false; // Allow re-render
  }
  
  // For other changes, check if they're significant
  const hasSignificantOtherChange = 
    prevFlight.id !== nextFlight.id ||
    Math.abs(prevFlight.altitude - nextFlight.altitude) > 10 ||
    Math.abs(prevFlight.speed - nextFlight.speed) > 5 ||
    Math.abs(prevFlight.heading - nextFlight.heading) > 2 ||
    prevFlight.status !== nextFlight.status ||
    prevFlight.flightNumber !== nextFlight.flightNumber;
  
  // Re-render only if there are significant changes
  return !hasSignificantOtherChange;
});

// Separate component for flight markers to allow independent updates
const FlightMarkers: React.FC<{ 
  flights: Flight[]; 
  onFlightClick: (flight: Flight) => void;
}> = memo(({ flights, onFlightClick }) => {
  const markers = useMemo(() => {
    return flights.map(flight => (
      <FlightMarker 
        key={flight.id} 
        flight={flight} 
        onClick={onFlightClick} 
      />
    ));
  }, [flights, onFlightClick]);

  return <>{markers}</>;
}, (prevProps, nextProps) => {
  // Only re-render if flights array or onFlightClick handler has changed
  // Use reference equality check for better performance
  return (
    prevProps.flights === nextProps.flights &&
    prevProps.onFlightClick === nextProps.onFlightClick
  );
});

// Main FlightMap component - memoized to prevent re-renders
const FlightMapInner: React.FC<FlightMapProps> = ({ 
  flights, 
  onFlightClick, 
  onMouseMove,
  selectedFlight 
}) => {
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
      <MapEvents onMouseMove={onMouseMove} />
      <MapZoomControls />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        // Add performance optimizations
        keepBuffer={2}
      />
      <IndianAirports />
      <FlightMarkers flights={flights} onFlightClick={onFlightClick} />
    </MapContainer>
  );
};

// Memoize the entire FlightMap to prevent re-renders when props haven't changed significantly
export const FlightMap = memo(FlightMapInner, (prevProps, nextProps) => {
  // Only re-render if essential props have changed
  // We don't need to re-render for selectedFlight changes as that doesn't affect the map container
  // Use reference equality for flights array to prevent re-rendering when individual flight objects change
  return (
    prevProps.flights === nextProps.flights &&
    prevProps.onFlightClick === nextProps.onFlightClick &&
    prevProps.onMouseMove === nextProps.onMouseMove
  );
});