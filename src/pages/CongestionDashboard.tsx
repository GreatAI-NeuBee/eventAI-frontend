import React, { useState } from 'react';
import CongestionMap, { LatLng, CongestionSegment } from '../components/CongestionMap';
import Card from '../components/common/Card';

const CongestionDashboard: React.FC = () => {
  const [congestionData, setCongestionData] = useState<CongestionSegment[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);

  // Example coordinates for Kuala Lumpur
  const origin: LatLng = { lat: 3.1390, lng: 101.6869 }; // KL Convention Centre
  const destination: LatLng = { lat: 3.1410, lng: 101.6900 }; // Nearby location
  const waypoints: LatLng[] = [
    { lat: 3.1400, lng: 101.6880 } // Optional waypoint
  ];

  const handleRouteChanged = (route: google.maps.DirectionsResult) => {
    if (route.routes && route.routes.length > 0) {
      const routeData = route.routes[0];
      const leg = routeData.legs[0];
      
      setRouteInfo({
        distance: leg.distance?.text || '0 km',
        duration: leg.duration?.text || '0 min'
      });
    }
  };

  const handleCongestionData = (segments: CongestionSegment[]) => {
    setCongestionData(segments);
  };

  // Calculate congestion statistics
  const getCongestionStats = () => {
    if (congestionData.length === 0) return null;

    const totalSegments = congestionData.length;
    const greenSegments = congestionData.filter(s => s.color === '#4CAF50').length;
    const orangeSegments = congestionData.filter(s => s.color === '#FF9800').length;
    const redSegments = congestionData.filter(s => s.color === '#F44336').length;

    return {
      total: totalSegments,
      green: greenSegments,
      orange: orangeSegments,
      red: redSegments,
      greenPercent: Math.round((greenSegments / totalSegments) * 100),
      orangePercent: Math.round((orangeSegments / totalSegments) * 100),
      redPercent: Math.round((redSegments / totalSegments) * 100)
    };
  };

  const stats = getCongestionStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traffic Congestion Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive Google Map with real-time traffic congestion visualization
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Card */}
          <div className="lg:col-span-3">
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Interactive Traffic Map</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Drag the route to see real-time congestion updates with Google Routes API
                </p>
              </div>
              <CongestionMap
                origin={origin}
                destination={destination}
                waypoints={waypoints}
                height={600}
                onRouteChanged={handleRouteChanged}
                onCongestionData={handleCongestionData}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Route Information */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
              {routeInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Distance</span>
                    <span className="font-semibold text-blue-600">{routeInfo.distance}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Duration</span>
                    <span className="font-semibold text-green-600">{routeInfo.duration}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Calculating route...</p>
                </div>
              )}
            </Card>

            {/* Congestion Statistics */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Flow Analysis</h3>
              {stats ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Segments</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Good Flow</span>
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        {stats.green} ({stats.greenPercent}%)
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Moderate</span>
                      </div>
                      <div className="text-sm font-semibold text-orange-600">
                        {stats.orange} ({stats.orangePercent}%)
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Heavy Congestion</span>
                      </div>
                      <div className="text-sm font-semibold text-red-600">
                        {stats.red} ({stats.redPercent}%)
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No congestion data available</p>
                </div>
              )}
            </Card>

            {/* Instructions */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-bold">1.</span>
                  <span>Click and drag the blue route line to modify the path</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-bold">2.</span>
                  <span>Watch the color-coded segments update in real-time</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-bold">3.</span>
                  <span>Green = good flow, Orange = moderate, Red = heavy congestion</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 font-bold">4.</span>
                  <span>Statistics update automatically as you modify the route</span>
                </div>
              </div>
            </Card>

            {/* Coordinates */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Points</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium text-gray-700">Origin</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                    {origin.lat.toFixed(6)}, {origin.lng.toFixed(6)}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-gray-700">Destination</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                    {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CongestionDashboard;

