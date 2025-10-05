import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import Card from '../common/Card';

interface TrafficForecastPanelProps {
  venueLocation: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
}

interface TrafficDataPoint {
  time: string;
  value: number;
  type: 'regular' | 'peak' | 'event';
}

const TrafficForecastPanel: React.FC<TrafficForecastPanelProps> = ({
  venueLocation
}) => {
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [trafficHistory, setTrafficHistory] = useState<TrafficDataPoint[]>([]);
  const [autoRefresh] = useState(true);
  
  // Real-time traffic API configuration
  const TRAFFIC_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
  const TRAFFIC_API_BASE = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';

  // Auto-refresh real-time data every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchRealTimeTrafficData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Generate mock traffic data for demonstration when API fails
  const generateMockTrafficData = useCallback(() => {
    const dataPoints: TrafficDataPoint[] = [];
    
    // Generate 16 data points for the day (6 AM to 10 PM)
    for (let i = 0; i < 16; i++) {
      const hour = 6 + i;
      const time = `${hour.toString().padStart(2, '0')}:00`;
      
      // Base traffic level with some randomness
      let baseValue = 100 + (i * 15) + Math.random() * 50;
      
      // Determine traffic type based on time
      let type: 'regular' | 'peak' | 'event' = 'regular';
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        type = 'peak';
        baseValue += 100; // Higher during peak hours
      } else if (hour >= 19 && hour <= 22) {
        type = 'event';
        baseValue += 150; // Highest during event period
      }
      
      dataPoints.push({
        time,
        value: Math.round(baseValue),
        type
      });
    }
    
    return dataPoints;
  }, []);

  // Fetch real-time traffic data from TomTom API
  const fetchRealTimeTrafficData = useCallback(async () => {
    try {
      const response = await fetch(
        `${TRAFFIC_API_BASE}?key=${TRAFFIC_API_KEY}&point=${venueLocation.lat},${venueLocation.lng}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
        console.log('🚦 Real-time traffic data updated:', data);
        
        // Generate traffic history from API data
        const currentSpeed = data.flowSegmentData?.currentSpeed || 50;
        const freeFlowSpeed = data.flowSegmentData?.freeFlowSpeed || 100;
        const trafficLevel = Math.round((currentSpeed / freeFlowSpeed) * 500);
        
        // Create a realistic traffic pattern based on current data
        const now = new Date();
        const currentHour = now.getHours();
        const newDataPoint: TrafficDataPoint = {
          time: now.toTimeString().slice(0, 5),
          value: trafficLevel,
          type: currentHour >= 19 ? 'event' : (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19) ? 'peak' : 'regular'
        };
        
        setTrafficHistory(prev => {
          const updated = [...prev, newDataPoint];
          // Keep only last 16 data points
          return updated.slice(-16);
        });
      } else {
        // Fallback to mock data if API fails
        console.warn('⚠️ API failed, using mock data');
        setTrafficHistory(generateMockTrafficData());
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch real-time traffic data:', error);
      // Fallback to mock data
      setTrafficHistory(generateMockTrafficData());
    }
  }, [venueLocation, generateMockTrafficData]);

  useEffect(() => {
    fetchRealTimeTrafficData();
  }, [fetchRealTimeTrafficData]);

  // Initialize with mock data if no traffic history
  useEffect(() => {
    if (trafficHistory.length === 0) {
      setTrafficHistory(generateMockTrafficData());
    }
  }, [trafficHistory.length, generateMockTrafficData]);

  // Helper function to get color for traffic type
  const getTrafficColor = (type: 'regular' | 'peak' | 'event') => {
    switch (type) {
      case 'peak': return '#f59e0b';
      case 'event': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  // Helper function to generate SVG path from data points
  const generatePathFromData = (data: TrafficDataPoint[]) => {
    if (data.length === 0) return '';
    
    const width = 900; // Chart width
    const height = 200; // Chart height
    const padding = 50;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    const maxValue = Math.max(...data.map(d => d.value), 500);
    const minValue = Math.min(...data.map(d => d.value), 100);
    const valueRange = maxValue - minValue;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + ((maxValue - point.value) / valueRange) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  return (
    <Card className="mb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Traffic Forecast
            </h3>
            <p className="text-sm text-gray-600">
              Real-time traffic conditions and predictions for {venueLocation.name || 'Event Venue'}
            </p>
          </div>
          {realTimeData && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <AlertCircle className="w-4 h-4" />
              <span>Live Data Active</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Traffic Forecast Graph */}
      <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200">
        <svg width="100%" height="250" viewBox="0 0 1000 250" className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="trafficGrid" width="50" height="25" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="trafficLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          <rect width="1000" height="250" fill="url(#trafficGrid)" />
          
          {/* Y-axis labels */}
          <text x="15" y="20" className="fill-gray-600 text-sm font-medium">500</text>
          <text x="15" y="70" className="fill-gray-600 text-sm font-medium">400</text>
          <text x="15" y="120" className="fill-gray-600 text-sm font-medium">300</text>
          <text x="15" y="170" className="fill-gray-600 text-sm font-medium">200</text>
          <text x="15" y="220" className="fill-gray-600 text-sm font-medium">100</text>
          
          {/* Peak Hours Highlight (7-9 AM) */}
          <rect x="200" y="10" width="120" height="230" fill="#fef3c7" opacity="0.6" rx="4"/>
          <text x="260" y="5" className="text-xs fill-yellow-700 font-medium" textAnchor="middle">Peak Hours</text>
          
          {/* Peak Hours Highlight (5-7 PM) */}
          <rect x="600" y="10" width="120" height="230" fill="#fef3c7" opacity="0.6" rx="4"/>
          <text x="660" y="5" className="text-xs fill-yellow-700 font-medium" textAnchor="middle">Peak Hours</text>
          
          {/* Event Period Highlight */}
          <rect x="750" y="10" width="150" height="230" fill="#fecaca" opacity="0.6" rx="4"/>
          <text x="825" y="5" className="text-xs fill-red-700 font-medium" textAnchor="middle">Event Period</text>
          
          {/* Dynamic Traffic Line */}
          {trafficHistory.length > 0 && (
            <path
              d={generatePathFromData(trafficHistory)}
              fill="none"
              stroke="url(#trafficLineGradient)"
              strokeWidth="4"
              className="drop-shadow-sm"
            />
          )}
          
          {/* Dynamic Data Points */}
          {trafficHistory.map((point, index) => {
            const width = 900;
            const height = 200;
            const padding = 50;
            const chartWidth = width - (padding * 2);
            const chartHeight = height - (padding * 2);
            
            const maxValue = Math.max(...trafficHistory.map(d => d.value), 500);
            const minValue = Math.min(...trafficHistory.map(d => d.value), 100);
            const valueRange = maxValue - minValue;
            
            const x = padding + (index / (trafficHistory.length - 1)) * chartWidth;
            const y = padding + ((maxValue - point.value) / valueRange) * chartHeight;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={getTrafficColor(point.type)}
                className="hover:r-6 transition-all cursor-pointer"
              >
                <title>{`${point.time}: ${point.value} traffic level`}</title>
              </circle>
            );
          })}
          
          {/* X-axis Labels */}
          {trafficHistory.map((point, index) => {
            const width = 900;
            const padding = 50;
            const chartWidth = width - (padding * 2);
            const x = padding + (index / (trafficHistory.length - 1)) * chartWidth;
            const hour = parseInt(point.time.split(':')[0]);
            const timeLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            
            return (
              <text
                key={index}
                x={x}
                y="245"
                className="text-xs fill-gray-500"
                textAnchor="middle"
              >
                {timeLabel}
              </text>
            );
          })}
        </svg>
        
        {/* Real-time data overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-gray-700">LIVE</span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Regular Traffic</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Peak Hours (7-9 AM, 5-7 PM)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Event Period</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live Data</span>
        </div>
      </div>
      
      {/* Real-time Traffic Stats */}
      {realTimeData && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {realTimeData.flowSegmentData?.currentSpeed || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Current Speed (km/h)</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {realTimeData.flowSegmentData?.freeFlowSpeed || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Free Flow Speed</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">
              {realTimeData.flowSegmentData?.confidence || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Confidence</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(((realTimeData.flowSegmentData?.currentSpeed || 0) / (realTimeData.flowSegmentData?.freeFlowSpeed || 1)) * 100) || 'N/A'}%
            </div>
            <div className="text-sm text-gray-600">Traffic Level</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TrafficForecastPanel;
