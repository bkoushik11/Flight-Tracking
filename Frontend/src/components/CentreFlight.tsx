import React, { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Flight } from '../types/flight';

interface CentreFlightProps {
  selectedFlight: Flight | null;
  isActive: boolean;
  showLeftPanel?: boolean;
  onBackToMap?: () => void;
}

/**
 * CentreFlight component that centers the map on the selected flight
 * and orients the flight to face north (like Google Maps)
 * 
 * Usage:
 * - This component is automatically integrated into FlightMap
 * - When a flight is clicked on the homepage, this component will:
 *   1. Center the map on the selected flight's position
 *   2. Set an appropriate zoom level (12) for good visibility
 *   3. Ensure the map is oriented with north up (standard Leaflet behavior)
 *   4. Animate the transition smoothly
 *   5. Handle split view properly by triggering map resize
 *   6. Re-center when left panel opens/closes
 * 
 * Back to Map Functionality:
 * - When "Back to Map" is clicked in the left panel, the map resets to:
 *   - Initial India view (coordinates: [20.5937, 78.9629])
 *   - Zoom level 5 (same as initial page load)
 *   - Smooth animated transition
 * 
 * The component only activates when a flight is selected and becomes inactive
 * when no flight is selected, preventing unnecessary re-centering.
 */
const CentreFlight: React.FC<CentreFlightProps> = ({ selectedFlight, isActive, showLeftPanel, onBackToMap }) => {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  const lastFlightIdRef = useRef<string | null>(null);
  const lastPanelStateRef = useRef<boolean | undefined>(undefined);
  const lastCenteredPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Only center if component is active and we have a selected flight
    if (!isActive || !selectedFlight) {
      hasCenteredRef.current = false;
      lastCenteredPosRef.current = null;
      return;
    }

    // Detect new selection or panel change
    const isNewFlight = lastFlightIdRef.current !== selectedFlight.id;
    const panelStateChanged = lastPanelStateRef.current !== showLeftPanel;
    if (isNewFlight || panelStateChanged) {
      lastFlightIdRef.current = selectedFlight.id;
      lastPanelStateRef.current = showLeftPanel;
      hasCenteredRef.current = false;
      lastCenteredPosRef.current = null;
    }

    // Follow the flight: keep it centered as it moves
    const { latitude, longitude } = selectedFlight;
    if (!Number.isFinite(latitude as number) || !Number.isFinite(longitude as number)) {
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const prior = lastCenteredPosRef.current;
    const movedEnough = !prior || Math.abs(prior.lat - lat) > 0.005 || Math.abs(prior.lng - lng) > 0.005;

    try {
      if (!hasCenteredRef.current) {
        // First time centering for this selection: set a good zoom
        map.setView([lat, lng], 12, { animate: true, duration: 0.8 });
        hasCenteredRef.current = true;
        lastCenteredPosRef.current = { lat, lng };
        setTimeout(() => map.invalidateSize(), 100);
      } else if (movedEnough) {
        // Subsequent updates: keep current zoom while recentering
        const currentZoom = map.getZoom();
        map.setView([lat, lng], currentZoom, { animate: true, duration: 0.6 });
        lastCenteredPosRef.current = { lat, lng };
      }
    } catch (error) {
      console.error('Error maintaining flight centering:', error);
    }
  }, [selectedFlight, isActive, showLeftPanel, map]);

  // Reset centering state when component becomes inactive
  useEffect(() => {
    if (!isActive) {
      hasCenteredRef.current = false;
      lastFlightIdRef.current = null;
      lastPanelStateRef.current = undefined;
      lastCenteredPosRef.current = null;
    }
  }, [isActive]);

  // Handle back to map functionality - reset to initial view when no selection
  useEffect(() => {
    if (!isActive && !selectedFlight) {
      // Reset to initial India view (zoom level 5) when going back to map
      try {
        map.setView([20.5937, 78.9629], 5, { 
          animate: true, 
          duration: 1.0 
        });
        
        // Trigger map resize to handle container size change back to full width
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        
        console.log('Reset map to initial view (zoom level 5)');
      } catch (error) {
        console.error('Error resetting map to initial view:', error);
      }
    }
  }, [isActive, selectedFlight, map]);

  // Handle panel state changes - ensure map resizes properly
  useEffect(() => {
    if (showLeftPanel !== lastPanelStateRef.current) {
      // Panel state changed, trigger map resize with multiple attempts
      const resizeMap = () => {
        map.invalidateSize();
        // Try again after a short delay to ensure proper resizing
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      };
      
      setTimeout(resizeMap, 100);
    }
  }, [showLeftPanel, map]);

  return null; // This component doesn't render anything visible
};

export default CentreFlight;
