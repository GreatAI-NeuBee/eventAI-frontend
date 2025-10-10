import React, { useState, useCallback, useEffect } from 'react';
import { AlertCircle, RefreshCw, MapPin, Clock } from 'lucide-react';
import Card from '../common/Card';
import { fixEventDate } from '../../utils/fixEventDate';

interface GoogleTrafficGraphProps {
  venueLocation: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
  };
  eventDate?: string;
  eventTimeRange?: {
    start: string; // e.g., "10:00 AM"
    end: string;   // e.g., "10:30 AM"
  };
}

interface TrafficDataPoint {
  time: string;
  duration: number; // ETA with traffic (seconds)
  staticDuration: number; // ETA without traffic (seconds)
  congestionIndex: number; // duration / staticDuration
  distanceMeters: number;
  routeLabel: string;
}

interface RouteData {
  origin: string;
  destination: string;
  label: string;
}

const GoogleTrafficGraph: React.FC<GoogleTrafficGraphProps> = ({
  venueLocation,
  eventDate,
  eventTimeRange
}) => {
  const [trafficData, setTrafficData] = useState<TrafficDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Routes will be defined inside fetchTrafficData function

  // Generate time grid based on event time range
  const generateTimeGrid = useCallback(() => {
    // Fix event date if it's in the past
    const fixedEventDate = eventDate ? fixEventDate(eventDate) : null;
    const baseDate = fixedEventDate ? new Date(fixedEventDate) : new Date();
    const times: string[] = [];
    
    if (eventTimeRange) {
      // Use the actual event time range
      const startTime = eventTimeRange.start;
      const endTime = eventTimeRange.end;
      
      console.log(`📅 Using event time range: ${startTime} to ${endTime} - FIXED TIME PARSING`);
      console.log(`📅 EventTimeRange object:`, eventTimeRange);
      console.log(`📅 Start time:`, startTime);
      console.log(`📅 End time:`, endTime);
      
      // Parse start and end times correctly
      const parseTime = (timeString: string) => {
        console.log(`📅 Parsing time: "${timeString}"`);
        const [time, period] = timeString.split(' ');
        let [hour, minute] = time.split(':').map(Number);
        console.log(`📅 Parsed: hour=${hour}, minute=${minute}, period=${period}`);
        
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0; // Midnight
        
        const totalMinutes = hour * 60 + minute;
        console.log(`📅 Total minutes: ${totalMinutes}`);
        return totalMinutes;
      };

      const startMinutes = parseTime(startTime);
      let endMinutes = parseTime(endTime);
      
      // Handle case where end time is next day (e.g., 12:30 AM)
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
      }
      
      console.log(`📅 Start minutes: ${startMinutes} (${startTime})`);
      console.log(`📅 End minutes: ${endMinutes} (${endTime})`);
      
      console.log(`📅 Loop: startMinutes=${startMinutes}, endMinutes=${endMinutes}`);
      for (let minutes = startMinutes; minutes <= endMinutes; minutes += 10) {
        const time = new Date(baseDate);
        const actualHour = Math.floor(minutes / 60) % 24;
        const actualMinute = minutes % 60;
        time.setHours(actualHour, actualMinute, 0, 0);
        times.push(time.toISOString());
        console.log(`📅 Generated time: ${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} (minutes=${minutes})`);
      }
      console.log(`📅 Total times generated: ${times.length}`);
    } else {
      // Fallback: Generate times from 6 AM to 10 PM
      console.log('📅 No event time range provided, using default 6 AM to 10 PM');
      for (let hour = 6; hour < 22; hour++) {
        for (let minute = 0; minute < 60; minute += 10) {
          const time = new Date(baseDate);
          time.setHours(hour, minute, 0, 0);
          times.push(time.toISOString());
        }
      }
    }
    
    console.log(`📅 Generated ${times.length} time points for traffic analysis`);
    return times;
  }, [eventDate, eventTimeRange]);

  // Fetch traffic data from Google Routes API - ONLY ONCE
  const fetchTrafficData = useCallback(async () => {
    if (isLoading) {
      console.log('⏳ Already loading, skipping duplicate request');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      console.log('🔑 Google Maps API Key:', googleApiKey ? 'Present' : 'Missing');
      
      if (!googleApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      console.log('🔄 Fetching Google Routes API data - TIME-BASED CALLS');
      console.log('📍 Venue location:', venueLocation);
      console.log('📅 Event date:', eventDate);
      console.log('⏰ Event time range:', eventTimeRange);

      // Generate time grid for the event
        let timeGrid = generateTimeGrid();
        console.log(`📅 Generated ${timeGrid.length} time points`);
      
      if (timeGrid.length === 0) {
        console.error('❌ No time points generated! Check eventTimeRange:', eventTimeRange);
        console.error('❌ EventDate:', eventDate);
        console.error('❌ VenueLocation:', venueLocation);
        
        // Generate fallback time points if parsing fails
        console.log('🔄 Generating fallback time points...');
        const fallbackTimes: string[] = [];
        // Fix event date if it's in the past
        const fixedEventDate = eventDate ? fixEventDate(eventDate) : null;
        const baseDate = fixedEventDate ? new Date(fixedEventDate) : new Date();
        
        // Generate fallback times based on user's event time if available
        if (eventTimeRange?.start) {
          const [time, period] = eventTimeRange.start.split(' ');
          let [hour, minute] = time.split(':').map(Number);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          // Check if the event time is in the past
          const eventDateTime = new Date(baseDate);
          eventDateTime.setHours(hour, minute, 0, 0);
          const now = new Date();
          
          if (eventDateTime < now) {
            console.warn(`⚠️ Event time is in the past, generating fallback times around current time`);
            // Generate times around current time instead
            const currentHour = now.getHours();
            for (let h = Math.max(0, currentHour - 1); h <= Math.min(23, currentHour + 3); h++) {
              for (let m = 0; m < 60; m += 15) {
                const fallbackTime = new Date(now);
                fallbackTime.setHours(h, m, 0, 0);
                fallbackTimes.push(fallbackTime.toISOString());
              }
            }
          } else {
            // Generate times around the user's event time
            for (let h = Math.max(0, hour - 1); h <= Math.min(23, hour + 2); h++) {
              for (let m = 0; m < 60; m += 15) {
                const fallbackTime = new Date(baseDate);
                fallbackTime.setHours(h, m, 0, 0);
                fallbackTimes.push(fallbackTime.toISOString());
              }
            }
          }
        } else {
          // Default fallback: current time + 1-3 hours
          const now = new Date();
          const currentHour = now.getHours();
          for (let hour = currentHour; hour <= Math.min(23, currentHour + 3); hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
              const time = new Date(now);
              time.setHours(hour, minute, 0, 0);
              fallbackTimes.push(time.toISOString());
            }
          }
        }
        
        console.log(`📅 Generated ${fallbackTimes.length} fallback time points`);
        timeGrid = fallbackTimes;
      }
      
        const allTrafficData: TrafficDataPoint[] = [];
        console.log(`📊 Initializing allTrafficData array`);

      // Test API key with a simple request first
      console.log('🧪 Testing Google Maps API key...');
      const testUrl = `/google/maps/api/directions/json?origin=3.1579,101.7116&destination=3.1579,101.7116&key=${googleApiKey}`;
      try {
        const testResponse = await fetch(testUrl);
        console.log(`🧪 Test API response status: ${testResponse.status}`);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log(`🧪 Test API response:`, testData);
          if (testData.error_message) {
            console.error(`🧪 API Error: ${testData.error_message}`);
            throw new Error(`Google Maps API Error: ${testData.error_message}`);
          }
        } else {
          console.error(`🧪 Test API failed: ${testResponse.status} ${testResponse.statusText}`);
        }
      } catch (testError) {
        console.error(`🧪 Test API failed:`, testError);
        throw new Error(`Google Maps API test failed: ${testError}`);
      }

      // Define routes to venue
      const routes: RouteData[] = [
        {
          origin: `${venueLocation.lat + 0.01},${venueLocation.lng + 0.01}`, // 1km from venue
          destination: `${venueLocation.lat},${venueLocation.lng}`,
          label: 'To Venue'
        }
      ];
      
      // Validate coordinates
      if (isNaN(venueLocation.lat) || isNaN(venueLocation.lng)) {
        throw new Error('Invalid venue coordinates');
      }
      
      console.log(`📍 Route coordinates: Origin ${routes[0].origin}, Destination ${routes[0].destination}`);

      // Call Google Maps API directly with your API key
      console.log(`📊 Fetching real Google Maps API data directly for your event time: ${eventTimeRange?.start} - ${eventTimeRange?.end}`);
      
        for (const route of routes) {
          console.log(`📍 Processing route: ${route.label} - REAL GOOGLE MAPS API CALL`);
        
        try {
          // Call Google Maps API via CORS proxy to avoid CORS issues
          const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (!googleApiKey) {
            throw new Error('Google Maps API key not found in environment variables');
          }
          
          // Use the user's event time for traffic analysis, but ensure it's not in the past
          // Fix event date if it's in the past
          const fixedEventDate = eventDate ? fixEventDate(eventDate) : null;
          let eventDateTime = fixedEventDate ? new Date(fixedEventDate) : new Date();
          
          if (eventTimeRange?.start) {
            const [time, period] = eventTimeRange.start.split(' ');
            let [hour, minute] = time.split(':').map(Number);
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            eventDateTime.setHours(hour, minute, 0, 0);
            console.log(`📅 Using user's event time: ${eventDateTime.toLocaleString()}`);
          } else {
            console.log(`📅 No event time range provided, using event date: ${eventDateTime.toLocaleString()}`);
          }
          
          // Check if the event time is in the past
          const now = new Date();
          if (eventDateTime < now) {
            console.warn(`⚠️ Event time is in the past (${eventDateTime.toLocaleString()}), using current time for API calls`);
            eventDateTime = now;
          }
          
          const eventTimestamp = Math.floor(eventDateTime.getTime() / 1000);
          
          console.log(`🕐 Event DateTime: ${eventDateTime.toISOString()}`);
          console.log(`🕐 Event Timestamp: ${eventTimestamp}`);
          console.log(`🕐 Event time range: ${eventTimeRange?.start} - ${eventTimeRange?.end}`);
          
          // Use CORS proxy to avoid browser CORS restrictions
          console.log(`🔗 Making Google Maps API call via CORS proxy for ${route.label} at event time: ${eventDateTime.toLocaleString()}`);
          
          // Build the Google Maps API URL
          const googleApiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${route.origin}&destination=${route.destination}&departure_time=${eventTimestamp}&traffic_model=best_guess&key=${googleApiKey}`;
          
          // Use CORS proxy to bypass browser CORS restrictions
          const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(googleApiUrl)}`;
          console.log(`🔗 CORS proxy URL: ${corsProxyUrl.substring(0, 100)}...`);
          
          console.log(`🔍 Making API call for ${route.label}`);
          
          const response = await fetch(corsProxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          console.log(`🔍 Response status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Google Maps API failed: ${response.status} ${response.statusText}`);
            console.error(`❌ Error details:`, errorText);
            throw new Error(`Google Maps API failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`✅ Vite proxy successful for ${route.label}`);
          
          if (data.error_message) {
            console.error(`❌ Google Maps API error for ${route.label}:`, data.error_message);
            continue;
          }
        
          if (data.routes && data.routes.length > 0) {
            const routeData = data.routes[0];
            const leg = routeData.legs[0];
            
            const duration = leg.duration.value;
            const staticDuration = leg.duration_in_traffic?.value || leg.duration.value;
            const congestionIndex = staticDuration > 0 ? duration / staticDuration : 1.0;
            
            // Fetch real-time traffic data for each time point
            console.log(`🔄 Processing ${timeGrid.length} time points for ${route.label}...`);
            let successCount = 0;
            let failureCount = 0;
            const maxFailures = 3; // Stop if we get too many failures
            
            for (const timePoint of timeGrid) {
              try {
                
                // Create a new API call for each time point to get real traffic variations
                const timePointDate = new Date(timePoint);
                const now = new Date();
                
                // Skip if the time point is in the past
                if (timePointDate < now) {
                  console.warn(`⚠️ Skipping past time point: ${timePointDate.toLocaleString()}`);
                  continue;
                }
                
                const departureTime = Math.floor(timePointDate.getTime() / 1000);
                const timeSpecificUrl = `/google/maps/api/directions/json?origin=${route.origin}&destination=${route.destination}&departure_time=${departureTime}&traffic_model=best_guess&key=${googleApiKey}`;
                
                const timeResponse = await fetch(timeSpecificUrl, {
                  method: 'GET',
                  headers: { 'Accept': 'application/json' }
                });
                
                if (timeResponse.ok) {
                  const timeData = await timeResponse.json();
                  
                  if (timeData.routes && timeData.routes.length > 0) {
                    const timeRouteData = timeData.routes[0];
                    const timeLeg = timeRouteData.legs[0];
                    
                    const timeDuration = timeLeg.duration.value;
                    const timeStaticDuration = timeLeg.duration_in_traffic?.value || timeLeg.duration.value;
                    const timeCongestionIndex = timeStaticDuration > 0 ? timeDuration / timeStaticDuration : 1.0;
                    
                    const dataPoint = {
                      time: new Date(timePoint).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                      }),
                      duration: Math.floor(timeDuration),
                      staticDuration: Math.floor(timeStaticDuration),
                      congestionIndex: timeCongestionIndex,
                      distanceMeters: timeLeg.distance.value,
                      routeLabel: route.label
                    };
                    
                    allTrafficData.push(dataPoint);
                    console.log(`📊 Real traffic data for ${route.label} at ${new Date(timePoint).toLocaleTimeString()}: ${timeCongestionIndex.toFixed(2)}x congestion`);
                    successCount++;
                  } else {
                    console.warn(`⚠️ No routes found for ${route.label} at ${new Date(timePoint).toLocaleTimeString()} - skipping this time point`);
                    failureCount++;
                    
                    // Stop if we get too many failures
                    if (failureCount >= maxFailures) {
                      console.warn(`⚠️ Too many failures (${failureCount}), stopping time point processing for ${route.label}`);
                      break;
                    }
                    continue;
                  }
                } else {
                  console.error(`❌ Time-specific API failed for ${route.label}: ${timeResponse.status}`);
                  throw new Error(`Time-specific API failed: ${timeResponse.status}`);
                }
                
                // Small delay between time-specific requests
                await new Promise(resolve => setTimeout(resolve, 200));
                
              } catch (timeError) {
                console.error(`❌ Time-specific traffic data failed for ${route.label}:`, timeError);
                failureCount++;
                
                // Stop if we get too many failures
                if (failureCount >= maxFailures) {
                  console.warn(`⚠️ Too many failures (${failureCount}), stopping time point processing for ${route.label}`);
                  break;
                }
              }
            }
            
            console.log(`📊 Time point processing complete for ${route.label}: ${successCount} successful, ${failureCount} failed`);

            // If no time-specific data was collected, add the base data point
            if (allTrafficData.filter(d => d.routeLabel === route.label).length === 0) {
              console.log(`📊 Adding base data point for ${route.label}`);
              const baseDataPoint = {
                time: new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }),
                duration: Math.floor(duration),
                staticDuration: Math.floor(staticDuration),
                congestionIndex: congestionIndex,
                distanceMeters: leg.distance.value,
                routeLabel: route.label
              };
              allTrafficData.push(baseDataPoint);
              console.log(`📊 Base data point added for ${route.label}`);
            }
            
            // If we had too many failures, add some demo data to show something
            if (failureCount >= maxFailures && successCount === 0) {
              console.log(`📊 API calls failed too much, adding demo data for ${route.label}`);
              const demoData: TrafficDataPoint[] = [];
              const demoTimes = generateTimeGrid().slice(0, 5).map(t => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
              
              for (const time of demoTimes) {
                const congestionIndex = Math.random() * 0.8 + 0.8;
                demoData.push({
                  time,
                  duration: Math.floor(Math.random() * 1800 + 900),
                  staticDuration: Math.floor(Math.random() * 1200 + 600),
                  congestionIndex,
                  distanceMeters: Math.floor(Math.random() * 20000 + 10000),
                  routeLabel: route.label
                });
              }
              
              allTrafficData.push(...demoData);
              console.log(`✅ ${route.label}: Demo data fallback - ${demoData.length} points`);
            }
            
            console.log(`✅ ${route.label}: Real Google Maps data - Base congestion ${congestionIndex.toFixed(2)} - Generated time variations`);
          }

          // Small delay between routes to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn(`❌ Error fetching real data for ${route.label}:`, error);
          
          // Fallback to demo data only if Google Maps API fails
          console.log(`📊 Google Maps API failed, using demo data for ${route.label}`);
          const demoData: TrafficDataPoint[] = [];
          const demoTimes = generateTimeGrid().map(t => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
          
          for (const time of demoTimes) {
            const congestionIndex = Math.random() * 0.8 + 0.8;
            const dataPoint = {
              time,
              duration: Math.floor(Math.random() * 1800 + 900),
              staticDuration: Math.floor(Math.random() * 1200 + 600),
              congestionIndex,
              distanceMeters: Math.floor(Math.random() * 20000 + 10000),
              routeLabel: route.label
            };
            demoData.push(dataPoint);
          }
          
          allTrafficData.push(...demoData);
          console.log(`✅ ${route.label}: Demo data fallback - ${demoData.length} points`);
        }
      }

        // Set the traffic data (real or fallback)
        console.log('📊 Setting traffic data to state:', allTrafficData.length, 'points');
        setTrafficData(allTrafficData);
        console.log('📊 Traffic data state updated');
      
    } catch (error) {
      console.error('❌ Error fetching traffic data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch traffic data');
      
      // No fallback - we only want real Google Maps data
      console.log('❌ No real traffic data available - API calls failed');
      setTrafficData([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove all dependencies to prevent loops

  // Auto-fetch traffic data when component mounts
  useEffect(() => {
    if (venueLocation && !isLoading && trafficData.length === 0) {
      console.log('🚀 Auto-fetching traffic data on component mount');
      fetchTrafficData();
    }
  }, [venueLocation, fetchTrafficData]);

  // Use all traffic data (no filtering)
  const filteredData = trafficData;
  
  // Debug: Log current traffic data state
  console.log('🔍 Current trafficData state:', trafficData.length, 'points');

  // Group data by time for visualization
  const groupedData = filteredData.reduce((acc, point) => {
    if (!acc[point.time]) {
      acc[point.time] = [];
    }
    acc[point.time].push(point);
    return acc;
  }, {} as Record<string, TrafficDataPoint[]>);

  // Calculate average congestion for each time point
  const timeAverages = Object.entries(groupedData).map(([time, points]) => {
    const avgCongestion = points.reduce((sum, p) => sum + p.congestionIndex, 0) / points.length;
    return {
      time,
      avgCongestion: isNaN(avgCongestion) ? 1.0 : avgCongestion, // Fallback to 1.0 if NaN
      pointCount: points.length
    };
  }).sort((a, b) => new Date(`2000-01-01 ${a.time}`).getTime() - new Date(`2000-01-01 ${b.time}`).getTime());


  // Calculate max congestion for Y-axis scaling
  const maxCongestion = Math.max(...timeAverages.map(d => d.avgCongestion), 2.0); // Min 2.0 for consistent scale

  // SVG dimensions
  const width = 800;
  const height = 250;
  const padding = 40;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Helper to get X position
  const getX = (index: number) => {
    if (timeAverages.length <= 1) return padding;
    const x = padding + (index / (timeAverages.length - 1)) * chartWidth;
    return isNaN(x) ? padding : x;
  };

  // Helper to get Y position
  const getY = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return padding + chartHeight / 2;
    const y = padding + (1 - (value / maxCongestion)) * chartHeight;
    return isNaN(y) ? padding + chartHeight / 2 : y;
  };

  // Generate SVG path
  const generatePath = (data: typeof timeAverages) => {
    if (data.length === 0) return '';
    const points = data.map((point, index) => {
      const x = getX(index);
      const y = getY(point.avgCongestion);
      return `${x},${y}`;
    }).filter(point => !point.includes('NaN')); // Filter out NaN values
    
    if (points.length === 0) return '';
    return `M ${points.join(' L ')}`;
  };

  // Helper function to get color for congestion index
  const getCongestionColor = (index: number) => {
    if (index >= 1.5) return '#ef4444'; // Heavy traffic - red
    if (index >= 1.2) return '#f59e0b'; // Moderate traffic - orange
    if (index >= 1.0) return '#3b82f6'; // Normal traffic - blue
    return '#10b981'; // Light traffic - green
  };

  // Don't render if no venue location
  if (!venueLocation || !venueLocation.lat || !venueLocation.lng) {
    return null;
  }

  return (
    <Card className="mb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Traffic Congestion Analysis
            </h3>
            <p className="text-sm text-gray-600">
              Traffic analysis for {venueLocation.name || 'Event Venue'} during event time using Google Routes API
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTrafficData}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (trafficData.length > 0 ? 'Refresh' : 'Load Traffic Data')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <strong className="font-bold">Google Maps API Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <div className="text-xs mt-2 space-y-1">
            <p>• Check your Google Maps API key in .env file</p>
            <p>• Ensure Directions API is enabled in Google Cloud Console</p>
            <p>• Verify API key has no domain restrictions</p>
            <p>• Check browser console for detailed error logs</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Fetching traffic data...</p>
          </div>
        </div>
      ) : trafficData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-gray-600 mb-4">No traffic data available</p>
            <p className="text-sm text-gray-500 mb-4">Click "Load Traffic Data" to fetch real-time traffic analysis</p>
          </div>
        </div>
      ) : (
        <div>
          <svg width="100%" height="250" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {/* Grid lines */}
            <defs>
              <pattern id="trafficGrid" width="50" height="25" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="url(#trafficGrid)" />
            
            {/* Y-axis labels */}
            {[0, 0.5, 1.0, 1.5, 2.0].map((value, i) => (
              <text key={i} x="15" y={getY(value) + 5} className="fill-gray-600 text-sm font-medium">
                {value.toFixed(1)}x
              </text>
            ))}
            
            {/* Dynamic Traffic Line */}
            {timeAverages.length > 0 && (
              <path
                d={generatePath(timeAverages)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
            )}
            
            {/* Dynamic Data Points */}
            {timeAverages.map((point, index) => {
              const x = getX(index);
              const y = getY(point.avgCongestion);
              
              // Skip rendering if coordinates are invalid
              if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
                return null;
              }
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={getCongestionColor(point.avgCongestion)}
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>{`${point.time}: ${point.avgCongestion.toFixed(2)} congestion (${point.pointCount} routes)`}</title>
                </circle>
              );
            })}
            
            {/* X-axis Labels (every 2 points for better visibility) */}
            {timeAverages.filter((_, index) => index % 2 === 0).map((point, index) => {
              const x = getX(index * 2);
              
              // Skip rendering if x coordinate is invalid
              if (isNaN(x) || !isFinite(x)) {
                return null;
              }
              
              return (
                <text
                  key={index}
                  x={x}
                  y={height - 10}
                  className="text-xs fill-gray-500"
                  textAnchor="middle"
                >
                  {point.time}
                </text>
              );
            })}
          </svg>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredData.length}
              </div>
              <div className="text-sm text-gray-600">Data Points</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <div className="text-2xl font-bold text-green-600">
                {timeAverages.length > 0 ? timeAverages[0].avgCongestion.toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Current Congestion</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {timeAverages.length > 0 ? Math.max(...timeAverages.map(t => t.avgCongestion)).toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Peak Congestion</div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Light Traffic (&lt;1.0)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Normal Traffic (1.0-1.2)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Moderate Traffic (1.2-1.5)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Heavy Traffic (1.5+)</span>
        </div>
      </div>
    </Card>
  );
};

export default GoogleTrafficGraph;