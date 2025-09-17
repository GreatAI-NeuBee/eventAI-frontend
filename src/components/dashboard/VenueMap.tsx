import React from 'react';
import VenueLayoutMap from '../maps/VenueLayoutMap';
import Card from '../common/Card';

interface Hotspot {
  x: number;
  y: number;
  intensity: number;
  location: string;
}

interface VenueMapProps {
  hotspots: Hotspot[];
  venueLocation?: {
    lat: number;
    lng: number;
    address?: string;
    placeId?: string;
    name?: string;
  };
  venueImage?: string;
  title?: string;
}

const VenueMap: React.FC<VenueMapProps> = ({ 
  hotspots, 
  venueLocation,
  venueImage, 
  title = 'Venue Layout & Predicted Hotspots' 
}) => {
  // If we have venue location data, use the new Google Maps layout
  if (venueLocation) {
    return (
      <VenueLayoutMap
        venueLocation={venueLocation}
        hotspots={hotspots}
        showHotspots={true}
        title={title}
      />
    );
  }

  // Fallback to original implementation for backward compatibility
  // Get intensity color based on hotspot intensity
  const getHotspotColor = (intensity: number) => {
    if (intensity >= 0.8) return 'bg-red-500';
    if (intensity >= 0.6) return 'bg-orange-500';
    if (intensity >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get hotspot size based on intensity
  const getHotspotSize = (intensity: number) => {
    if (intensity >= 0.8) return 'w-6 h-6';
    if (intensity >= 0.6) return 'w-5 h-5';
    if (intensity >= 0.4) return 'w-4 h-4';
    return 'w-3 h-3';
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span>High Density (80%+)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
          <span>Medium-High (60-80%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span>Medium (40-60%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Low (&lt;40%)</span>
        </div>
      </div>

      {/* Venue Map Container */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
        {/* Background Image or Placeholder */}
        {venueImage ? (
          <img
            src={venueImage}
            alt="Venue Layout"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center text-gray-500">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-lg font-medium">Venue Layout</p>
              <p className="text-sm">Select venue location for detailed visualization</p>
            </div>
          </div>
        )}

        {/* Hotspots Overlay */}
        {hotspots && hotspots.length > 0 && (
          <div className="absolute inset-0">
            {hotspots.map((hotspot, index) => (
              <div
                key={index}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer ${getHotspotColor(hotspot.intensity)} ${getHotspotSize(hotspot.intensity)}`}
                style={{
                  left: `${hotspot.x * 100}%`,
                  top: `${hotspot.y * 100}%`,
                }}
                title={`${hotspot.location}: ${Math.round(hotspot.intensity * 100)}% density`}
              >
                {/* Pulse animation for high intensity hotspots */}
                {hotspot.intensity >= 0.8 && (
                  <div className={`absolute inset-0 rounded-full ${getHotspotColor(hotspot.intensity)} animate-ping opacity-50`}></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hotspots List */}
      {hotspots && hotspots.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Detected Hotspots</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {hotspots
              .sort((a, b) => b.intensity - a.intensity)
              .map((hotspot, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{hotspot.location}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getHotspotColor(hotspot.intensity)}`}>
                    {Math.round(hotspot.intensity * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default VenueMap;
