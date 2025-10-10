import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { GoogleMap, DirectionsRenderer, Marker, useJsApiLoader } from '@react-google-maps/api';

export type LatLng = { lat: number; lng: number };

export interface CongestionMapProps {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  height?: number | string;
  onRouteChanged?: (route: google.maps.DirectionsResult) => void;
  onCongestionData?: (congestionData: CongestionSegment[]) => void;
  venueCenter?: LatLng;
  zoomLevel?: number;
  eventDate?: string;
  eventTime?: string;
}

export interface CongestionSegment {
  startIndex: number;
  endIndex: number;
  speed: number;
  color: string;
  latLngs: LatLng[];
}

const CongestionMap: React.FC<CongestionMapProps> = memo(({
  origin,
  destination,
  waypoints = [],
  height = 500,
  onRouteChanged,
  onCongestionData,
  venueCenter,
  zoomLevel = 15,
  eventDate,
  eventTime
}) => {
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [congestionSegments, setCongestionSegments] = useState<CongestionSegment[]>([]);
  const [routeLoaded, setRouteLoaded] = useState<boolean>(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const loadingRef = useRef<boolean>(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load Google Maps API with stable configuration
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places', 'geometry'],
    preventGoogleFontsLoading: true
  });

  // Fetch predictive traffic data for specific event time and venue
  const fetchPredictiveTrafficData = useCallback(async (
    venueLocation: LatLng, 
    eventDate?: string, 
    eventTime?: string
  ): Promise<CongestionSegment[]> => {
    try {
      console.log('🚦 Fetching predictive traffic data for venue:', venueLocation);
      console.log('📅 Event date:', eventDate);
      console.log('⏰ Event time:', eventTime);
      
      const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        throw new Error('Google Maps API key not found');
      }
      
      // Calculate departure time for traffic prediction
      let departureTime: number;
      if (eventDate && eventTime) {
        // Use event-specific time for prediction
        const eventDateTime = new Date(eventDate);
        const [time, period] = eventTime.split(' ');
        let [hour, minute] = time.split(':').map(Number);
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        eventDateTime.setHours(hour, minute, 0, 0);
        departureTime = Math.floor(eventDateTime.getTime() / 1000);
        console.log(`📅 Using event time for prediction: ${eventDateTime.toLocaleString()}`);
      } else {
        // Use current time if no event time provided
        departureTime = Math.floor(Date.now() / 1000);
        console.log('📅 Using current time for prediction');
      }
      
      // Create comprehensive routes around the venue for traffic prediction
      const routes = [
        {
          name: 'North Approach',
          origin: `${venueLocation.lat + 0.01},${venueLocation.lng}`,
          destination: `${venueLocation.lat - 0.01},${venueLocation.lng}`
        },
        {
          name: 'South Approach', 
          origin: `${venueLocation.lat - 0.01},${venueLocation.lng}`,
          destination: `${venueLocation.lat + 0.01},${venueLocation.lng}`
        },
        {
          name: 'East Approach',
          origin: `${venueLocation.lat},${venueLocation.lng + 0.01}`,
          destination: `${venueLocation.lat},${venueLocation.lng - 0.01}`
        },
        {
          name: 'West Approach',
          origin: `${venueLocation.lat},${venueLocation.lng - 0.01}`,
          destination: `${venueLocation.lat},${venueLocation.lng + 0.01}`
        },
        {
          name: 'Northeast Approach',
          origin: `${venueLocation.lat + 0.007},${venueLocation.lng + 0.007}`,
          destination: `${venueLocation.lat - 0.007},${venueLocation.lng - 0.007}`
        },
        {
          name: 'Southwest Approach',
          origin: `${venueLocation.lat - 0.007},${venueLocation.lng - 0.007}`,
          destination: `${venueLocation.lat + 0.007},${venueLocation.lng + 0.007}`
        }
      ];
      
      const segments: CongestionSegment[] = [];
      
      for (const route of routes) {
        try {
          // Use Vite proxy with predictive traffic model
          const proxyUrl = `/google/maps/api/directions/json?origin=${route.origin}&destination=${route.destination}&departure_time=${departureTime}&traffic_model=best_guess&key=${googleApiKey}`;
          
          console.log(`🔍 Fetching predictive traffic for ${route.name} at ${new Date(departureTime * 1000).toLocaleString()}`);
          
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn(`⚠️ API call failed for ${route.name}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const routeData = data.routes[0];
            const leg = routeData.legs[0];
            
            // Get predictive traffic data
            const currentDuration = leg.duration.value;
            const trafficDuration = leg.duration_in_traffic?.value || leg.duration.value;
            const congestionRatio = trafficDuration / currentDuration;
            
            let speed: number;
            let color: string;
            let congestionLevel: string;
            
            if (congestionRatio < 1.2) {
              speed = 50; // Good flow
              color = '#4CAF50';
              congestionLevel = 'Good Flow';
            } else if (congestionRatio < 1.5) {
              speed = 35; // Moderate
              color = '#FF9800';
              congestionLevel = 'Moderate';
            } else {
              speed = 20; // Heavy
              color = '#F44336';
              congestionLevel = 'Heavy';
            }
            
            // Create segment from route path
            if (routeData.overview_path && routeData.overview_path.length > 1) {
              const path = routeData.overview_path;
              segments.push({
                startIndex: segments.length * 2,
                endIndex: segments.length * 2 + 1,
                speed: speed,
                color: color,
                latLngs: [
                  { lat: path[0].lat(), lng: path[0].lng() },
                  { lat: path[path.length - 1].lat(), lng: path[path.length - 1].lng() }
                ]
              });
            }
            
            console.log(`✅ Predictive traffic for ${route.name}: ${congestionLevel} (${speed} km/h) at ${new Date(departureTime * 1000).toLocaleString()}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching predictive traffic for ${route.name}:`, error);
        }
      }
      
      console.log(`🚦 Generated ${segments.length} predictive traffic segments for event time`);
      return segments;
      
    } catch (error) {
      console.error('❌ Error fetching predictive traffic data:', error);
      return [];
    }
  }, []);


  // Fetch real congestion data using Google Maps API
  const fetchCongestionData = useCallback(async (route: google.maps.DirectionsResult) => {
    try {
      console.log('🚦 Fetching real congestion data for route');
      
      if (!route.routes || route.routes.length === 0) return;

      const routePath = route.routes[0].overview_path;
      if (!routePath || routePath.length === 0) return;

      // Get venue location from the route
      const venueLocation = route.routes[0]?.legs[0]?.end_location;
      if (!venueLocation) {
        console.warn('⚠️ No venue location found in route');
        return;
      }
      
      const venueLatLng = {
        lat: venueLocation.lat(),
        lng: venueLocation.lng()
      };
      
      // Fetch predictive traffic data for the event time
      const realTrafficSegments = await fetchPredictiveTrafficData(venueLatLng, eventDate, eventTime);
      
      if (realTrafficSegments.length > 0) {
        setCongestionSegments(realTrafficSegments);
        if (onCongestionData) {
          onCongestionData(realTrafficSegments);
        }
        console.log(`✅ Loaded ${realTrafficSegments.length} real traffic segments`);
      } else {
        console.warn('⚠️ No real traffic data available - generating basic route-based segments');
        // Generate basic traffic segments from the route itself
        const routePath = route.routes[0].overview_path;
        if (routePath && routePath.length > 0) {
          const segments: CongestionSegment[] = [];
          const segmentLength = Math.max(1, Math.floor(routePath.length / 8));
          
          for (let i = 0; i < routePath.length; i += segmentLength) {
            const endIndex = Math.min(i + segmentLength, routePath.length - 1);
            const segmentPath = routePath.slice(i, endIndex + 1);
            
            // Use route duration to estimate congestion
            const leg = route.routes[0].legs[0];
            const duration = leg.duration?.value || 60;
            const distance = leg.distance?.value || 1000;
            const speed = (distance / 1000) / (duration / 3600); // km/h
            
            let color: string;
            if (speed >= 40) color = '#4CAF50'; // Green - good flow
            else if (speed >= 25) color = '#FF9800'; // Orange - moderate
            else color = '#F44336'; // Red - heavy
            
            segments.push({
              startIndex: i,
              endIndex: endIndex,
              speed: speed,
              color: color,
              latLngs: segmentPath.map(point => ({
                lat: point.lat(),
                lng: point.lng()
              }))
            });
          }
          
          setCongestionSegments(segments);
          if (onCongestionData) {
            onCongestionData(segments);
          }
          console.log(`✅ Generated ${segments.length} route-based traffic segments`);
        } else {
          setCongestionSegments([]);
          if (onCongestionData) {
            onCongestionData([]);
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching congestion data:', error);
    }
  }, [fetchPredictiveTrafficData, onCongestionData]);

  // Draw congestion polylines on map
  const drawCongestionPolylines = useCallback((map: google.maps.Map) => {
    console.log(`🎨 Drawing ${congestionSegments.length} congestion segments`);
    
    // Clear existing polylines completely
    polylinesRef.current.forEach(polyline => {
      try {
        polyline.setMap(null);
      } catch (error) {
        console.warn('Error removing polyline:', error);
      }
    });
    polylinesRef.current = [];

    // Only draw new congestion segments if they exist
    if (congestionSegments.length > 0) {
      congestionSegments.forEach((segment, index) => {
        console.log(`🎨 Drawing segment ${index}: ${segment.color} (${segment.speed} km/h)`);
        const polyline = new google.maps.Polyline({
          path: segment.latLngs,
          strokeColor: segment.color,
          strokeOpacity: 0.9,
          strokeWeight: 8,
          zIndex: 1000 + index
        });
        
        polyline.setMap(map);
        polylinesRef.current.push(polyline);
      });
      console.log(`✅ Drew ${polylinesRef.current.length} polylines on map`);
    } else {
      console.log('⚠️ No congestion segments to draw');
    }
  }, [congestionSegments]);

  // Handle directions response
  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    try {
      loadingRef.current = false;
      setIsLoading(false);
      
      if (status === google.maps.DirectionsStatus.OK && result) {
        // Clear old route and congestion data first
        setDirectionsResult(null);
        setCongestionSegments([]);
        
        // Set new route
        setDirectionsResult(result);
        setRouteLoaded(true); // Mark route as loaded
        
        // Remove the directions_changed listener to prevent API calls
        if (directionsRenderer) {
          try {
            directionsRenderer.removeListener('directions_changed', handleDirectionsChanged);
            console.log('Directions changed listener removed - no more API calls');
          } catch (error) {
            console.warn('Error removing directions changed listener:', error);
          }
        }
        
        // Force clear all existing polylines to remove old routes
        polylinesRef.current.forEach(polyline => {
          try {
            polyline.setMap(null);
          } catch (error) {
            console.warn('Error removing old polyline:', error);
          }
        });
        polylinesRef.current = [];
        
        fetchCongestionData(result);
        
        if (onRouteChanged) {
          onRouteChanged(result);
        }
      } else {
        console.warn('Directions request failed due to:', status);
      }
    } catch (error) {
      console.warn('Error in directions callback:', error);
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Handle directions changed (when user drags the route) with debounce
  const handleDirectionsChanged = useCallback(() => {
    try {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Only handle route changes if route is not yet loaded
      if (routeLoaded) {
        console.log('Route already loaded - skipping API calls');
        return;
      }
      
      // Force clear everything immediately
      setDirectionsResult(null);
      setCongestionSegments([]);
      
      // Clear all polylines from map
      polylinesRef.current.forEach(polyline => {
        try {
          polyline.setMap(null);
        } catch (error) {
          console.warn('Error removing polyline:', error);
        }
      });
      polylinesRef.current = [];
      
      // Clear directions renderer
      if (directionsRenderer) {
        try {
          directionsRenderer.setMap(null);
        } catch (error) {
          console.warn('Error clearing directions renderer:', error);
        }
      }
      
      debounceRef.current = setTimeout(() => {
        if (directionsRenderer && directionsResult) {
          const newResult = directionsRenderer.getDirections();
          if (newResult) {
            // Re-set the directions renderer
            directionsRenderer.setMap(mapRef.current);
            setDirectionsResult(newResult);
            setRouteLoaded(true); // Mark as loaded
            fetchCongestionData(newResult);
            
            if (onRouteChanged) {
              onRouteChanged(newResult);
            }
          }
        }
      }, 200); // Slightly longer debounce for complete clearing
    } catch (error) {
      console.warn('Error in directions changed handler:', error);
    }
  }, [directionsRenderer, directionsResult, onRouteChanged, routeLoaded]);

  // Request directions when component mounts or props change
  useEffect(() => {
    try {
      if (!isLoaded || !directionsService || loadingRef.current) return;


      loadingRef.current = true;
      setIsLoading(true);
      
      const request: google.maps.DirectionsRequest = {
        origin: origin,
        destination: destination,
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
    } catch (error) {
      console.warn('Error requesting directions:', error);
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [isLoaded, directionsService, origin, destination, waypoints, directionsCallback]);

  // Initialize directions service and renderer
  useEffect(() => {
    try {
      if (!isLoaded) return;

      const service = new google.maps.DirectionsService();
      const renderer = new google.maps.DirectionsRenderer({
        draggable: true,
        suppressMarkers: false,
        preserveViewport: false,
        polylineOptions: {
          strokeColor: '#4285f4',
          strokeOpacity: 0.3,
          strokeWeight: 2,
          zIndex: 500
        }
      });

      setDirectionsService(service);
      setDirectionsRenderer(renderer);

      return () => {
        // Cleanup
        try {
          if (renderer) {
            renderer.setMap(null);
          }
          polylinesRef.current.forEach(polyline => polyline.setMap(null));
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      };
    } catch (error) {
      console.warn('Error initializing directions service:', error);
    }
  }, [isLoaded]);

  // Set up directions renderer on map
  const onMapLoad = useCallback((map: google.maps.Map) => {
    try {
      mapRef.current = map;
      
      if (directionsRenderer) {
        directionsRenderer.setMap(map);
        
        // Only add listener if route is not loaded yet
        if (!routeLoaded) {
          directionsRenderer.addListener('directions_changed', handleDirectionsChanged);
        }
        
        // Clear polylines when dragging starts
        directionsRenderer.addListener('dragstart', () => {
          console.log('Drag started - clearing all polylines');
          polylinesRef.current.forEach(polyline => {
            try {
              polyline.setMap(null);
            } catch (error) {
              console.warn('Error removing polyline on drag start:', error);
            }
          });
          polylinesRef.current = [];
          
          // Also clear congestion segments state
          setCongestionSegments([]);
        });
      }
    } catch (error) {
      console.warn('Error setting up map:', error);
    }
  }, [directionsRenderer, handleDirectionsChanged, routeLoaded]);

  // Draw congestion polylines when segments change
  useEffect(() => {
    try {
      if (mapRef.current) {
        drawCongestionPolylines(mapRef.current);
      }
    } catch (error) {
      console.warn('Error drawing congestion polylines:', error);
    }
  }, [congestionSegments, drawCongestionPolylines]);

  // Cleanup polylines when component unmounts
  useEffect(() => {
    return () => {
      try {
        polylinesRef.current.forEach(polyline => {
          polyline.setMap(null);
        });
        polylinesRef.current = [];
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, []);

  // Default center point (midpoint between origin and destination)
  const center: LatLng = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2
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
        center={venueCenter || center}
        zoom={zoomLevel}
        onLoad={onMapLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          disableDefaultUI: false
        }}
      >
        {directionsResult && (
          <DirectionsRenderer
            key={directionsResult.routes[0]?.overview_path?.length || 0}
            directions={directionsResult}
            options={{
              draggable: true,
              suppressMarkers: true,
              preserveViewport: false,
              polylineOptions: {
                strokeColor: '#3b82f6',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                zIndex: 500
              }
            }}
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
      
      {routeLoaded && (
        <div className="absolute top-4 left-4 bg-purple-100 px-3 py-2 rounded-lg shadow-md border border-purple-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-purple-700">
              {eventDate && eventTime ? 'Predictive traffic' : 'Real-time traffic'}
            </span>
          </div>
        </div>
      )}
      
      {/* Congestion Legend */}
      <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md">
        <div className="text-sm font-medium text-gray-700 mb-2">Traffic Flow</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Good Flow</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Heavy Congestion</span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.origin.lat === nextProps.origin.lat &&
    prevProps.origin.lng === nextProps.origin.lng &&
    prevProps.destination.lat === nextProps.destination.lat &&
    prevProps.destination.lng === nextProps.destination.lng &&
    prevProps.height === nextProps.height &&
    JSON.stringify(prevProps.waypoints) === JSON.stringify(nextProps.waypoints)
  );
});

CongestionMap.displayName = 'CongestionMap';

export default CongestionMap;

