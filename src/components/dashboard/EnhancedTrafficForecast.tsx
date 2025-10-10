import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { TrendingUp, Clock, AlertTriangle, Car, Train, Bus } from 'lucide-react';
import { fixEventDate, debugEventDates } from '../../utils/fixEventDate';

interface EnhancedTrafficForecastProps {
  venueLocation: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  eventDate: string;
  eventTimeRange?: {
    start: string;
    end: string;
  };
}

interface TrafficData {
  route: string;
  currentDuration: number;
  freeFlowDuration: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  confidence: number;
  lastUpdated: Date;
}

interface TransitData {
  station: string;
  service: 'MRT' | 'LRT' | 'BUS';
  frequency: number;
  capacity: number;
  occupancy: number;
  nextArrival: number;
}

const EnhancedTrafficForecast: React.FC<EnhancedTrafficForecastProps> = ({
  venueLocation,
  eventDate,
  eventTimeRange
}) => {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [transitData, setTransitData] = useState<TransitData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [cachedEnhancedData, setCachedEnhancedData] = useState<any>(null);
  const [isApiCallInProgress, setIsApiCallInProgress] = useState(false);

  const fetchEnhancedTrafficData = useCallback(async () => {
    if (loading || isApiCallInProgress) {
      console.log('⏳ Enhanced traffic forecast already loading, skipping duplicate request');
      return;
    }
    
    // Check if we have cached data
    if (cachedEnhancedData) {
      const cacheAge = Date.now() - cachedEnhancedData.timestamp;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (cacheAge < fiveMinutes) {
        console.log('📊 Using cached enhanced traffic data');
        setTrafficData(cachedEnhancedData.trafficData);
        setTransitData(cachedEnhancedData.transitData);
        setLastUpdated(new Date());
        return;
      } else {
        console.log('📊 Cache expired, fetching fresh enhanced traffic data');
      }
    }
    
    setIsApiCallInProgress(true);
    setLoading(true);
    setError(null);

    try {
      console.log('🚦 Fetching enhanced traffic forecast for:', venueLocation);
      
      const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        throw new Error('Google Maps API key not found');
      }

      // Define multiple routes to the venue
      const routes = [
        {
          name: 'From KLCC',
          origin: '3.1579,101.7116', // KLCC coordinates
          destination: `${venueLocation.lat},${venueLocation.lng}`
        },
        {
          name: 'From KL Sentral',
          origin: '3.1347,101.6869', // KL Sentral coordinates
          destination: `${venueLocation.lat},${venueLocation.lng}`
        },
        {
          name: 'From Bukit Bintang',
          origin: '3.1478,101.7042', // Bukit Bintang coordinates
          destination: `${venueLocation.lat},${venueLocation.lng}`
        }
      ];

      const trafficResults: TrafficData[] = [];
      const transitResults: TransitData[] = [];

      // Fetch traffic data for each route
      for (const route of routes) {
        try {
          // Fix event date if it's in the past
          const fixedEventDate = fixEventDate(eventDate);
          console.log(`📅 Original event date: ${eventDate}`);
          console.log(`📅 Fixed event date: ${fixedEventDate}`);
          
          // Debug the date issue
          debugEventDates(eventDate);
          
          // Use event-specific time instead of current time
          let eventDateTime = new Date(fixedEventDate);
          
          // If we have eventTimeRange, use the start time from the range
          if (eventTimeRange?.start) {
            const [time, period] = eventTimeRange.start.split(' ');
            let [hour, minute] = time.split(':').map(Number);
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            eventDateTime.setHours(hour, minute, 0, 0);
            console.log(`📅 Using event-specific time: ${eventDateTime.toLocaleString()}`);
          }
          
          const eventTimestamp = Math.floor(eventDateTime.getTime() / 1000);
          
          // Use CORS proxy to avoid browser CORS restrictions
          console.log(`🔗 Making Google Maps API call via CORS proxy for ${route.name} at event time: ${eventDateTime.toLocaleString()}`);
          
          // Build the Google Maps API URL
          const googleApiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${route.origin}&destination=${route.destination}&departure_time=${eventTimestamp}&traffic_model=best_guess&key=${googleApiKey}`;
          
          // Use CORS proxy to bypass browser CORS restrictions
          const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(googleApiUrl)}`;
          
          console.log(`🔗 Making request via CORS proxy: ${corsProxyUrl.substring(0, 100)}...`);
          
          const response = await fetch(corsProxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });

          console.log(`📊 Response status: ${response.status}`);
          console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error Response:`, errorText);
            throw new Error(`Google Maps API failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`📊 API Response for ${route.name}:`, data);

          if (data.routes && data.routes.length > 0) {
            const routeData = data.routes[0];
            const leg = routeData.legs[0];
            
            const currentDuration = leg.duration.value;
            const freeFlowDuration = leg.duration_in_traffic?.value || leg.duration.value;
            const congestionRatio = currentDuration / freeFlowDuration;
            
            let congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
            if (congestionRatio < 1.2) congestionLevel = 'LOW';
            else if (congestionRatio < 1.5) congestionLevel = 'MODERATE';
            else if (congestionRatio < 2.0) congestionLevel = 'HIGH';
            else congestionLevel = 'SEVERE';

            trafficResults.push({
              route: route.name,
              currentDuration: Math.round(currentDuration / 60), // Convert to minutes
              freeFlowDuration: Math.round(freeFlowDuration / 60),
              congestionLevel,
              confidence: 0.9,
              lastUpdated: new Date()
            });

            console.log(`✅ Real Google Maps data for ${route.name}: ${congestionLevel} congestion`);
          } else {
            throw new Error(`No routes found for ${route.name}`);
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Failed to fetch real traffic data for ${route.name}:`, error);
          // No fallback - we only use real data
        }
      }

      // No mock transit data - only use real data
      console.log('🚇 Transit data will be loaded from real APIs when available');

      setTrafficData(trafficResults);
      setTransitData(transitResults);
      setLastUpdated(new Date());

      // Cache the enhanced traffic data
      setCachedEnhancedData({
        trafficData: trafficResults,
        transitData: transitResults,
        timestamp: Date.now()
      });

      console.log('✅ Enhanced traffic forecast completed:', {
        trafficRoutes: trafficResults.length,
        transitServices: transitResults.length
      });

    } catch (error) {
      console.error('❌ Enhanced traffic forecast failed:', error);
      setError('Failed to load traffic forecast data');
    } finally {
      setLoading(false);
      setIsApiCallInProgress(false);
    }
  }, [venueLocation, cachedEnhancedData, isApiCallInProgress]);

  // Auto-fetch traffic data when component mounts
  useEffect(() => {
    if (venueLocation && !loading && trafficData.length === 0) {
      console.log('🚀 Auto-fetching enhanced traffic forecast on component mount');
      fetchEnhancedTrafficData();
    }
  }, [venueLocation, fetchEnhancedTrafficData]);

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'SEVERE': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'MRT': return <Train className="w-4 h-4" />;
      case 'LRT': return <Train className="w-4 h-4" />;
      case 'BUS': return <Bus className="w-4 h-4" />;
      default: return <Car className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" className="mr-2" />
          <span className="text-gray-600">Loading enhanced traffic forecast...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <div className="flex items-center gap-2 text-red-600 p-4">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Enhanced Traffic Forecast
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              onClick={fetchEnhancedTrafficData}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Traffic Routes */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Car className="h-4 w-4" />
            Traffic Routes
          </h4>
          <div className="space-y-3">
            {trafficData.map((route, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{route.route}</div>
                  <div className="text-sm text-gray-600">
                    {route.currentDuration} min (vs {route.freeFlowDuration} min free flow)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCongestionColor(route.congestionLevel)}`}>
                    {route.congestionLevel}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(route.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transit Services */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Train className="h-4 w-4" />
            Public Transit
          </h4>
          <div className="space-y-3">
            {transitData.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getServiceIcon(service.service)}
                  <div>
                    <div className="font-medium text-gray-900">{service.station}</div>
                    <div className="text-sm text-gray-600">
                      Every {service.frequency} min • Next in {service.nextArrival} min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {Math.round(service.occupancy * 100)}% full
                  </div>
                  <div className="text-xs text-gray-500">
                    {service.capacity} capacity
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedTrafficForecast;
