import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, Clock } from 'lucide-react';
import Input from '../common/Input';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
  name?: string;
}

interface VenueSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
}

interface VenueSearchInputProps {
  onVenueSelected: (location: LocationData) => void;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const VenueSearchInput: React.FC<VenueSearchInputProps> = ({
  onVenueSelected,
  placeholder = "Search for venue...",
  value = "",
  onValueChange
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<VenueSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<LocationData[]>([]);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded } = useGoogleMaps();

  // Google Maps API Key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('venueSearchHistory');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Search for venues using Google Places Autocomplete
  const searchVenues = useCallback(async (query: string): Promise<VenueSearchResult[]> => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps Places API not loaded');
      return [];
    }

    return new Promise((resolve) => {
      const service = new google.maps.places.AutocompleteService();
      const request = {
        input: query,
        types: ['establishment', 'geocode']
        // Removed country restriction to allow global venue search
      };

      service.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Convert predictions to our format
          const results: VenueSearchResult[] = predictions.map(prediction => ({
            place_id: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            formatted_address: prediction.description,
            geometry: {
              location: {
                lat: 0, // Will be filled when selected
                lng: 0
              }
            },
            types: prediction.types
          }));
          resolve(results);
        } else {
          resolve([]);
        }
      });
    });
  }, []);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onValueChange?.(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(query.trim().length === 0 && recentSearches.length > 0);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(true);

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchVenues(query.trim());
        setSuggestions(results);
      } catch (error) {
        console.error('Error searching venues:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  // Handle venue selection
  const handleVenueSelect = async (venue: VenueSearchResult | LocationData) => {
    setShowSuggestions(false);
    
    // If it's a recent search, use it directly
    if ('lat' in venue && 'lng' in venue) {
      setSearchQuery(venue.name || venue.address || '');
      onValueChange?.(venue.name || venue.address || '');
      onVenueSelected(venue);
      return;
    }

    // Check if Google Places API is available
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps Places API not loaded');
      return;
    }

    // If it's a search result, we need to get the full place details
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    
    placesService.getDetails(
      {
        placeId: venue.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'place_id']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const location: LocationData = {
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0,
            address: place.formatted_address,
            placeId: place.place_id,
            name: place.name
          };

          setSearchQuery(place.name || place.formatted_address || '');
          onValueChange?.(place.name || place.formatted_address || '');
          onVenueSelected(location);

          // Save to recent searches
          const updated = [location, ...recentSearches.filter(r => r.placeId !== location.placeId)].slice(0, 5);
          setRecentSearches(updated);
          localStorage.setItem('venueSearchHistory', JSON.stringify(updated));
        }
      }
    );
  };

  const handleFocus = () => {
    if (searchQuery.length < 3 && recentSearches.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const getVenueIcon = (types?: string[]) => {
    if (!types) return <MapPin className="h-4 w-4" />;
    
    if (types.includes('stadium') || types.includes('arena')) {
      return <span className="text-lg">🏟️</span>;
    }
    if (types.includes('school') || types.includes('university')) {
      return <span className="text-lg">🎓</span>;
    }
    if (types.includes('park')) {
      return <span className="text-lg">🌳</span>;
    }
    if (types.includes('museum')) {
      return <span className="text-lg">🏛️</span>;
    }
    if (types.includes('restaurant')) {
      return <span className="text-lg">🍽️</span>;
    }
    if (types.includes('hotel') || types.includes('lodging')) {
      return <span className="text-lg">🏨</span>;
    }
    
    return <MapPin className="h-4 w-4" />;
  };

  // Don't render if API key is missing
  if (!apiKey) {
    return (
      <Input
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Google Maps API key required for venue search"
        icon={Search}
        disabled
      />
    );
  }

  return (
    <div className="relative">
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          icon={Search}
        />

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Searching venues...</p>
            </div>
          )}

          {!isLoading && suggestions.length === 0 && searchQuery.length >= 3 && (
            <div className="p-4 text-center text-gray-500">
              <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No venues found for "{searchQuery}"</p>
            </div>
          )}

          {!isLoading && searchQuery.length < 3 && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Searches
                </div>
              </div>
              {recentSearches.map((location, index) => (
                <button
                  key={index}
                  onClick={() => handleVenueSelect(location)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex-shrink-0 mt-0.5 text-gray-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {location.name || 'Unknown Venue'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{location.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div>
              {suggestions.map((venue) => (
                <button
                  key={venue.place_id}
                  onClick={() => handleVenueSelect(venue)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex-shrink-0 mt-0.5 text-gray-400">
                    {getVenueIcon(venue.types)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {venue.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{venue.formatted_address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VenueSearchInput;
