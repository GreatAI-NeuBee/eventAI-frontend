import React, { createContext, useContext, ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsContextProps {
  isLoaded: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextProps>({
  isLoaded: false,
});

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
};

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  // Get Google Maps API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Maps API key not found. Google Maps features will be disabled.');
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
      <GoogleMapsContext.Provider value={{ isLoaded: true }}>
        {children}
      </GoogleMapsContext.Provider>
    </APIProvider>
  );
};

export default GoogleMapsProvider;
