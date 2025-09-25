import React, { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Flight } from '../types/flight';
import { UI_CONFIG } from '../shared/constants';
import { Plus, Minus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Create dynamic airplane icon based on heading
const createAirplaneIcon = (heading: number): L.Icon => {
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 32 32" fill="#10b981" width="32" height="32">
        <g transform="rotate(${heading} 12 12)">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </g>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    shadowUrl: undefined,
    shadowSize: undefined,
    shadowAnchor: undefined
  });
};

// Custom Zoom Control Component
const CustomZoomControl: React.FC = () => {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1">
      <button 
        onClick={handleZoomIn}
        className="w-10 h-10 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md flex items-center justify-center transition-all duration-200 hover:shadow-lg active:scale-95"
        title="Zoom In"
      >
        <Plus className="w-5 h-5 text-gray-700" />
      </button>
      <button 
        onClick={handleZoomOut}
        className="w-10 h-10 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md flex items-center justify-center transition-all duration-200 hover:shadow-lg active:scale-95"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
};

/**
 * Props for the FlightMap component
 */
interface FlightMapProps {
  flights: Flight[];
  onFlightClick?: (flight: Flight) => void;
  center?: [number, number];
}

/**
 * Main FlightMap component with proper Leaflet integration
 */
export const FlightMap: React.FC<FlightMapProps> = ({ 
  flights,
  onFlightClick,
  center
}) => {
  const initialCenterRef = useRef<[number, number]>(center || UI_CONFIG.MAP_DEFAULT_CENTER);

  console.log('FlightMap Debug:', {
    flightsCount: flights.length,
    center: initialCenterRef.current,
    hasFlights: flights.length > 0,
    firstFlight: flights[0] ? {
      id: flights[0].id,
      flightNumber: flights[0].flightNumber,
      lat: flights[0].latitude,
      lng: flights[0].longitude,
      heading: flights[0].heading
    } : null
  });

  return (
    <div 
      id="map-container"
      style={{ 
        height: '100%', 
        width: '100%',
        position: 'relative',
        minHeight: '400px'
      }}
    >
      <MapContainer
        center={initialCenterRef.current}
        zoom={UI_CONFIG.MAP_DEFAULT_ZOOM}
        style={{ 
          height: '100%', 
          width: '100%',
          minHeight: '400px'
        }}
        zoomControl={false} // We'll add custom controls
        attributionControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        whenReady={() => {
          console.log('✅ Map container is ready and loaded!');
        }}
      >
        {/* Custom Zoom Controls */}
        <CustomZoomControl />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Carto Voyager">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        {/* Render flight markers */}
        {flights.slice(0, 100).map((flight: Flight) => {
          // Validate coordinates
          const lat = flight.latitude;
          const lng = flight.longitude;
          
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            console.warn('Invalid coordinates for flight:', flight.flightNumber, { lat, lng });
            return null;
          }

          // Debug heading values
          if (flight.heading && flight.heading !== 0) {
            console.log(`Flight ${flight.flightNumber} heading: ${flight.heading}°`);
          }

          return (
            <Marker
              key={flight.id}
              position={[lat, lng]}
              icon={createAirplaneIcon(flight.heading || 0)}
              eventHandlers={{ 
                click: () => {
                  console.log('Flight marker clicked:', flight.flightNumber);
                  onFlightClick?.(flight);
                }
              }}
            >
              <Popup>
                <div style={{ color: '#000', minWidth: '200px' }}>
                  <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                    {flight.flightNumber || 'Unknown Flight'}
                  </h3>
                  <p style={{ margin: '4px 0' }}>Altitude: {flight.altitude || 'N/A'} ft</p>
                  <p style={{ margin: '4px 0' }}>Speed: {flight.speed || 'N/A'} kts</p>
                  <p style={{ margin: '4px 0' }}>Status: {flight.status || 'Unknown'}</p>
                  <p style={{ margin: '4px 0' }}>
                    Route: {flight.origin || 'N/A'} → {flight.destination || 'N/A'}
                  </p>
                  <small style={{ margin: '4px 0', display: 'block' }}>
                    Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
                  </small>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};