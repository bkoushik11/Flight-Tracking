import { useState, useCallback } from 'react';
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

// Zones now come from the hook's service

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

  const [filters, setFilters] = useState({
    minAltitude: 0,
    maxAltitude: 50000,
    statuses: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);

  // Combine server alerts with local alerts
  const allAlerts = [...alerts, ...localAlerts];

  // Filter flights based on current filters
  const filteredFlights = flights.filter(flight => {
    const altitudeInRange = flight.altitude >= filters.minAltitude && flight.altitude <= filters.maxAltitude;
    const statusMatches = filters.statuses.length === 0 || filters.statuses.includes(flight.status);
    return altitudeInRange && statusMatches;
  });

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
    // Try to dismiss from server first
    await dismissAlert(alertId);
    // Also remove from local alerts
    setLocalAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, [dismissAlert]);

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    fetchFlights(newFilters);
  }, [fetchFlights]);

  const handleRefresh = useCallback(() => {
    refreshData(filters);
  }, [refreshData, filters]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4 z-[3000] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="text-blue-600" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Live Flight Tracker</h1>
                <p className="text-sm text-gray-600">Real-time aircraft monitoring system</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isOpen={showFilters}
                onToggle={() => setShowFilters(!showFilters)}
              />
              <AlertsPanel
                alerts={allAlerts}
                onDismissAlert={handleDismissAlert}
                isOpen={showAlerts}
                onToggle={() => setShowAlerts(!showAlerts)}
              />
            </div>
          </div>
        </header>

        {/* Main Map Area */}
        <main className="flex-1 relative">
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
          onClose={() => setSelectedFlight(null)}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;