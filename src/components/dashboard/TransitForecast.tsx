import React, { useState, useEffect } from 'react';
import { Phone, RefreshCw } from 'lucide-react';
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
          
          // Set first station as selected by default
          if (nearbyStations.length > 0) {
            setSelectedStation(nearbyStations[0]);
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
    }
  };


  const handleStationChange = (station: Station) => {
    setSelectedStation(station);
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
      {/* Header with Station Selector */}
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

      {/* Traffic Forecast Graph */}
      {selectedStation && (
        <Card className="mb-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Transit Traffic Forecast
            </h3>
            <p className="text-xs text-gray-600">
              Expected passenger count throughout the day for {selectedStation?.name}
            </p>
          </div>
          
          {/* Mock Traffic Graph */}
          <div className="relative bg-gray-50 rounded-lg p-4">
            <svg width="100%" height="200" viewBox="0 0 800 200" className="overflow-visible">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="800" height="200" fill="url(#grid)" />
              
              {/* Y-axis labels */}
              <text x="10" y="20" className="fill-gray-500 text-xs">500</text>
              <text x="10" y="60" className="fill-gray-500 text-xs">400</text>
              <text x="10" y="100" className="fill-gray-500 text-xs">300</text>
              <text x="10" y="140" className="fill-gray-500 text-xs">200</text>
              <text x="10" y="180" className="fill-gray-500 text-xs">100</text>
              
              {/* Mock traffic line */}
              <path
                d="M 50,180 L 80,170 L 110,160 L 140,140 L 170,120 L 200,100 L 230,90 L 260,95 L 290,110 L 320,130 L 350,150 L 380,160 L 410,170 L 440,165 L 470,150 L 500,130 L 530,110 L 560,90 L 590,70 L 620,60 L 650,80 L 680,100 L 710,120 L 740,140"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                className="drop-shadow-sm"
              />
              
              {/* Event period highlight */}
              <rect x="500" y="0" width="120" height="200" fill="rgba(239, 68, 68, 0.1)" />
              <text x="560" y="15" className="fill-red-600 text-xs font-medium" textAnchor="middle">Event Period</text>
              
              {/* Peak hours highlight */}
              <rect x="140" y="0" width="80" height="200" fill="rgba(245, 158, 11, 0.1)" />
              <rect x="620" y="0" width="80" height="200" fill="rgba(245, 158, 11, 0.1)" />
              
              {/* Data points */}
              <circle cx="50" cy="180" r="3" fill="#3b82f6" />
              <circle cx="140" cy="140" r="3" fill="#f59e0b" />
              <circle cx="200" cy="100" r="3" fill="#f59e0b" />
              <circle cx="560" cy="90" r="3" fill="#ef4444" />
              <circle cx="590" cy="70" r="3" fill="#ef4444" />
              <circle cx="650" cy="80" r="3" fill="#f59e0b" />
              <circle cx="680" cy="100" r="3" fill="#f59e0b" />
              
              {/* X-axis labels */}
              <text x="50" y="195" className="fill-gray-500 text-xs" textAnchor="middle">00:00</text>
              <text x="170" y="195" className="fill-gray-500 text-xs" textAnchor="middle">06:00</text>
              <text x="290" y="195" className="fill-gray-500 text-xs" textAnchor="middle">12:00</text>
              <text x="410" y="195" className="fill-gray-500 text-xs" textAnchor="middle">18:00</text>
              <text x="530" y="195" className="fill-gray-500 text-xs" textAnchor="middle">24:00</text>
            </svg>
            
            {/* Legend */}
            <div className="flex justify-center space-x-6 mt-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Regular Traffic</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Peak Hours (7-9 AM, 5-7 PM)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>Event Period</span>
              </div>
            </div>
          </div>
        </Card>
      )}

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
