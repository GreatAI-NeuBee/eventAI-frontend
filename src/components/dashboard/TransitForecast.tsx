import React, { useState, useEffect } from 'react';
import { MapPin, Train, Bus, Clock, Phone, ExternalLink, RefreshCw } from 'lucide-react';
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
      // Load nearby stations
      const nearbyStations = await rapidKlAPI.findNearbyStations(
        venueLocation.lat,
        venueLocation.lng,
        3 // 3km radius for forecast
      );
      setStations(nearbyStations);

      // Load vehicle positions
      const allPositions = await rapidKlAPI.getAllVehiclePositions();
      setVehiclePositions(allPositions);

      // Load frequency data
      await loadStationFrequencies(nearbyStations);

      // Generate forecast data
      generateForecastData(nearbyStations, allPositions, expectedCapacity || 1000);
    } catch (err) {
      setError('Failed to load transit forecast data');
      console.error('Error loading transit forecast:', err);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6">
      {/* Forecast Summary */}
      {forecastData && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transit Forecast Summary</h3>
            <Button
              onClick={loadTransitForecast}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{forecastData.totalStations}</div>
              <div className="text-sm text-blue-800">Nearby Stations</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{forecastData.estimatedTransitUsers}</div>
              <div className="text-sm text-green-800">Expected Transit Users</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{forecastData.congestionForecast.level}</div>
              <div className="text-sm text-orange-800">Congestion Level</div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Forecast Alert</h4>
            <p className="text-sm text-yellow-800">
              Expected wait time: {forecastData.congestionForecast.estimatedWaitTime}
            </p>
          </div>
        </Card>
      )}

      {/* Nearby Stations */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nearby Transit Stations</h3>
            <p className="text-sm text-gray-600">
              Found {stations.length} station{stations.length !== 1 ? 's' : ''} within 3km
            </p>
          </div>
          <Button
            onClick={handleContactRapidKl}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <Phone className="w-4 h-4 mr-1" />
            Contact Rapid KL
          </Button>
        </div>

        <div className="space-y-3">
          {stations.map((station) => {
            const frequency = frequencies[station.id];
            const forecast = forecastData?.recommendedFrequencies.find(f => f.stationId === station.id);
            
            return (
              <div key={station.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="font-medium text-gray-900 mr-2">{station.name}</h4>
                      {station.agency && (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAgencyColor(station.agency)}`}
                        >
                          {getAgencyIcon(station.agency)}
                          <span className="ml-1 uppercase">{station.agency}</span>
                        </span>
                      )}
                      {forecast?.priority === 'HIGH' && (
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{formatDistance(station.distance || 0)} away</span>
                    </div>

                    {frequency && forecast && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Current Frequency:</span>
                          <span className="ml-1 font-medium">{frequency.currentFrequency} trains/hour</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Recommended:</span>
                          <span className="ml-1 font-medium text-green-600">{forecast.recommendedFrequency} trains/hour</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1 ml-4">
                    <Button
                      onClick={() => handleRequestFrequencyIncrease(station)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Request More Trains
                    </Button>
                    
                    <Button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`, '_blank')}
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
