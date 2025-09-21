import React from 'react';
import { X, Plane, MapPin, Clock, Gauge, Compass, AlertTriangle, Navigation, Route, Target } from 'lucide-react';
import { Flight } from '../types/flight';
import { getStatusBgColor, formatAltitude, formatSpeed, formatHeading } from '../shared/constants';

/**
 * Props for the FlightDetails component
 */
interface FlightDetailsProps {
  flight: Flight | null;
  onClose: () => void;
}

/**
 * Get appropriate icon for flight status
 * @param status - Flight status
 * @returns JSX element with appropriate icon
 */
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'emergency':
    case 'lost-comm':
      return <AlertTriangle size={16} />;
    default:
      return <Plane size={16} />;
  }
};

/**
 * FlightDetails component
 * Displays detailed information about a selected flight in a modal
 * 
 * Features:
 * - Comprehensive flight information display
 * - Route visualization with origin/destination
 * - Real-time flight metrics (altitude, speed, heading)
 * - Position coordinates
 * - Status-based styling
 * - Responsive modal design
 */
export const FlightDetails: React.FC<FlightDetailsProps> = ({ flight, onClose }) => {
  if (!flight) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[4000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{flight.flightNumber}</h2>
              <p className="text-gray-600">{flight.aircraft}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="px-6 pt-4">
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full ${getStatusBgColor(flight.status)}`}>
            {getStatusIcon(flight.status)}
            <span className="font-medium capitalize">{flight.status.replace('-', ' ')}</span>
          </div>
        </div>

        {/* Route Information */}
        <div className="p-6">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Route size={20} className="mr-2 text-blue-600" />
              Flight Route
            </h3>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="bg-white rounded-lg p-3 shadow-sm border">
                  <div className="text-lg font-bold text-gray-900">{flight.origin}</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center mt-1">
                    <MapPin size={14} className="mr-1" />
                    Origin
                  </div>
                </div>
              </div>
              <div className="flex-1 mx-6">
                <div className="h-1 bg-gradient-to-r from-blue-400 to-green-400 rounded-full relative">
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-white rounded-full p-1 shadow-md border-2 border-blue-500">
                      <Plane size={16} className="text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className="text-xs text-gray-500">En Route</div>
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-green-200">
                  <div className="text-lg font-bold text-green-700 flex items-center justify-center">
                    <Target size={16} className="mr-1" />
                    {flight.destination}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center justify-center mt-1">
                    <Navigation size={14} className="mr-1" />
                    Destination
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Destination Details */}
          <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center">
              <Target size={18} className="mr-2" />
              Heading to Destination
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="text-sm text-gray-600 mb-1">Destination Airport</div>
                <div className="text-lg font-semibold text-green-700">{flight.destination}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="text-sm text-gray-600 mb-1">Current Heading</div>
                <div className="text-lg font-semibold text-green-700 flex items-center">
                  <Compass size={16} className="mr-1" />
                  {flight.heading}°
                </div>
              </div>
            </div>
          </div>

          {/* Flight Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="text-blue-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatAltitude(flight.altitude)}</div>
              <div className="text-sm text-gray-600">Altitude</div>
            </div>
            
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="text-green-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatSpeed(flight.speed)}</div>
              <div className="text-sm text-gray-600">Speed</div>
            </div>
            
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Compass className="text-purple-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatHeading(flight.heading)}</div>
              <div className="text-sm text-gray-600">Heading</div>
            </div>
            
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="text-orange-600" size={20} />
              </div>
              <div className="text-sm font-bold text-gray-900">
                {flight.lastUpdate.toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-600">Last Update</div>
            </div>
          </div>

          {/* Position Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Current Position</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Latitude:</span>
                <p className="text-gray-900 font-mono">{flight.latitude.toFixed(6)}°</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Longitude:</span>
                <p className="text-gray-900 font-mono">{flight.longitude.toFixed(6)}°</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Flight ID: {flight.id}</span>
            <span>Updated {flight.lastUpdate.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};