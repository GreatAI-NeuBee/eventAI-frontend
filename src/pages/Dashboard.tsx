import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import SimulationChart from '../components/dashboard/SimulationChart';
import VenueMap from '../components/dashboard/VenueMap';
import RecommendationCard from '../components/dashboard/RecommendationCard';
import ScenarioTabs from '../components/dashboard/ScenarioTabs';
import { useEventStore } from '../store/eventStore';
import { useSimulation } from '../hooks/useSimulation';
import { useDynamicRecommendations } from '../hooks/useDynamicRecommendations';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const {
    currentEvent,
    simulationResult,
    isLoading,
    error,
    clearError,
  } = useEventStore();

  // Get eventId from location state or current event
  const eventId = location.state?.eventId || currentEvent?.id;
  
  // Use simulation hook to fetch and monitor results
  const { startSimulationMonitoring } = useSimulation(eventId);

  // Use dynamic recommendations hook
  const dynamicRecommendations = useDynamicRecommendations({
    simulationResult,
    selectedLocation,
  });

  // Debug logging
  console.log('Dashboard - simulationResult:', simulationResult);
  console.log('Dashboard - dynamicRecommendations:', dynamicRecommendations);
  console.log('Dashboard - selectedLocation:', selectedLocation);

  useEffect(() => {
    if (!eventId) {
      navigate('/new-event');
    }
  }, [eventId, navigate]);

  const handleRecommendationAction = (recommendation: any) => {
    console.log('Action clicked for recommendation:', recommendation);
    // Implement specific actions based on recommendation type
  };

  const handleLocationClick = (location: string) => {
    setSelectedLocation(selectedLocation === location ? null : location);
  };

  const handleRetry = () => {
    clearError();
    if (eventId) {
      startSimulationMonitoring(eventId);
    }
  };

  // Loading state
  if (isLoading && !simulationResult) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Spinner size="lg" className="mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Processing Simulation
          </h2>
          <p className="text-gray-600 mb-4">
            Analyzing crowd patterns and generating insights...
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center text-blue-700">
              <Clock className="h-5 w-5 mr-2" />
              <span className="text-sm">This may take a few minutes</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Simulation Failed
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={handleRetry}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/new-event')}>
              Create New Event
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No simulation result yet
  if (!simulationResult) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No Simulation Data
          </h2>
          <p className="text-gray-600 mb-6">
            Start by creating a new event to see simulation results
          </p>
          <Button onClick={() => navigate('/new-event')}>
            Create New Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {currentEvent?.name || 'Event Dashboard'}
          </h1>
          <p className="mt-2 text-gray-600">
            AI-powered crowd simulation analysis and recommendations
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Click chart lines to filter recommendations
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Click location tags to focus chart
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Dashed lines show predictions
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-700">
            Simulation Complete
          </span>
        </div>
      </div>

      {/* Event Summary */}
      {currentEvent && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {currentEvent.capacity.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Capacity</div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {simulationResult.hotspots.length}
              </div>
              <div className="text-sm text-gray-600">Hotspots Detected</div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dynamicRecommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High Priority Alerts</div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {new Date(currentEvent.date).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Event Date</div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts and Map */}
        <div className="lg:col-span-2 space-y-8">
          {/* Simulation Chart */}
          {(() => {
            // Build simple predicted data for each location separately
            const byLocation = simulationResult.crowdDensity.reduce<Record<string, typeof simulationResult.crowdDensity>>(
              (acc, point) => {
                (acc[point.location] ||= []).push(point);
                return acc;
              },
              {}
            );
            const predictedAll: typeof simulationResult.crowdDensity = [];
            Object.values(byLocation).forEach(series => {
              series.forEach((point, idx, arr) => {
                const prev = arr[idx - 1]?.density ?? point.density;
                const prev2 = arr[idx - 2]?.density ?? prev;
                const avg = (point.density + prev + prev2) / 3;
                const trend = point.density * 0.05;
                const density = Math.max(0, Math.min(1, parseFloat((avg + trend).toFixed(2))));
                predictedAll.push({ ...point, density });
              });
            });

            return (
              <SimulationChart
                data={simulationResult.crowdDensity}
                predictedData={predictedAll}
                showPredictionsDefault={true}
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
              />
            );
          })()}

          {/* Venue Map */}
          <VenueMap 
            hotspots={simulationResult.hotspots} 
            venueLocation={currentEvent?.venueLocation}
          />

          {/* Scenario Analysis */}
          <ScenarioTabs scenarios={simulationResult.scenarios} />
        </div>

        {/* Right Column - Recommendations */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recommendations
                </h2>
                {dynamicRecommendations.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    📊 {dynamicRecommendations.length} Active
                  </span>
                )}
              </div>
              {selectedLocation && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Filtered by:</span>
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    📍 {selectedLocation}
                  </span>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            
            {/* Connection Indicator */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Interactive Dashboard</span>
                <span className="text-blue-600">•</span>
                <span>Chart and recommendations are synchronized</span>
              </div>
            </div>
            {dynamicRecommendations.length > 0 ? (
              <div className="space-y-4">
                {dynamicRecommendations.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    onActionClick={handleRecommendationAction}
                    onLocationClick={handleLocationClick}
                    isHighlighted={selectedLocation === recommendation.location}
                  />
                ))}
              </div>
            ) : (
              <Card padding="md">
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>No specific recommendations</p>
                  <p className="text-sm">
                    {selectedLocation 
                      ? `No issues detected at ${selectedLocation}` 
                      : 'Your event looks well-planned!'
                    }
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/new-event')}
              >
                Create New Event
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/history')}
              >
                View Event History
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.print()}
              >
                Export Report
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
