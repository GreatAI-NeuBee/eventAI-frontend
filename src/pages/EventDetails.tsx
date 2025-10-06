import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Calendar, MapPin, Play } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import WeatherBackground, { WeatherContext } from '../components/common/WeatherBackground';
import VenueMap from '../components/dashboard/VenueMap';
import TransitForecast from '../components/dashboard/TransitForecast';
import ParkingForecast from '../components/dashboard/ParkingForecast';
import VenueLayoutEditor, { VenueLayoutEditorData } from '../components/venue/VenueLayoutEditor';
import PopularityInsights from '../components/event/PopularityInsights';
import { useEventStore } from '../store/eventStore';
import { useAuth } from '../contexts/AuthContext';
import type { EventData } from '../types/simulation';
import { eventAPI } from '../api/apiClient';
import { VenueLayoutCard } from './VenueLayoutCard';

// Component for event time card with weather-aware colors
const EventTimeCard: React.FC<{ currentEvent: EventData }> = ({ currentEvent }) => {
  const { isDarkBackground } = useContext(WeatherContext);
  
  const getTextColor = () => isDarkBackground ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => isDarkBackground ? 'text-white/80' : 'text-gray-700';
  const getDividerColor = () => isDarkBackground ? 'text-white/60' : 'text-gray-400';
  
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
  const { isDarkBackground } = useContext(WeatherContext);
  
  const getTextColor = () => isDarkBackground ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => isDarkBackground ? 'text-white/80' : 'text-gray-700';
  
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
  const { isDarkBackground, weatherData, weatherCondition } = useContext(WeatherContext);
  
  const getTextColor = () => isDarkBackground ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => isDarkBackground ? 'text-white/80' : 'text-gray-700';
  
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
  
  return (
    <GlassCard intensity="medium" blur="md">
      <div className="flex items-center">
        <div className="text-4xl">
          {getWeatherIcon()}
        </div>
        <div className="ml-4">
          <p className={`text-sm font-medium ${getSecondaryTextColor()}`}>Weather</p>
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
        </div>
      </div>
    </GlassCard>
  );
};

