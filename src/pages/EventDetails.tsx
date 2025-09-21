import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, TrendingUp, Calendar, MapPin, Play } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import SimulationChart from '../components/dashboard/SimulationChart';
import VenueMap from '../components/dashboard/VenueMap';
import ScenarioTabs from '../components/dashboard/ScenarioTabs';
import TransitForecast from '../components/dashboard/TransitForecast';
import ParkingForecast from '../components/dashboard/ParkingForecast';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import VenueLayoutEditor, { VenueLayoutEditorData } from '../components/venue/VenueLayoutEditor';
import { useEventStore } from '../store/eventStore';
import { useAuth } from '../contexts/AuthContext';
import type { EventData } from '../types/simulation';
import { eventAPI } from '../api/apiClient';
import { VenueLayoutCard } from './VenueLayoutCard';

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
        
        // Check if forecastResult exists (note: API returns 'forecastResult', not 'forecast_result')
        if (eventData.forecastResult) {
          console.log('EventDetails: Forecast result found, loading simulation data');
          console.log('EventDetails: Forecast result structure:', eventData.forecastResult);
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
            console.log('EventDetails: Simulation data set in store:', simulationData);
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
      console.log('🔮 Generating forecast for event:', currentEvent.name);
      
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
      
      console.log('🔮 Forecast request data:', forecastRequestData);
      
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
      
      console.log('✅ Forecast generated successfully with API integration');
      
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
            {(!forecastResult || Object.keys(forecastResult).length === 0) && (
              <Button 
                onClick={handleGenerateForecast}
                disabled={isForecastLoading || !currentEvent.venueLayout}
                title={!currentEvent.venueLayout ? 'Venue layout required to generate forecast' : ''}
              >
                {isForecastLoading ? 'Generating...' : 'Forecast'}
              </Button>
            )}
            {forecastResult && Object.keys(forecastResult).length > 0 && (
              <Button 
                onClick={handleViewOngoingEvent}
                variant="primary"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                View Ongoing Event
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-primary-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Event Time</p>
                <div className="flex flex-row items-center space-x-2">
                  <div className="text-sm font-semibold text-gray-900">
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
                  <div className="text-gray-400 font-medium">-</div>
                  <div className="text-sm font-semibold text-gray-900">
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
            <CheckCircle className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Hotspots</p>
              <p className="text-lg font-semibold text-gray-900">
                {forecastResult && Object.keys(forecastResult).length > 0
                  ? (forecastResult?.hotspots?.length || simulationResult?.hotspots?.length || 0)
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Show venue layout configuration when no forecast is available */}
      {(!forecastResult || Object.keys(forecastResult).length === 0) && !isForecastLoading && (
        <div className="space-y-6">
          {/* Forecast Info Card */}
          <Card className="mb-6">
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Forecast Not Generated
              </h3>
              <p className="text-gray-600 mb-4">
                Configure your venue layout below with exits and toilets, then click "Forecast" to generate crowd density predictions.
                <br />
                <span className="text-sm text-gray-500">
                  Note: Supports up to 5 exits and 2 toilets for forecast generation.
                </span>
              </p>
            </div>
          </Card>

          {/* Venue Layout Editor */}
          {currentEvent?.venueLayout && (
            <VenueLayoutEditor
              venueLayout={currentEvent.venueLayout}
              eventId={eventId}
              onSave={handleVenueConfigSave}
              readOnly={false}
            />
          )}

          {/* Show message if no venue layout exists */}
          {!currentEvent?.venueLayout && (
            <Card className="p-6">
              <div className="text-center text-gray-500">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No Venue Layout
                </h4>
                <p className="text-gray-600">
                  This event was created without a venue layout. You can add one by editing the event or creating a new event with the venue layout builder.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
      

      {/* Main Dashboard Content - Only show if forecast exists */}
      {forecastResult && Object.keys(forecastResult).length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Simulation Chart and Venue Map */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Crowd Density Simulation</h3>
              {/* <SimulationChart
                data={forecastResult?.crowdDensity || simulationResult?.crowdDensity || []}
                title="Crowd Density Simulation"
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
              /> */}
                <VenueLayoutCard event={viewEvent} />

            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Venue Layout</h3>
              <VenueMap
                hotspots={forecastResult?.hotspots || simulationResult?.hotspots || []}
                venueLocation={currentEvent.venueLocation}
              />
            </Card>

            {/* Weather Forecast */}
            {currentEvent.venueLocation && (
              <Card className="p-6">
                <WeatherWidget
                  venueLocation={currentEvent.venueLocation}
                  eventDate={currentEvent.dateStart}
                />
              </Card>
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
