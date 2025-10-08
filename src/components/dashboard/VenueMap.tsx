import React from 'react';
import VenueLayoutMap from '../maps/VenueLayoutMap';
import Card from '../common/Card';

interface VenueMapProps {
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
  venueLocation,
  venueImage, 
  title = 'Venue Layout' 
}) => {
  // If we have venue location data, use the new Google Maps layout
  if (venueLocation) {
    return (
      <VenueLayoutMap
        venueLocation={venueLocation}
        title={title}
      />
    );
  }

  // Fallback to original implementation for backward compatibility

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      

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

      </div>

    </Card>
  );
};

export default VenueMap;
