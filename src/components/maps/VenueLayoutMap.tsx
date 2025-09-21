import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Eye, Layers, Building } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
  name?: string;
}

interface NearbyPlace {
  place_id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
  rating?: number;
  vicinity?: string;
  formatted_address?: string;
  distance?: number; // Distance in meters
  availability?: 'available' | 'limited' | 'full'; // Parking availability status
  capacity?: number; // Total parking capacity
  occupied?: number; // Currently occupied spots
}

interface Hotspot {
  x: number;
  y: number;
  intensity: number;
  location: string;
}

interface VenueLayoutMapProps {
  venueLocation: LocationData;
  hotspots?: Hotspot[];
  showHotspots?: boolean;
  title?: string;
}

const VenueLayoutMap: React.FC<VenueLayoutMapProps> = ({
  venueLocation,
  hotspots = [],
  showHotspots = false,
  title = "Venue Layout & Nearby Parking"
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [isLoading, setIsLoading] = useState(false);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(true);
  const [selectedParking, setSelectedParking] = useState<NearbyPlace | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
      });
    };

    loadGoogleMapsScript().catch(console.error);
  }, [apiKey]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // Initialize Google Maps
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !apiKey || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: venueLocation.lat, lng: venueLocation.lng },
      zoom: 16,
      mapTypeId: mapType === 'roadmap' ? google.maps.MapTypeId.ROADMAP :
                 mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE :
                 google.maps.MapTypeId.HYBRID,
      gestureHandling: 'greedy',
      disableDefaultUI: false,
      scrollwheel: true,
      draggable: true,
      keyboardShortcuts: true,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: true,
      fullscreenControl: true
    });

    mapInstanceRef.current = map;
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      draggable: false,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4285f4',
        strokeOpacity: 0.8,
        strokeWeight: 4
      }
    });
    directionsRendererRef.current.setMap(map);

    // Add venue marker
    const venueMarker = new google.maps.Marker({
      position: { lat: venueLocation.lat, lng: venueLocation.lng },
      map: map,
      title: venueLocation.name || 'Venue Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });
    markersRef.current.push(venueMarker);

  }, [venueLocation, mapType, apiKey]);

  // Calculate route from venue to parking
  const calculateRoute = async (parking: NearbyPlace) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    const request: google.maps.DirectionsRequest = {
      origin: { lat: venueLocation.lat, lng: venueLocation.lng },
      destination: { lat: parking.location.lat, lng: parking.location.lng },
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    };

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsServiceRef.current!.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        });
      });

      if (result.routes && result.routes.length > 0) {
        directionsRendererRef.current.setDirections(result);
        
        const route = result.routes[0];
        const leg = route.legs[0];
        
        setRouteInfo({
          distance: leg.distance?.text || 'Unknown distance',
          duration: leg.duration?.text || 'Unknown duration'
        });

        // Center map on the route
        if (mapInstanceRef.current) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: venueLocation.lat, lng: venueLocation.lng });
          bounds.extend({ lat: parking.location.lat, lng: parking.location.lng });
          mapInstanceRef.current.fitBounds(bounds);
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      // Fallback: show straight line distance
      const distance = parking.distance ? formatDistance(parking.distance) : 'Unknown distance';
      const estimatedTime = parking.distance ? 
        `${Math.max(1, Math.round(parking.distance / 1000 * 2))} mins` : 'Unknown duration';
      
      setRouteInfo({
        distance,
        duration: estimatedTime
      });
    }
  };

  // Add parking markers to map
  const addParkingMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing parking markers
    markersRef.current.forEach(marker => {
      if (marker.getTitle() !== 'Venue Location') {
        marker.setMap(null);
      }
    });
    markersRef.current = markersRef.current.filter(marker => marker.getTitle() === 'Venue Location');

    // Add parking markers
    nearbyPlaces.forEach((parking) => {
      const marker = new google.maps.Marker({
        position: { lat: parking.location.lat, lng: parking.location.lng },
        map: mapInstanceRef.current,
        title: `${parking.name}${parking.distance ? ` (${formatDistance(parking.distance)})` : ''}${parking.rating ? ` (${parking.rating}⭐)` : ''}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: getMarkerColor(parking.types),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        handleParkingSelect(parking);
      });

      markersRef.current.push(marker);
    });
  }, [nearbyPlaces]);

  // Handle parking selection
  const handleParkingSelect = async (parking: NearbyPlace) => {
    setSelectedParking(parking);
    await calculateRoute(parking);
  };

  // Generate parking recommendations based on availability
  const getParkingRecommendations = (parkings: NearbyPlace[]): {
    recommended: NearbyPlace[];
    alternatives: NearbyPlace[];
    full: NearbyPlace[];
  } => {
    const available = parkings.filter(p => p.availability === 'available');
    const limited = parkings.filter(p => p.availability === 'limited');
    const full = parkings.filter(p => p.availability === 'full');

    // Recommend available parking first, then limited
    const recommended = [...available, ...limited].slice(0, 3);
    const alternatives = parkings.filter(p => 
      p.availability !== 'available' && 
      p.availability !== 'limited' && 
      p.availability !== 'full'
    ).slice(0, 2);

    return { recommended, alternatives, full };
  };

  // Get availability status color and text
  const getAvailabilityInfo = (parking: NearbyPlace) => {
    switch (parking.availability) {
      case 'available':
        return { color: 'text-green-600', bgColor: 'bg-green-100', text: 'Available', icon: '✅' };
      case 'limited':
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', text: 'Limited', icon: '⚠️' };
      case 'full':
        return { color: 'text-red-600', bgColor: 'bg-red-100', text: 'Full', icon: '❌' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-100', text: 'Unknown', icon: '❓' };
    }
  };

  // Load nearby places using Google Maps Places service
  const loadNearbyPlaces = useCallback(async () => {
    if (!venueLocation || !apiKey) return;

    setIsLoading(true);
    try {
      // Initialize Places service
      const service = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request: google.maps.places.PlaceSearchRequest = {
        location: { lat: venueLocation.lat, lng: venueLocation.lng },
        radius: 1000, // 1km radius
        type: 'parking' // Search specifically for parking facilities
      };

      // Use Promise wrapper for PlacesService
      const searchPromise = new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        });
      });

      const results = await searchPromise;
      
      // Filter and format results - only show parking facilities
      const formattedPlaces: NearbyPlace[] = results
        .filter(place => 
          place.place_id && 
          place.geometry?.location && 
          place.types && 
          (place.types.includes('parking') || 
           place.types.includes('parking_lot') || 
           place.types.includes('parking_garage') ||
           place.types.some(type => type.toLowerCase().includes('parking')))
        )
        .slice(0, 20) // Limit to 20 places
        .map(place => {
          const lat = place.geometry!.location!.lat();
          const lng = place.geometry!.location!.lng();
          const distance = calculateDistance(venueLocation.lat, venueLocation.lng, lat, lng);
          
          return {
            place_id: place.place_id!,
            name: place.name || 'Unknown Place',
            location: { lat, lng },
            types: place.types || [],
            rating: place.rating,
            vicinity: place.vicinity,
            formatted_address: place.vicinity,
            distance
          };
        })
        .sort((a, b) => (a.distance || 0) - (b.distance || 0)); // Sort by distance

      console.log('Google Places API results:', formattedPlaces.length, 'parking facilities found');
      setNearbyPlaces(formattedPlaces);
    } catch (error) {
      console.error('Error loading nearby places:', error);
      console.log('Falling back to mock parking data');
      
      // Fallback to mock data for demo purposes
      const mockPlaces: NearbyPlace[] = [
        {
          place_id: 'mock-1',
          name: 'Main Parking Garage',
          location: { 
            lat: venueLocation.lat + 0.002, 
            lng: venueLocation.lng + 0.001 
          },
          types: ['parking'],
          rating: 4.2,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat + 0.002, venueLocation.lng + 0.001),
          availability: 'full',
          capacity: 200,
          occupied: 200
        },
        {
          place_id: 'mock-2',
          name: 'Street Parking Zone A',
          location: { 
            lat: venueLocation.lat - 0.001, 
            lng: venueLocation.lng + 0.002 
          },
          types: ['parking'],
          rating: 3.8,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat - 0.001, venueLocation.lng + 0.002),
          availability: 'limited',
          capacity: 50,
          occupied: 45
        },
        {
          place_id: 'mock-3',
          name: 'Valet Parking Service',
          location: { 
            lat: venueLocation.lat + 0.003, 
            lng: venueLocation.lng - 0.001 
          },
          types: ['parking'],
          rating: 4.5,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat + 0.003, venueLocation.lng - 0.001),
          availability: 'available',
          capacity: 30,
          occupied: 15
        },
        {
          place_id: 'mock-4',
          name: 'Underground Parking',
          location: { 
            lat: venueLocation.lat - 0.002, 
            lng: venueLocation.lng - 0.003 
          },
          types: ['parking'],
          rating: 4.1,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat - 0.002, venueLocation.lng - 0.003),
          availability: 'available',
          capacity: 150,
          occupied: 60
        },
        {
          place_id: 'mock-5',
          name: 'VIP Parking Area',
          location: { 
            lat: venueLocation.lat + 0.001, 
            lng: venueLocation.lng - 0.002 
          },
          types: ['parking'],
          rating: 4.7,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat + 0.001, venueLocation.lng - 0.002),
          availability: 'full',
          capacity: 25,
          occupied: 25
        },
        {
          place_id: 'mock-6',
          name: 'Street Parking Zone B',
          location: { 
            lat: venueLocation.lat - 0.003, 
            lng: venueLocation.lng + 0.001 
          },
          types: ['parking'],
          rating: 3.9,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat - 0.003, venueLocation.lng + 0.001),
          availability: 'available',
          capacity: 40,
          occupied: 12
        },
        {
          place_id: 'mock-7',
          name: 'Multi-Level Parking',
          location: { 
            lat: venueLocation.lat + 0.004, 
            lng: venueLocation.lng + 0.003 
          },
          types: ['parking'],
          rating: 4.3,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat + 0.004, venueLocation.lng + 0.003),
          availability: 'limited',
          capacity: 300,
          occupied: 280
        },
        {
          place_id: 'mock-8',
          name: 'Event Parking Lot',
          location: { 
            lat: venueLocation.lat - 0.004, 
            lng: venueLocation.lng - 0.001 
          },
          types: ['parking'],
          rating: 4.0,
          distance: calculateDistance(venueLocation.lat, venueLocation.lng, venueLocation.lat - 0.004, venueLocation.lng - 0.001),
          availability: 'available',
          capacity: 500,
          occupied: 200
        }
      ].sort((a, b) => (a.distance || 0) - (b.distance || 0)); // Sort by distance
      setNearbyPlaces(mockPlaces);
    } finally {
      setIsLoading(false);
    }
  }, [venueLocation, apiKey]);

  // Load nearby places when venue location changes
  useEffect(() => {
    if (showNearbyPlaces) {
      loadNearbyPlaces();
    }
  }, [loadNearbyPlaces, showNearbyPlaces]);

  // Initialize map when component mounts
  useEffect(() => {
    if (apiKey && venueLocation) {
      initializeMap();
    }
  }, [initializeMap, apiKey, venueLocation]);

  // Add parking markers when nearby places change
  useEffect(() => {
    if (nearbyPlaces.length > 0 && mapInstanceRef.current) {
      addParkingMarkers();
    }
  }, [addParkingMarkers, nearbyPlaces]);

  // Update map type when it changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const mapTypeId = mapType === 'roadmap' ? google.maps.MapTypeId.ROADMAP :
                       mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE :
                       google.maps.MapTypeId.HYBRID;
      mapInstanceRef.current.setMapTypeId(mapTypeId);
    }
  }, [mapType]);

  // Get icon for place type
  const getPlaceIcon = (types: string[]) => {
    if (types.includes('parking')) return '🅿️';
    if (types.includes('restaurant') || types.includes('food')) return '🍽️';
    if (types.includes('hospital') || types.includes('health')) return '🏥';
    if (types.includes('transit_station') || types.includes('subway_station')) return '🚇';
    if (types.includes('gas_station')) return '⛽';
    if (types.includes('bank') || types.includes('atm')) return '🏦';
    if (types.includes('hotel') || types.includes('lodging')) return '🏨';
    if (types.includes('shopping_mall') || types.includes('store')) return '🛍️';
    return '📍';
  };

  // Get marker color for place type
  const getMarkerColor = (types: string[]) => {
    if (types.includes('parking')) return '#6b7280';
    if (types.includes('restaurant') || types.includes('food')) return '#f97316';
    if (types.includes('hospital') || types.includes('health')) return '#dc2626';
    if (types.includes('transit_station')) return '#16a34a';
    if (types.includes('gas_station')) return '#eab308';
    if (types.includes('bank')) return '#3b82f6';
    if (types.includes('hotel')) return '#8b5cf6';
    if (types.includes('shopping_mall')) return '#ec4899';
    return '#64748b';
  };

  // Convert hotspot coordinates to map coordinates
  const getHotspotMapPosition = (hotspot: Hotspot) => {
    // Convert percentage-based coordinates to actual map coordinates
    // This is a rough approximation - in a real app you'd need proper coordinate transformation
    const latOffset = (hotspot.y - 50) * 0.001; // Convert to degrees
    const lngOffset = (hotspot.x - 50) * 0.001;
    
    return {
      lat: venueLocation.lat + latOffset,
      lng: venueLocation.lng + lngOffset
    };
  };

  if (!apiKey) {
    return (
      <Card>
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Maps API Key Required</h3>
          <p className="text-gray-600">
            Please set VITE_GOOGLE_MAPS_API_KEY to view the venue layout.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        <div className="flex items-center space-x-2">
          {/* Map Type Controls */}
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant={mapType === 'roadmap' ? 'primary' : 'outline'}
              onClick={() => setMapType('roadmap')}
            >
              Map
            </Button>
            <Button
              size="sm"
              variant={mapType === 'satellite' ? 'primary' : 'outline'}
              onClick={() => setMapType('satellite')}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={mapType === 'hybrid' ? 'primary' : 'outline'}
              onClick={() => setMapType('hybrid')}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>

          {/* Nearby Places Toggle */}
          <Button
            size="sm"
            variant={showNearbyPlaces ? 'primary' : 'outline'}
            onClick={() => setShowNearbyPlaces(!showNearbyPlaces)}
          >
            <Building className="h-4 w-4 mr-1" />
            Nearby
          </Button>
          
          {/* Test Button for Mock Data */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              console.log('Forcing mock data load...');
              loadNearbyPlaces();
            }}
          >
            Test
          </Button>
        </div>
      </div>

      {/* Venue Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <p className="font-medium text-blue-900">{venueLocation.name || 'Selected Venue'}</p>
            <p className="text-sm text-blue-700">{venueLocation.address || `${venueLocation.lat.toFixed(6)}, ${venueLocation.lng.toFixed(6)}`}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        {showHotspots && hotspots.length > 0 && (
          <>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>High Density (80%+)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span>Medium-High (60-80%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Medium (40-60%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Low (&lt;40%)</span>
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <div className="h-96 rounded-lg overflow-hidden border border-gray-200 mb-4">
        {!apiKey ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Maps API Key Required</h3>
              <p className="text-gray-600">
                Please set VITE_GOOGLE_MAPS_API_KEY to view the interactive map.
              </p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ minHeight: '384px' }}
          />
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading nearby parking...</span>
        </div>
      )}

      {/* Selected Parking Info */}
      {selectedParking && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-lg mr-2">🅿️</div>
              <div>
                <p className="font-medium text-green-900">Selected: {selectedParking.name}</p>
                <p className="text-sm text-green-700">
                  {selectedParking.distance && `${formatDistance(selectedParking.distance)} from venue`}
                  {selectedParking.rating && ` • ⭐ ${selectedParking.rating}/5`}
                </p>
                {routeInfo && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center text-sm text-blue-800">
                      <span className="mr-2">🚗</span>
                      <span className="font-medium">Route: {routeInfo.distance} • {routeInfo.duration}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedParking(null);
                setRouteInfo(null);
                if (directionsRendererRef.current) {
                  directionsRendererRef.current.setDirections({ routes: [] });
                }
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Parking Recommendations */}
      {showNearbyPlaces && nearbyPlaces.length > 0 && !isLoading && (() => {
        const recommendations = getParkingRecommendations(nearbyPlaces);
        const hasFullParking = recommendations.full.length > 0;
        const hasRecommended = recommendations.recommended.length > 0;
        
        return (
          <div className="mb-6">
            {/* Recommendation Alert */}
            {hasFullParking && hasRecommended && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <div className="text-lg mr-3">⚠️</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-900 mb-1">Parking Alert</h4>
                    <p className="text-sm text-orange-700 mb-2">
                      The closest parking facilities are full. We recommend these alternative options:
                    </p>
                    <div className="space-y-1">
                      {recommendations.recommended.slice(0, 2).map((parking) => {
                        const availability = getAvailabilityInfo(parking);
                        return (
                          <div key={parking.place_id} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-orange-900">{parking.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs ${availability.bgColor} ${availability.color}`}>
                                {availability.icon} {availability.text}
                              </span>
                              {parking.distance && (
                                <span className="text-orange-600 font-medium">
                                  {formatDistance(parking.distance)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Best Available Parking */}
            {recommendations.recommended.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2 flex items-center">
                  <span className="mr-2">🎯</span>
                  Recommended Parking
                </h4>
                <div className="space-y-2">
                  {recommendations.recommended.slice(0, 3).map((parking) => {
                    const availability = getAvailabilityInfo(parking);
                    return (
                      <div 
                        key={parking.place_id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-200 cursor-pointer hover:bg-green-100 hover:border-green-300 hover:shadow-md transition-all duration-200 transform hover:scale-105"
                        onClick={() => {
                          console.log('Recommended parking selected:', parking.name);
                          handleParkingSelect(parking);
                        }}
                        style={{ 
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div className="flex items-center">
                          <span className="text-lg mr-2">🅿️</span>
                          <div>
                            <p className="font-medium text-green-900 text-sm">{parking.name}</p>
                            <p className="text-xs text-green-700">
                              {parking.capacity && parking.occupied !== undefined && 
                                `${parking.capacity - parking.occupied} spots available`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${availability.bgColor} ${availability.color}`}>
                            {availability.icon} {availability.text}
                          </span>
                          {parking.distance && (
                            <span className="text-green-600 font-medium text-sm">
                              {formatDistance(parking.distance)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Nearby Places List */}
      {showNearbyPlaces && nearbyPlaces.length > 0 && !isLoading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">All Parking Options</h4>
            <p className="text-xs text-gray-500">Click any parking to see route</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {nearbyPlaces.slice(0, 9).map((place) => {
              const availability = getAvailabilityInfo(place);
              return (
                <div 
                  key={place.place_id} 
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                    selectedParking?.place_id === place.place_id 
                      ? 'bg-green-50 border-green-400 shadow-lg ring-2 ring-green-200' 
                      : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => {
                    console.log('Parking selected:', place.name);
                    handleParkingSelect(place);
                  }}
                  style={{ 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div className="flex-shrink-0 text-lg mr-2">
                    {getPlaceIcon(place.types)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium truncate text-xs ${
                        selectedParking?.place_id === place.place_id ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {place.name}
                        {selectedParking?.place_id === place.place_id && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${availability.bgColor} ${availability.color}`}>
                          {availability.icon}
                        </span>
                        {place.distance && (
                          <span className={`text-xs font-medium ${
                            selectedParking?.place_id === place.place_id ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {formatDistance(place.distance)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 truncate">
                        {place.types[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      {place.capacity && place.occupied !== undefined && (
                        <p className="text-xs text-gray-500">
                          {place.capacity - place.occupied}/{place.capacity}
                        </p>
                      )}
                    </div>
                    {place.rating && (
                      <p className="text-xs text-yellow-600">⭐ {place.rating}/5</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {nearbyPlaces.length > 9 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              And {nearbyPlaces.length - 9} more parking locations shown on map
            </p>
          )}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>
          📍 Interactive map showing venue location and surrounding area. 
          {showNearbyPlaces && ' Markers show nearby parking facilities important for event planning.'}
          {showHotspots && hotspots.length > 0 && ' Colored circles indicate predicted crowd density areas.'}
        </p>
      </div>
    </Card>
  );
};

export default VenueLayoutMap;
