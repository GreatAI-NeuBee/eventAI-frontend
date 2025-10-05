import React, { useState, useEffect, useCallback } from 'react';
import { Phone, RefreshCw, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import StationSelector from '../common/StationSelector';
import { rapidKlAPI, Station } from '../../api/rapidKlApi';

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
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Real-time traffic API configuration
  const TRAFFIC_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
  const TRAFFIC_API_BASE = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';

  useEffect(() => {
    if (venueLocation.lat && venueLocation.lng) {
      loadTransitForecast();
    }
  }, [venueLocation, eventDate, expectedCapacity]);

  // Auto-refresh real-time data every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !selectedStation) return;
    
    const interval = setInterval(() => {
      fetchRealTimeTrafficData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedStation]);

  // Fetch real-time traffic data from TomTom API
  const fetchRealTimeTrafficData = useCallback(async () => {
    if (!selectedStation) return;
    
    try {
      const response = await fetch(
        `${TRAFFIC_API_BASE}?key=${TRAFFIC_API_KEY}&point=${selectedStation.latitude},${selectedStation.longitude}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
        setLastUpdated(new Date());
        console.log('🚦 Real-time traffic data updated:', data);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch real-time traffic data:', error);
    }
  }, [selectedStation]);

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
          
          // Set first station as selected by default
          if (nearbyStations.length > 0) {
            setSelectedStation(nearbyStations[0]);
            // Fetch real-time data for the selected station
            setTimeout(() => fetchRealTimeTrafficData(), 1000);
          }
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
        distance: 200,
        latitude: venueLocation.lat + 0.001,
        longitude: venueLocation.lng + 0.001
      },
      {
        id: 'SBK07',
        name: 'Serdang-Raya Utara',
        agency: 'mrt',
        distance: 800,
        latitude: venueLocation.lat - 0.002,
        longitude: venueLocation.lng + 0.003
      },
      {
        id: 'KJ14',
        name: 'Sri Petaling',
        agency: 'lrt',
        distance: 1200,
        latitude: venueLocation.lat + 0.005,
        longitude: venueLocation.lng - 0.002
      }
    ];
    setStations(mockStations);
    
    // Set first station as selected by default
    if (mockStations.length > 0) {
      setSelectedStation(mockStations[0]);
      // Fetch real-time data for the selected station
      setTimeout(() => fetchRealTimeTrafficData(), 1000);
    }
  };


  const handleStationChange = (station: Station) => {
    setSelectedStation(station);
    // Fetch real-time data for the new station
    fetchRealTimeTrafficData();
  };

  // const getAgencyIcon = (agency: RapidKlAgency) => {
  //   switch (agency) {
  //     case 'lrt':
  //     case 'mrt':
  //       return <Train className="w-4 h-4" />;
  //     case 'monorail':
  //       return <Train className="w-4 h-4" />;
  //     case 'bus':
  //     case 'brt':
  //       return <Bus className="w-4 h-4" />;
  //     default:
  //       return <MapPin className="w-4 h-4" />;
  //   }
  // };

  // const getAgencyColor = (agency: RapidKlAgency) => {
  //   switch (agency) {
  //     case 'lrt':
  //       return 'text-blue-600 bg-blue-100';
  //     case 'mrt':
  //       return 'text-green-600 bg-green-100';
  //     case 'monorail':
  //       return 'text-purple-600 bg-purple-100';
  //     case 'bus':
  //     case 'brt':
  //       return 'text-orange-600 bg-orange-100';
  //     default:
  //       return 'text-gray-600 bg-gray-100';
  //   }
  // };

  // const formatDistance = (distance: number) => {
  //   if (distance < 1000) {
  //     return `${Math.round(distance)}m`;
  //   }
  //   return `${(distance / 1000).toFixed(1)}km`;
  // };

  const handleContactRapidKl = () => {
    window.open('https://www.myrapid.com.my/contact-us', '_blank');
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
      {/* Enhanced Header with Real-time Status */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="mr-2 text-2xl">🚌</span>
              Real-Time Transit Forecast
            </h3>
            {realTimeData && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Data</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchRealTimeTrafficData}
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh Now
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "primary" : "outline"}
              size="sm"
              className="text-xs px-3 py-1"
            >
              <Clock className="w-3 h-3 mr-1" />
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
          </div>
        </div>
        
        {/* Real-time Status Bar */}
        {realTimeData && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Current Traffic Level: {realTimeData.flowSegmentData?.currentSpeed || 'N/A'} km/h
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Free Flow Speed: {realTimeData.flowSegmentData?.freeFlowSpeed || 'N/A'} km/h
                  </span>
                </div>
              </div>
              <div className="text-xs text-green-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
        
        {/* Station Selector */}
        {stations.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Station
            </label>
            <StationSelector
              stations={stations}
              value={selectedStation}
              onChange={handleStationChange}
              placeholder="Choose a transit station"
              name="selectedStation"
            />
          </div>
        )}

        
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
