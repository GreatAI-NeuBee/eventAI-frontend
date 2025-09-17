import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
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
  title = "Venue Layout & Nearby Facilities"
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [isLoading, setIsLoading] = useState(false);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(true);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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
        type: undefined // Will search for all types
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
      
      // Filter and format results
      const formattedPlaces: NearbyPlace[] = results
        .filter(place => place.place_id && place.geometry?.location)
        .slice(0, 20) // Limit to 20 places
        .map(place => ({
          place_id: place.place_id!,
          name: place.name || 'Unknown Place',
          location: {
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng()
          },
          types: place.types || [],
          rating: place.rating,
          vicinity: place.vicinity,
          formatted_address: place.vicinity
        }));

      setNearbyPlaces(formattedPlaces);
    } catch (error) {
      console.error('Error loading nearby places:', error);
      
      // Fallback to mock data for demo purposes
      const mockPlaces: NearbyPlace[] = [
        {
          place_id: 'mock-1',
          name: 'City Parking Garage',
          location: { 
            lat: venueLocation.lat + 0.002, 
            lng: venueLocation.lng + 0.001 
          },
          types: ['parking'],
          rating: 4.2
        },
        {
          place_id: 'mock-2',
          name: 'Downtown Restaurant',
          location: { 
            lat: venueLocation.lat - 0.001, 
            lng: venueLocation.lng + 0.002 
          },
          types: ['restaurant', 'food'],
          rating: 4.5
        },
        {
          place_id: 'mock-3',
          name: 'Metro Station',
          location: { 
            lat: venueLocation.lat + 0.003, 
            lng: venueLocation.lng - 0.001 
          },
          types: ['transit_station'],
          rating: 4.1
        },
        {
          place_id: 'mock-4',
          name: 'Medical Center',
          location: { 
            lat: venueLocation.lat - 0.002, 
            lng: venueLocation.lng - 0.003 
          },
          types: ['hospital', 'health'],
          rating: 4.7
        }
      ];
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
        <APIProvider apiKey={apiKey} libraries={['places']}>
          <Map
            defaultCenter={{ lat: venueLocation.lat, lng: venueLocation.lng }}
            defaultZoom={16}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="venue-layout-map"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Main Venue Marker */}
            <AdvancedMarker
              position={{ lat: venueLocation.lat, lng: venueLocation.lng }}
              title={venueLocation.name || venueLocation.address || 'Venue Location'}
            >
              <Pin 
                background="#ef4444" 
                glyphColor="#ffffff" 
                borderColor="#ffffff"
                scale={1.5}
              />
            </AdvancedMarker>

            {/* Nearby Places Markers */}
            {showNearbyPlaces && nearbyPlaces.map((place) => (
              <AdvancedMarker
                key={place.place_id}
                position={{ lat: place.location.lat, lng: place.location.lng }}
                title={`${place.name}${place.rating ? ` (${place.rating}⭐)` : ''}`}
              >
                <Pin 
                  background={getMarkerColor(place.types)} 
                  glyphColor="#ffffff" 
                  borderColor="#ffffff"
                  scale={0.8}
                />
              </AdvancedMarker>
            ))}

            {/* Hotspot Markers */}
            {showHotspots && hotspots.map((hotspot, index) => {
              const position = getHotspotMapPosition(hotspot);
              const color = hotspot.intensity >= 0.8 ? '#ef4444' : 
                          hotspot.intensity >= 0.6 ? '#f97316' : 
                          hotspot.intensity >= 0.4 ? '#eab308' : '#22c55e';
              
              return (
                <AdvancedMarker
                  key={`hotspot-${index}`}
                  position={position}
                  title={`${hotspot.location}: ${Math.round(hotspot.intensity * 100)}% density`}
                >
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-lg opacity-80"
                    style={{ backgroundColor: color }}
                  />
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading nearby facilities...</span>
        </div>
      )}

      {/* Nearby Places List */}
      {showNearbyPlaces && nearbyPlaces.length > 0 && !isLoading && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Nearby Facilities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {nearbyPlaces.slice(0, 9).map((place) => (
              <div key={place.place_id} className="flex items-center p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex-shrink-0 text-lg mr-2">
                  {getPlaceIcon(place.types)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-xs">{place.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {place.types[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {place.rating && (
                    <p className="text-xs text-yellow-600">⭐ {place.rating}/5</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {nearbyPlaces.length > 9 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              And {nearbyPlaces.length - 9} more facilities shown on map
            </p>
          )}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>
          📍 Interactive map showing venue location and surrounding area. 
          {showNearbyPlaces && ' Markers show nearby facilities important for event planning.'}
          {showHotspots && hotspots.length > 0 && ' Colored circles indicate predicted crowd density areas.'}
        </p>
      </div>
    </Card>
  );
};

export default VenueLayoutMap;
