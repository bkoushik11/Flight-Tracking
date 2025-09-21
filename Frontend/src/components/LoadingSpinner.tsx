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
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative">
          <Plane 
            size={48} 
            className="text-blue-600 animate-pulse mx-auto mb-4" 
          />
          <div className="absolute inset-0 animate-spin">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Flight Data</h2>
        <p className="text-gray-500">Connecting to flight tracking system...</p>
      </div>
    </div>
  );
};