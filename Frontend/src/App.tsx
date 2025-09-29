import React, { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MapPage from './pages/MapPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FlightDetailsPage } from './pages/FlightDetailsPage';
import { LoginPage } from './pages/LoginPage';
import RecordingsPage from './pages/RecordingsPage';
import { useFlights } from './hooks/useFlights';
import { useAuth } from './contexts/AuthContext';
import { Flight } from './types/flight';
import AuthService from './services/authService';

function App() {
  const {
    flights,
    loading,
  } = useFlights();
  
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [pendingFlightClick, setPendingFlightClick] = useState<Flight | null>(null);

  const handleFlightClick = useCallback((flight: Flight) => {
    if (!isAuthenticated) {
      // Store the flight for after authentication
      setPendingFlightClick(flight);
      // Redirect to login page
      navigate('/login');
      return;
    }
    
    // If authenticated, show flight details
    setSelectedFlight(flight);
    console.log('Flight clicked:', flight.flightNumber);
  }, [isAuthenticated, navigate]);

  const handleBackToMap = useCallback(() => {
    setSelectedFlight(null);
    navigate('/');
  }, [navigate]);

  const handleAuthSuccess = useCallback(() => {
    if (pendingFlightClick) {
      // Show the flight details for the pending flight
      setSelectedFlight(pendingFlightClick);
      setPendingFlightClick(null);
      navigate('/');
    } else {
      navigate('/');
    }
  }, [pendingFlightClick, navigate]);

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

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  // Protected Route Component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Routes>
      <Route path="/login" element={
        <ErrorBoundary>
          <LoginPage
            onBack={handleBackToMap}
            onLoginSuccess={handleLoginSuccess}
            onSuccess={handleAuthSuccess}
          />
        </ErrorBoundary>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <MapPage
              flights={flights}
              user={user}
              onFlightClick={handleFlightClick}
              onShowRecordings={handleShowRecordings}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/flights/:flightId" element={
        <ProtectedRoute>
          {selectedFlight ? (
            <ErrorBoundary>
              <FlightDetailsPage
                flight={selectedFlight}
                onBack={handleBackToMap}
              />
            </ErrorBoundary>
          ) : (
            <Navigate to="/" />
          )}
        </ProtectedRoute>
      } />
      <Route path="/recordings" element={
        <ProtectedRoute>
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