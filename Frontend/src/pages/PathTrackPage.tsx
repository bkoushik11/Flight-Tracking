import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FlightMap } from '../components/FlightMap';
import { MapLayerProvider } from '../components/Layers';
import { Flight } from '../types/flight';

import { Position as PastTrackPosition } from '../components/PastTrackLayer';
import { fetchPositions, listRecordedFlightIds, deleteRecordedFlight } from '../services/flightService';
import { Play, Pause, RotateCcw, ArrowLeft, Trash2, Gauge } from 'lucide-react';

interface PathTrackPageProps {
  flights: Flight[];
  onBack: () => void;
}

const PathTrackPage: React.FC<PathTrackPageProps> = ({ onBack }) => {
  const [showPastTrack, setShowPastTrack] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playIndex, setPlayIndex] = useState<number>(0);
  const [positions, setPositions] = useState<PastTrackPosition[]>([]);
  const [availableFlightIds, setAvailableFlightIds] = useState<string[]>([]);
  const [activeFlightId, setActiveFlightId] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // default 1x
  const animationFrameIdRef = useRef<number | null>(null);

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
      } catch (e) {}
      if (!cancelled) {
        setPositions([]);
        setPlayIndex(0);
      }
    };
    if (activeFlightId) load();
    return () => { cancelled = true; };
  }, [activeFlightId]);

  // Playback effect
  useEffect(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (!showPastTrack || !isPlaying || positions.length === 0) return;

    // Calculate the total time span of the flight data
    const firstTimestamp = new Date(positions[0].timestamp).getTime();
    const lastTimestamp = new Date(positions[positions.length - 1].timestamp).getTime();
    const totalFlightTimeMs = lastTimestamp - firstTimestamp;
    
    // Adjust the duration based on playback speed
    // Higher speed means shorter duration, lower speed means longer duration
    const adjustedDurationMs = totalFlightTimeMs / playbackSpeed;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / adjustedDurationMs);
      const nextIndex = Math.floor(progress * (positions.length - 1));
      setPlayIndex(nextIndex);

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [showPastTrack, isPlaying, positions, playbackSpeed]);

  const handleReplay = () => {
    setPlayIndex(0);
    setIsPlaying(true);
    setShowPastTrack(true);
  };

  const currentPlaybackPos = positions.length
    ? positions[Math.min(playIndex, positions.length - 1)]
    : null;

  return (
    <MapLayerProvider>
      <div className="h-screen w-full relative">
        <div className="h-full w-full relative">
          <FlightMap
            flights={[]}
            selectedFlight={null}
            pastTrack={{
              positions,
              isVisible: showPastTrack,
              flightId: activeFlightId || 'past-track',
              currentIndex: playIndex,
              isPlaying,
              stepDurationMs: 2000
            }}
            onFlightClick={() => {}}
            onMapClick={() => {}}
            onMouseMove={() => {}}
            onRectangleDrawn={undefined}
          />

          {/* Back button */}
          <div className="absolute top-4 left-4 z-[1000]">
            <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 rounded-lg text-slate-300 hover:bg-slate-700/90 transition-all shadow-lg">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Recorded Flights */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
            <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-400/40 rounded-lg shadow-lg p-2">
              <div className="text-emerald-300 text-sm font-medium mb-1">Recorded Flights</div>
              {availableFlightIds.length === 0 ? (
                <div className="text-slate-400 text-xs p-2">No recordings yet</div>
              ) : (
                <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(3 * 40px)' }}>
                  {availableFlightIds.map((fid, index) => (
                    <div key={fid} className={`flex items-center justify-between p-2 rounded transition-all ${activeFlightId === fid ? 'bg-emerald-500/20 border border-emerald-400/30' : 'hover:bg-slate-700/50'}`}>
                      <button onClick={() => setActiveFlightId(fid)} className="flex-1 text-left flex items-center gap-2">
                        <span className="text-emerald-300 font-mono text-xs">{index + 1}.</span>
                        <div>
                          <div className="text-emerald-200 text-sm font-medium">{fid}</div>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          await deleteRecordedFlight(fid);
                          const res = await listRecordedFlightIds();
                          setAvailableFlightIds(res.flightIds || []);
                          if (activeFlightId === fid) {
                            setActiveFlightId(res.flightIds?.[0] || '');
                            setPositions([]);
                            setPlayIndex(0);
                          }
                        }}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Playback controls bottom center */}
          {showPastTrack && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
              <div className="bg-slate-900/90 backdrop-blur-md border border-amber-400/40 rounded-xl px-4 py-2 shadow-lg flex flex-col items-center gap-2">
                {/* Controls row */}
                <div className="flex items-center gap-3">
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
                  
                  {/* Speed Control Slider */}
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-amber-200" />
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="1"
                      value={[0.25, 0.5, 1, 2, 4].indexOf(playbackSpeed) !== -1 ? [0.25, 0.5, 1, 2, 4].indexOf(playbackSpeed) : 2}
                      onChange={(e) => {
                        const speeds = [0.25, 0.5, 1, 2, 4];
                        setPlaybackSpeed(speeds[parseInt(e.target.value)]);
                      }}
                      className="w-28 accent-amber-400"
                    />
                    <span className="text-amber-200 text-xs w-10">{playbackSpeed}x</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-amber-200 text-xs font-mono min-w-[70px]">
                      {Math.min(playIndex + 1, positions.length)} / {positions.length}
                    </div>
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${positions.length ? ((Math.min(playIndex + 1, positions.length) / positions.length) * 100) : 0}%` }} />
                    </div>
                  </div>
                  {/* {showPastTrack && currentPlaybackPos && (
                    <div className="ml-2 text-amber-200 text-[11px] font-mono whitespace-nowrap">
                      Lat: {currentPlaybackPos.lat.toFixed(5)}
                      {" "}| Lng: {currentPlaybackPos.lng.toFixed(5)}
                      {" "}| Time: {new Date(currentPlaybackPos.timestamp).toLocaleTimeString()}
                    </div>
                  )} */}
                </div>

                {/* Time range row - Start and Last time */}
                {positions.length > 0 && (
                  <div className="flex items-center justify-between w-full px-2">
                    <div className="text-amber-200 text-[11px] font-mono">
                      Start time: {new Date(positions[0].timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-amber-200 text-[11px] font-mono">
                      Last time: {new Date(positions[positions.length - 1].timestamp).toLocaleTimeString()}
                    </div>
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
