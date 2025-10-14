import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MapPage from './pages/MapPage';
import PathTrackPage from './pages/PathTrackPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import RecordingsPage from './pages/RecordingsPage';
import { useFlights } from './hooks/useFlights';
import { useAuth } from './contexts/AuthContext';
import { Flight } from './types/flight';
import AuthService from './services/authService';
import { MapProvider } from './contexts/MapContext';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Stable ProtectedRoute defined at module scope to avoid remounts on App re-render
const ProtectedRoute: React.FC<{ children: React.ReactNode; isAuthenticated: boolean }> = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const {
    flights,
    loading,
  } = useFlights();
  
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);

  const handleFlightClick = useCallback((flight: Flight) => {
    if (!isAuthenticated) {
      // Redirect to login page
      navigate('/login');
      return;
    }
    
    // Show left panel directly when clicking on flight
    setSelectedFlight(flight);
    setShowLeftPanel(true);
  }, [isAuthenticated, navigate]);

  const handleMapClick = useCallback(() => {
    // Clear selected flight when clicking on the map
    setSelectedFlight(null);
    setShowLeftPanel(false);
  }, []);

  const handleBackToMap = useCallback(() => {
    setSelectedFlight(null);
    setShowLeftPanel(false);
    navigate('/');
  }, [navigate]);

  // Keep selectedFlight in sync with live updates - only update when there are actual changes
  useEffect(() => {
    if (!selectedFlight) return;
    const latest = flights.find(f => f.id === selectedFlight.id);
    if (latest) {
      // Always update the selected flight with the latest data to ensure real-time updates
      // Create a new object to ensure React detects changes
      setSelectedFlight({...latest, lastUpdate: new Date()});
    }
  }, [flights, selectedFlight]);

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
      // Navigate to homepage after successful login
      navigate('/');
    } catch (error) {
      console.error('Login success handler failed:', error);
    }
  }, [login, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await AuthService.logout();
      logout();
      setSelectedFlight(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  // const handleShowRecordings = useCallback(() => {
  //   navigate('/recordings');
  // }, [navigate]);

  const handleShowPathTrack = useCallback(() => {
    navigate('/pathtrack');
  }, [navigate]);

  // Memoize the flights data to prevent unnecessary re-renders
  const memoizedFlights = useMemo(() => flights, [flights]);

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <MapProvider>
      <Routes>
        <Route path="/login" element={
          <ErrorBoundary>
            <LoginPage
              onBack={handleBackToMap}
              onLoginSuccess={handleLoginSuccess}
            />
          </ErrorBoundary>
        } />
        <Route path="/" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ErrorBoundary>
              <MapPage
                flights={memoizedFlights}
                user={user}
                onFlightClick={handleFlightClick}
                // onShowRecordings={handleShowRecordings}
                onShowPathTrack={handleShowPathTrack}
                onLogout={handleLogout}
                onMapClick={handleMapClick}
                selectedFlight={selectedFlight}
                onBackToMap={handleBackToMap}
                showLeftPanel={showLeftPanel}
              />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/recordings" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ErrorBoundary>
              <RecordingsPage onBack={handleBackToMap} />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/pathtrack" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ErrorBoundary>
              <PathTrackPage 
                flights={memoizedFlights}
                onBack={handleBackToMap}
                // onLogout={handleLogout}
              />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MapProvider>
  );
}

export default App;