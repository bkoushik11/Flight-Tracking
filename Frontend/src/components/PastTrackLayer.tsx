import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Flag } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface Position {
  lat: number;
  lng: number;
  heading: number;
  altitude: number;
  speed: number;
  timestamp: string;
}

interface PastTrackLayerProps {
  positions: Position[];
  isVisible: boolean;
  flightId: string;
  showStartPlane?: boolean;
  currentIndex?: number; // moving plane index along the path
  isPlaying?: boolean; // whether playback is active
  stepDurationMs?: number; // duration between indices for interpolation
}

const createStartPlaneIcon = (heading: number) => {
  return L.divIcon({
    className: 'past-track-start-plane',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${heading+180}deg);
        background: rgba(16,185,129,0.08);
        border-radius: 9999px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      ">
        <div style="
          font-size: 22px;
          color: #10b981;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          transform: rotate(90deg);
        ">✈</div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Compute bearing (degrees) from point A to point B using great-circle formula
const computeBearing = (from: Position, to: Position): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lng - from.lng);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon) - Math.sin(lat1) * Math.sin(lat2);
  const brng = Math.atan2(y, x);
  const deg = (toDeg(brng) + 360) % 360;
  return deg;
};

// Get best heading for a given index, prefer provided heading, fallback to computed bearing
const getHeadingForIndex = (positions: Position[], idx: number): number => {
  const current = positions[idx];
  if (!current) return 0;
  if (typeof current.heading === 'number' && !Number.isNaN(current.heading)) {
    return current.heading;
  }
  // Prefer bearing from previous to current; if not available, current to next
  if (idx > 0) {
    return computeBearing(positions[idx - 1], current);
  }
  if (idx < positions.length - 1) {
    return computeBearing(current, positions[idx + 1]);
  }
  return 0;
};

export const PastTrackLayer: React.FC<PastTrackLayerProps> = ({ 
  positions, 
  isVisible, 
  flightId,
  showStartPlane = true,
  currentIndex,
  isPlaying = false,
  stepDurationMs = 600
}) => {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const movingPlaneRef = useRef<L.Marker | null>(null);
  const animRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);
  const fromIdxRef = useRef<number>(0);
  const toIdxRef = useRef<number>(0);
  
  // FIXED: Add refs to track animation state
  const currentIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isVisible || positions.length === 0) {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
      markersRef.current.forEach(marker => map.removeLayer(marker));
      markersRef.current = [];
      return;
    }

    const latLngs = positions.map(pos => [pos.lat, pos.lng] as [number, number]);
    const polyline = L.polyline(latLngs, {
      color: '#ff6b35',
      weight: 3,
      opacity: 0.9,
      smoothFactor: 1,
      className: 'past-track-line'
    });
    polyline.addTo(map);
    polylineRef.current = polyline;

    const markers: L.Marker[] = [];

    // No static start marker; moving plane marker is handled separately

    // End marker
    if (positions.length > 1) {
      const end = positions[positions.length - 1];
      const flagSvg = renderToStaticMarkup(
        <Flag size={16} color="#ef4444" strokeWidth={2.5} />
      );
      const endIcon = L.divIcon({
        className: 'past-track-end',
        html: `
          <div style="
            width: 22px; height: 22px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.35); border-radius: 9999px;
            display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          ">${flagSvg}</div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      const endMarker = L.marker([end.lat, end.lng], { icon: endIcon })
        .bindPopup(`
          <div class="text-sm">
            <div class="font-bold text-red-600">End</div>
            <div>Time: ${new Date(end.timestamp).toLocaleTimeString()}</div>
            <div>Speed: ${end.speed.toFixed(0)} kts</div>
            <div>Altitude: ${end.altitude.toFixed(0)} ft</div>
          </div>
        `);
      endMarker.addTo(map);
      markers.push(endMarker);
    }

    // Removed orange intermediate markers

    // Fit bounds
    if (latLngs.length > 1) {
      const group = L.featureGroup([polyline, ...markers]);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    markersRef.current = markers;

    return () => {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
      if (movingPlaneRef.current) {
        map.removeLayer(movingPlaneRef.current);
        movingPlaneRef.current = null;
      }
    };
  }, [map, positions, isVisible, flightId, showStartPlane]);

  // Smoothly interpolate the moving plane between indices
  useEffect(() => {
    if (!isVisible || positions.length === 0) return;

    // FIXED: Update refs and check validity
    currentIndexRef.current = typeof currentIndex === 'number' ? currentIndex : 0;
    isPlayingRef.current = isPlaying;

    const clampIndex = (i: number) => Math.max(0, Math.min(i, positions.length - 1));
    const idx = clampIndex(currentIndexRef.current);
    const nextIdx = clampIndex(idx + 1);

    // Cancel any running animation on change
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    animStartTimeRef.current = null;
    fromIdxRef.current = idx;
    toIdxRef.current = nextIdx;

    const placeAtIndex = (placeIdx: number) => {
      const p = positions[placeIdx];
      if (!p) return;
      const heading = getHeadingForIndex(positions, placeIdx);
      const icon = createStartPlaneIcon(heading);
      if (!movingPlaneRef.current) {
        movingPlaneRef.current = L.marker([p.lat, p.lng], { icon }).addTo(map);
      } else {
        movingPlaneRef.current.setLatLng([p.lat, p.lng]);
        movingPlaneRef.current.setIcon(icon);
      }
    };

    // If not playing or at the last point, snap to the current index
    if (!isPlaying || idx === nextIdx) {
      placeAtIndex(idx);
      return;
    }

    const from = positions[idx];
    const to = positions[nextIdx];
    if (!from || !to) {
      placeAtIndex(idx);
      return;
    }

    const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const headingFrom = getHeadingForIndex(positions, idx);
    const headingTo = getHeadingForIndex(positions, nextIdx);
    let delta = normalizeAngle(headingTo) - normalizeAngle(headingFrom);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const animate = (ts: number) => {
      // FIXED: Check if animation is still valid
      if (currentIndexRef.current !== idx || !isPlayingRef.current) {
        placeAtIndex(currentIndexRef.current);
        return; // Stop invalid animation
      }
      
      if (animStartTimeRef.current === null) animStartTimeRef.current = ts;
      const elapsed = ts - (animStartTimeRef.current || 0);
      const duration = Math.max(100, stepDurationMs);
      const tRaw = Math.min(1, elapsed / duration);
      // easeInOutQuad
      const t = tRaw < 0.5 ? 2 * tRaw * tRaw : -1 + (4 - 2 * tRaw) * tRaw;

      const lat = lerp(from.lat, to.lat, t);
      const lng = lerp(from.lng, to.lng, t);
      const heading = normalizeAngle(headingFrom + delta * t);
      const icon = createStartPlaneIcon(heading);

      if (!movingPlaneRef.current) {
        movingPlaneRef.current = L.marker([lat, lng], { icon }).addTo(map);
      } else {
        movingPlaneRef.current.setLatLng([lat, lng]);
        movingPlaneRef.current.setIcon(icon);
      }

      // FIXED: Only continue if still valid
      if (tRaw < 1 && currentIndexRef.current === idx && isPlayingRef.current) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to end to avoid drift
        placeAtIndex(nextIdx);
        animRef.current = null;
        animStartTimeRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      animStartTimeRef.current = null;
    };
  }, [map, isVisible, positions, currentIndex, isPlaying, stepDurationMs]);

  return null;
};

export default PastTrackLayer;


