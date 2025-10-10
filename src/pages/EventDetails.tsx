import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Calendar, MapPin, Play, FileDown, Phone, Train, BarChart3, Map, Settings, Lightbulb } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import WeatherBackground, { WeatherContext } from '../components/common/WeatherBackground';
import VenueMap from '../components/dashboard/VenueMap';
import LiveTrafficForecast from '../components/dashboard/LiveTrafficForecast';
import VenueLayoutEditor, { VenueLayoutEditorData } from '../components/venue/VenueLayoutEditor';
import PopularityInsights from '../components/event/PopularityInsights';
import CongestionMap, { CongestionSegment } from '../components/CongestionMap';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useEventStore } from '../store/eventStore';
import { useAuth } from '../contexts/AuthContext';
import type { EventData } from '../types/simulation';
import { eventAPI } from '../api/apiClient';
import { VenueLayoutCard } from './VenueLayoutCard';

/* Optional: help TS with the global google object if you use geocoder */
declare global {
  interface Window {
    google: {
      maps: {
        Geocoder: new () => google.maps.Geocoder;
        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
      };
    };
  }
}

// Component for event time card with weather-aware colors
const EventTimeCard: React.FC<{ currentEvent: EventData }> = ({ currentEvent }) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  // Storm and Rain: white text; Clear/Sunny/Cloudy: dark text
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-700';
  const getDividerColor = () => (isDarkBackground || isRainBackground) ? 'text-white/60' : 'text-gray-400';
  
  return (
    <GlassCard intensity="medium" blur="md">
      <div className="flex items-center">
        <Calendar className="h-8 w-8 text-blue-400" />
        <div className="ml-4">
          <p className={`text-sm font-medium ${getSecondaryTextColor()}`}>Event Time</p>
          <div className="flex flex-row items-center space-x-2">
            <div className={`text-sm font-semibold ${getTextColor()}`}>
              {new Date(currentEvent.dateStart).toLocaleString('en-MY', {
                timeZone: 'Asia/Kuala_Lumpur',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
            <div className={`${getDividerColor()} font-medium`}>-</div>
            <div className={`text-sm font-semibold ${getTextColor()}`}>
              {new Date(currentEvent.dateEnd).toLocaleString('en-MY', {
                timeZone: 'Asia/Kuala_Lumpur',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Component for venue card with weather-aware colors
const VenueCard: React.FC<{ currentEvent: EventData }> = ({ currentEvent }) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-700';
  
  return (
    <GlassCard intensity="medium" blur="md">
      <div className="flex items-center">
        <MapPin className="h-8 w-8 text-green-500" />
        <div className="ml-4">
          <p className={`text-sm font-medium ${getSecondaryTextColor()}`}>Venue</p>
          <p className={`text-lg font-semibold ${getTextColor()}`}>{currentEvent.venue}</p>
        </div>
      </div>
    </GlassCard>
  );
};

// Component for weather card with weather-aware colors
const WeatherCard: React.FC = () => {
  const { isDarkBackground, isRainBackground, weatherData, weatherCondition } = useContext(WeatherContext);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-700';
  
  // Get weather icon based on condition
  const getWeatherIcon = () => {
    switch (weatherCondition) {
      case 'rain':
        return '🌧️';
      case 'storm':
        return '⛈️';
      case 'snow':
        return '❄️';
      case 'cloudy':
        return '☁️';
      default:
        return '☀️';
    }
  };
  
  // Check if weather is not available
  const isWeatherNotAvailable = weatherData?.current.condition.toLowerCase().includes('not available');
  
  return (
    <GlassCard intensity="medium" blur="md">
      <div className="flex items-center">
        <div className="text-4xl">
          {getWeatherIcon()}
        </div>
        <div className="ml-4">
          <p className={`text-sm font-medium ${getSecondaryTextColor()}`}>Weather</p>
          {isWeatherNotAvailable ? (
            <p className={`text-sm ${getSecondaryTextColor()}`}>
              Temporarily not available
            </p>
          ) : (
            <div className="flex items-baseline gap-2">
              <p className={`text-lg font-semibold ${getTextColor()}`}>
                {weatherData ? `${weatherData.current.temperature}°C` : 'N/A'}
              </p>
              {weatherData && (
                <p className={`text-xs ${getSecondaryTextColor()} capitalize`}>
                  {weatherData.current.condition}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

// Component for nearby events display from backend
const NearbyEventsCard: React.FC<{ 
  nearbyEventData: any; 
}> = ({ nearbyEventData }) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  // Log whenever component renders with new data
  console.log('🎨 [NearbyEventsCard] Rendering with:', {
    hasData: !!nearbyEventData,
    totalResults: nearbyEventData?.summary?.total_results || 0,
    recommendedCount: nearbyEventData?.summary?.recommended_results?.length || 0,
    hasRelevantResults: nearbyEventData?.summary?.has_relevant_results,
    nearbyEventData: nearbyEventData,
  });
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-600';
  const getCardBg = () => (isDarkBackground || isRainBackground) ? 'bg-blue-500/10 border-blue-300/30' : 'bg-blue-50 border-blue-200';
  const getLinkColor = () => (isDarkBackground || isRainBackground) ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800';
  const getRelevanceBadgeColor = (score: number) => {
    if (score >= 0.7) {
      return (isDarkBackground || isRainBackground) 
        ? 'bg-green-500/30 text-green-100 border-green-300/40' 
        : 'bg-green-100 text-green-800 border-green-300';
    } else if (score >= 0.5) {
      return (isDarkBackground || isRainBackground)
        ? 'bg-yellow-500/30 text-yellow-100 border-yellow-300/40'
        : 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    return (isDarkBackground || isRainBackground)
      ? 'bg-gray-500/30 text-gray-100 border-gray-300/40'
      : 'bg-gray-100 text-gray-800 border-gray-300';
  };
  
  // Get top 3 most relevant results - prefer recommended_results, fallback to all results sorted by relevance
  const getTopResults = () => {
    if (nearbyEventData?.summary?.recommended_results && nearbyEventData.summary.recommended_results.length > 0) {
      return nearbyEventData.summary.recommended_results.slice(0, 3);
    }
    
    if (nearbyEventData?.results && nearbyEventData.results.length > 0) {
      return [...nearbyEventData.results]
        .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, 3);
    }
    
    return [];
  };
  
  const topResults = getTopResults();
  
  // Don't show if no relevant results
  if (!nearbyEventData || topResults.length === 0) {
    return null; // Don't show empty card
  }

  return (
    <GlassCard intensity="medium" blur="md">
      <h3 className={`text-lg font-semibold mb-4 ${getTextColor()}`}>
        🔍 Nearby Events Discovery
        {nearbyEventData.summary?.total_results && (
          <span className={`ml-2 text-xs font-normal ${getSecondaryTextColor()}`}>
            (Top {topResults.length} of {nearbyEventData.summary.total_results.toLocaleString()})
          </span>
        )}
      </h3>
      
      <div className="space-y-3">
        {/* Display top 3 most relevant results */}
        {topResults.map((result: any, idx: number) => (
          <a
            key={idx}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-4 ${getCardBg()} border rounded-lg backdrop-blur-sm hover:shadow-md transition-all group`}
          >
            {/* Header with source and relevance */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-xs font-medium ${getSecondaryTextColor()}`}>
                  {result.source || 'Unknown Source'}
                </span>
                {result.date && (
                  <>
                    <span className={`text-xs ${getSecondaryTextColor()}`}>•</span>
                    <span className={`text-xs ${getSecondaryTextColor()}`}>{result.date}</span>
                  </>
                )}
              </div>
              {result.relevance_score !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getRelevanceBadgeColor(result.relevance_score)}`}>
                  {Math.round(result.relevance_score * 100)}% match
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className={`text-sm font-semibold ${getLinkColor()} mb-2 group-hover:underline line-clamp-2`}>
              {result.title}
            </h4>

            {/* Description with highlighted keywords */}
            {result.description && (
              <p className={`text-sm ${getSecondaryTextColor()} line-clamp-3 mb-2`}>
                {result.description}
              </p>
            )}

            {/* Matched keywords */}
            {result.matched_keywords && result.matched_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.matched_keywords.slice(0, 4).map((keyword: string, i: number) => (
                  <span 
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      (isDarkBackground || isRainBackground)
                        ? 'bg-blue-400/20 text-blue-200'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            {/* High relevance badge */}
            {result.is_highly_relevant && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs">✨</span>
                <span className={`text-xs font-medium ${
                  (isDarkBackground || isRainBackground)
                    ? 'text-green-300'
                    : 'text-green-700'
                }`}>
                  Highly Relevant
                </span>
              </div>
            )}
          </a>
        ))}
      </div>

     
    </GlassCard>
  );
};

// Combined Component for Nearby Transit Stations and Contact RapidKL using Google Maps API
const TransitInformationCard: React.FC<{ venueLocation: { lat: number; lng: number; name?: string; address?: string } }> = ({ venueLocation }) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-600';
  const getCardBg = () => (isDarkBackground || isRainBackground) ? 'bg-purple-500/10 border-purple-300/30' : 'bg-purple-50 border-purple-200';

  const fetchNearbyTransitStations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const service = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request = {
        location: new google.maps.LatLng(venueLocation.lat, venueLocation.lng),
        radius: 2000, // 2km radius
        type: 'transit_station',
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          console.log('🚇 Found transit stations:', results.length);
          // Sort by distance and take top 5
          const sortedStations = results
            .slice(0, 5)
            .map((place: any) => ({
              name: place.name,
              address: place.vicinity,
              distance: place.geometry?.location
                ? google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(venueLocation.lat, venueLocation.lng),
                    place.geometry.location
                  )
                : 0,
              types: place.types,
              rating: place.rating,
            }));
          setStations(sortedStations);
          setLoading(false);
        } else {
          console.warn('No transit stations found or API error:', status);
          setError('No transit stations found nearby');
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Error fetching transit stations:', err);
      setError('Failed to load transit stations');
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  useEffect(() => {
    if (venueLocation.lat && venueLocation.lng && window.google?.maps) {
      fetchNearbyTransitStations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueLocation.lat, venueLocation.lng]);

  const handleContactRapidKL = () => {
    window.open('https://www.myrapid.com.my/contact-us', '_blank');
  };

  if (!window.google?.maps) {
    return null;
  }

  return (
    <GlassCard intensity="medium" blur="md">
      <h3 className={`text-lg font-semibold mb-4 ${getTextColor()}`}>
        🚇 Public Transit Information
      </h3>

      {/* Nearby Stations Section */}
      <div className="mb-6">
        <h4 className={`text-sm font-semibold ${getTextColor()} mb-3`}>
          Nearby Stations
        </h4>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
            <span className={`ml-3 text-sm ${getSecondaryTextColor()}`}>Finding nearby stations...</span>
          </div>
        )}

        {error && !loading && (
          <div className={`p-3 ${getCardBg()} border rounded-lg text-center`}>
            <p className={`text-sm ${getSecondaryTextColor()}`}>{error}</p>
          </div>
        )}

        {!loading && !error && stations.length > 0 && (
          <div className="space-y-2">
            {stations.slice(0, 3).map((station, idx) => (
              <div
                key={idx}
                className={`p-3 ${getCardBg()} border rounded-lg backdrop-blur-sm`}
              >
                <div className="flex items-start">
                  <Train className={`h-4 w-4 ${(isDarkBackground || isRainBackground) ? 'text-purple-300' : 'text-purple-600'} mt-0.5 mr-2 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h5 className={`text-sm font-semibold ${getTextColor()}`}>
                        {station.name}
                      </h5>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        (isDarkBackground || isRainBackground)
                          ? 'bg-purple-400/20 text-purple-200'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {formatDistance(station.distance)}
                      </span>
                    </div>
                    {station.address && (
                      <p className={`text-xs ${getSecondaryTextColor()} mt-1`}>
                        {station.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && stations.length === 0 && (
          <div className={`p-3 ${getCardBg()} border rounded-lg text-center`}>
            <p className={`text-sm ${getSecondaryTextColor()}`}>
              No transit stations found within 2km
            </p>
          </div>
        )}
      </div>

      {/* Contact RapidKL Section */}
      <div className={`p-3 ${getCardBg()} border rounded-lg`}>
        <div className="flex items-start">
          <Phone className={`w-4 h-4 ${(isDarkBackground || isRainBackground) ? 'text-blue-300' : 'text-blue-600'} mt-0.5 mr-2 flex-shrink-0`} />
          <div className="flex-1">
            <h5 className={`text-sm font-semibold ${getTextColor()} mb-1`}>
              Request Enhanced Services
            </h5>
            <p className={`text-xs ${getSecondaryTextColor()} mb-2`}>
              Contact Rapid KL for increased frequency or special event transit services.
            </p>
            <Button
              onClick={handleContactRapidKL}
              variant="outline"
              size="sm"
              className={`text-xs ${
                (isDarkBackground || isRainBackground)
                  ? 'text-blue-300 border-blue-300/40 hover:bg-blue-500/20'
                  : 'text-blue-600 border-blue-300 hover:bg-blue-100'
              }`}
            >
              <Phone className="h-3 w-3 mr-1" />
              Contact Rapid KL
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Component for weather recommendations based on weather conditions
const WeatherRecommendations: React.FC = () => {
  const { isDarkBackground, isRainBackground, weatherCondition, weatherData } = useContext(WeatherContext);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  
  // Get weather-specific recommendations
  const getWeatherRecommendations = () => {
    // Check if weather is not available
    const isWeatherNotAvailable = weatherData?.current.condition.toLowerCase().includes('not available');
    
    if (isWeatherNotAvailable) {
      return null; // Don't show recommendations if weather is not available
    }

    switch (weatherCondition) {
      case 'clear':
      case 'sunny':
        return {
          icon: '☀️',
          title: 'Sunny Weather Preparations',
          color: (isDarkBackground || isRainBackground) 
            ? { bg: 'bg-yellow-500/20', border: 'border-yellow-300/40', text: 'text-yellow-100' }
            : { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900' },
          recommendations: [
            '• Set up water stations or arrange merchants/stalls to sell drinking water',
            '• Provide shaded areas or distribute sunscreen samples',
            '• Consider selling branded hats or caps as merchandise',
            '• Monitor for heat-related emergencies, have medical staff ready',
          ]
        };
      
      case 'rain':
        return {
          icon: '🌧️',
          title: 'Rainy Weather Preparations',
          color: (isDarkBackground || isRainBackground) 
            ? { bg: 'bg-blue-500/20', border: 'border-blue-300/40', text: 'text-blue-100' }
            : { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900' },
          recommendations: [
            '• Prepare and distribute raincoats or ponchos for attendees',
            '• Place anti-slip mats at entrances and high-traffic areas',
            '• Alert attendees to wear appropriate footwear',
            '• Protect electrical equipment and ensure proper drainage',
          ]
        };
      
      case 'storm':
        return {
          icon: '⛈️',
          title: 'Storm Weather Preparations - High Alert',
          color: (isDarkBackground || isRainBackground) 
            ? { bg: 'bg-red-500/20', border: 'border-red-300/40', text: 'text-red-100' }
            : { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900' },
          recommendations: [
            '• Consider postponing or rescheduling the event if conditions are severe',
            '• Identify and clearly mark emergency shelter locations',
            '• Increase security and emergency response personnel',
            '• Prepare backup power systems and secure outdoor equipment',
            '• Have emergency medical services on standby',
            '• Send weather warnings and safety instructions to all attendees'
          ]
        };
      
      case 'cloudy':
        return {
          icon: '☁️',
          title: 'Cloudy Weather Preparations',
          color: (isDarkBackground || isRainBackground) 
            ? { bg: 'bg-gray-500/20', border: 'border-gray-300/40', text: 'text-gray-100' }
            : { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900' },
          recommendations: [
            '• Have raincoats/umbrellas available as weather may change',
            '• Monitor weather updates throughout the event',
            '• Prepare temporary shelter areas in case of rain',
            '• Ensure adequate lighting as it may be darker than usual',
          ]
        };
      
      case 'snow':
        return {
          icon: '❄️',
          title: 'Snow Weather Preparations',
          color: (isDarkBackground || isRainBackground) 
            ? { bg: 'bg-cyan-500/20', border: 'border-cyan-300/40', text: 'text-cyan-100' }
            : { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900' },
          recommendations: [
            '• Provide heating areas and warm beverage stations',
            '• Clear walkways and apply salt/sand to prevent slipping',
            '• Arrange transportation assistance for attendees',
            '• Monitor for ice formation and weather deterioration',
            '• Send cold weather safety tips to attendees',
            '• Prepare for cold-related medical emergencies'
          ]
        };
      
      default:
        return null;
    }
  };

  const weatherRecs = getWeatherRecommendations();
  
  if (!weatherRecs) return null;

  return (
    <GlassCard intensity="medium" blur="md" className="mb-6">
      <div>
        <h3 className={`text-lg font-semibold mb-3 ${getTextColor()} flex items-center gap-2`}>
          <span className="text-2xl">{weatherRecs.icon}</span>
          {weatherRecs.title}
        </h3>
        <div className={`p-4 ${weatherRecs.color.bg} ${weatherRecs.color.border} border rounded-lg backdrop-blur-sm`}>
          <ul className="space-y-2">
            {weatherRecs.recommendations.map((rec, index) => (
              <li key={index} className={`text-sm ${weatherRecs.color.text}`}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlassCard>
  );
};

// Component for forecast not generated card with weather-aware colors
const ForecastNotGeneratedCard: React.FC = () => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-600';
  const getIconColor = () => (isDarkBackground || isRainBackground) ? 'text-white/60' : 'text-gray-400';
  
  return (
    <GlassCard className="mb-6" intensity="medium" blur="md">
      <div className="text-center py-8">
        <TrendingUp className={`mx-auto h-12 w-12 ${getIconColor()} mb-3`} />
        <h3 className={`text-lg font-medium ${getTextColor()} mb-2`}>
          Forecast Not Generated
        </h3>
        <p className={`${getSecondaryTextColor()} mb-4`}>
          Configure your venue layout below with exits and toilets, then click "Forecast" to generate crowd density predictions.
          <br />
        </p>
      </div>
    </GlassCard>
  );
};

// Component for the event header that uses weather context
const EventHeader: React.FC<{
  currentEvent: EventData;
  forecastResult: any;
  isForecastLoading: boolean;
  handleGenerateForecast: () => void;
  handleViewOngoingEvent: () => void;
  handleGenerateReport: () => void;
  isGeneratingReport: boolean;
  getStatusBadge: (status: EventData['status']) => React.ReactNode;
}> = ({ 
  currentEvent, 
  forecastResult, 
  isForecastLoading, 
  handleGenerateForecast, 
  handleViewOngoingEvent,
  handleGenerateReport,
  isGeneratingReport,
  getStatusBadge 
}) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  // For rain background, use light colors; for storm use white; for clear/sunny use dark
  const getTitleColor = () => {
    if (isDarkBackground) return 'text-white'; // Storm
    if (isRainBackground) return 'text-gray-200'; // Rain - light but visible
    return 'text-gray-900'; // Clear/sunny
  };
  
  const getDescriptionColor = () => {
    if (isDarkBackground) return 'text-white/80'; // Storm
    if (isRainBackground) return 'text-gray-300'; // Rain - light but visible
    return 'text-gray-600'; // Clear/sunny
  };
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${getTitleColor()}`}>
            {currentEvent.name}
          </h1>
          <p className={`mt-2 ${getDescriptionColor()}`}>
            Event Dashboard - Real-time monitoring and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {getStatusBadge(currentEvent.status)}
          {(!forecastResult || Object.keys(forecastResult).length === 0) && (
            <Button 
              onClick={handleGenerateForecast}
              disabled={isForecastLoading || !currentEvent.venueLayout}
              title={!currentEvent.venueLayout ? 'Venue layout required to generate forecast' : ''}
              className="hover:scale-100 hover:bg-blue-600 hover:shadow-md"
            >
              {isForecastLoading ? 'Generating...' : 'Forecast'}
            </Button>
          )}
          {forecastResult && Object.keys(forecastResult).length > 0 && (
            <>
              <Button 
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                variant="secondary"
                className="bg-indigo-600 hover:scale-100 hover:bg-indigo-700 hover:shadow-md"
              >
                {isGeneratingReport ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
              <Button 
                onClick={handleViewOngoingEvent}
                variant="primary"
                className="bg-green-600 hover:scale-100 hover:bg-green-600 hover:shadow-md"
              >
                <Play className="h-4 w-4 mr-2" />
                View Ongoing Event
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'logistics' | 'configuration'>('overview');
  
  // Traffic congestion state
  const [congestionData, setCongestionData] = useState<CongestionSegment[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  
  // Ref to track if simulation monitoring is already started for this event
  const monitoringEventId = useRef<string | null>(null);
  
  // Helper for section header colors
  const getSectionHeaderColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';

  // Traffic congestion handlers
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


  const {
    currentEvent,
    events,
    setCurrentEvent,
    isLoading,
    error,
  } = useEventStore();

  // Build the object the child expects from data you already have
  const viewEvent = useMemo(
    () => (currentEvent ? { ...currentEvent, forecastResult } : null),
    [currentEvent, forecastResult]
  );

  // ---- Helpers ----
  const extractGatesFromVenueLayout = (venueLayout: any): { gates: string[]; gates_crowd: number[] } => {
    const gates: string[] = [];
    const gates_crowd: number[] = [];

    if (!venueLayout) {
      console.warn('No venue layout provided for gate extraction');
      return { gates, gates_crowd };
    }

    // Exits A..E
    if (venueLayout.exitsList && Array.isArray(venueLayout.exitsList)) {
      const exitCount = Math.min(venueLayout.exitsList.length, 5);
      const exitLetters = ['A', 'B', 'C', 'D', 'E'];
      for (let i = 0; i < exitCount; i++) {
        gates.push(exitLetters[i]);
        const capacity = venueLayout.exitsList[i]?.capacity ?? 800;
        gates_crowd.push(capacity);
      }
    }

    // Toilets 1..2
    if (venueLayout.toiletsList && Array.isArray(venueLayout.toiletsList)) {
      const toiletCount = Math.min(venueLayout.toiletsList.length, 2);
      for (let i = 1; i <= toiletCount; i++) {
        gates.push(i.toString());
        const capacity = venueLayout.toiletsList[i - 1]?.capacity ?? 50;
        gates_crowd.push(capacity);
      }
    }

    return { gates, gates_crowd };
  };

  const getVenueLocationWithCoordinates = async (eventData: any) => {
    if (eventData.venueLocation?.lat && eventData.venueLocation?.lng) {
      return eventData.venueLocation;
    }

    const venueString =
      eventData.venue || eventData.venueLocation?.name || eventData.venueLocation?.address;

    if (venueString) {
      // Wait for Google Maps to load
      let retries = 0;
      const maxRetries = 10;
      while (
        retries < maxRetries &&
        (!window.google || !window.google.maps || !window.google.maps.Geocoder)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries++;
      }

      if (window.google?.maps?.Geocoder) {
        try {
          const geocoder = new google.maps.Geocoder();
          const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: venueString }, (res, status) => {
              if (status === 'OK' && res && res.length > 0) resolve(res);
              else reject(new Error(`Geocoding failed: ${status}`));
            });
          });

          const loc = results[0].geometry.location;
          return {
            lat: loc.lat(),
            lng: loc.lng(),
            name: venueString,
            address: results[0].formatted_address,
          };
        } catch (e) {
          console.warn('Geocoding failed:', e);
        }
      } else {
        console.warn('Google Maps not loaded after waiting');
      }
    }

    return {
      lat: 3.139,
      lng: 101.6869,
      name: venueString || 'Event Venue',
      address: venueString || 'Kuala Lumpur, Malaysia',
    };
  };

  // ---- Effects ----
  useEffect(() => {
    if (!eventId) {
      navigate('/dashboard');
      return;
    }

    const fetchEventDetails = async () => {
      setIsLoadingEventDetails(true);
      try {
        const response = await eventAPI.getEvent(eventId);
        // Handle the backend response structure
        const eventData = response.data.data || response.data;

        // Debug: Check for nearby_event data
        console.log('📍 [EventDetails] Checking for nearby_event data:', {
          has_nearby_event: !!eventData.nearby_event,
          has_nearby_result: !!eventData.nearby_result,
          nearby_event_keys: eventData.nearby_event ? Object.keys(eventData.nearby_event) : [],
          nearby_event_data: eventData.nearby_event,
        });

        const transformedEvent: EventData = {
          id: eventData.eventId || eventData.id,
          name: eventData.name,
          dateStart: eventData.dateOfEventStart || eventData.dateStart,
          dateEnd: eventData.dateOfEventEnd || eventData.dateEnd,
          venue:
            eventData.venue ||
            eventData.venueLocation?.name ||
            eventData.venueLocation?.address ||
            'Venue location',
          description: eventData.description || '',
          venueLocation: await getVenueLocationWithCoordinates(eventData),
          venueLayout: eventData.venueLayout,
          userEmail: eventData.userEmail,
          status:
            (eventData.status?.toLowerCase() === 'created'
              ? 'active'
              : (eventData.status?.toLowerCase() || 'completed')) as EventData['status'],
          createdAt: eventData.createdAt,
          attachmentUrls: eventData.attachmentUrls || [],
          attachmentFilenames: eventData.attachmentFilenames || [],
          popularityContent: eventData.popularityContent || eventData.popularity_content || eventData.popularityExtent || undefined,
          nearby_result: eventData.nearby_event || eventData.nearby_result || eventData.nearbyResult || eventData.nearbyEvent || undefined,
        };
        
        console.log('📍 [EventDetails] Transformed event nearby_result:', {
          has_nearby_result: !!transformedEvent.nearby_result,
          nearby_result_summary: transformedEvent.nearby_result?.summary,
        });
        
        setCurrentEvent(transformedEvent);

        if (eventData.forecastResult) {
          setForecastResult(eventData.forecastResult);
          const forecastData =
            eventData.forecastResult.forecast || eventData.forecastResult;

          if (forecastData.crowdDensity || forecastData.summary) {
            const simulationData = {
              eventId,
              crowdDensity: forecastData.crowdDensity || [],
              recommendations: forecastData.recommendations || [],
              scenarios: forecastData.scenarios || { entry: {}, exit: {}, congestion: {} },
            };
            const { setSimulationResult } = useEventStore.getState();
            setSimulationResult(simulationData);
          }
        } else {
          setForecastResult(null);
        }
        
      } catch (error: any) {
        console.error('❌ EventDetails: Error fetching event details:', error);
        
        // If API fails, try to find event in existing events array as fallback
        const foundEvent = events.find(event => event.id === eventId);
        if (foundEvent) {
          setCurrentEvent(foundEvent);
        } else {
          navigate('/dashboard');
        }
      } finally {
        setIsLoadingEventDetails(false);
      }
    };

    fetchEventDetails();
  }, [eventId, navigate, setCurrentEvent, events]);

  // ---- Handlers ----
  const handleBackToDashboard = () => {
    monitoringEventId.current = null;
    setCurrentEvent(null);
    navigate('/dashboard');
  };

  const handleViewOngoingEvent = async () => {
    if (!eventId || !currentEvent) return;

    try {
      // Check if we're within the event time window
      const now = new Date();
      const eventStart = new Date(currentEvent.dateStart);
      const eventEnd = new Date(currentEvent.dateEnd);
      const isWithinEventTime = now >= eventStart && now <= eventEnd;

      // If predict_result is null AND we're within event time, fetch predictions
      if (!currentEvent.predict_result && isWithinEventTime) {
        console.log('📡 Fetching live predictions for ongoing event...');
        
        try {
          // Call the prediction API
          const response = await eventAPI.getPrediction(eventId);
          console.log('✅ Prediction API response:', response);
          
          // Update the current event with the new predict_result
          // The backend should have updated the event, so we refetch it
          const updatedEventResponse = await eventAPI.getEvent(eventId);
          const updatedEvent = updatedEventResponse.data.data || updatedEventResponse.data;
          
          setCurrentEvent({
            ...currentEvent,
            predict_result: updatedEvent.predict_result || updatedEvent.predictResult,
          });
          
          console.log('✅ Event updated with live predictions');
        } catch (predictionError) {
          console.error('❌ Failed to fetch predictions:', predictionError);
          // Don't block navigation, just log the error
          setForecastError('Failed to fetch live predictions. Displaying available data.');
        }
      }

      // Navigate to ongoing event page
      navigate(`/event/ongoing-event/${eventId}`);
    } catch (error) {
      console.error('Error in handleViewOngoingEvent:', error);
      // Still navigate even if there's an error
      navigate(`/event/ongoing-event/${eventId}`);
    }
  };

  const handleGenerateForecast = async () => {
    if (!eventId || !currentEvent) return;

    setIsForecastLoading(true);
    setForecastError(null);

    try {
      
      // Extract gates and their capacities from venue layout
      const { gates, gates_crowd } = extractGatesFromVenueLayout(currentEvent.venueLayout);
      if (gates.length === 0) {
        throw new Error(
          'No gates found in venue layout. Please configure exits and toilets in the venue layout.'
        );
      }

      const forecastRequestData = {
        eventid: eventId,
        gates,
        gates_crowd,
        schedule_start_time: currentEvent.dateStart,
        event_end_time: currentEvent.dateEnd,
        event_capacity: 5,
        method_exits: 'mirror_delay',
        freq: '5min',
      };
      
      
      const response = await eventAPI.generateForecast(forecastRequestData);
      const forecastData = response.data;

      const enhancedForecastData = {
        ...forecastData,
        venueLocation: currentEvent.venueLocation,
        eventDetails: {
          name: currentEvent.name,
          dateStart: currentEvent.dateStart,
          dateEnd: currentEvent.dateEnd,
          venue: currentEvent.venue,
        },
      };

      setForecastResult(enhancedForecastData);

      const simulationData = {
        eventId,
        crowdDensity: forecastData.crowdDensity || [],
        recommendations: forecastData.recommendations || [],
        scenarios: forecastData.scenarios || { entry: {}, exit: {}, congestion: {} },
        venueLocation: currentEvent.venueLocation,
      };
      const { setSimulationResult } = useEventStore.getState();
      setSimulationResult(simulationData);
      
      // Refetch event details to get updated popularityContent
      console.log('🔄 Refetching event details to get popularity content...');
      try {
        const updatedEventResponse = await eventAPI.getEvent(eventId);
        const updatedEventData = updatedEventResponse.data.data || updatedEventResponse.data;
        
        // Update only the popularityContent field
        if (updatedEventData.popularityContent || updatedEventData.popularity_content || updatedEventData.popularityExtent) {
          const updatedEvent = {
            ...currentEvent,
            popularityContent: updatedEventData.popularityContent || updatedEventData.popularity_content || updatedEventData.popularityExtent
          };
          setCurrentEvent(updatedEvent);
          console.log('✅ Popularity content updated:', updatedEvent.popularityContent);
        } else {
          console.log('⚠️ No popularity content found in updated event data');
        }
      } catch (refetchError) {
        console.warn('⚠️ Failed to refetch event for popularity content:', refetchError);
        // Don't throw error, forecast was still successful
      }
      
    } catch (error: any) {
      console.error('❌ Error generating forecast:', error);
      setForecastError(error.response?.data?.message || error.message || 'Failed to generate forecast');
    } finally {
      setIsForecastLoading(false);
    }
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!eventId || !currentEvent) return;
    
    setIsGeneratingReport(true);
    
    try {
      console.log('📄 Generating report for event:', eventId);
      
      // Call API with only eventId - backend will handle all data collection
      const response = await eventAPI.generateForecastReport(eventId);
      const reportResult = response.data.data;
      
      console.log('✅ Report generated successfully:', reportResult);
      
      // Download the file
      if (reportResult.reportUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = reportResult.reportUrl;
        link.download = reportResult.filename || 'forecast-report.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ Report downloaded: ${reportResult.filename}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error generating report:', error);
      setForecastError(error.response?.data?.message || error.message || 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle venue configuration save
  const handleVenueConfigSave = async (updatedConfig: VenueLayoutEditorData) => {
    try {
      console.log('Venue configuration updated:', updatedConfig);
      // await eventAPI.updateVenueConfig(eventId, updatedConfig);
    } catch (e) {
      console.error('Failed to save venue configuration:', e);
    }
  };

  const getStatusBadge = (status: EventData['status']) => {
    const statusConfig: Record<EventData['status'], { color: string; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      error: { color: 'bg-red-100 text-red-800', label: 'Error' },
      active: { color: 'bg-emerald-100 text-emerald-800', label: 'Active' },
    };

    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // ---- Early returns ----
  if (isLoading || isLoadingEventDetails) {
    return (
      <WeatherBackground 
        venueLocation={null} 
        eventDate={''}
        testMode={false}
      >
        <div className="max-w-7xl mx-auto p-6">
          <GlassCard intensity="medium" blur="md" className="text-center py-12">
            <Spinner size="lg" className="mb-4" />
            <p className="text-white/80">
              {isLoadingEventDetails ? 'Loading event details...' : 'Loading event dashboard...'}
            </p>
          </GlassCard>
        </div>
      </WeatherBackground>
    );
  }

  if (!user) {
    return (
      <WeatherBackground 
        venueLocation={null} 
        eventDate={''}
        testMode={false}
      >
        <div className="max-w-7xl mx-auto p-6">
          <GlassCard intensity="medium" blur="md">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-white mb-2">
                Authentication Required
              </h3>
              <p className="text-white/80 mb-6">
                Please sign in to view event details
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </GlassCard>
        </div>
      </WeatherBackground>
    );
  }

  if (!currentEvent) {
    return (
      <WeatherBackground 
        venueLocation={null} 
        eventDate={''}
        testMode={false}
      >
        <div className="max-w-7xl mx-auto p-6">
          <GlassCard intensity="medium" blur="md">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-white mb-2">
                Event Not Found
              </h3>
              <p className="text-white/80 mb-6">
                The requested event could not be found or you don't have access to it.
              </p>
              <Button onClick={handleBackToDashboard}>
                Back to Dashboard
              </Button>
            </div>
          </GlassCard>
        </div>
      </WeatherBackground>
    );
  }

  // ---- Derived recommendations (no IIFE) ----
  const recommendations: Array<{ title: string; description: string; action?: string; priority?: 'high' | 'medium' | 'low' }> =
    (forecastResult?.recommendations?.length ? forecastResult.recommendations : [
      {
        title: 'Optimize Entry Flow',
        description:
          'Based on venue layout analysis, consider opening additional entry points 30 minutes before event start to reduce bottlenecks.',
        action: 'Deploy staff to gates A and C',
        priority: 'high',
      },
      {
        title: 'Peak Time Management',
        description:
          'Expected high congestion between 2:30-3:00 PM. Prepare crowd control measures for main concourse areas.',
        action: 'Station security at hotspot zones',
        priority: 'medium',
      },
    ]) as any[];

  return (
    <WeatherBackground 
      venueLocation={currentEvent?.venueLocation || null} 
      eventDate={currentEvent?.dateStart || ''}
      testMode={false}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Back button */}
        

        {/* Event Header */}
        <EventHeader
          currentEvent={currentEvent}
          forecastResult={forecastResult}
          isForecastLoading={isForecastLoading}
          handleGenerateForecast={handleGenerateForecast}
          handleViewOngoingEvent={handleViewOngoingEvent}
          handleGenerateReport={handleGenerateReport}
          isGeneratingReport={isGeneratingReport}
          getStatusBadge={getStatusBadge}
        />

      {/* Error Display */}
      {(error || forecastError) && (
        <GlassCard className="mb-6" intensity="medium" blur="md">
          <div className="flex items-center gap-2 text-red-100 bg-red-500/20 rounded-lg p-4 border border-red-300/30">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error:</span>
            <span>{error || forecastError}</span>
          </div>
        </GlassCard>
      )}

      {/* Forecast Loading Display */}
      {isForecastLoading && (
        <GlassCard className="mb-6" intensity="medium" blur="md">
          <div className="flex items-center gap-2 text-blue-100 bg-blue-500/20 rounded-lg p-4 border border-blue-300/30">
            <Spinner size="sm" />
            <span className="font-medium">Generating forecast...</span>
            <span>This may take a moment to analyze your event data.</span>
          </div>
        </GlassCard>
      )}

      {/* Event Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EventTimeCard currentEvent={currentEvent} />

        <VenueCard currentEvent={currentEvent} />

        <WeatherCard />
      </div>

      {/* Show venue layout configuration when no forecast is available */}
      {(!forecastResult || Object.keys(forecastResult).length === 0) && !isForecastLoading && (
        <div className="space-y-6">
          {/* Forecast Info Card */}
          <ForecastNotGeneratedCard />

          {/* Venue Layout Editor */}
          {currentEvent?.venueLayout && (
            <VenueLayoutEditor
              venueLayout={currentEvent.venueLayout}
              eventId={eventId}
              onSave={handleVenueConfigSave}
              readOnly={false}
              existingAttachmentUrls={currentEvent.attachmentUrls || []}
              existingAttachmentFilenames={currentEvent.attachmentFilenames || []}
              hideLayoutTypeControls={true}
            />
          )}

          {/* Show message if no venue layout exists */}
          {!currentEvent?.venueLayout && (
            <GlassCard intensity="medium" blur="md">
              <div className={`text-center ${(isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-500'}`}>
                <TrendingUp className={`mx-auto h-12 w-12 mb-3 ${(isDarkBackground || isRainBackground) ? 'text-white/60' : 'text-gray-400'}`} />
                <h4 className={`text-lg font-medium mb-2 ${(isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900'}`}>
                  No Venue Layout
                </h4>
                <p className={(isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-600'}>
                  This event was created without a venue layout. You can add one by editing the event or creating a new event with the venue layout builder.
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Main Dashboard Content - Only show if forecast exists */}
      {forecastResult && Object.keys(forecastResult).length > 0 && (
        <div className="space-y-6">
          {/* Tabbed Interface */}
          <GlassCard intensity="medium" blur="md">
            {/* Tab Headers */}
            <div className="flex space-x-1 border-b border-white/10 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all ${
                  activeTab === 'overview'
                    ? (isDarkBackground || isRainBackground)
                      ? 'text-white border-b-2 border-blue-400 bg-blue-500/10'
                      : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : (isDarkBackground || isRainBackground)
                      ? 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Overview
              </button>
              
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all ${
                  activeTab === 'insights'
                    ? (isDarkBackground || isRainBackground)
                      ? 'text-white border-b-2 border-blue-400 bg-blue-500/10'
                      : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : (isDarkBackground || isRainBackground)
                      ? 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                AI Insights
              </button>
              
              <button
                onClick={() => setActiveTab('logistics')}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all ${
                  activeTab === 'logistics'
                    ? (isDarkBackground || isRainBackground)
                      ? 'text-white border-b-2 border-blue-400 bg-blue-500/10'
                      : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : (isDarkBackground || isRainBackground)
                      ? 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Map className="h-4 w-4" />
                Traffic
              </button>
              
              <button
                onClick={() => setActiveTab('configuration')}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all ${
                  activeTab === 'configuration'
                    ? (isDarkBackground || isRainBackground)
                      ? 'text-white border-b-2 border-blue-400 bg-blue-500/10'
                      : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : (isDarkBackground || isRainBackground)
                      ? 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-4 w-4" />
                Configuration
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="border border-white/10 rounded-lg p-6 bg-white/5">
                    <h3 className={`text-lg font-semibold mb-4 ${getSectionHeaderColor()}`}>Crowd Density Simulation</h3>
                    <div className="w-full transform scale-90 origin-top">
                      <VenueLayoutCard event={viewEvent} />
                    </div>
                  </div>

                  <div className="border border-white/10 rounded-lg p-6 bg-white/5">
                    <h3 className={`text-lg font-semibold mb-4 ${getSectionHeaderColor()}`}>🚦 Venue Traffic</h3>
                    <div className="space-y-4">
                      {/* Route Info */}
                      {routeInfo && (
                        <div className="flex gap-2 text-xs">
                          <span className={`px-2 py-1 rounded text-xs ${(isDarkBackground || isRainBackground) ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
                            {routeInfo.distance}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${(isDarkBackground || isRainBackground) ? 'bg-green-500/20 text-green-200' : 'bg-green-50 text-green-700'}`}>
                            {routeInfo.duration}
                          </span>
                        </div>
                      )}

                      {/* Full Width Map */}
                      <div className="rounded overflow-hidden border border-gray-200">
                        <ErrorBoundary>
                          <CongestionMap
                            origin={{ 
                              lat: (currentEvent.venueLocation?.lat || 3.1390) - 0.001, 
                              lng: (currentEvent.venueLocation?.lng || 101.6869) - 0.001 
                            }}
                            destination={{ 
                              lat: (currentEvent.venueLocation?.lat || 3.1390) + 0.001, 
                              lng: (currentEvent.venueLocation?.lng || 101.6869) + 0.001 
                            }}
                            waypoints={[
                              { 
                                lat: currentEvent.venueLocation?.lat || 3.1390, 
                                lng: currentEvent.venueLocation?.lng || 101.6869 
                              }
                            ]}
                            height={400}
                            venueCenter={{ lat: currentEvent.venueLocation?.lat || 3.1390, lng: currentEvent.venueLocation?.lng || 101.6869 }}
                            zoomLevel={16}
                            onRouteChanged={handleRouteChanged}
                            onCongestionData={handleCongestionData}
                          />
                        </ErrorBoundary>
                      </div>
                    
                      {/* Traffic Stats Below Map */}
                      <div className="grid grid-cols-3 gap-3">
                        {congestionData.length > 0 ? (
                          <>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center justify-center space-x-2 mb-1">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-700">Good Flow</span>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                {(() => {
                                  const total = congestionData.length;
                                  const green = congestionData.filter(s => s.color === '#4CAF50').length;
                                  return Math.round((green / total) * 100);
                                })()}%
                              </div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="flex items-center justify-center space-x-2 mb-1">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-sm font-medium text-orange-700">Moderate</span>
                              </div>
                              <div className="text-lg font-bold text-orange-600">
                                {(() => {
                                  const total = congestionData.length;
                                  const orange = congestionData.filter(s => s.color === '#FF9800').length;
                                  return Math.round((orange / total) * 100);
                                })()}%
                              </div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <div className="flex items-center justify-center space-x-2 mb-1">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-medium text-red-700">Heavy</span>
                              </div>
                              <div className="text-lg font-bold text-red-600">
                                {(() => {
                                  const total = congestionData.length;
                                  const red = congestionData.filter(s => s.color === '#F44336').length;
                                  return Math.round((red / total) * 100);
                                })()}%
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-3 text-center">
                            <p className={`text-xs ${(isDarkBackground || isRainBackground) ? 'text-white/60' : 'text-gray-400'}`}>
                              Drag to see data
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-white/10 rounded-lg p-6 bg-white/5">
                    <h3 className={`text-lg font-semibold mb-8 ${getSectionHeaderColor()}`}>Nearby Parking</h3>
                    <div className="w-full overflow-hidden rounded-lg">
                      <div className="w-full transform scale-95 origin-top">
                        <VenueMap venueLocation={currentEvent.venueLocation} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights Tab */}
              {activeTab === 'insights' && (
                <div className="space-y-6">
                  {/* Weather Recommendations */}
                  <WeatherRecommendations />

                  {/* AI Recommendations */}
                  <div>
                    <h3 className={`text-lg font-semibold mb-4 ${getSectionHeaderColor()}`}>AI Recommendations</h3>
                    <div className="space-y-3">
                      {recommendations.map((rec: any, index: number) => {
                        const priorityColors = (isDarkBackground || isRainBackground) ? {
                          high: { bg: 'bg-red-500/20', border: 'border-red-300/40', text: 'text-red-100', icon: 'text-red-200' },
                          medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-300/40', text: 'text-yellow-100', icon: 'text-yellow-200' },
                          low: { bg: 'bg-blue-500/20', border: 'border-blue-300/40', text: 'text-blue-100', icon: 'text-blue-200' }
                        } : {
                          high: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-900', icon: 'text-red-700' },
                          medium: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900', icon: 'text-yellow-700' },
                          low: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', icon: 'text-blue-700' }
                        };
                        
                        const colors = priorityColors[rec.priority as keyof typeof priorityColors] || priorityColors.medium;
                        
                        return (
                          <div key={index} className={`p-3 ${colors.bg} ${colors.border} border rounded-lg backdrop-blur-sm`}>
                            <div className="flex items-start">
                              <AlertTriangle className={`h-4 w-4 ${colors.icon} mt-0.5 mr-2 flex-shrink-0`} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className={`text-sm font-medium ${colors.text}`}>{rec.title}</h4>
                                  {rec.priority && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      (isDarkBackground || isRainBackground) 
                                        ? (rec.priority === 'high' ? 'bg-red-400/30 text-red-100 border border-red-300/40' :
                                           rec.priority === 'medium' ? 'bg-yellow-400/30 text-yellow-100 border border-yellow-300/40' :
                                           'bg-blue-400/30 text-blue-100 border border-blue-300/40')
                                        : (rec.priority === 'high' ? 'bg-red-200 text-red-900 border border-red-400' :
                                           rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-900 border border-yellow-400' :
                                           'bg-blue-200 text-blue-900 border border-blue-400')
                                    }`}>
                                      {rec.priority.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm ${colors.text} mt-1 opacity-90`}>{rec.description}</p>
                                {rec.action && (
                                  <div className={`mt-2 text-xs ${colors.text} rounded px-2 py-1 border ${
                                    (isDarkBackground || isRainBackground) 
                                      ? 'bg-white/10 backdrop-blur-sm border-white/20' 
                                      : 'bg-white/50 border-gray-300'
                                  }`}>
                                    <span className="font-medium">💡 Action:</span> {rec.action}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nearby Events Discovery */}
                  {currentEvent.nearby_result && (
                    <NearbyEventsCard nearbyEventData={currentEvent.nearby_result} />
                  )}

                  {/* AI Popularity Analysis */}
                  {currentEvent.popularityContent && (
                    <PopularityInsights popularityContent={currentEvent.popularityContent} />
                  )}
                </div>
              )}

              {/* Logistics Tab */}
              {activeTab === 'logistics' && (
                <div className="space-y-6">
                  {/* Public Transit Information */}
                  {currentEvent.venueLocation && (
                    <TransitInformationCard venueLocation={currentEvent.venueLocation} />
                  )}

                  {/* Live Traffic Forecast */}
                  {currentEvent.venueLocation && (
                    <LiveTrafficForecast 
                      venueLocation={currentEvent.venueLocation}
                      selectedStation={undefined}
                      eventDate={currentEvent.dateStart}
                      eventTimeRange={{
                        start: new Date(currentEvent.dateStart).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        }),
                        end: new Date(currentEvent.dateEnd).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })
                      }}
                    />
                  )}
                </div>
              )}

              {/* Configuration Tab */}
              {activeTab === 'configuration' && (
                <div className="space-y-6">
                  {currentEvent?.venueLayout && (
                    <VenueLayoutEditor
                      venueLayout={currentEvent.venueLayout}
                      eventId={eventId}
                      onSave={handleVenueConfigSave}
                      readOnly={false}
                      existingAttachmentUrls={currentEvent.attachmentUrls || []}
                      existingAttachmentFilenames={currentEvent.attachmentFilenames || []}
                      hideLayoutTypeControls={true}
                    />
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
      </div>
    </WeatherBackground>
  );
};

export default EventDetails;

