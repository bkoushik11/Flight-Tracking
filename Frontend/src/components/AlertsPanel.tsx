import React, { useCallback } from 'react';
import { AlertTriangle, X, Bell } from 'lucide-react';
import { Alert } from '../types/flight';
import { getSeverityColor, getSeverityBgColor } from '../shared/constants';

/**
 * Props for the AlertsPanel component
 */
interface AlertsPanelProps {
  alerts: Alert[];
  onDismissAlert: (alertId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Memoized alert item component
 * Renders individual alert items with dismiss functionality
 * Optimized to prevent unnecessary re-renders
 */
const AlertItem = React.memo<{
  alert: Alert;
  onDismiss: (alertId: string) => void;
}>(({ alert, onDismiss }) => {
  const handleDismiss = useCallback(() => {
    onDismiss(alert.id);
  }, [alert.id, onDismiss]);

  return (
    <div className={`p-2 m-1 rounded-lg border ${getSeverityBgColor(alert.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`} />
            <span className="font-medium text-xs uppercase text-gray-600">
              {alert.type.replace('-', ' ')}
            </span>
          </div>
          <p className="text-sm mb-1">{alert.message}</p>
          <p className="text-xs text-gray-500">
            {alert.timestamp.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 ml-2 p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
});

AlertItem.displayName = 'AlertItem';

/**
 * AlertsPanel component
 * Displays a collapsible panel showing active flight alerts
 * 
 * Features:
 * - Real-time alert display with severity-based styling
 * - Alert dismissal functionality
 * - Alert count badge
 * - Responsive design with scrollable content
 */
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
        className="flex items-center space-x-2 bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors relative"
      >
        <Bell size={18} />
        <span className="text-sm">Alerts</span>
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 bg-white rounded-lg shadow-xl border w-80 z-[4000] max-h-80 overflow-y-auto">
          <div className="p-3 border-b">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={18} className="text-orange-500" />
              <h3 className="font-bold text-base">Active Alerts</h3>
            </div>
          </div>

          <div className="p-1">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              alerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onDismiss={onDismissAlert}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};