import React, { useState, useEffect } from 'react';
import { MapPin, Car, Clock, ExternalLink } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
// import { rapidKlAPI } from '../../api/rapidKlApi';

interface ParkingLocation {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor' | 'multi-level';
  availability: 'available' | 'limited' | 'full';
  distance: number;
  capacity: number;
  price: string;
  features: string[];
  coordinates: { lat: number; lng: number };
}

interface NearbyParkingOptionsProps {
  venueLocation: { lat: number; lng: number };
}

const NearbyParkingOptions: React.FC<NearbyParkingOptionsProps> = ({ venueLocation }) => {
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadParkingLocations();
  }, [venueLocation]);

  const loadParkingLocations = async () => {
    setLoading(true);
    try {
      // const locations = await rapidKlAPI.findNearbyParking(venueLocation);
      const locations: any[] = []; // Mock for now
      setParkingLocations(locations);
    } catch (error) {
      console.error('Error loading parking locations:', error);
      // Use mock data as fallback
      setParkingLocations(generateMockParkingLocations());
    } finally {
      setLoading(false);
    }
  };

  const generateMockParkingLocations = (): ParkingLocation[] => {
    return [
      {
        id: '1',
        name: 'Multi Level Parking 1',
        type: 'multi-level',
        availability: 'available',
        distance: 965,
        capacity: 540,
        price: 'RM 3-5/hour',
        features: ['24/7 Access'],
        coordinates: { lat: venueLocation.lat + 0.001, lng: venueLocation.lng + 0.001 }
      },
      {
        id: '2',
        name: 'Tempat Letak Kereta Taman Rekreasi Bukit Jalil',
        type: 'outdoor',
        availability: 'available',
        distance: 2100,
        capacity: 265,
        price: 'RM 2-4/hour',
        features: ['24/7 Access', 'EV Charging'],
        coordinates: { lat: venueLocation.lat - 0.002, lng: venueLocation.lng + 0.003 }
      },
      {
        id: '3',
        name: 'Parking 3',
        type: 'indoor',
        availability: 'limited',
        distance: 335,
        capacity: 395,
        price: 'RM 5-8/hour',
        features: ['24/7 Access'],
        coordinates: { lat: venueLocation.lat + 0.005, lng: venueLocation.lng - 0.002 }
      },
      {
        id: '4',
        name: 'National Stadium Bukit Jalil, Carpark A',
        type: 'outdoor',
        availability: 'available',
        distance: 128,
        capacity: 128,
        price: 'RM 2-3/hour',
        features: ['24/7 Access'],
        coordinates: { lat: venueLocation.lat + 0.0005, lng: venueLocation.lng + 0.0005 }
      }
    ];
  };

  const getParkingTypeColor = (type: string) => {
    switch (type) {
      case 'indoor': return 'bg-blue-100 text-blue-800';
      case 'outdoor': return 'bg-green-100 text-green-800';
      case 'multi-level': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getParkingTypeIcon = (type: string) => {
    switch (type) {
      case 'indoor': return '🏢';
      case 'outdoor': return '🅿️';
      case 'multi-level': return '🏗️';
      default: return '🅿️';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'limited': return 'bg-yellow-100 text-yellow-800';
      case 'full': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${distance}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center">
          <div className="text-sm text-gray-600">Loading parking options...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Nearby Parking Options</h3>
        <p className="text-sm text-gray-600">
          Found {parkingLocations.length} parking location{parkingLocations.length !== 1 ? 's' : ''} within 1km
        </p>
      </div>

      <div className="space-y-3">
        {parkingLocations.map((parking) => (
          <div key={parking.id} className="p-3 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="font-medium text-gray-900 mr-2 text-sm">{parking.name}</h4>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getParkingTypeColor(parking.type)}`}
                  >
                    {getParkingTypeIcon(parking.type)}
                    <span className="ml-1 capitalize">{parking.type}</span>
                  </span>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(parking.availability)}`}
                  >
                    {parking.availability.toUpperCase()} AVAILABILITY
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{formatDistance(parking.distance)} away</span>
                  </div>
                  <div className="flex items-center">
                    <Car className="w-3 h-3 mr-1" />
                    <span>{parking.capacity} spaces</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{parking.price}</span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {parking.features.join(', ')}
                  </div>
                </div>
              </div>

              <div className="ml-3">
                <Button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${parking.coordinates.lat},${parking.coordinates.lng}`, '_blank')}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Directions
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default NearbyParkingOptions;
