import React from 'react';
import { Sliders, Filter } from 'lucide-react';

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

const statusOptions = [
  { value: 'on-time', label: 'On Time', color: '#10b981' },
  { value: 'delayed', label: 'Delayed', color: '#f59e0b' },
  { value: 'landed', label: 'Landed', color: '#3b82f6' },
  { value: 'lost-comm', label: 'Lost Communication', color: '#ef4444' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  isOpen,
  onToggle
}) => {
  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
      >
        <Filter size={20} />
        <span>Filters</span>
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 bg-white rounded-lg shadow-xl border p-6 w-80 z-[4000]">
          <div className="flex items-center space-x-2 mb-4">
            <Sliders size={20} />
            <h3 className="font-bold text-lg">Flight Filters</h3>
          </div>

          {/* Altitude Filter */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Altitude Range (feet)</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="1000"
                  value={filters.minAltitude}
                  onChange={(e) => onFiltersChange({ ...filters, minAltitude: parseInt(e.target.value) })}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">{filters.minAltitude.toLocaleString()} ft</span>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="1000"
                  value={filters.maxAltitude}
                  onChange={(e) => onFiltersChange({ ...filters, maxAltitude: parseInt(e.target.value) })}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">{filters.maxAltitude.toLocaleString()} ft</span>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="font-medium mb-3">Flight Status</h4>
            <div className="space-y-2">
              {statusOptions.map(status => (
                <label
                  key={status.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status.value)}
                    onChange={() => handleStatusToggle(status.value)}
                    className="rounded"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => onFiltersChange({
                minAltitude: 0,
                maxAltitude: 50000,
                statuses: []
              })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};