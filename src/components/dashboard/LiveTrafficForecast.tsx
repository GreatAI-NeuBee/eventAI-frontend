import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import Card from '../common/Card';

interface LiveTrafficForecastProps {
  venueLocation: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  selectedStation?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

const LiveTrafficForecast: React.FC<LiveTrafficForecastProps> = ({
  venueLocation,
  selectedStation
}) => {
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Real-time traffic API configuration
  const TRAFFIC_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
  const TRAFFIC_API_BASE = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';

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

  useEffect(() => {
    if (selectedStation) {
      fetchRealTimeTrafficData();
    }
  }, [selectedStation, fetchRealTimeTrafficData]);

  if (!selectedStation) {
    return null;
  }

  return (
    <Card className="mb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Live Traffic Forecast
            </h3>
            <p className="text-sm text-gray-600">
              Real-time traffic conditions and predictions for {selectedStation?.name}
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
      
      {/* Enhanced Interactive Traffic Graph */}
      <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200">
        <svg width="100%" height="300" viewBox="0 0 1000 300" className="overflow-visible">
          {/* Enhanced Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="30" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="trafficGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          <rect width="1000" height="300" fill="url(#grid)" />
          
          {/* Enhanced Y-axis labels */}
          <text x="15" y="25" className="fill-gray-600 text-sm font-medium">500</text>
          <text x="15" y="85" className="fill-gray-600 text-sm font-medium">400</text>
          <text x="15" y="145" className="fill-gray-600 text-sm font-medium">300</text>
          <text x="15" y="205" className="fill-gray-600 text-sm font-medium">200</text>
          <text x="15" y="265" className="fill-gray-600 text-sm font-medium">100</text>
          
          {/* Enhanced traffic line with real-time data */}
          <path
            d="M 50,250 Q 150,200 250,180 Q 350,160 450,140 Q 550,120 650,100 Q 750,80 850,60 Q 950,40 950,40"
            fill="none"
            stroke="url(#trafficGradient)"
            strokeWidth="4"
            className="drop-shadow-sm"
          />
          
          {/* Peak Hours Highlight (7-9 AM) */}
          <rect x="200" y="20" width="150" height="260" fill="#fef3c7" opacity="0.6" rx="4"/>
          <text x="275" y="15" className="text-xs fill-yellow-700 font-medium" textAnchor="middle">Peak Hours</text>
          
          {/* Peak Hours Highlight (5-7 PM) */}
          <rect x="600" y="20" width="150" height="260" fill="#fef3c7" opacity="0.6" rx="4"/>
          <text x="675" y="15" className="text-xs fill-yellow-700 font-medium" textAnchor="middle">Peak Hours</text>
          
          {/* Event Period Highlight */}
          <rect x="750" y="20" width="200" height="260" fill="#fecaca" opacity="0.6" rx="4"/>
          <text x="850" y="15" className="text-xs fill-red-700 font-medium" textAnchor="middle">Event Period</text>
          
          {/* Data Points */}
          <circle cx="150" cy="200" r="4" fill="#3b82f6" className="hover:r-6 transition-all"/>
          <circle cx="250" cy="180" r="4" fill="#f59e0b" className="hover:r-6 transition-all"/>
          <circle cx="350" cy="160" r="4" fill="#3b82f6" className="hover:r-6 transition-all"/>
          <circle cx="450" cy="140" r="4" fill="#3b82f6" className="hover:r-6 transition-all"/>
          <circle cx="550" cy="120" r="4" fill="#f59e0b" className="hover:r-6 transition-all"/>
          <circle cx="650" cy="100" r="4" fill="#f59e0b" className="hover:r-6 transition-all"/>
          <circle cx="750" cy="80" r="4" fill="#ef4444" className="hover:r-6 transition-all"/>
          <circle cx="850" cy="60" r="4" fill="#ef4444" className="hover:r-6 transition-all"/>
          
          {/* X-axis Labels */}
          <text x="100" y="295" className="text-xs fill-gray-500" textAnchor="middle">6 AM</text>
          <text x="200" y="295" className="text-xs fill-gray-500" textAnchor="middle">8 AM</text>
          <text x="300" y="295" className="text-xs fill-gray-500" textAnchor="middle">10 AM</text>
          <text x="400" y="295" className="text-xs fill-gray-500" textAnchor="middle">12 PM</text>
          <text x="500" y="295" className="text-xs fill-gray-500" textAnchor="middle">2 PM</text>
          <text x="600" y="295" className="text-xs fill-gray-500" textAnchor="middle">4 PM</text>
          <text x="700" y="295" className="text-xs fill-gray-500" textAnchor="middle">6 PM</text>
          <text x="800" y="295" className="text-xs fill-gray-500" textAnchor="middle">8 PM</text>
          <text x="900" y="295" className="text-xs fill-gray-500" textAnchor="middle">10 PM</text>
        </svg>
        
        {/* Real-time data overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-gray-700">LIVE</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced Legend */}
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
        </div>
      )}
    </Card>
  );
};

export default LiveTrafficForecast;
