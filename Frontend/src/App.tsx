import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MapPage from './pages/MapPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import RecordingsPage from './pages/RecordingsPage';
import { useFlights } from './hooks/useFlights';
import { useAuth } from './contexts/AuthContext';
import { Flight } from './types/flight';
import AuthService from './services/authService';

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

  const handleFlightClick = useCallback((flight: Flight) => {
    if (!isAuthenticated) {
      // Redirect to login page
      navigate('/login');
      return;
    }
    
    // Select the flight to show in split view
    setSelectedFlight(flight);
  }, [isAuthenticated, navigate]);

  const handleBackToMap = useCallback(() => {
    setSelectedFlight(null);
    // Don't navigate to '/' as this might be causing the full page refresh
    // The MapPage component should handle the display logic
  }, []);

  // Keep selectedFlight in sync with live updates
  useEffect(() => {
    if (!selectedFlight) return;
    const latest = flights.find(f => f.id === selectedFlight.id);
    if (latest && latest !== selectedFlight) {
      setSelectedFlight(latest);
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

  const handleShowRecordings = useCallback(() => {
    navigate('/recordings');
  }, [navigate]);

  // Memoize the flights data to prevent unnecessary re-renders
  const memoizedFlights = useMemo(() => flights, [flights]);

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
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
              onShowRecordings={handleShowRecordings}
              onLogout={handleLogout}
              selectedFlight={selectedFlight}
              onBackToMap={handleBackToMap}
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;