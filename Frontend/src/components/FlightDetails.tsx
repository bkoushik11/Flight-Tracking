import React from 'react';
import { X, Plane, MapPin, Clock, Gauge, Compass, AlertTriangle } from 'lucide-react';
import { Flight } from '../types/flight';

interface FlightDetailsProps {
  flight: Flight | null;
  onClose: () => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'on-time': return 'text-green-600 bg-green-100';
    case 'delayed': return 'text-yellow-600 bg-yellow-100';
    case 'landed': return 'text-gray-600 bg-gray-100';
    case 'lost-comm': return 'text-red-600 bg-red-100';
    case 'diverted': return 'text-purple-600 bg-purple-100';
    case 'emergency': return 'text-red-700 bg-red-200';
    default: return 'text-blue-600 bg-blue-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'emergency':
    case 'lost-comm':
      return <AlertTriangle size={16} />;
    default:
      return <Plane size={16} />;
  }
};

export const FlightDetails: React.FC<FlightDetailsProps> = ({ flight, onClose }) => {
  if (!flight) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full ${getStatusColor(flight.status)}`}>
            {getStatusIcon(flight.status)}
            <span className="font-medium capitalize">{flight.status.replace('-', ' ')}</span>
          </div>
        </div>

        {/* Route Information */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <MapPin size={20} className="mr-2" />
              Route
            </h3>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{flight.origin}</div>
                <div className="text-sm text-gray-600">Origin</div>
              </div>
              <div className="flex-1 mx-4">
                <div className="h-0.5 bg-gray-300 relative">
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Plane size={16} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{flight.destination}</div>
                <div className="text-sm text-gray-600">Destination</div>
              </div>
            </div>
          </div>

          {/* Flight Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="text-blue-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{flight.altitude.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Altitude (ft)</div>
            </div>
            
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="text-green-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{flight.speed}</div>
              <div className="text-sm text-gray-600">Speed (kts)</div>
            </div>
            
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Compass className="text-purple-600" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{flight.heading}°</div>
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