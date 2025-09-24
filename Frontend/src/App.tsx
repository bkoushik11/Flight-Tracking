import React, { useState, useCallback, useMemo } from 'react';
import { FlightMap } from './components/FlightMap';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FlightDetailsPage } from './pages/FlightDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { useFlights } from './hooks/useFlights';
import { Flight } from './types/flight';
import { MapPin, LogIn, UserPlus } from 'lucide-react';

function App() {
  const {
    flights,
    loading,
  } = useFlights();

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [currentView, setCurrentView] = useState<'map' | 'flightDetails' | 'login' | 'signup'>('map');
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  // Show all flights without filtering
  const displayFlights = useMemo(() => {
    return flights;
  }, [flights]);

  const handleFlightClick = useCallback((flight: Flight) => {
    setSelectedFlight(flight);
    setCurrentView('flightDetails');
    console.log('Flight clicked:', flight.flightNumber);
  }, []);

  const handleBackToMap = useCallback(() => {
    setSelectedFlight(null);
    setCurrentView('map');
  }, []);

  const handleLogin = useCallback(() => {
    setCurrentView('login');
  }, []);

  const handleSignup = useCallback(() => {
    setCurrentView('signup');
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setCurrentView('map');
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setSelectedFlight(null);
    setCurrentView('map');
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Show Login Page
  if (currentView === 'login') {
    return (
      <ErrorBoundary>
        <LoginPage
          onBack={handleBackToMap}
          onSignup={handleSignup}
          onLoginSuccess={handleLoginSuccess}
        />
      </ErrorBoundary>
    );
  }

  // Show Signup Page
  if (currentView === 'signup') {
    return (
      <ErrorBoundary>
        <SignupPage
          onBack={handleBackToMap}
          onLogin={handleLogin}
        />
      </ErrorBoundary>
    );
  }

  // Show Flight Details Page
  if (currentView === 'flightDetails' && selectedFlight) {
    return (
      <ErrorBoundary>
        <FlightDetailsPage
          flight={selectedFlight}
          onBack={handleBackToMap}
        />
      </ErrorBoundary>
    );
  }

  // Show Main Map View
  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col">
        {/* Header with Midnight Command styling */}
        <header className="midnight-panel shadow-sm border-b px-4 py-2" 
                style={{ borderColor: 'rgba(0, 217, 255, 0.3)', backgroundColor: '#0A0E1A' }}>
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-1 rounded-lg midnight-glow" 
                   style={{ backgroundColor: 'rgba(0, 217, 255, 0.2)' }}>
                <MapPin className="midnight-text-accent" size={20} />
              </div>
              <span className="text-white font-semibold">Flight Tracker</span>
            </div>
            
            {/* Authentication Buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-lg hover:bg-cyan-500/30 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </button>
                  <button
                    onClick={handleSignup}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-400/30 rounded-lg hover:bg-green-500/30 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Map Area - Full Height */}
        <main style={{ 
          flex: 1, 
          height: 'calc(100vh - 60px)', // Account for header only
          minHeight: '500px',
          overflow: 'hidden'
        }}>
          <FlightMap
            flights={displayFlights}
            onFlightClick={handleFlightClick}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;