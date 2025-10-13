import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

interface DrawControlProps {
  onRectangleDrawn?: (bounds: L.LatLngBounds) => void;
  autoZoom?: boolean;
}

const DrawControl: React.FC<DrawControlProps> = ({ onRectangleDrawn, autoZoom = true }) => {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnLayersRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const rectangleHandlerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Create feature group for drawn items
    map.addLayer(drawnLayersRef.current);

    // Initialize the draw control with all drawing tools disabled except rectangle
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: false,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2,
            dashArray: '5, 5'
          },
          repeatMode: false
        }
      },
      edit: {
        featureGroup: drawnLayersRef.current,
        remove: true
      }
    });

    drawControlRef.current = drawControl;
    map.addControl(drawControlRef.current);

    // Hide default control UI since we're using custom buttons
    const drawControlElement = drawControlRef.current.getContainer();
    if (drawControlElement) {
      drawControlElement.style.display = 'none';
    }

    // Make map instance and drawing functions available globally
    (window as any).mapInstance = map;
    (window as any).mapInstance.drawnLayers = drawnLayersRef.current;

    // Function to enable rectangle drawing
    (window as any).mapInstance.enableRectangleDrawing = () => {
      // Disable any existing drawing mode
      if (rectangleHandlerRef.current) {
        rectangleHandlerRef.current.disable();
      }

      // Create new rectangle handler using the proper Leaflet Draw API
      // Cast map to any to avoid type issues with Leaflet Draw
      rectangleHandlerRef.current = new (L.Draw as any).Rectangle(map as any, {
        shapeOptions: {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.8,
          fillOpacity: 0.2,
          dashArray: '5, 5'
        },
        showArea: false,
        metric: true
      });

      // Enable the drawing mode
      rectangleHandlerRef.current.enable();
      console.log('Rectangle drawing enabled');
    };

    // Function to disable rectangle drawing
    (window as any).mapInstance.disableRectangleDrawing = () => {
      if (rectangleHandlerRef.current) {
        rectangleHandlerRef.current.disable();
        rectangleHandlerRef.current = null;
        console.log('Rectangle drawing disabled');
      }
    };

    // Event handler for when a shape is created
    const handleDrawCreated = (e: any) => {
      const layer = e.layer;
      drawnLayersRef.current.addLayer(layer);

      // Get bounds for rectangles
      const bounds = layer.getBounds();

      // Auto zoom to drawn area if enabled
      if (autoZoom) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Call the callback if provided
      onRectangleDrawn?.(bounds);
    };

    // Event handler for when shapes are deleted
    const handleDrawDeleted = () => {
      // Reset view if all layers are deleted
      if (drawnLayersRef.current.getLayers().length === 0) {
        map.setView([20.5937, 78.9629], 5);
      }
    };

    // Attach event listeners
    map.on((L.Draw as any).Event.CREATED, handleDrawCreated);
    map.on((L.Draw as any).Event.DELETED, handleDrawDeleted);

    // Cleanup function
    return () => {
      // Disable drawing if active
      if (rectangleHandlerRef.current) {
        rectangleHandlerRef.current.disable();
      }

      // Remove event listeners
      map.off((L.Draw as any).Event.CREATED, handleDrawCreated);
      map.off((L.Draw as any).Event.DELETED, handleDrawDeleted);

      // Remove control and layers
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      map.removeLayer(drawnLayersRef.current);
    };
  }, [map, onRectangleDrawn, autoZoom]);

  return null;
};

export default DrawControl;