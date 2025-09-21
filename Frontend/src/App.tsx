import { useState, useCallback, useMemo } from 'react';
import { FlightMap } from './components/FlightMap';
import { FilterPanel } from './components/FilterPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { StatusBar } from './components/StatusBar';
import { FlightDetails } from './components/FlightDetails';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useFlights } from './hooks/useFlights';
import { Flight, Alert } from './types/flight';
import { MapPin } from 'lucide-react';

// Constants for better maintainability
const DEFAULT_FILTERS = {
  minAltitude: 0,
  maxAltitude: 50000,
  statuses: [] as string[]
};

function App() {
  const {
    flights,
    alerts,
    restrictedZones,
    loading,
    error,
    lastUpdate,
    refreshData,
    dismissAlert,
    fetchFlights
  } = useFlights();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);

  // Memoized filtered flights for better performance
  const filteredFlights = useMemo(() => {
    return flights.filter(flight => {
      const altitudeInRange = flight.altitude >= filters.minAltitude && flight.altitude <= filters.maxAltitude;
      const statusMatches = filters.statuses.length === 0 || filters.statuses.includes(flight.status);
      return altitudeInRange && statusMatches;
    });
  }, [flights, filters]);

  // Memoized combined alerts
  const allAlerts = useMemo(() => [...alerts, ...localAlerts], [alerts, localAlerts]);

  const handleAlertGenerated = useCallback((alert: Alert) => {
    setLocalAlerts(prev => {
      // Avoid duplicate alerts
      if (prev.some(a => a.flightId === alert.flightId && a.type === alert.type)) {
        return prev;
      }
      return [...prev, alert];
    });
  }, []);

  const handleDismissAlert = useCallback(async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      setLocalAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  }, [dismissAlert]);

  const handleFiltersChange = useCallback((newFilters: typeof DEFAULT_FILTERS) => {
    setFilters(newFilters);
    fetchFlights(newFilters);
  }, [fetchFlights]);

  const handleRefresh = useCallback(() => {
    refreshData(filters);
  }, [refreshData, filters]);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const toggleAlerts = useCallback(() => {
    setShowAlerts(prev => !prev);
  }, []);

  const closeFlightDetails = useCallback(() => {
    setSelectedFlight(null);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Simplified Header */}
        <header className="bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Live Flight Tracker</h1>
                <p className="text-sm text-gray-600">Real-time aircraft monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isOpen={showFilters}
                onToggle={toggleFilters}
              />
              <AlertsPanel
                alerts={allAlerts}
                onDismissAlert={handleDismissAlert}
                isOpen={showAlerts}
                onToggle={toggleAlerts}
              />
            </div>
          </div>
        </header>

        {/* Main Map Area */}
        <main className="flex-1">
          <FlightMap
            flights={filteredFlights}
            restrictedZones={restrictedZones}
            onAlertGenerated={handleAlertGenerated}
            onFlightClick={setSelectedFlight}
          />
        </main>

        {/* Status Bar */}
        <StatusBar
          isConnected={!error}
          totalFlights={flights.length}
          filteredFlights={filteredFlights.length}
          lastUpdate={lastUpdate}
          error={error}
          onRefresh={handleRefresh}
        />

        {/* Flight Details Modal */}
        <FlightDetails
          flight={selectedFlight}
          onClose={closeFlightDetails}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;