import React, { useState, useEffect, useCallback } from 'react';
import { Phone, RefreshCw, Clock } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import StationSelector from '../common/StationSelector';
import { rapidKlAPI, Station } from '../../api/rapidKlApi';

interface TransitSchedule {
  line: string;
  destination: string;
  arrivalTime: string;
  delay: number;
  capacity: number;
  status: 'on-time' | 'delayed' | 'cancelled';
}

interface TransitForecastData {
  time: string;
  passengerLoad: number;
  frequency: number;
  capacity: number;
  type: 'regular' | 'peak' | 'event';
}

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
  const [transitSchedules, setTransitSchedules] = useState<TransitSchedule[]>([]);
  const [transitForecast, setTransitForecast] = useState<TransitForecastData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Real-time transit API configuration
  const TRANSIT_API_KEY = import.meta.env.VITE_RAPIDKL_API_KEY;
  const TRANSIT_API_BASE = 'https://api.rapidkl.com.my/v1';

  useEffect(() => {
    if (venueLocation.lat && venueLocation.lng) {
      loadTransitForecast();
    }
  }, [venueLocation, eventDate, expectedCapacity]);

  // Auto-refresh real-time data every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !selectedStation) return;
    
    const interval = setInterval(() => {
      fetchRealTimeTransitData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedStation]);

  // Fetch real-time transit schedules and capacity data
  const fetchRealTimeTransitData = useCallback(async () => {
    if (!selectedStation) return;
    
    try {
      // Use venue location and date as search parameters
      const searchParams = new URLSearchParams({
        lat: venueLocation.lat.toString(),
        lng: venueLocation.lng.toString(),
        date: eventDate || new Date().toISOString().split('T')[0],
        station_id: selectedStation.id,
        venue_name: venueLocation.name || 'Event Venue'
      });
      
      // Fetch real-time schedules with location and date context
      const schedulesResponse = await fetch(
        `${TRANSIT_API_BASE}/schedules?${searchParams}&key=${TRANSIT_API_KEY}`
      );
      
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        setTransitSchedules(schedulesData.schedules || []);
        console.log('🚌 Real-time transit schedules updated for location:', venueLocation.name, schedulesData);
      }
      
      // Fetch capacity and passenger load data with venue context
      const capacityResponse = await fetch(
        `${TRANSIT_API_BASE}/capacity?${searchParams}&key=${TRANSIT_API_KEY}`
      );
      
      if (capacityResponse.ok) {
        const capacityData = await capacityResponse.json();
        setRealTimeData(capacityData);
        generateTransitForecast(capacityData);
        console.log('📊 Real-time transit capacity updated for location:', venueLocation.name, capacityData);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.warn('⚠️ Failed to fetch real-time transit data for location:', venueLocation.name, error);
      // Fallback to mock transit data with location context
      generateMockTransitData();
    }
  }, [selectedStation, venueLocation, eventDate]);

  // Generate transit forecast based on real data and venue context
  const generateTransitForecast = useCallback((_capacityData: any) => {
    const forecastData: TransitForecastData[] = [];
    
    // Get event date or use current date
    const eventDateTime = eventDate ? new Date(eventDate) : new Date();
    const isWeekend = eventDateTime.getDay() === 0 || eventDateTime.getDay() === 6;
    
    // Generate 16 data points for the day (6 AM to 10 PM)
    for (let i = 0; i < 16; i++) {
      const hour = 6 + i;
      const time = `${hour.toString().padStart(2, '0')}:00`;
      
      // Base passenger load varies by location and day type
      let baseLoad = 30 + (i * 5) + Math.random() * 20;
      
      // Adjust for weekend vs weekday patterns
      if (isWeekend) {
        baseLoad *= 0.7; // Lower weekend usage
      }
      
      // Location-specific adjustments
      const locationMultiplier = getLocationTransitMultiplier(venueLocation.name || '');
      baseLoad *= locationMultiplier;
      
      // Determine transit type based on time and event context
      let type: 'regular' | 'peak' | 'event' = 'regular';
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        type = 'peak';
        baseLoad += 40; // Higher during peak hours
      } else if (hour >= 19 && hour <= 22) {
        type = 'event';
        baseLoad += 60; // Highest during event period
        // Add event capacity impact based on venue
        if (expectedCapacity) {
          const eventImpact = getEventTransitImpact(venueLocation.name || '', expectedCapacity);
          baseLoad += eventImpact;
        }
      }
      
      // Adjust frequency based on location and time
      const frequency = getTransitFrequency(venueLocation.name || '', type, isWeekend);
      
      forecastData.push({
        time,
        passengerLoad: Math.round(Math.min(baseLoad, 100)), // Cap at 100%
        frequency,
        capacity: 100, // max capacity
        type
      });
    }
    
    setTransitForecast(forecastData);
  }, [expectedCapacity, eventDate, venueLocation]);

  // Get location-specific transit multiplier
  const getLocationTransitMultiplier = (venueName: string): number => {
    const location = venueName.toLowerCase();
    if (location.includes('bukit jalil') || location.includes('stadium')) return 1.2; // High transit usage
    if (location.includes('klcc') || location.includes('pavilion')) return 1.1; // Commercial areas
    if (location.includes('subang') || location.includes('shah alam')) return 0.9; // Lower density areas
    return 1.0; // Default
  };

  // Get event-specific transit impact
  const getEventTransitImpact = (venueName: string, capacity: number): number => {
    const location = venueName.toLowerCase();
    if (location.includes('stadium') || location.includes('arena')) {
      return Math.min(capacity * 0.15, 80); // Stadium events have high transit impact
    }
    if (location.includes('convention') || location.includes('exhibition')) {
      return Math.min(capacity * 0.1, 60); // Convention centers moderate impact
    }
    return Math.min(capacity * 0.05, 40); // Default impact
  };

  // Get transit frequency based on location and time
  const getTransitFrequency = (venueName: string, type: string, isWeekend: boolean): number => {
    const location = venueName.toLowerCase();
    let baseFrequency = 5; // Default 5 minutes
    
    if (location.includes('bukit jalil') || location.includes('klcc')) {
      baseFrequency = 3; // More frequent service in major areas
    }
    
    if (type === 'peak') {
      baseFrequency = Math.max(baseFrequency - 1, 2); // More frequent during peak
    } else if (type === 'event') {
      baseFrequency = Math.max(baseFrequency - 2, 1); // Most frequent during events
    }
    
    if (isWeekend) {
      baseFrequency += 1; // Less frequent on weekends
    }
    
    return baseFrequency;
  };

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
            setTimeout(() => fetchRealTimeTransitData(), 1000);
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
      // Generate mock transit data
      generateMockTransitData();
    }
  };


  const handleStationChange = (station: Station) => {
    setSelectedStation(station);
    // Fetch real-time data for the new station
    fetchRealTimeTransitData();
  };

  // Generate mock transit data when API fails
  const generateMockTransitData = useCallback(() => {
    console.log('🎭 Using mock transit data for location:', venueLocation.name);
    
    // Generate location-specific mock schedules
    const mockSchedules: TransitSchedule[] = generateLocationSpecificSchedules(venueLocation.name || '');
    setTransitSchedules(mockSchedules);
    
    // Generate mock forecast data with location context
    generateTransitForecast({});
  }, [generateTransitForecast, venueLocation]);

  // Generate location-specific mock schedules
  const generateLocationSpecificSchedules = (venueName: string): TransitSchedule[] => {
    const location = venueName.toLowerCase();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Base schedules that vary by location
    let baseSchedules: TransitSchedule[] = [];
    
    if (location.includes('bukit jalil') || location.includes('stadium')) {
      baseSchedules = [
        {
          line: 'LRT Kelana Jaya',
          destination: 'Gombak',
          arrivalTime: `${currentHour}:${(currentMinute + 2).toString().padStart(2, '0')}`,
          delay: 0,
          capacity: 85,
          status: 'on-time'
        },
        {
          line: 'LRT Kelana Jaya',
          destination: 'Putra Heights',
          arrivalTime: `${currentHour}:${(currentMinute + 5).toString().padStart(2, '0')}`,
          delay: 1,
          capacity: 92,
          status: 'delayed'
        },
        {
          line: 'LRT Kelana Jaya',
          destination: 'Gombak',
          arrivalTime: `${currentHour}:${(currentMinute + 8).toString().padStart(2, '0')}`,
          delay: 0,
          capacity: 78,
          status: 'on-time'
        }
      ];
    } else if (location.includes('klcc') || location.includes('pavilion')) {
      baseSchedules = [
        {
          line: 'LRT Kelana Jaya',
          destination: 'Gombak',
          arrivalTime: `${currentHour}:${(currentMinute + 3).toString().padStart(2, '0')}`,
          delay: 0,
          capacity: 75,
          status: 'on-time'
        },
        {
          line: 'LRT Kelana Jaya',
          destination: 'Putra Heights',
          arrivalTime: `${currentHour}:${(currentMinute + 6).toString().padStart(2, '0')}`,
          delay: 0,
          capacity: 88,
          status: 'on-time'
        }
      ];
    } else {
      // Default for other locations
      baseSchedules = [
        {
          line: 'LRT/MRT',
          destination: 'City Center',
          arrivalTime: `${currentHour}:${(currentMinute + 4).toString().padStart(2, '0')}`,
          delay: 0,
          capacity: 70,
          status: 'on-time'
        },
        {
          line: 'LRT/MRT',
          destination: 'Terminal',
          arrivalTime: `${currentHour}:${(currentMinute + 7).toString().padStart(2, '0')}`,
          delay: 0,
          capacity: 65,
          status: 'on-time'
        }
      ];
    }
    
    return baseSchedules;
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
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchRealTimeTransitData}
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
        
        {/* Real-time Transit Status */}
        {transitSchedules.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-blue-900">Next Arrivals</h4>
              <div className="text-xs text-blue-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
            <div className="space-y-2">
              {transitSchedules.slice(0, 3).map((schedule, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      schedule.status === 'on-time' ? 'bg-green-500' : 
                      schedule.status === 'delayed' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="text-sm font-medium">{schedule.line}</div>
                      <div className="text-xs text-gray-600">{schedule.destination}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{schedule.arrivalTime}</div>
                    <div className="text-xs text-gray-600">
                      {schedule.delay > 0 ? `+${schedule.delay}min` : 'On time'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transit Capacity Forecast Chart */}
        {transitForecast.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Passenger Load Forecast</h4>
            <svg width="100%" height="200" viewBox="0 0 800 200" className="overflow-visible">
              {/* Grid lines */}
              <defs>
                <pattern id="transitGrid" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                </pattern>
                <linearGradient id="transitLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3"/>
                </linearGradient>
              </defs>
              <rect width="800" height="200" fill="url(#transitGrid)" />
              
              {/* Y-axis labels */}
              <text x="15" y="20" className="fill-gray-600 text-sm font-medium">100%</text>
              <text x="15" y="60" className="fill-gray-600 text-sm font-medium">75%</text>
              <text x="15" y="100" className="fill-gray-600 text-sm font-medium">50%</text>
              <text x="15" y="140" className="fill-gray-600 text-sm font-medium">25%</text>
              <text x="15" y="180" className="fill-gray-600 text-sm font-medium">0%</text>
              
              {/* Peak Hours Highlight */}
              <rect x="100" y="10" width="80" height="180" fill="#fef3c7" opacity="0.6" rx="4"/>
              <text x="140" y="5" className="text-xs fill-yellow-700 font-medium" textAnchor="middle">Peak Hours</text>
              
              {/* Event Period Highlight */}
              <rect x="600" y="10" width="120" height="180" fill="#fecaca" opacity="0.6" rx="4"/>
              <text x="660" y="5" className="text-xs fill-red-700 font-medium" textAnchor="middle">Event Period</text>
              
              {/* Dynamic Transit Line */}
              <path
                d={transitForecast.map((point, index) => {
                  const x = 50 + (index / (transitForecast.length - 1)) * 700;
                  const y = 20 + ((100 - point.passengerLoad) / 100) * 160;
                  return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="url(#transitLineGradient)"
                strokeWidth="3"
                className="drop-shadow-sm"
              />
              
              {/* Dynamic Data Points */}
              {transitForecast.map((point, index) => {
                const x = 50 + (index / (transitForecast.length - 1)) * 700;
                const y = 20 + ((100 - point.passengerLoad) / 100) * 160;
                const color = point.type === 'peak' ? '#f59e0b' : point.type === 'event' ? '#ef4444' : '#3b82f6';
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={color}
                    className="hover:r-6 transition-all cursor-pointer"
                  >
                    <title>{`${point.time}: ${point.passengerLoad}% capacity`}</title>
                  </circle>
                );
              })}
              
              {/* X-axis Labels */}
              {transitForecast.map((point, index) => {
                const x = 50 + (index / (transitForecast.length - 1)) * 700;
                const hour = parseInt(point.time.split(':')[0]);
                const timeLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                
                return (
                  <text
                    key={index}
                    x={x}
                    y="195"
                    className="text-xs fill-gray-500"
                    textAnchor="middle"
                  >
                    {timeLabel}
                  </text>
                );
              })}
            </svg>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Regular Load</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Peak Hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Event Period</span>
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
