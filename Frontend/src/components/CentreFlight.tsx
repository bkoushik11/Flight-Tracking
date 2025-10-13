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

  useEffect(() => {
    // Only center if component is active and we have a selected flight
    if (!isActive || !selectedFlight) {
      hasCenteredRef.current = false;
      return;
    }

    // Check if this is a new flight selection or panel state changed
    const isNewFlight = lastFlightIdRef.current !== selectedFlight.id;
    const panelStateChanged = lastPanelStateRef.current !== showLeftPanel;
    
    if (isNewFlight || panelStateChanged) {
      lastFlightIdRef.current = selectedFlight.id;
      lastPanelStateRef.current = showLeftPanel;
      hasCenteredRef.current = false;
    }

    // Center the flight if we haven't done so for this flight yet
    if (!hasCenteredRef.current && selectedFlight.latitude && selectedFlight.longitude) {
      try {
        const flightPosition: [number, number] = [selectedFlight.latitude, selectedFlight.longitude];
        
        // Center the map on the flight with a good zoom level
        // Standard Leaflet maps are always oriented with north up
        map.setView(flightPosition, 12, { 
          animate: true, 
          duration: 1.0 
        });
        
        // Trigger map resize to handle split view properly
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        
        // Mark as centered for this flight
        hasCenteredRef.current = true;
        
        console.log(`Centered map on flight ${selectedFlight.flightNumber} at position:`, flightPosition);
        console.log(`Flight heading: ${selectedFlight.heading}°, Map oriented to north`);
      } catch (error) {
        console.error('Error centering flight on map:', error);
      }
    }
  }, [selectedFlight, isActive, showLeftPanel, map]);

  // Reset centering state when component becomes inactive
  useEffect(() => {
    if (!isActive) {
      hasCenteredRef.current = false;
      lastFlightIdRef.current = null;
      lastPanelStateRef.current = undefined;
    }
  }, [isActive]);

  // Handle back to map functionality - reset to initial view
  useEffect(() => {
    if (onBackToMap && !isActive && !selectedFlight) {
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
  }, [isActive, selectedFlight, onBackToMap, map]);

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
