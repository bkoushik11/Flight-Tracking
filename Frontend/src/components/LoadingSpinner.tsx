import React from 'react';
import { Plane } from 'lucide-react';

/**
 * LoadingSpinner component
 * Displays a loading animation while the application is initializing
 * 
 * Features:
 * - Animated airplane icon
 * - Spinning loading ring
 * - Informative loading message
 * - Full-screen overlay design
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="h-screen flex items-center justify-center" 
         style={{ backgroundColor: '#0A0E1A' }}>
      <div className="text-center">
        <div className="relative">
          <Plane 
            size={48} 
            className="midnight-text-accent animate-pulse mx-auto mb-4" 
          />
          <div className="absolute inset-0 animate-spin">
            <div className="w-16 h-16 border-4 rounded-full mx-auto"
                 style={{
                   borderColor: 'rgba(0, 217, 255, 0.2)',
                   borderTopColor: '#00D9FF'
                 }}></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold midnight-text-primary mb-2">Loading Flight Data</h2>
        <p className="midnight-text-secondary">Connecting to flight tracking system...</p>
      </div>
    </div>
  );
};