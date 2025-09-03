import React from 'react';
import { AlertTriangle, X, Bell } from 'lucide-react';
import { Alert } from '../types/flight';

interface AlertsPanelProps {
  alerts: Alert[];
  onDismissAlert: (alertId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
};

const getSeverityBgColor = (severity: string): string => {
  switch (severity) {
    case 'high': return 'bg-red-50 border-red-200';
    case 'medium': return 'bg-yellow-50 border-yellow-200';
    case 'low': return 'bg-blue-50 border-blue-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onDismissAlert,
  isOpen,
  onToggle
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors relative"
      >
        <Bell size={20} />
        <span>Alerts</span>
        {alerts.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 bg-white rounded-lg shadow-xl border w-96 z-[4000] max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-orange-500" />
              <h3 className="font-bold text-lg">Active Alerts</h3>
            </div>
          </div>

          <div className="p-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell size={48} className="mx-auto mb-2 text-gray-300" />
                <p>No active alerts</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 m-2 rounded-lg border ${getSeverityBgColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`}
                        />
                        <span className="font-medium text-sm uppercase text-gray-600">
                          {alert.type.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};