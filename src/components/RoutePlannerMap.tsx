import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';

export type LatLng = { lat: number; lng: number };

export interface RoutePlannerMapProps {
  venue: LatLng;                 // origin
  parking: LatLng;               // destination
  waypoints?: LatLng[];          // optional mid points
  height?: number | string;      // default 420
  onSummary?(s: { distanceKm: number; durationMin: number; waypoints: LatLng[]; }): void;
  onRouteChanged?(route: google.maps.DirectionsResult): void;
}

const RoutePlannerMap: React.FC<RoutePlannerMapProps> = ({
  venue,
  parking,
  waypoints = [],
  height = 420,
  onSummary,
  onRouteChanged
}) => {
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  });

  // Calculate route summary from directions result
  const calculateRouteSummary = useCallback((result: google.maps.DirectionsResult) => {
    if (!result.routes || result.routes.length === 0) return;

    const route = result.routes[0];
    const leg = route.legs[0];
    
    // Extract distance and duration
    const distanceText = leg.distance?.text || '0 km';
    const durationText = leg.duration?.text || '0 min';
    
    // Convert to numeric values
    const distanceKm = parseFloat(distanceText.replace(/[^\d.]/g, '')) || 0;
    const durationMin = parseFloat(durationText.replace(/[^\d.]/g, '')) || 0;
    
    // Extract waypoints from the route
    const routeWaypoints: LatLng[] = [];
    if (route.overview_path) {
      route.overview_path.forEach(point => {
        routeWaypoints.push({
          lat: point.lat(),
          lng: point.lng()
        });
      });
    }

    // Call onSummary callback if provided
    if (onSummary) {
      onSummary({
        distanceKm,
        durationMin,
        waypoints: routeWaypoints
      });
    }
  }, [onSummary]);

  // Handle directions response
  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    setIsLoading(false);
    
    if (status === google.maps.DirectionsStatus.OK && result) {
      setDirectionsResult(result);
      calculateRouteSummary(result);
      
      // Call onRouteChanged callback if provided
      if (onRouteChanged) {
        onRouteChanged(result);
      }
    } else {
      console.error('Directions request failed due to:', status);
    }
  }, [calculateRouteSummary, onRouteChanged]);

  // Handle directions changed (when user drags the route)
  const handleDirectionsChanged = useCallback(() => {
    if (directionsRenderer && directionsResult) {
      const newResult = directionsRenderer.getDirections();
      if (newResult) {
        setDirectionsResult(newResult);
        calculateRouteSummary(newResult);
        
        // Call onRouteChanged callback if provided
        if (onRouteChanged) {
          onRouteChanged(newResult);
        }
      }
    }
  }, [directionsRenderer, directionsResult, calculateRouteSummary, onRouteChanged]);

  // Request directions when component mounts or props change
  useEffect(() => {
    if (!isLoaded || !directionsService) return;

    setIsLoading(true);
    
    const request: google.maps.DirectionsRequest = {
      origin: venue,
      destination: parking,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      avoidHighways: false,
      avoidTolls: false
    };

    // Add waypoints if provided
    if (waypoints.length > 0) {
      request.waypoints = waypoints.map(wp => ({
        location: wp,
        stopover: true
      }));
    }

    directionsService.route(request, directionsCallback);
  }, [isLoaded, directionsService, venue, parking, waypoints, directionsCallback]);

  // Initialize directions service and renderer
  useEffect(() => {
    if (!isLoaded) return;

    const service = new google.maps.DirectionsService();
    const renderer = new google.maps.DirectionsRenderer({
      draggable: true,
      suppressMarkers: false,
      preserveViewport: false
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    return () => {
      // Cleanup
      if (renderer) {
        renderer.setMap(null);
      }
    };
  }, [isLoaded]);

  // Set up directions renderer on map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (directionsRenderer) {
      directionsRenderer.setMap(map);
      directionsRenderer.addListener('directions_changed', handleDirectionsChanged);
    }
  }, [directionsRenderer, handleDirectionsChanged]);

  // Default center point (midpoint between venue and parking)
  const center: LatLng = {
    lat: (venue.lat + parking.lat) / 2,
    lng: (venue.lng + parking.lng) / 2
  };

  if (!isLoaded) {
    return (
      <div 
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        className="flex items-center justify-center bg-gray-100 rounded-lg"
      >
        <div className="text-gray-600">Loading Google Maps...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={{
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height
        }}
        center={center}
        zoom={12}
        onLoad={onMapLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true
        }}
      >
        {directionsResult && (
          <DirectionsRenderer
            directions={directionsResult}
            options={{
              draggable: true,
              suppressMarkers: false,
              preserveViewport: false
            }}
            onDirectionsChanged={handleDirectionsChanged}
          />
        )}
      </GoogleMap>
      
      {isLoading && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Calculating route...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlannerMap;