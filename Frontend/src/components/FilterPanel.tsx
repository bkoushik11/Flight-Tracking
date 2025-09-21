import React, { useCallback } from 'react';
import { Sliders, Filter } from 'lucide-react';
import { FLIGHT_STATUSES, getStatusColor, formatFlightStatus } from '../shared/constants';

/**
 * Props for the FilterPanel component
 */
interface FilterPanelProps {
  filters: {
    minAltitude: number;
    maxAltitude: number;
    statuses: string[];
  };
  onFiltersChange: (filters: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Status options for filtering flights
 * Generated from shared constants for consistency
 */
const STATUS_OPTIONS = Object.values(FLIGHT_STATUSES).map(status => ({
  value: status,
  label: formatFlightStatus(status),
  color: getStatusColor(status)
}));

/**
 * Default filter values
 */
const DEFAULT_FILTERS = {
  minAltitude: 0,
  maxAltitude: 50000,
  statuses: []
};

/**
 * FilterPanel component
 * Provides filtering controls for flight data
 * 
 * Features:
 * - Altitude range filtering with sliders
 * - Flight status filtering with checkboxes
 * - Real-time filter application
 * - Reset functionality
 * - Collapsible panel design
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  isOpen,
  onToggle
}) => {
  const handleStatusToggle = useCallback((status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    
    onFiltersChange({ ...filters, statuses: newStatuses });
  }, [filters, onFiltersChange]);

  const handleAltitudeChange = useCallback((field: 'minAltitude' | 'maxAltitude', value: number) => {
    onFiltersChange({ ...filters, [field]: value });
  }, [filters, onFiltersChange]);

  const resetFilters = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
      >
        <Filter size={18} />
        <span className="text-sm">Filters</span>
      </button>

      {isOpen && (
        <div className="absolute top-10 left-0 bg-white rounded-lg shadow-xl border p-4 w-72 z-[4000]">
          <div className="flex items-center space-x-2 mb-3">
            <Sliders size={18} />
            <h3 className="font-bold text-base">Flight Filters</h3>
          </div>

          {/* Altitude Filter */}
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-sm">Altitude Range (feet)</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Minimum</label>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="1000"
                  value={filters.minAltitude}
                  onChange={(e) => handleAltitudeChange('minAltitude', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{filters.minAltitude.toLocaleString()} ft</span>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Maximum</label>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="1000"
                  value={filters.maxAltitude}
                  onChange={(e) => handleAltitudeChange('maxAltitude', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{filters.maxAltitude.toLocaleString()} ft</span>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="font-medium mb-2 text-sm">Flight Status</h4>
            <div className="space-y-1">
              {STATUS_OPTIONS.map(status => (
                <label
                  key={status.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status.value)}
                    onChange={() => handleStatusToggle(status.value)}
                    className="rounded"
                  />
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span>{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};