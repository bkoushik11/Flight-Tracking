import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { FlightMap } from '../components/FlightMap';
import { MapLayerProvider } from '../components/Layers';
import { Flight } from '../types/flight';

import { Position as PastTrackPosition } from '../components/PastTrackLayer';
import { fetchPositions, listRecordedFlightIds, deleteRecordedFlight } from '../services/flightService';
import { Play, Pause, RotateCcw, ArrowLeft, Trash2 } from 'lucide-react';
// import L from 'leaflet';

interface PathTrackPageProps {
  flights: Flight[];
  onBack: () => void;
}

const PathTrackPage: React.FC<PathTrackPageProps> = ({ 
  // flights, 
  onBack
}) => {
  const [showPastTrack, setShowPastTrack] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playIndex, setPlayIndex] = useState<number>(0);
  const [positions, setPositions] = useState<PastTrackPosition[]>([]);
  // const [drawnRectangles, setDrawnRectangles] = useState<L.LatLngBounds[]>([]);
  const [availableFlightIds, setAvailableFlightIds] = useState<string[]>([]);
  const [activeFlightId, setActiveFlightId] = useState<string>('');
  
  // Refs for animation frame management
  const animationFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Load recorded flight ids
  useEffect(() => {
    let cancelled = false;
    const loadIds = async () => {
      try {
        const res = await listRecordedFlightIds();
        if (!cancelled && res?.flightIds) {
          setAvailableFlightIds(res.flightIds);
          if (res.flightIds.length > 0) {
            setActiveFlightId(res.flightIds[0]);
          }
        }
      } catch {}
    };
    loadIds();
    return () => { cancelled = true; };
  }, []);

  // Fetch positions from backend for active flight id
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchPositions(activeFlightId);
        if (!cancelled && Array.isArray(res.positions) && res.positions.length > 0) {
          setPositions(res.positions as PastTrackPosition[]);
          setPlayIndex(0);
          return;
        }
      } catch (e) {
        // ignore
      }
      if (!cancelled) {
        setPositions([]);
        setPlayIndex(0);
      }
    };
    if (activeFlightId) {
      load();
    }
    return () => { cancelled = true; };
  }, [activeFlightId]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Playback effect using requestAnimationFrame (1 step every ~800ms)
  useEffect(() => {
    // Clean up any existing animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    startTimeRef.current = null;

    // Exit if not playing or no positions
    if (!showPastTrack || !isPlaying || positions.length === 0) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;

      const elapsed = timestamp - startTimeRef.current;
      const stepDuration = 800; // ms per step

      const nextIndex = Math.floor(elapsed / stepDuration);

      if (nextIndex < positions.length) {
        setPlayIndex(nextIndex);
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);
    
    // Cleanup function for this effect
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [isPlaying, showPastTrack, positions]);

  const handleReplay = () => {
    setPlayIndex(0);
    setIsPlaying(true);
    setShowPastTrack(true);
  };

  const currentPlaybackPos = positions.length
    ? positions[Math.min(playIndex, positions.length - 1)]
    : null;

  // Handle rectangle drawing
  // const handleRectangleDrawn = useCallback((bounds: L.LatLngBounds) => {
  //   setDrawnRectangles(prev => [...prev, bounds]);
  // }, []);

  // Handle flight click (minimal functionality for path track page)
  const handleFlightClick = useCallback((flight: Flight) => {
    console.log('Flight clicked:', flight.flightNumber);
  }, []);

  // Handle map click
  const handleMapClick = useCallback(() => {
    // No specific action needed for path track page
  }, []);

  // Handle mouse move
  const handleMapMouseMove = useCallback(() => {
    // No specific action needed for path track page
  }, []);

  return (
    <MapLayerProvider>
      <div className="h-screen w-full relative">
        {/* Map Container */}
        <div className="h-full w-full relative">
          <FlightMap
            flights={[]}
            onFlightClick={handleFlightClick}
            onMapClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            selectedFlight={null}
            pastTrack={{ 
              positions, 
              isVisible: showPastTrack, 
              flightId: activeFlightId || 'past-track', 
              currentIndex: playIndex,
              isPlaying: isPlaying,
              stepDurationMs: 800 
            }}
            onRectangleDrawn={undefined}
          />
          
          {/* Back Button - Top Left */}
          <div className="absolute top-4 left-4 z-[1000]">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-600/40 rounded-lg text-slate-300 hover:bg-slate-700/90 transition-all shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          
          {/* Controls Panel - Top Right */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
            
            {/* Recorded Flights Selector (with inline delete per flight) */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-400/40 rounded-lg shadow-lg p-2">
              <div className="text-emerald-300 text-sm font-medium mb-1">Recorded Flights</div>
              <div className="flex gap-2 flex-wrap max-w-[280px]">
                {availableFlightIds.length === 0 && (
                  <div className="text-slate-400 text-xs">No recordings yet</div>
                )}
                {availableFlightIds.map(fid => (
                  <div key={fid} className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setActiveFlightId(fid)}
                      className={`px-2 py-1 text-xs rounded border transition-all ${activeFlightId === fid ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50' : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/20'}`}
                      title={fid}
                    >
                      {fid}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteRecordedFlight(fid);
                          // If the deleted one is active, reset selection
                          let nextActive = activeFlightId;
                          if (activeFlightId === fid) {
                            nextActive = '';
                          }
                          const res = await listRecordedFlightIds();
                          setAvailableFlightIds(res.flightIds || []);
                          setActiveFlightId(nextActive || (res.flightIds?.[0] || ''));
                          if (activeFlightId === fid) {
                            setPositions([]);
                            setPlayIndex(0);
                          }
                        } catch (e) {
                          console.error('Failed to delete recorded flight', e);
                        }
                      }}
                      className="p-1 text-red-300 hover:text-red-200 border border-red-400/30 rounded"
                      aria-label={`Delete ${fid}`}
                      title={`Delete ${fid}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Path Track Toggle and Delete */}
            <div className="flex flex-col gap-2 items-end">
              {/* Smaller Path Track button */}
              <div className="inline-flex p-0.5 bg-slate-900/90 backdrop-blur-md border border-amber-400/40 rounded-md shadow-lg">
                <button
                  onClick={() => { setShowPastTrack(!showPastTrack); if (!showPastTrack) { setPlayIndex(0); } }}
                  className={`px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20 transition-all rounded ${showPastTrack ? 'bg-amber-500/20' : ''}`}
                  aria-label="Path Track"
                >
                  Path Track
                </button>
              </div>

              {/* Per-flight delete moved inline next to each recorded flight */}
            </div>
            
          </div>

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

export default memo(PathTrackPage);