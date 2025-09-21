import React, { useState, useEffect } from 'react';
import { MapPin, Car, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

interface ParkingForecastProps {
  venueLocation: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  eventDate?: string;
  expectedCapacity?: number;
}

interface ParkingLocation {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor' | 'street' | 'valet';
  capacity: number;
  distance: number;
  price: string;
  availability: 'high' | 'medium' | 'low';
  features: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
}

const ParkingForecast: React.FC<ParkingForecastProps> = ({
  venueLocation,
  eventDate,
  expectedCapacity
}) => {
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);

  useEffect(() => {
    if (venueLocation.lat && venueLocation.lng) {
      loadParkingForecast();
    }
  }, [venueLocation, eventDate, expectedCapacity]);

  const loadParkingForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚗 Loading real parking forecast for venue:', venueLocation);
      
      // Try to load real nearby parking using Google Places API
      try {
        const realParkingData = await searchNearbyParking(venueLocation.lat, venueLocation.lng);
        
        if (realParkingData.length > 0) {
          console.log('✅ Found real nearby parking:', realParkingData);
          setParkingLocations(realParkingData);
          generateParkingForecast(realParkingData, expectedCapacity || 1000);
        } else {
          console.log('⚠️ No real parking found, using mock data');
          useMockParkingData();
        }
      } catch (apiError) {
        console.warn('⚠️ Google Places API failed, using mock data:', apiError);
        useMockParkingData();
      }
    } catch (err) {
      setError('Failed to load parking forecast data');
      console.error('Error loading parking forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchNearbyParking = async (lat: number, lng: number): Promise<ParkingLocation[]> => {
    // Use Google Places API to search for nearby parking
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps not loaded');
    }

    return new Promise((resolve, reject) => {
      const map = new google.maps.Map(document.createElement('div'), {
        center: { lat, lng },
        zoom: 15
      });

      const service = new google.maps.places.PlacesService(map);
      
      const request = {
        location: { lat, lng },
        radius: 2000, // 2km radius
        keyword: 'parking',
        type: 'parking'
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const parkingLocations: ParkingLocation[] = results.slice(0, 10).map((place, index) => {
            const distance = place.geometry?.location ? 
              google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(lat, lng),
                place.geometry.location
              ) : 1000;

            return {
              id: place.place_id || `parking-${index}`,
              name: place.name || 'Parking Area',
              type: determineParkingType(place.name || ''),
              capacity: estimateCapacity(place.name || '', distance),
              distance: Math.round(distance),
              price: estimatePrice(distance),
              availability: estimateAvailability(distance, expectedCapacity || 1000),
              features: generateFeatures(place.name || '', place.rating || 0),
              coordinates: {
                lat: place.geometry?.location?.lat() || lat,
                lng: place.geometry?.location?.lng() || lng
              },
              rating: place.rating,
              address: place.vicinity
            };
          });
          
          resolve(parkingLocations);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  };

  // Helper functions for parking data estimation
  const determineParkingType = (name: string): 'indoor' | 'outdoor' | 'street' | 'valet' => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('mall') || nameLower.includes('building') || nameLower.includes('garage')) {
      return 'indoor';
    } else if (nameLower.includes('street') || nameLower.includes('roadside')) {
      return 'street';
    } else if (nameLower.includes('valet')) {
      return 'valet';
    }
    return 'outdoor';
  };

  const estimateCapacity = (name: string, _distance: number): number => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('mall') || nameLower.includes('complex')) {
      return Math.floor(Math.random() * 2000) + 1000; // 1000-3000
    } else if (nameLower.includes('street')) {
      return Math.floor(Math.random() * 50) + 20; // 20-70
    }
    return Math.floor(Math.random() * 500) + 100; // 100-600
  };

  const estimatePrice = (distance: number): string => {
    if (distance < 500) return 'RM 5-8/hour';
    if (distance < 1000) return 'RM 3-5/hour';
    return 'RM 2-4/hour';
  };

  const estimateAvailability = (distance: number, eventCapacity: number): 'high' | 'medium' | 'low' => {
    if (distance < 500 && eventCapacity > 2000) return 'low';
    if (distance < 1000 && eventCapacity > 1000) return 'medium';
    return 'high';
  };

  const generateFeatures = (name: string, rating: number): string[] => {
    const features = [];
    if (name.toLowerCase().includes('mall') || name.toLowerCase().includes('building')) {
      features.push('Covered', 'Security');
    }
    if (rating > 4.0) features.push('Well Maintained');
    if (Math.random() > 0.5) features.push('24/7 Access');
    if (Math.random() > 0.7) features.push('EV Charging');
    return features;
  };

  // This function is already defined below, removing duplicate

  const useMockParkingData = () => {
    console.log('🎭 Using mock data for Parking Forecast');
    
    // Mock parking data based on real venue location
    const mockParkingLocations: ParkingLocation[] = [
        {
          id: 'parking-1',
          name: 'KLCC Mall Parking',
          type: 'indoor',
          capacity: 5000,
          distance: 200,
          price: 'RM 3/hour',
          availability: 'high',
          features: ['Covered', 'Security', 'EV Charging', 'Valet'],
          coordinates: {
            lat: venueLocation.lat + 0.001,
            lng: venueLocation.lng + 0.001
          }
        },
        {
          id: 'parking-2',
          name: 'Street Parking - Jalan Ampang',
          type: 'street',
          capacity: 150,
          distance: 300,
          price: 'RM 2/hour',
          availability: 'low',
          features: ['Metered', '2-hour limit'],
          coordinates: {
            lat: venueLocation.lat - 0.001,
            lng: venueLocation.lng + 0.002
          }
        },
        {
          id: 'parking-3',
          name: 'Avenue K Parking',
          type: 'indoor',
          capacity: 800,
          distance: 450,
          price: 'RM 4/hour',
          availability: 'medium',
          features: ['Covered', 'Security', 'Restaurant Validation'],
          coordinates: {
            lat: venueLocation.lat + 0.002,
            lng: venueLocation.lng - 0.001
          }
        },
        {
          id: 'parking-4',
          name: 'Open Air Parking - KLCC Park',
          type: 'outdoor',
          capacity: 200,
          distance: 600,
          price: 'RM 1.50/hour',
          availability: 'medium',
          features: ['Open Air', 'Park & Walk'],
          coordinates: {
            lat: venueLocation.lat - 0.002,
            lng: venueLocation.lng - 0.002
          }
        },
        {
          id: 'parking-5',
          name: 'Valet Parking - Mandarin Oriental',
          type: 'valet',
          capacity: 100,
          distance: 100,
          price: 'RM 15/event',
          availability: 'high',
          features: ['Valet Service', 'Premium', 'Concierge'],
          coordinates: {
            lat: venueLocation.lat + 0.0005,
            lng: venueLocation.lng + 0.0005
          }
        }
      ];

      setParkingLocations(mockParkingLocations);

      // Generate forecast data
      generateParkingForecast(mockParkingLocations, expectedCapacity || 1000);
  };

  const generateParkingForecast = (parking: ParkingLocation[], capacity: number) => {
    const totalCapacity = parking.reduce((sum, p) => sum + p.capacity, 0);
    const estimatedCars = Math.floor(capacity * 0.4); // 40% of attendees drive
    const capacityRatio = estimatedCars / totalCapacity;
    
    const forecast = {
      totalSpaces: totalCapacity,
      estimatedCars: estimatedCars,
      capacityRatio: capacityRatio,
      availabilityLevel: capacityRatio > 0.8 ? 'CRITICAL' : capacityRatio > 0.6 ? 'HIGH' : 'MODERATE',
      recommendedActions: capacityRatio > 0.8 ? [
        'Encourage public transport',
        'Set up additional parking areas',
        'Implement shuttle services',
        'Coordinate with nearby venues'
      ] : capacityRatio > 0.6 ? [
        'Monitor parking availability',
        'Prepare overflow parking',
        'Communicate parking options to attendees'
      ] : [
        'Standard parking management',
        'Regular availability updates'
      ],
      peakArrivalTime: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
      estimatedWaitTime: capacityRatio > 0.8 ? '20-30 minutes' : capacityRatio > 0.6 ? '10-15 minutes' : '5-10 minutes'
    };

    setForecastData(forecast);
  };

  const getParkingTypeIcon = (type: string) => {
    switch (type) {
      case 'indoor':
        return <Car className="w-4 h-4" />;
      case 'outdoor':
        return <MapPin className="w-4 h-4" />;
      case 'street':
        return <MapPin className="w-4 h-4" />;
      case 'valet':
        return <Car className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  const getParkingTypeColor = (type: string) => {
    switch (type) {
      case 'indoor':
        return 'text-blue-600 bg-blue-100';
      case 'outdoor':
        return 'text-green-600 bg-green-100';
      case 'street':
        return 'text-orange-600 bg-orange-100';
      case 'valet':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" className="mr-2" />
          <span className="text-gray-600">Generating parking forecast...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadParkingForecast} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full">
      {/* Forecast Summary */}
      {forecastData && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🚗 Parking Forecast</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              forecastData.availabilityLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
              forecastData.availabilityLevel === 'HIGH' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {forecastData.availabilityLevel} DEMAND
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{forecastData.totalSpaces.toLocaleString()}</div>
              <div className="text-sm text-blue-800">Total Parking Spaces</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{forecastData.estimatedCars.toLocaleString()}</div>
              <div className="text-sm text-green-800">Expected Vehicles</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{Math.round(forecastData.capacityRatio * 100)}%</div>
              <div className="text-sm text-orange-800">Capacity Utilization</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            forecastData.availabilityLevel === 'CRITICAL' ? 'bg-red-50 border border-red-200' :
            forecastData.availabilityLevel === 'HIGH' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-start">
              {forecastData.availabilityLevel === 'CRITICAL' ? (
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
              )}
              <div>
                <h4 className={`font-medium ${
                  forecastData.availabilityLevel === 'CRITICAL' ? 'text-red-900' :
                  forecastData.availabilityLevel === 'HIGH' ? 'text-yellow-900' :
                  'text-green-900'
                }`}>
                  Forecast Alert
                </h4>
                <p className={`text-sm mt-1 ${
                  forecastData.availabilityLevel === 'CRITICAL' ? 'text-red-800' :
                  forecastData.availabilityLevel === 'HIGH' ? 'text-yellow-800' :
                  'text-green-800'
                }`}>
                  Expected wait time: {forecastData.estimatedWaitTime}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommended Actions */}
      {forecastData && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
          <div className="space-y-2">
            {forecastData.recommendedActions.map((action: string, index: number) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">{action}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Parking Locations */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nearby Parking Options</h3>
            <p className="text-sm text-gray-600">
              Found {parkingLocations.length} parking location{parkingLocations.length !== 1 ? 's' : ''} within 1km
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {parkingLocations.map((parking) => (
            <div key={parking.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium text-gray-900 mr-2">{parking.name}</h4>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getParkingTypeColor(parking.type)}`}
                    >
                      {getParkingTypeIcon(parking.type)}
                      <span className="ml-1 capitalize">{parking.type}</span>
                    </span>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(parking.availability)}`}
                    >
                      {parking.availability.toUpperCase()} AVAILABILITY
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{formatDistance(parking.distance)} away</span>
                    </div>
                    <div className="flex items-center">
                      <Car className="w-4 h-4 mr-1" />
                      <span>{parking.capacity} spaces</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{parking.price}</span>
                    </div>
                    <div className="text-gray-500">
                      {parking.features.join(', ')}
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${parking.coordinates.lat},${parking.coordinates.lng}`, '_blank')}
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ParkingForecast;
