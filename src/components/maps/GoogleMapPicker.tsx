import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Target } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
  name?: string;
}

interface GoogleMapPickerProps {
  onLocationSelected: (location: LocationData) => void;
  initialLocation?: LocationData;
  title?: string;
}

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  onLocationSelected,
  initialLocation,
  title = "Select Venue Location"
}) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation || null
  );
  const [mapCenter, setMapCenter] = useState(
    initialLocation || { lat: 37.7749, lng: -122.4194 } // Default to San Francisco
  );
  const [zoom, setZoom] = useState(12);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded } = useGoogleMaps();

  // Google Maps API Key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Update map when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      setMapCenter(initialLocation);
      setZoom(16);
      
      // Pan map to new location if map is loaded
      if (mapRef.current) {
        mapRef.current.panTo(initialLocation);
        mapRef.current.setZoom(16);
      }
    }
  }, [initialLocation]);

  // Handle map click to select location
  const handleMapClick = useCallback(async (event: any) => {
    // Get latLng from the event detail for vis.gl/react-google-maps
    const latLng = event.detail?.latLng || event.latLng;
    if (!latLng) return;

    const lat = latLng.lat();
    const lng = latLng.lng();
    
    const newLocation: LocationData = { lat, lng };
    setSelectedLocation(newLocation);

    // Reverse geocode to get address
    setIsGeocoding(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        newLocation.address = result.formatted_address;
        newLocation.placeId = result.place_id;
        
        // Try to get a more specific name from place components
        const addressComponents = result.address_components;
        const premiseComponent = addressComponents.find(comp => comp.types.includes('premise'));
        const establishmentComponent = addressComponents.find(comp => comp.types.includes('establishment'));
        
        if (establishmentComponent) {
          newLocation.name = establishmentComponent.long_name;
        } else if (premiseComponent) {
          newLocation.name = premiseComponent.long_name;
        }
        
        setSelectedLocation({ ...newLocation });
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Handle camera change to update center and zoom
  const handleCameraChange = useCallback((event: MapCameraChangedEvent) => {
    setMapCenter({ lat: event.detail.center.lat, lng: event.detail.center.lng });
    setZoom(event.detail.zoom);
    
    // Store map reference from the event
    if (event.map && !mapRef.current) {
      mapRef.current = event.map;
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const newCenter = { lat, lng };
          
          setMapCenter(newCenter);
          setZoom(15);
          
          // Pan the map to the new location
          if (mapRef.current) {
            mapRef.current.panTo(newCenter);
            mapRef.current.setZoom(15);
          }
          
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Error getting current location:', error);
          setIsGettingLocation(false);
          
          let errorMessage = 'Unable to get your current location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          alert(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }, []);

  // Confirm selected location
  const handleConfirmLocation = useCallback(() => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
    }
  }, [selectedLocation, onLocationSelected]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  if (!apiKey) {
    return (
      <Card>
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Maps API Key Required</h3>
          <p className="text-gray-600 mb-4">
            Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables to use the map picker.
          </p>
          <Button
            variant="primary"
            onClick={() => window.open('https://developers.google.com/maps/documentation/javascript/get-api-key', '_blank')}
          >
            Get API Key
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                Getting...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-1" />
                My Location
              </>
            )}
          </Button>
          {selectedLocation && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearSelection}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmLocation}
              >
                <Target className="h-4 w-4 mr-1" />
                Confirm Location
              </Button>
            </>
          )}
        </div>
      </div>

      {selectedLocation && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div className="flex-1">
              {isGeocoding ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-blue-700">Getting address...</span>
                </div>
              ) : (
                <>
                  {selectedLocation.name && (
                    <p className="font-medium text-blue-900">{selectedLocation.name}</p>
                  )}
                  <p className="text-sm text-blue-700">
                    {selectedLocation.address || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
        {!isLoaded ? (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        ) : (
          <Map
            defaultCenter={mapCenter}
            defaultZoom={zoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={handleMapClick}
            onCameraChanged={handleCameraChange}
            mapId="venue-selector-map"
            style={{ width: '100%', height: '100%' }}
          >
            {selectedLocation && (
              <AdvancedMarker
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                title={selectedLocation.name || selectedLocation.address || 'Selected Location'}
              >
                <Pin 
                  background="#ef4444" 
                  glyphColor="#ffffff" 
                  borderColor="#ffffff"
                  scale={1.2}
                />
              </AdvancedMarker>
            )}
          </Map>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          📍 Click anywhere on the map to select a venue location. 
          Use the controls to navigate and zoom for precise positioning.
        </p>
      </div>
    </Card>
  );
};

export default GoogleMapPicker;
