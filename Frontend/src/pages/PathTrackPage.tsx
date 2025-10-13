import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FlightMap } from '../components/FlightMap';
import { Layers, MapLayerProvider } from '../components/Layers';
import { Flight } from '../types/flight';
import pathTrackData from '../Data/pathtrack.json';
import { Position as PastTrackPosition } from '../components/PastTrackLayer';
import { fetchPositions } from '../services/flightService';
import { Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react';
import L from 'leaflet';

interface PathTrackPageProps {
  flights: Flight[];
  onBack: () => void;
  onLogout: () => void;
}

const PathTrackPage: React.FC<PathTrackPageProps> = ({ 
  flights, 
  onBack,
  onLogout
}) => {
  const [showPastTrack, setShowPastTrack] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playIndex, setPlayIndex] = useState<number>(0);
  const [positions, setPositions] = useState<PastTrackPosition[]>(() => (pathTrackData as any).positions || []);
  const [drawnRectangles, setDrawnRectangles] = useState<L.LatLngBounds[]>([]);
  const defaultFlightId = (pathTrackData as any).flightId || '80163c';

  // Fetch positions from backend for active flight id with JSON fallback
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchPositions(defaultFlightId);
        if (!cancelled && Array.isArray(res.positions) && res.positions.length > 0) {
          setPositions(res.positions as PastTrackPosition[]);
          setPlayIndex(0);
          return;
        }
      } catch (e) {
        // fall back to bundled JSON
      }
      if (!cancelled) {
        setPositions(((pathTrackData as any).positions || []) as PastTrackPosition[]);
        setPlayIndex(0);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [defaultFlightId]);

  // Simple playback effect advancing through positions
  useEffect(() => {
    if (!showPastTrack || !isPlaying || positions.length === 0) return;
    if (playIndex >= positions.length - 1) return;
    const id = setInterval(() => {
      setPlayIndex((idx) => Math.min(idx + 1, positions.length - 1));
    }, 800);
    return () => clearInterval(id);
  }, [showPastTrack, isPlaying, playIndex, positions.length]);

  const handleReplay = () => {
    setPlayIndex(0);
    setIsPlaying(true);
    setShowPastTrack(true);
  };

  const currentPlaybackPos = positions.length
    ? positions[Math.min(playIndex, positions.length - 1)]
    : null;

  // Handle rectangle drawing
  const handleRectangleDrawn = useCallback((bounds: L.LatLngBounds) => {
    setDrawnRectangles(prev => [...prev, bounds]);
  }, []);

  // Handle flight click (minimal functionality for path track page)
  const handleFlightClick = useCallback((flight: Flight) => {
    console.log('Flight clicked:', flight.flightNumber);
  }, []);

  // Handle map click
  const handleMapClick = useCallback(() => {
    // No specific action needed for path track page
  }, []);

  // Handle mouse move
  const handleMapMouseMove = useCallback((lat: number, lng: number) => {
    // No specific action needed for path track page
  }, []);

  return (
    <MapLayerProvider>
      <div className="h-screen w-full relative">
        {/* Map Container */}
        <div className="h-full w-full relative">
          <FlightMap
            flights={flights}
            onFlightClick={handleFlightClick}
            onMapClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            selectedFlight={null}
            pastTrack={{ 
              positions, 
              isVisible: showPastTrack, 
              flightId: (pathTrackData as any).flightId || 'past-track', 
              currentIndex: playIndex 
            }}
            onRectangleDrawn={handleRectangleDrawn}
          />
          
          {/* Back Button - Top Left */}
          <div className="absolute top-4 left-4 z-[1000]">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-600/40 rounded-lg text-slate-300 hover:bg-slate-700/90 transition-all shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Map</span>
            </button>
          </div>
          
          {/* Controls Panel - Top Right */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
            {/* Layers Control */}
            <div className="inline-flex p-0.5 bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-md shadow-lg">
              <Layers />
            </div>
            
            {/* Path Track Toggle */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-amber-400/40 rounded-lg shadow-lg">
              <button
                onClick={() => { setShowPastTrack(!showPastTrack); if (!showPastTrack) { setPlayIndex(0); } }}
                className={`px-3 py-2 flex items-center gap-2 text-amber-300 hover:bg-amber-500/20 transition-all rounded-lg ${showPastTrack ? 'bg-amber-500/20' : ''}`}
                aria-label="Path Track"
              >
                <span className="text-sm">Path Track</span>
              </button>
            </div>
            
            {/* Draw Control */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-blue-400/40 rounded-lg shadow-lg">
              <div className="px-3 py-2">
                <div className="text-blue-300 text-sm font-medium mb-2">Draw Tools</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const map = (window as any).mapInstance;
                      if (map && map.drawControl) {
                        map.drawControl._toolbars.draw._modes.rectangle.handler.enable();
                      }
                    }}
                    className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-xs hover:bg-blue-500/30 transition-all"
                    title="Draw Rectangle"
                  >
                    📐 Rectangle
                  </button>
                  <button
                    onClick={() => {
                      setDrawnRectangles([]);
                      const map = (window as any).mapInstance;
                      if (map && map.drawnLayers) {
                        map.drawnLayers.clearLayers();
                      }
                    }}
                    className="px-2 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded text-xs hover:bg-red-500/30 transition-all"
                    title="Clear All"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Drawn Rectangles Info */}
          {drawnRectangles.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
              <div className="bg-slate-900/90 backdrop-blur-md border border-blue-400/40 rounded-lg px-3 py-2 shadow-lg">
                <div className="text-blue-300 text-sm font-medium">
                  Drawn Areas: {drawnRectangles.length}
                </div>
                <div className="text-blue-200 text-xs">
                  Use the draw tool to create rectangles
                </div>
              </div>
            </div>
          )}

          {/* Playback Controls - Bottom Center */}
          {showPastTrack && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
              <div className="bg-slate-900/90 backdrop-blur-md border border-amber-400/40 rounded-xl px-4 py-2 shadow-lg flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg hover:bg-amber-500/30 transition-all"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  disabled={!showPastTrack}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleReplay}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg hover:bg-amber-500/30 transition-all"
                  aria-label="Replay"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <div className="text-amber-200 text-xs font-mono">
                  {Math.min(playIndex + 1, positions.length)} / {positions.length}
                </div>
                <div className="w-40 h-2 bg-slate-700 rounded overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${positions.length ? ((Math.min(playIndex + 1, positions.length) / positions.length) * 100) : 0}%` }} />
                </div>
                {showPastTrack && currentPlaybackPos && (
                  <div className="ml-2 text-amber-200 text-[11px] font-mono whitespace-nowrap">
                    Lat: {currentPlaybackPos.lat.toFixed(5)}
                    {" "}| Lng: {currentPlaybackPos.lng.toFixed(5)}
                    {" "}| Time: {new Date(currentPlaybackPos.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </MapLayerProvider>
  );
};

export default PathTrackPage;
