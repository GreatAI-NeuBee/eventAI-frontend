import React, { useState, useEffect } from 'react';
import { MapPin, Train, Bus, Phone, ExternalLink, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { rapidKlAPI, Station, RapidKlAgency, VehiclePosition } from '../../api/rapidKlApi';

interface TransitForecastProps {
  venueLocation: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  eventDate?: string;
  expectedCapacity?: number;
}

const TransitForecast: React.FC<TransitForecastProps> = ({
  venueLocation,
  eventDate,
  expectedCapacity
}) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [vehiclePositions, setVehiclePositions] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequencies, setFrequencies] = useState<Record<string, any>>({});
  const [forecastData, setForecastData] = useState<any>(null);

  useEffect(() => {
    if (venueLocation.lat && venueLocation.lng) {
      loadTransitForecast();
    }
  }, [venueLocation, eventDate, expectedCapacity]);

  const loadTransitForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚌 Loading real transit forecast for venue:', venueLocation);
      
      // Try to load real nearby stations first
      try {
        // Load nearby stations using RapidKL API
        const nearbyStations = await rapidKlAPI.findNearbyStations(
          venueLocation.lat,
          venueLocation.lng,
          3 // 3km radius for forecast
        );
        
        if (nearbyStations.length > 0) {
          console.log('✅ Found real nearby stations:', nearbyStations);
          setStations(nearbyStations);

          // Load vehicle positions
          const allPositions = await rapidKlAPI.getAllVehiclePositions();
          setVehiclePositions(allPositions);

          // Load frequency data
          await loadStationFrequencies(nearbyStations);

          // Generate forecast data
          generateForecastData(nearbyStations, allPositions, expectedCapacity || 1000);
        } else {
          // Fallback to mock data if no real stations found
          console.log('⚠️ No real stations found, using mock data');
          useMockTransitData();
        }
      } catch (apiError) {
        console.warn('⚠️ RapidKL API failed, using mock data:', apiError);
        useMockTransitData();
      }
    } catch (err) {
      setError('Failed to load transit forecast data');
      console.error('Error loading transit forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const useMockTransitData = () => {
    console.log('🎭 Using mock data for Transit Forecast');
    
    // Mock nearby stations based on real venue location
    const mockStations: Station[] = [
      {
        id: 'KJ15',
        name: 'Bukit Jalil',
        agency: 'lrt',
        coordinates: { lat: venueLocation.lat + 0.001, lng: venueLocation.lng + 0.001 },
        distance: 0.2
      },
      {
        id: 'SBK07',
        name: 'Serdang-Raya Utara',
        agency: 'mrt',
        coordinates: { lat: venueLocation.lat - 0.002, lng: venueLocation.lng + 0.003 },
        distance: 0.8
      },
      {
        id: 'KJ14',
        name: 'Sri Petaling',
        agency: 'lrt',
        coordinates: { lat: venueLocation.lat + 0.005, lng: venueLocation.lng - 0.002 },
        distance: 1.2
      }
    ];
    setStations(mockStations);

    // Mock vehicle positions (empty for now)
    setVehiclePositions([]);

    // Generate mock forecast data
    generateMockForecastData(mockStations, expectedCapacity || 1000);
  };

  const loadStationFrequencies = async (stations: Station[]) => {
    const frequencyPromises = stations.map(async (station) => {
      if (station.agency) {
        try {
          const freq = await rapidKlAPI.getStationFrequency(station.id, station.agency);
          return { stationId: station.id, frequency: freq };
        } catch (err) {
          console.warn(`Failed to load frequency for ${station.name}:`, err);
          return null;
        }
      }
      return null;
    });

    const results = await Promise.all(frequencyPromises);
    const frequencyMap: Record<string, any> = {};
    
    results.forEach(result => {
      if (result) {
        frequencyMap[result.stationId] = result.frequency;
      }
    });
    
    setFrequencies(frequencyMap);
  };

  const generateMockForecastData = (stations: Station[], capacity: number) => {
    // Generate mock forecast data for development
    const forecast = {
      totalStations: stations.length,
      estimatedTransitUsers: Math.floor(capacity * 0.3), // 30% of attendees use transit
      peakArrivalTime: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
      recommendedFrequencies: stations.map(station => ({
        stationId: station.id,
        stationName: station.name,
        currentFrequency: 6, // Mock current frequency
        recommendedFrequency: Math.max(12, Math.floor(capacity / 100)), // Scale with capacity
        priority: station.distance && station.distance < 1 ? 'HIGH' : 'MEDIUM'
      })),
      congestionForecast: {
        level: capacity > 5000 ? 'HIGH' : capacity > 2000 ? 'MEDIUM' : 'LOW',
        estimatedWaitTime: capacity > 5000 ? '15-20 minutes' : capacity > 2000 ? '10-15 minutes' : '5-10 minutes'
      }
    };

    setForecastData(forecast);
  };

  const generateForecastData = (stations: Station[], positions: VehiclePosition[], capacity: number) => {
    // Calculate forecast based on event capacity and station proximity
    const forecast = {
      totalStations: stations.length,
      estimatedTransitUsers: Math.floor(capacity * 0.3), // 30% of attendees use transit
      peakArrivalTime: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
      recommendedFrequencies: stations.map(station => ({
        stationId: station.id,
        stationName: station.name,
        currentFrequency: frequencies[station.id]?.currentFrequency || 6,
        recommendedFrequency: Math.max(12, Math.floor(capacity / 100)), // Scale with capacity
        priority: station.distance && station.distance < 1000 ? 'HIGH' : 'MEDIUM'
      })),
      congestionForecast: {
        level: capacity > 5000 ? 'HIGH' : capacity > 2000 ? 'MEDIUM' : 'LOW',
        estimatedWaitTime: capacity > 5000 ? '15-20 minutes' : capacity > 2000 ? '10-15 minutes' : '5-10 minutes'
      }
    };

    setForecastData(forecast);
  };

  const getAgencyIcon = (agency: RapidKlAgency) => {
    switch (agency) {
      case 'lrt':
      case 'mrt':
        return <Train className="w-4 h-4" />;
      case 'monorail':
        return <Train className="w-4 h-4" />;
      case 'bus':
      case 'brt':
        return <Bus className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getAgencyColor = (agency: RapidKlAgency) => {
    switch (agency) {
      case 'lrt':
        return 'text-blue-600 bg-blue-100';
      case 'mrt':
        return 'text-green-600 bg-green-100';
      case 'monorail':
        return 'text-purple-600 bg-purple-100';
      case 'bus':
      case 'brt':
        return 'text-orange-600 bg-orange-100';
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

  const handleContactRapidKl = () => {
    window.open('https://www.myrapid.com.my/contact-us', '_blank');
  };

  const handleRequestFrequencyIncrease = (station: Station) => {
    const message = `Event Details:
- Venue: ${venueLocation.name || venueLocation.address}
- Date: ${eventDate || 'TBD'}
- Expected Capacity: ${expectedCapacity || 'TBD'} people
- Station: ${station.name}
- Current Frequency: ${frequencies[station.id]?.currentFrequency || 'Unknown'} trains/hour
- Recommended Frequency: ${Math.max(12, Math.floor((expectedCapacity || 1000) / 100))} trains/hour

Please contact Rapid KL to request increased frequency for this event.`;
    
    alert(message);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" className="mr-2" />
          <span className="text-gray-600">Generating transit forecast...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadTransitForecast} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full animate-fade-in">
      {/* Forecast Summary */}
      {forecastData && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2 text-lg">🚌</span>
              Transit Forecast
            </h3>
            <Button
              onClick={loadTransitForecast}
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded border">
              <div className="text-xl font-bold text-gray-800 mb-1">{forecastData.totalStations}</div>
              <div className="text-xs text-gray-600">Stations</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded border">
              <div className="text-xl font-bold text-gray-800 mb-1">{forecastData.estimatedTransitUsers}</div>
              <div className="text-xs text-gray-600">Users</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded border">
              <div className="text-xl font-bold text-gray-800 mb-1">{forecastData.congestionForecast.level}</div>
              <div className="text-xs text-gray-600">Congestion</div>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 rounded text-xs">
            <span className="font-medium text-yellow-900">Alert: </span>
            <span className="text-yellow-800">Wait time: {forecastData.congestionForecast.estimatedWaitTime}</span>
          </div>
        </Card>
      )}

      {/* Nearby Stations */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Nearby Transit Stations</h3>
            <p className="text-xs text-gray-600">
              {stations.length} station{stations.length !== 1 ? 's' : ''} within 3km
            </p>
          </div>
          <Button
            onClick={handleContactRapidKl}
            variant="outline"
            size="sm"
            className="text-xs px-2 py-1"
          >
            <Phone className="w-3 h-3 mr-1" />
            Contact
          </Button>
        </div>

        <div className="space-y-2">
          {stations.map((station) => {
            const frequency = frequencies[station.id];
            const forecast = forecastData?.recommendedFrequencies.find(f => f.stationId === station.id);
            
            return (
              <div key={station.id} className="p-2 border border-gray-200 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h4 className="font-medium text-gray-900 mr-2 text-sm">{station.name}</h4>
                      {station.agency && (
                        <span
                          className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${getAgencyColor(station.agency)}`}
                        >
                          {getAgencyIcon(station.agency)}
                          <span className="ml-1 uppercase text-xs">{station.agency}</span>
                        </span>
                      )}
                      {forecast?.priority === 'HIGH' && (
                        <span className="ml-1 px-1 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                          HIGH
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-600 mb-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{formatDistance(station.distance || 0)} away</span>
                    </div>

                    {frequency && forecast && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Current:</span>
                          <span className="ml-1 font-medium">{frequency.currentFrequency}/hr</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Recommended:</span>
                          <span className="ml-1 font-medium text-green-600">{forecast.recommendedFrequency}/hr</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 ml-2">
                    <Button
                      onClick={() => handleRequestFrequencyIncrease(station)}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      Request
                    </Button>
                    
                    <Button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Contact Rapid KL */}
      <Card>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                Request Enhanced Transit Services
              </h4>
              <p className="mt-1 text-sm text-blue-700">
                Contact Rapid KL to request increased frequency, special event services, 
                or additional routes for your event. They can provide customized transit solutions.
              </p>
              <div className="mt-3">
                <Button
                  onClick={handleContactRapidKl}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  Contact Rapid KL
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TransitForecast;