// Component for forecast not generated card with weather-aware colors
const ForecastNotGeneratedCard: React.FC = () => {
  const { isDarkBackground } = useContext(WeatherContext);
  
  const getTextColor = () => isDarkBackground ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => isDarkBackground ? 'text-white/80' : 'text-gray-600';
  const getIconColor = () => isDarkBackground ? 'text-white/60' : 'text-gray-400';
  
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
  getStatusBadge: (status: EventData['status']) => React.ReactNode;
}> = ({ 
  currentEvent, 
  forecastResult, 
  isForecastLoading, 
  handleGenerateForecast, 
  handleViewOngoingEvent, 
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
            <Button 
              onClick={handleViewOngoingEvent}
              variant="primary"
              className="bg-green-600 hover:scale-100 hover:bg-green-600 hover:shadow-md"
            >
              <Play className="h-4 w-4 mr-2" />
              View Ongoing Event
            </Button>
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
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(true);
  
  // Ref to track if simulation monitoring is already started for this event
  const monitoringEventId = useRef<string | null>(null);

  // Helper function to extract gates from venue layout
  const extractGatesFromVenueLayout = (venueLayout: any): { gates: string[], gates_crowd: number[] } => {
    const gates: string[] = [];
    const gates_crowd: number[] = [];
    
    if (!venueLayout) {
      console.warn('No venue layout provided for gate extraction');
      return { gates, gates_crowd };
    }

    // Extract exits (represented as A, B, C, D, E - max 5)
    if (venueLayout.exitsList && Array.isArray(venueLayout.exitsList)) {
      const exitCount = Math.min(venueLayout.exitsList.length, 5); // Max 5 exits
      const exitLetters = ['A', 'B', 'C', 'D', 'E'];
      
      for (let i = 0; i < exitCount; i++) {
        gates.push(exitLetters[i]);
        // Get capacity from exitsList, default to 800 if not specified
        const capacity = venueLayout.exitsList[i]?.capacity || 800;
        gates_crowd.push(capacity);
      }
      
      console.log(`🚪 Extracted ${exitCount} exit gates:`, gates.slice(0, exitCount));
      console.log(`🚪 Exit capacities:`, gates_crowd.slice(0, exitCount));
    }

    // Extract toilets (represented as 1, 2 - max 2)
    if (venueLayout.toiletsList && Array.isArray(venueLayout.toiletsList)) {
      const toiletCount = Math.min(venueLayout.toiletsList.length, 2); // Max 2 toilets
      
      for (let i = 1; i <= toiletCount; i++) {
        gates.push(i.toString());
        // Get capacity from toiletsList, default to 50 if not specified
        const capacity = venueLayout.toiletsList[i-1]?.capacity || 50;
        gates_crowd.push(capacity);
      }
      
      console.log(`🚽 Extracted ${toiletCount} toilet gates:`, gates.slice(-toiletCount));
      console.log(`🚽 Toilet capacities:`, gates_crowd.slice(-toiletCount));
    }

    console.log('🎯 Total gates extracted:', gates);
    console.log('🎯 Total gate capacities:', gates_crowd);
    return { gates, gates_crowd };
  };

  // Helper function to get venue location with coordinates
  const getVenueLocationWithCoordinates = async (eventData: any) => {
    // If venueLocation already has coordinates, return it
    if (eventData.venueLocation && eventData.venueLocation.lat && eventData.venueLocation.lng) {
      return eventData.venueLocation;
    }

    // If we have a venue string, try to geocode it
    const venueString = eventData.venue || eventData.venueLocation?.name || eventData.venueLocation?.address;
    if (venueString) {
      // Wait for Google Maps to load
      let retries = 0;
      const maxRetries = 10;
      while (retries < maxRetries && (!window.google || !window.google.maps || !window.google.maps.Geocoder)) {
        console.log(`⏳ Waiting for Google Maps to load... (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: venueString }, (results, status) => {
              if (status === 'OK' && results && results.length > 0) {
                resolve(results);
              } else {
                reject(new Error(`Geocoding failed: ${status}`));
              }
            });
          });

          const location = result[0].geometry.location;
          const geocodedLocation = {
            lat: location.lat(),
            lng: location.lng(),
            name: venueString,
            address: result[0].formatted_address,
          };
          return geocodedLocation;
        } catch (error) {
          console.warn('⚠️ Geocoding failed:', error);
        }
      }
    }

    // Default fallback location (Kuala Lumpur city center)
    const defaultLocation = {
      lat: 3.139,
      lng: 101.6869,
      name: venueString || 'Event Venue',
      address: venueString || 'Kuala Lumpur, Malaysia',
    };
    return defaultLocation;
  };
  
  const {
    currentEvent,
    events,
    setCurrentEvent,
    simulationResult,
    isLoading,
    error,
  } = useEventStore();

  // Build the object the child expects from data you already have
  const viewEvent = React.useMemo(
    () => (currentEvent ? { ...currentEvent, forecastResult } : null),
    [currentEvent, forecastResult]
  );


  // Note: useSimulation and useDynamicRecommendations hooks removed as we're using direct forecast generation

  // Note: Simulation monitoring removed as we're using forecast generation instead

  // Fetch event details from API when component mounts or eventId changes
  useEffect(() => {
    if (!eventId) {
      console.warn('EventDetails: No event ID provided');
      navigate('/dashboard');
      return;
    }

    const fetchEventDetails = async () => {
      setIsLoadingEventDetails(true);
      try {
        const response = await eventAPI.getEvent(eventId);
        // Handle the backend response structure
        const eventData = response.data.data || response.data;

        
        // Transform backend event to frontend EventData format
        const transformedEvent: EventData = {
          id: eventData.eventId || eventData.id,
          name: eventData.name,
          dateStart: eventData.dateOfEventStart || eventData.dateStart,
          dateEnd: eventData.dateOfEventEnd || eventData.dateEnd,
          venue: eventData.venue || eventData.venueLocation?.name || eventData.venueLocation?.address || 'Venue location',
          description: eventData.description || '',
          venueLocation: await getVenueLocationWithCoordinates(eventData),
          venueLayout: eventData.venueLayout,
          userEmail: eventData.userEmail,
          status: eventData.status?.toLowerCase() === 'created' ? 'active' : (eventData.status?.toLowerCase() || 'completed') as EventData['status'],
          createdAt: eventData.createdAt,
          attachmentUrls: eventData.attachmentUrls || [],
          attachmentFilenames: eventData.attachmentFilenames || [],
          popularityContent: eventData.popularityContent || eventData.popularity_content || eventData.popularityExtent || undefined,
        };
        
        setCurrentEvent(transformedEvent);
        
        // Check if forecastResult exists (note: API returns 'forecastResult', not 'forecast_result')
        if (eventData.forecastResult) {
          setForecastResult(eventData.forecastResult);
          
          // Handle nested forecast structure - data might be under 'forecast' property
          const forecastData = eventData.forecastResult.forecast || eventData.forecastResult;
          
          // Set simulation result in the store for components to use
          if (forecastData.crowdDensity || forecastData.hotspots || forecastData.summary) {
            const simulationData = {
              eventId: eventId,
              crowdDensity: forecastData.crowdDensity || [],
              hotspots: forecastData.hotspots || [],
              recommendations: forecastData.recommendations || [],
              scenarios: forecastData.scenarios || { entry: {}, exit: {}, congestion: {} }
            };
            // Update the simulation result in the store
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

  // Handle back navigation
  const handleBackToDashboard = () => {
    // Reset monitoring when going back to dashboard
    monitoringEventId.current = null;
    setCurrentEvent(null);
    navigate('/dashboard');
  };

  // Handle navigation to ongoing event
  const handleViewOngoingEvent = () => {
    if (eventId) {
      navigate(`/event/ongoing-event/${eventId}`);
    }
  };

  // Handle forecast generation
  const handleGenerateForecast = async () => {
    if (!eventId || !currentEvent) return;
    
    setIsForecastLoading(true);
    setForecastError(null);
    
    try {
      
      // Extract gates and their capacities from venue layout
      const { gates, gates_crowd } = extractGatesFromVenueLayout(currentEvent.venueLayout);
      
      if (gates.length === 0) {
        throw new Error('No gates found in venue layout. Please configure exits and toilets in the venue layout.');
      }
      
      // Prepare forecast request data
      // Time gap logic: API provides forecast for pre-event and post-event periods
      // During the actual event time (between schedule_start_time and event_end_time),
      // event_capacity simulates late arrivals with a low fixed number
      const forecastRequestData = {
        eventid: eventId,
        gates: gates,
        gates_crowd: gates_crowd,
        schedule_start_time: currentEvent.dateStart,
        event_end_time: currentEvent.dateEnd,
        event_capacity: 5, // Fixed low capacity for late arrivals during event
        method_exits: "mirror_delay",
        freq: "5min"
      };
      
      
      const response = await eventAPI.generateForecast(forecastRequestData);
      const forecastData = response.data;
      
      // Enhanced forecast data with venue location for real Google Maps integration
      const enhancedForecastData = {
        ...forecastData,
        venueLocation: currentEvent.venueLocation, // Include real venue location
        eventDetails: {
          name: currentEvent.name,
          dateStart: currentEvent.dateStart,
          dateEnd: currentEvent.dateEnd,
          venue: currentEvent.venue
        }
      };
      
      setForecastResult(enhancedForecastData);
      
      // Set simulation result in the store for components to use
      const simulationData = {
        eventId: eventId,
        crowdDensity: forecastData.crowdDensity || [],
        hotspots: forecastData.hotspots || [],
        recommendations: forecastData.recommendations || [],
        scenarios: forecastData.scenarios || { entry: {}, exit: {}, congestion: {} },
        venueLocation: currentEvent.venueLocation // Add venue location to simulation data
      };
      
      // Update the simulation result in the store
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

  // Handle venue configuration save
  const handleVenueConfigSave = async (updatedConfig: VenueLayoutEditorData) => {
    try {
      
      // Here you could save the configuration to the backend
      // For now, we'll just store it locally and show success feedback
      console.log('💾 Venue configuration updated:', updatedConfig);
      
      // You could add an API call here to save the gate configuration:
      // await eventAPI.updateVenueConfig(eventId, updatedConfig);
      
      // Show success message (you could add a toast notification here)
      console.log('✅ Venue configuration saved successfully');
      
    } catch (error) {
      console.error('❌ Failed to save venue configuration:', error);
      // You could show an error message here
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

    // Fallback to 'completed' if status is not recognized
    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Show loading state
  if (isLoading || isLoadingEventDetails) {
    return (
      <WeatherBackground 
        venueLocation={null} 
        eventDate={''}
        testMode={true}
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

  // Show authentication error if user is not logged in
  if (!user) {
    return (
      <WeatherBackground 
        venueLocation={null} 
        eventDate={''}
        testMode={true}
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

  // Show error if no current event
  if (!currentEvent) {
    return (
      <WeatherBackground 
        venueLocation={null} 
        eventDate={''}
        testMode={true}
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

  // Debug logging removed

  return (
    <WeatherBackground 
      venueLocation={currentEvent?.venueLocation || null} 
      eventDate={currentEvent?.dateStart || ''}
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
            />
          )}

          {/* Show message if no venue layout exists */}
          {!currentEvent?.venueLayout && (
            <GlassCard intensity="medium" blur="md">
              <div className="text-center text-gray-500">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No Venue Layout
                </h4>
                <p className="text-gray-600">
                  This event was created without a venue layout. You can add one by editing the event or creating a new event with the venue layout builder.
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      )}
      

      {/* Main Dashboard Content - Only show if forecast exists */}
      {forecastResult && Object.keys(forecastResult).length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Simulation Chart and Venue Map */}
          <div className="xl:col-span-2 space-y-6">
            <GlassCard intensity="medium" blur="md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Crowd Density Simulation</h3>
              {/* <SimulationChart
                data={forecastResult?.crowdDensity || simulationResult?.crowdDensity || []}
                title="Crowd Density Simulation"
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
              /> */}
                <VenueLayoutCard event={viewEvent} />

            </GlassCard>

            <GlassCard intensity="medium" blur="md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Venue Layout</h3>
              <VenueMap
                hotspots={forecastResult?.hotspots || simulationResult?.hotspots || []}
                venueLocation={currentEvent.venueLocation}
              />
            </GlassCard>

            
          </div>

          {/* Right Column - Recommendations and Forecasts */}
          <div className="space-y-6">
            <GlassCard intensity="medium" blur="md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">AI Recommendations</h3>
              <div className="space-y-3">
                {(() => {
                  // Generate mock AI recommendations based on event data
                  const mockRecommendations = [
                    {
                      title: "Optimize Entry Flow",
                      description: "Based on venue layout analysis, consider opening additional entry points 30 minutes before event start to reduce bottlenecks.",
                      action: "Deploy staff to gates A and C",
                      priority: "high"
                    },
                    {
                      title: "Peak Time Management",
                      description: "Expected high congestion between 2:30-3:00 PM. Prepare crowd control measures for main concourse areas.",
                      action: "Station security at hotspot zones",
                      priority: "medium"
                    },
                  ];

                  // Use API recommendations if available, otherwise use mock data
                  const recommendations = (forecastResult?.recommendations?.length > 0) 
                    ? forecastResult.recommendations 
                    : mockRecommendations;

                  return recommendations.map((rec: any, index: number) => {
                    const priorityColors = {
                      high: { bg: 'bg-red-500/20', border: 'border-red-300/40', text: 'text-red-100', icon: 'text-red-200' },
                      medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-300/40', text: 'text-yellow-100', icon: 'text-yellow-200' },
                      low: { bg: 'bg-blue-500/20', border: 'border-blue-300/40', text: 'text-blue-100', icon: 'text-blue-200' }
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
                                  rec.priority === 'high' ? 'bg-red-400/30 text-red-100 border border-red-300/40' :
                                  rec.priority === 'medium' ? 'bg-yellow-400/30 text-yellow-100 border border-yellow-300/40' :
                                  'bg-blue-400/30 text-blue-100 border border-blue-300/40'
                                }`}>
                                  {rec.priority.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${colors.text} mt-1 opacity-90`}>{rec.description}</p>
                            {rec.action && (
                              <div className={`mt-2 text-xs ${colors.text} bg-white/10 backdrop-blur-sm rounded px-2 py-1 border border-white/20`}>
                                <span className="font-medium">💡 Action:</span> {rec.action}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </GlassCard>

        

            {/* Transit and Parking Forecasts in Right Column */}
            {currentEvent.venueLocation && (
              <div className="space-y-6">
                <TransitForecast venueLocation={currentEvent.venueLocation} />
                <ParkingForecast venueLocation={currentEvent.venueLocation} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Popularity Analysis Section - Full width at bottom */}
      {forecastResult && Object.keys(forecastResult).length > 0 && currentEvent.popularityContent && (
        <div className="mt-6">
          <PopularityInsights popularityContent={currentEvent.popularityContent} />
        </div>
      )}
      </div>
    </WeatherBackground>
  );
};

export default EventDetails;
