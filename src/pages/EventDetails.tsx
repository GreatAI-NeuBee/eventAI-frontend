import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Calendar, MapPin, Play, FileDown } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import WeatherBackground, { WeatherContext } from '../components/common/WeatherBackground';
import VenueMap from '../components/dashboard/VenueMap';
import LiveTrafficForecast from '../components/dashboard/LiveTrafficForecast';
import ParkingForecast from '../components/dashboard/ParkingForecast';
import VenueLayoutEditor, { VenueLayoutEditorData } from '../components/venue/VenueLayoutEditor';
import PopularityInsights from '../components/event/PopularityInsights';
import CongestionMap, { LatLng, CongestionSegment } from '../components/CongestionMap';
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
        };
        
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

      {/* Minimal Traffic Map */}
      <GlassCard className="mb-4" intensity="light" blur="sm">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
             <h4 className={`text-sm font-medium ${getSectionHeaderColor()}`}>
               🚦 Venue Traffic
             </h4>
            {routeInfo && (
              <div className="flex gap-1 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-xs ${(isDarkBackground || isRainBackground) ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
                  {routeInfo.distance}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${(isDarkBackground || isRainBackground) ? 'bg-green-500/20 text-green-200' : 'bg-green-50 text-green-700'}`}>
                  {routeInfo.duration}
                </span>
              </div>
            )}
          </div>
          
           <div className="space-y-4">
             {/* Full Width Map */}
              <div className="rounded overflow-hidden border border-gray-200">
                <ErrorBoundary>
                  <CongestionMap
                    origin={{ 
                      lat: (currentEvent.venue?.lat || 3.1390) - 0.001, 
                      lng: (currentEvent.venue?.lng || 101.6869) - 0.001 
                    }}
                    destination={{ 
                      lat: (currentEvent.venue?.lat || 3.1390) + 0.001, 
                      lng: (currentEvent.venue?.lng || 101.6869) + 0.001 
                    }}
                    waypoints={[
                      { 
                        lat: currentEvent.venue?.lat || 3.1390, 
                        lng: currentEvent.venue?.lng || 101.6869 
                      }
                    ]}
                    height={400}
                    venueCenter={{ lat: currentEvent.venue?.lat || 3.1390, lng: currentEvent.venue?.lng || 101.6869 }}
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
                <div className="text-center">
                  <p className={`text-xs ${(isDarkBackground || isRainBackground) ? 'text-white/60' : 'text-gray-400'}`}>
                    Drag to see data
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Simulation Chart and Venue Map */}
          <div className="xl:col-span-2 space-y-6">
            <GlassCard intensity="medium" blur="md">
              <h3 className={`text-lg font-semibold mb-4 ${getSectionHeaderColor()}`}>Crowd Density Simulation</h3>
              <VenueLayoutCard event={viewEvent} />
            </GlassCard>

            <GlassCard intensity="medium" blur="md">
              <h3 className={`text-lg font-semibold mb-4 ${getSectionHeaderColor()}`}>Venue Layout</h3>
              <VenueMap
                venueLocation={currentEvent.venueLocation}
              />
            </GlassCard>
          </div>

          {/* Right Column - Recommendations and Forecasts */}
          <div className="space-y-6">
            <GlassCard intensity="medium" blur="md">
              <h3 className={`text-lg font-semibold mb-4 ${getSectionHeaderColor()}`}>AI Recommendations</h3>
              <div className="space-y-3">
                {(() => {
                  return recommendations.map((rec: any, index: number) => {
                    // Dynamic colors based on weather
                    const priorityColors = (isDarkBackground || isRainBackground) ? {
                      // Storm/Rain - light text on dark backgrounds
                      high: { bg: 'bg-red-500/20', border: 'border-red-300/40', text: 'text-red-100', icon: 'text-red-200' },
                      medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-300/40', text: 'text-yellow-100', icon: 'text-yellow-200' },
                      low: { bg: 'bg-blue-500/20', border: 'border-blue-300/40', text: 'text-blue-100', icon: 'text-blue-200' }
                    } : {
                      // Clear/Sunny/Cloudy - dark text on light backgrounds
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
                  });
                })()}
              </div>
            </GlassCard>

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

            {/* Parking Forecast */}
            {currentEvent.venueLocation && (
              <ParkingForecast venueLocation={currentEvent.venueLocation} />
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

