import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, TrendingUp, Calendar, MapPin } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import SimulationChart from '../components/dashboard/SimulationChart';
import VenueMap from '../components/dashboard/VenueMap';
import ScenarioTabs from '../components/dashboard/ScenarioTabs';
import TransitForecast from '../components/dashboard/TransitForecast';
import ParkingForecast from '../components/dashboard/ParkingForecast';
import NearbyParkingOptions from '../components/dashboard/NearbyParkingOptions';
import { useEventStore } from '../store/eventStore';
import { useAuth } from '../contexts/AuthContext';
import type { EventData } from '../types/simulation';
import { eventAPI } from '../api/apiClient';

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(true);
  
  // Ref to track if simulation monitoring is already started for this event
  const monitoringEventId = useRef<string | null>(null);

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
          console.log('🗺️ Geocoding venue:', venueString);
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
          console.log('✅ Geocoded venue location:', geocodedLocation);
          return geocodedLocation;
        } catch (error) {
          console.warn('⚠️ Geocoding failed:', error);
        }
      } else {
        console.warn('⚠️ Google Maps not loaded after waiting');
      }
    }

    // Default fallback location (Kuala Lumpur city center)
    const defaultLocation = {
      lat: 3.139,
      lng: 101.6869,
      name: venueString || 'Event Venue',
      address: venueString || 'Kuala Lumpur, Malaysia',
    };
    console.log('🏙️ Using default location for venue:', defaultLocation);
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
        console.log('🔍 EventDetails: Fetching event details for:', eventId);
        const response = await eventAPI.getEvent(eventId);
        console.log('🔍 EventDetails: API response:', response);
        
        // Handle the backend response structure
        const eventData = response.data.data || response.data;
        console.log('🔍 EventDetails: Parsed event data:', eventData);
        
        // Transform backend event to frontend EventData format
        const transformedEvent: EventData = {
          id: eventData.eventId || eventData.id,
          name: eventData.name,
          dateStart: eventData.dateOfEventStart || eventData.dateStart,
          dateEnd: eventData.dateOfEventEnd || eventData.dateEnd,
          venue: eventData.venue || eventData.venueLocation?.name || eventData.venueLocation?.address || 'Venue location',
          description: eventData.description || '',
          venueLocation: await (async () => {
            console.log('🗺️ EventDetails: Getting venue location for:', eventData.venue);
            const venueLocationWithCoords = await getVenueLocationWithCoordinates(eventData);
            console.log('🗺️ EventDetails: Final venue location:', venueLocationWithCoords);
            return venueLocationWithCoords;
          })(),
          venueLayout: eventData.venueLayout,
          userEmail: eventData.userEmail,
          status: eventData.status?.toLowerCase() === 'created' ? 'active' : (eventData.status?.toLowerCase() || 'completed') as EventData['status'],
          createdAt: eventData.createdAt,
        };
        
        console.log('🔍 EventDetails: Transformed event:', transformedEvent);
        setCurrentEvent(transformedEvent);
        
        // Check if forecast_result exists
        if (eventData.forecast_result) {
          console.log('EventDetails: Forecast result found, loading simulation data');
          setForecastResult(eventData.forecast_result);
          // Set simulation result in the store for components to use
          if (eventData.forecast_result.crowdDensity || eventData.forecast_result.hotspots) {
            const simulationData = {
              eventId: eventId,
              crowdDensity: eventData.forecast_result.crowdDensity || [],
              hotspots: eventData.forecast_result.hotspots || [],
              recommendations: eventData.forecast_result.recommendations || [],
              scenarios: eventData.forecast_result.scenarios || { entry: {}, exit: {}, congestion: {} }
            };
            // Update the simulation result in the store
            const { setSimulationResult } = useEventStore.getState();
            setSimulationResult(simulationData);
          }
        } else {
          console.log('EventDetails: No forecast result found, showing basic event info');
          setForecastResult(null);
        }
        
      } catch (error: any) {
        console.error('❌ EventDetails: Error fetching event details:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        // If API fails, try to find event in existing events array as fallback
        const foundEvent = events.find(event => event.id === eventId);
        if (foundEvent) {
          console.log('EventDetails: Using fallback event from store');
          setCurrentEvent(foundEvent);
        } else {
          console.warn('EventDetails: Event not found, redirecting to dashboard');
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

  // Handle forecast generation
  const handleGenerateForecast = async () => {
    if (!eventId || !currentEvent) return;
    
    setIsForecastLoading(true);
    setForecastError(null);
    
    try {
      console.log('🔮 Generating forecast with venue location:', currentEvent.venueLocation);
      
      const response = await eventAPI.generateForecast(eventId) as any;
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
      
      console.log('✅ Forecast generated with real venue integration');
      
    } catch (error: any) {
      console.error('Error generating forecast:', error);
      setForecastError(error.response?.data?.message || error.message || 'Failed to generate forecast');
    } finally {
      setIsForecastLoading(false);
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Spinner size="lg" className="mb-4" />
          <p className="text-gray-600">
            {isLoadingEventDetails ? 'Loading event details...' : 'Loading event dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Show authentication error if user is not logged in
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign in to view event details
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show error if no current event
  if (!currentEvent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Event Not Found
            </h3>
            <p className="text-gray-600 mb-6">
              The requested event could not be found or you don't have access to it.
            </p>
            <Button onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Debug logging removed

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back button */}
      

      {/* Event Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentEvent.name}</h1>
            <p className="mt-2 text-gray-600">
              Event Dashboard - Real-time monitoring and insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusBadge(currentEvent.status)}
            {!forecastResult && (
              <Button 
                onClick={handleGenerateForecast}
                disabled={isForecastLoading}
              >
                {isForecastLoading ? 'Generating...' : 'Forecast'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(error || forecastError) && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error:</span>
            <span>{error || forecastError}</span>
          </div>
        </Card>
      )}

      {/* Forecast Loading Display */}
      {isForecastLoading && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Spinner size="sm" />
            <span className="font-medium">Generating forecast...</span>
            <span>This may take a moment to analyze your event data.</span>
          </div>
        </Card>
      )}

      {/* Event Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-primary-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Event Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(currentEvent.dateStart).toLocaleString('en-MY', {
                  timeZone: 'Asia/Kuala_Lumpur',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Venue</p>
              <p className="text-lg font-semibold text-gray-900">{currentEvent.venue}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {currentEvent.status === 'active' ? 'Active' : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {forecastResult && (
          <Card>
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hotspots</p>
                <p className="text-lg font-semibold text-gray-900">
                  {forecastResult?.hotspots?.length || simulationResult?.hotspots?.length || 0}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Show message when no forecast is available */}
      {!forecastResult && !isForecastLoading && (
        <Card className="mb-8">
          <div className="text-center py-12">
            <TrendingUp className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Forecast Not Generated
            </h3>
            <p className="text-gray-600 mb-6">
              Click the "Forecast" button above to generate crowd density predictions, 
              AI recommendations, and venue insights for this event.
            </p>
          </div>
        </Card>
      )}

      {/* Main Dashboard Content - Only show if forecast exists */}
      {forecastResult && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Simulation Chart and Venue Map */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Crowd Density Simulation</h3>
              <SimulationChart
                data={forecastResult?.crowdDensity || simulationResult?.crowdDensity || []}
                title="Crowd Density Simulation"
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Venue Layout</h3>
              <VenueMap
                hotspots={forecastResult?.hotspots || simulationResult?.hotspots || []}
                venueLocation={currentEvent.venueLocation}
              />
            </Card>

            {/* Nearby Parking Options below Venue Layout */}
            {currentEvent.venueLocation && (
              <NearbyParkingOptions venueLocation={currentEvent.venueLocation} />
            )}
          </div>

          {/* Right Column - Recommendations and Forecasts */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
              <div className="space-y-3">
                {(forecastResult?.recommendations || []).length > 0 ? (
                  (forecastResult?.recommendations).map((rec: any, index: number) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">{rec.title}</h4>
                          <p className="text-sm text-yellow-700 mt-1">{rec.description}</p>
                          {rec.action && (
                            <p className="text-xs text-yellow-600 mt-2">Action: {rec.action}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">
                    No recommendations available. The forecast will generate AI insights based on your event data.
                  </p>
                )}
              </div>
            </Card>

            <ScenarioTabs 
              scenarios={forecastResult?.scenarios || simulationResult?.scenarios || {
                entry: {},
                exit: {},
                congestion: {}
              }}
            />

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
    </div>
  );
};

export default EventDetails;
