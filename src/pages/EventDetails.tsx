import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Calendar, MapPin, Play } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import VenueMap from '../components/dashboard/VenueMap';
import TransitForecast from '../components/dashboard/TransitForecast';
import LiveTrafficForecast from '../components/dashboard/LiveTrafficForecast';
import ParkingForecast from '../components/dashboard/ParkingForecast';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import GoogleTrafficGraph from '../components/dashboard/GoogleTrafficGraph';
import EnhancedTrafficForecast from '../components/dashboard/EnhancedTrafficForecast';
import VenueLayoutEditor, { VenueLayoutEditorData } from '../components/venue/VenueLayoutEditor';
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
      } catch (e: any) {
        console.error('Error fetching event details:', e);
        const foundEvent = events.find((ev) => ev.id === eventId);
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

  const handleViewOngoingEvent = () => {
    if (eventId) navigate(`/event/ongoing-event/${eventId}`);
  };

  const handleGenerateForecast = async () => {
    if (!eventId || !currentEvent) return;

    setIsForecastLoading(true);
    setForecastError(null);

    try {
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
    } catch (e: any) {
      console.error('Error generating forecast:', e);
      setForecastError(e.response?.data?.message || e.message || 'Failed to generate forecast');
    } finally {
      setIsForecastLoading(false);
    }
  };

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

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-6">Please sign in to view event details</p>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Event Not Found</h3>
            <p className="text-gray-600 mb-6">
              The requested event could not be found or you don't have access to it.
            </p>
            <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Event Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentEvent.name}</h1>
            <p className="mt-2 text-gray-600">Event Dashboard - Real-time monitoring and insights</p>
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
              <Button onClick={handleViewOngoingEvent} variant="primary" className="bg-green-600 hover:bg-green-700">
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
      </div>

      {/* Show venue layout configuration when no forecast is available */}
      {(!forecastResult || Object.keys(forecastResult).length === 0) && !isForecastLoading && (
        <div className="space-y-8">
          {/* Real-Time Traffic Forecast - Always Visible */}
          {currentEvent.venueLocation && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Real-Time Traffic & Transit Forecast</h2>
              <TransitForecast venueLocation={currentEvent.venueLocation} />
            </div>
          )}

          <div className="space-y-6">
            {/* Forecast Info Card */}
            <Card className="mb-6">
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Forecast Not Generated</h3>
                <p className="text-gray-600 mb-4">
                  Configure your venue layout below with exits and toilets, then click "Forecast" to generate crowd density predictions.
                  <br />
                  <span className="text-sm text-gray-500">Note: Supports up to 5 exits and 2 toilets for forecast generation.</span>
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
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Venue Layout</h4>
                  <p className="text-gray-600">
                    This event was created without a venue layout. You can add one by editing the event or creating a new event with the venue layout builder.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Main Dashboard Content - Only show if forecast exists */}
      {forecastResult && Object.keys(forecastResult).length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6">
              {/* Enhanced Traffic Forecast - New comprehensive traffic analysis */}
              {currentEvent.venueLocation && (
                <EnhancedTrafficForecast 
                  venueLocation={currentEvent.venueLocation}
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

              {/* Google Traffic Graph - Detailed traffic analysis */}
              {currentEvent.venueLocation && (
                <GoogleTrafficGraph 
                  venueLocation={currentEvent.venueLocation}
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

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Crowd Density Simulation</h3>
                <VenueLayoutCard event={viewEvent} />
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Venue Layout</h3>
                <VenueMap venueLocation={currentEvent.venueLocation} />
              </Card>

              {/* Weather Forecast */}
              {currentEvent.venueLocation && (
                <Card className="p-6">
                  <WeatherWidget venueLocation={currentEvent.venueLocation} eventDate={currentEvent.dateStart} />
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Real-Time Traffic Forecast - Moved to right column */}
              {currentEvent.venueLocation && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Real-Time Traffic & Transit Forecast</h3>
                  <TransitForecast venueLocation={currentEvent.venueLocation} />
                </Card>
              )}

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => {
                    const priorityColors = {
                      high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
                      medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
                      low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
                    } as const;

                    const colors = (priorityColors as any)[rec.priority ?? 'medium'] ?? priorityColors.medium;

                    return (
                      <div key={index} className={`p-3 ${colors.bg} ${colors.border} border rounded-lg`}>
                        <div className="flex items-start">
                          <AlertTriangle className={`h-4 w-4 ${colors.icon} mt-0.5 mr-2 flex-shrink-0`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-sm font-medium ${colors.text}`}>{rec.title}</h4>
                              {rec.priority && (
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    rec.priority === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : rec.priority === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {rec.priority.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${colors.text} mt-1 opacity-90`}>{rec.description}</p>
                            {rec.action && (
                              <div className={`mt-2 text-xs ${colors.text} bg-white/50 rounded px-2 py-1`}>
                                <span className="font-medium">💡 Action:</span> {rec.action}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Live Traffic Forecast */}
              {currentEvent.venueLocation && (
                <LiveTrafficForecast 
                  venueLocation={currentEvent.venueLocation}
                  selectedStation={undefined} // This will need to be passed from TransitForecast
                />
              )}

              {/* Parking Forecast */}
              {currentEvent.venueLocation && (
                <ParkingForecast venueLocation={currentEvent.venueLocation} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;

