import React, { useRef, useEffect, useMemo, memo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { INDIAN_AIRPORTS } from './IndianAirports';
import { recordingService } from '../services/recordingService';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FlightPathMapProps {
  selectedFlight: any;
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

export const FlightPathMap: React.FC<FlightPathMapProps> = ({ selectedFlight }) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording the screen
  const startRecording = async () => {
    try {
      setRecordingError(null);
      
      // Get screen recording stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Save recording
        saveRecording();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setRecordingError('Recording error occurred');
        stopRecording();
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time every second
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError('Failed to start recording. Please ensure you have given permission to record your screen.');
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Save recording to backend
  const saveRecording = async () => {
    if (recordedChunksRef.current.length === 0) {
      setRecordingError('No recording data to save');
      return;
    }

    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const title = `Flight Path Recording - ${selectedFlight.flightNumber} - ${new Date().toLocaleString()}`;
      
      await recordingService.uploadRecording(blob, {
        title,
        durationMs: recordingTime * 1000
      });

      // Show success message
      alert('Recording saved successfully!');
      
      // Clear recorded chunks
      recordedChunksRef.current = [];
    } catch (error) {
      console.error('Error saving recording:', error);
      setRecordingError('Failed to save recording');
    }
  };

  // Format recording time as MM:SS
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      // Stop recording if component unmounts while recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // Prepare full flight path (from origin to destination) - includes current position
  const fullFlightPath: [number, number][] = useMemo(() => {
    const path: [number, number][] = [];
    
    // Add historical path points
    if (selectedFlight.path && selectedFlight.path.length > 0) {
      path.push(...selectedFlight.path.map((point: [number, number]) => [point[0], point[1]] as [number, number]));
    }
    
    // Add current position if it exists and is different from the last path point
    if (selectedFlight.latitude && selectedFlight.longitude) {
      const currentPos: [number, number] = [selectedFlight.latitude, selectedFlight.longitude];
      
      // Only add current position if it's different from the last point in the path
      if (path.length === 0 || 
          Math.abs(path[path.length - 1][0] - currentPos[0]) > 0.0001 || 
          Math.abs(path[path.length - 1][1] - currentPos[1]) > 0.0001) {
        path.push(currentPos);
      }
    }
    
    return path;
  }, [selectedFlight.path, selectedFlight.latitude, selectedFlight.longitude]);


  // Build the desired green "route" polyline - now includes current position
  const routePath: [number, number][] = useMemo(() => {
    const path: [number, number][] = [];
    
    // Add historical path points
    if (selectedFlight.path && selectedFlight.path.length > 0) {
      path.push(...selectedFlight.path.map((point: [number, number]) => [point[0], point[1]] as [number, number]));
    }
    
    // Add current position if it exists and is different from the last path point
    if (selectedFlight.latitude && selectedFlight.longitude) {
      const currentPos: [number, number] = [selectedFlight.latitude, selectedFlight.longitude];
      
      // Only add current position if it's different from the last point in the path
      if (path.length === 0 || 
          Math.abs(path[path.length - 1][0] - currentPos[0]) > 0.0001 || 
          Math.abs(path[path.length - 1][1] - currentPos[1]) > 0.0001) {
        path.push(currentPos);
      }
    }
    
    return path;
  }, [selectedFlight.path, selectedFlight.latitude, selectedFlight.longitude]);

  // Map center is restored via persisted view now

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 rounded-lg overflow-hidden min-h-0">
        <MapContainer 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          {...(() => {
            // compute once per mount via closure
            const iv = getInitialView();
            return { center: iv.center as [number, number], zoom: iv.zoom };
          })()}
        >
          <PersistView />
          <FitToSelection selectedFlight={selectedFlight} routePath={routePath} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            keepBuffer={2}
          />
          
          {/* Full flight path (faint line to show complete route) */}
          {fullFlightPath.length > 0 && (
            <Polyline
              positions={fullFlightPath}
              color="#94a3b8"
              weight={1}
              opacity={0.5}
              dashArray="5, 5"
            />
          )}
          
          {/* Desired route path from origin to destination or to border (green) */}
          {routePath.length > 1 && (
            <Polyline
              positions={routePath}
              color="#10b981"
              weight={3}
              opacity={0.9}
            />
          )}
          
          {/* Keep a subtle full path trace if needed */}
          {selectedFlight.path && selectedFlight.path.length > 0 && (
            <Polyline
              positions={selectedFlight.path as [number, number][]}
              color="#64748b"
              weight={1}
              opacity={0.4}
              dashArray="4,4"
            />
          )}
          
          
          {/* Current flight marker */}
          {selectedFlight.latitude && selectedFlight.longitude && (
            <Marker
              position={[selectedFlight.latitude, selectedFlight.longitude]}
              icon={createAirplaneIcon(selectedFlight.heading || 0)}
            />
          )}
          
          {/* Major Indian Airports */}
          {INDIAN_AIRPORTS.map((airport, index) => (
            <Marker
              key={`airport-${index}`}
              position={[airport.lat, airport.lng]}
              icon={createGeneralAirportIcon(airport.name)}
            />
          ))}
        </MapContainer>
      </div>
      
      {/* Record Button Section */}
      <div className="mt-2 flex justify-center">
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-lg p-1 shadow-lg">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-all text-xs flex items-center justify-center gap-1"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded hover:bg-cyan-500/30 transition-all text-xs flex items-center justify-center gap-1"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="hidden sm:inline">Record</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Recording Indicator - Shown when recording */}
      {isRecording && (
        <div className="mt-2 flex justify-center">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>REC</span> {formatRecordingTime(recordingTime)}
          </div>
        </div>
      )}
      
      {/* Recording Error Message */}
      {recordingError && (
        <div className="mt-2 flex justify-center">
          <div className="bg-red-500 text-white px-3 py-1 rounded text-xs">
            <span className="hidden sm:inline">{recordingError}</span>
            <span className="sm:hidden">Error</span>
            <button 
              onClick={() => setRecordingError(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize the FlightPathMap component
export default memo(FlightPathMap, (prevProps: { selectedFlight: any }, nextProps: { selectedFlight: any }) => {
  // Only re-render if the selected flight has changed
  return prevProps.selectedFlight === nextProps.selectedFlight;
});