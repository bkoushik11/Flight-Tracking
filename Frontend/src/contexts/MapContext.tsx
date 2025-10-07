import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapContextType {
  showIndiaBorders: boolean;
  showStateBorders: boolean;
  toggleIndiaBorders: () => void;
  toggleStateBorders: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showIndiaBorders, setShowIndiaBorders] = useState(false);
  const [showStateBorders, setShowStateBorders] = useState(false);

  const toggleIndiaBorders = () => {
    setShowIndiaBorders(!showIndiaBorders);
    // If turning on India borders, turn off state borders
    if (!showIndiaBorders) {
      setShowStateBorders(false);
    }
  };

  const toggleStateBorders = () => {
    setShowStateBorders(!showStateBorders);
    // If turning on state borders, turn off India borders
    if (!showStateBorders) {
      setShowIndiaBorders(false);
    }
  };

  return (
    <MapContext.Provider value={{ 
      showIndiaBorders, 
      showStateBorders, 
      toggleIndiaBorders, 
      toggleStateBorders 
    }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};