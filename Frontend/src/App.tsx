import React, { useState, useCallback, useMemo } from 'react';
import { FlightMap } from './components/FlightMap';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FlightDetailsPage } from './pages/FlightDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { useFlights } from './hooks/useFlights';
import { useAuth } from './contexts/AuthContext';
import { Flight } from './types/flight';
import { MapPin, LogIn, UserPlus } from 'lucide-react';
import AuthService from './services/authService';

function App() {
  const {
    flights,
    loading,
  } = useFlights();
  
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [currentView, setCurrentView] = useState<'map' | 'flightDetails' | 'login' | 'signup'>('map');
  const [pendingFlightClick, setPendingFlightClick] = useState<Flight | null>(null);


  // Show all flights without filtering
  const displayFlights = useMemo(() => {
    return flights;
  }, [flights]);

  const handleFlightClick = useCallback((flight: Flight) => {
    if (!isAuthenticated) {
      // Store the flight for after authentication
      setPendingFlightClick(flight);
      // If not authenticated, redirect to signup page
      setCurrentView('signup');
      return;
    }
    
    // If authenticated, show flight details
    setSelectedFlight(flight);
    setCurrentView('flightDetails');
    console.log('Flight clicked:', flight.flightNumber);
  }, [isAuthenticated]);

  const handleBackToMap = useCallback(() => {
    setSelectedFlight(null);
    setCurrentView('map');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    if (pendingFlightClick) {
      // Show the flight details for the pending flight
      setSelectedFlight(pendingFlightClick);
      setCurrentView('flightDetails');
      setPendingFlightClick(null);
    } else {
      setCurrentView('map');
    }
  }, [pendingFlightClick]);

  const handleLoginFromSignup = useCallback(() => {
    setCurrentView('login');
  }, []);

  const handleLogin = useCallback(() => {
    setCurrentView('login');
  }, []);

  const handleSignup = useCallback(() => {
    setCurrentView('signup');
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    try {
      const userData = AuthService.getStoredUser();
      if (userData) {
        login({
          id: userData._id || userData.id,
          fullName: userData.fullName,
          email: userData.email
        });
      }
      setCurrentView('map');
    } catch (error) {
      console.error('Login success handler failed:', error);
    }
  }, [login]);

  const handleLogout = useCallback(async () => {
    try {
      await AuthService.logout();
      logout();
      setSelectedFlight(null);
      setCurrentView('map');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  if (loading || authLoading) {
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
          onSuccess={handleAuthSuccess}
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
          onLogin={handleLoginFromSignup}
          onSuccess={handleAuthSuccess}
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
            
            {/* User Info - Only show when authenticated */}
            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 text-sm">
                  Welcome, {user?.fullName || 'User'}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  Logout
                </button>
              </div>
            )}
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