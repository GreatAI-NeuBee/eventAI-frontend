import React, { useState, useEffect } from 'react';
import { MapPin, Train, Bus, Clock, Phone, ExternalLink } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { rapidKlAPI, Station, RapidKlAgency } from '../../api/rapidKlApi';

interface NearbyStationsBoxProps {
  venueLocation: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  onStationSelect?: (station: Station) => void;
  selectedStation?: Station | null;
}

const NearbyStationsBox: React.FC<NearbyStationsBoxProps> = ({
  venueLocation,
  onStationSelect,
  selectedStation
}) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequencies, setFrequencies] = useState<Record<string, any>>({});

  // Load nearby stations when venue location changes
  useEffect(() => {
    if (venueLocation.lat && venueLocation.lng) {
      loadNearbyStations();
    }
  }, [venueLocation.lat, venueLocation.lng]);

  const loadNearbyStations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const nearbyStations = await rapidKlAPI.findNearbyStations(
        venueLocation.lat,
        venueLocation.lng,
        2 // 2km radius
      );
      setStations(nearbyStations);
      
      // Load frequency data for each station
      loadStationFrequencies(nearbyStations);
    } catch (err) {
      setError('Failed to load nearby stations');
      console.error('Error loading nearby stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStationFrequencies = async (stations: Station[]) => {
    const frequencyPromises = stations.map(async (station) => {
      if (station.agency) {
        try {
          const freq = await rapidKlAPI.getStationFrequency(station.id, station.agency);
          return { stationId: station.id, frequency: freq };
        } catch (err) {
          console.warn(`Failed to load frequency for ${station.name}:`, err);
          return null;
        }
      }
      return null;
    });

    const results = await Promise.all(frequencyPromises);
    const frequencyMap: Record<string, any> = {};
    
    results.forEach(result => {
      if (result) {
        frequencyMap[result.stationId] = result.frequency;
      }
    });
    
    setFrequencies(frequencyMap);
  };

  const getAgencyIcon = (agency: RapidKlAgency) => {
    switch (agency) {
      case 'lrt':
      case 'mrt':
        return <Train className="w-4 h-4" />;
      case 'monorail':
        return <Train className="w-4 h-4" />;
      case 'bus':
      case 'brt':
        return <Bus className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getAgencyColor = (agency: RapidKlAgency) => {
    switch (agency) {
      case 'lrt':
        return 'text-blue-600 bg-blue-100';
      case 'mrt':
        return 'text-green-600 bg-green-100';
      case 'monorail':
        return 'text-purple-600 bg-purple-100';
      case 'bus':
      case 'brt':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const handleContactRapidKl = () => {
    // Open Rapid KL contact page or email
    window.open('https://www.myrapid.com.my/contact-us', '_blank');
  };

  const handleRequestFrequencyIncrease = (station: Station) => {
    // This would typically open a form or redirect to a contact page
    // For now, we'll show an alert with contact information
    alert(`To request frequency increase for ${station.name}:\n\nContact Rapid KL:\nPhone: 03-7885 2585\nEmail: customer@myrapid.com.my\n\nOr visit: https://www.myrapid.com.my/contact-us`);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" className="mr-2" />
          <span className="text-gray-600">Loading nearby stations...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadNearbyStations} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (stations.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Nearby Stations</h3>
          <p className="text-gray-600 mb-4">
            No Rapid KL stations found within 2km of this venue.
          </p>
          <Button onClick={loadNearbyStations} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Nearby Transit Stations</h3>
          <p className="text-sm text-gray-600">
            Found {stations.length} station{stations.length !== 1 ? 's' : ''} within 2km
          </p>
        </div>
        <Button
          onClick={handleContactRapidKl}
          variant="outline"
          size="sm"
          className="flex items-center"
        >
          <Phone className="w-4 h-4 mr-1" />
          Contact Rapid KL
        </Button>
      </div>

      <div className="space-y-3">
        {stations.map((station) => {
          const frequency = frequencies[station.id];
          const isSelected = selectedStation?.id === station.id;
          
          return (
            <div
              key={station.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onStationSelect?.(station)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium text-gray-900 mr-2">{station.name}</h4>
                    {station.agency && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAgencyColor(station.agency)}`}
                      >
                        {getAgencyIcon(station.agency)}
                        <span className="ml-1 uppercase">{station.agency}</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{formatDistance(station.distance || 0)} away</span>
                  </div>

                  {frequency && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>
                        {frequency.currentFrequency} trains/hour
                        {frequency.peakFrequency !== frequency.offPeakFrequency && (
                          <span className="text-gray-500 ml-1">
                            (Peak: {frequency.peakFrequency}, Off-peak: {frequency.offPeakFrequency})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-1 ml-4">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestFrequencyIncrease(station);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Request More Trains
                  </Button>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`, '_blank');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Phone className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">
              Need More Transit Options?
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              Contact Rapid KL to request increased frequency or new routes for your event.
              They can provide special services for large events.
            </p>
            <div className="mt-2">
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
  );
};

export default NearbyStationsBox;
