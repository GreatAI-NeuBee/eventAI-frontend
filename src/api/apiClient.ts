import axios from 'axios';
import mockApiClient from './mockApiClient';

// Configuration for mock mode - disable mock for specific endpoints
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false'; // Default to true for demo
const USE_MOCK_CREATE_EVENT = false; // Always use real API for event creation
const USE_MOCK_EVENT_HISTORY = false; // Always use real API for event history
const USE_MOCK_GET_EVENT = false; // Always use real API for getting event details

// Central Axios instance for API calls
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoints with mock fallback
export const eventAPI = {
  // Create new event simulation - always use real API
  createEvent: (eventData: any) => {
    if (USE_MOCK_CREATE_EVENT) {
      console.log('🎭 Using mock data for createEvent');
      return mockApiClient.createEvent(eventData);
    }
    console.log('🌐 Using real API for createEvent:', `${apiClient.defaults.baseURL}/events`);
    return apiClient.post('/events', eventData, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  // Get simulation results
  getSimulationResults: (eventId: string) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data for getSimulationResults');
      return mockApiClient.getSimulationResults(eventId);
    }
    return apiClient.get(`/events/${eventId}/simulation`);
  },
  
  // Get event history
  getEventHistory: (userEmail?: string) => {
    if (USE_MOCK_EVENT_HISTORY) {
      console.log('🎭 Using mock data for getEventHistory');
      return mockApiClient.getEventHistory();
    }
    
    console.log('🌐 Using real API for getEventHistory:', `${apiClient.defaults.baseURL}/events`);
    // Add userEmail as query parameter if provided
    const params = userEmail ? { userEmail } : {};
    return apiClient.get('/events', { params });
  },
  
  // Get specific event details
  getEvent: (eventId: string) => {
    if (USE_MOCK_GET_EVENT) {
      console.log('🎭 Using mock data for getEvent');
      return mockApiClient.getEvent(eventId);
    }
    console.log('🌐 Using real API for getEvent:', `${apiClient.defaults.baseURL}/events/${eventId}`);
    return apiClient.get(`/events/${eventId}`);
  },
  
  // Check simulation status
  getSimulationStatus: (eventId: string) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data for getSimulationStatus');
      return mockApiClient.getSimulationStatus(eventId);
    }
    return apiClient.get(`/events/${eventId}/status`);
  },
  
  // Delete event
  deleteEvent: (eventId: string) => {
    console.log('🗑️ Using real API for deleteEvent:', `${apiClient.defaults.baseURL}/events/${eventId}`);
    return apiClient.delete(`/events/${eventId}`);
  },
  
  // Generate forecast for event
  generateForecast: (eventId: string) => {
    // For now, use mock data since the server is not ready
    console.log('🎭 Using mock data for generateForecast');
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock forecast result with simulation data
        const mockForecastResult = {
          eventId,
          crowdDensity: [
            { timestamp: '2024-01-15T10:00:00Z', location: 'Main Entrance', density: 45 },
            { timestamp: '2024-01-15T11:00:00Z', location: 'Main Entrance', density: 78 },
            { timestamp: '2024-01-15T12:00:00Z', location: 'Food Court', density: 92 },
            { timestamp: '2024-01-15T13:00:00Z', location: 'Stage Area', density: 156 },
            { timestamp: '2024-01-15T14:00:00Z', location: 'Stage Area', density: 189 },
          ],
          hotspots: [
            { x: 150, y: 200, intensity: 0.8, location: 'Main Entrance' },
            { x: 300, y: 350, intensity: 0.9, location: 'Stage Area' },
            { x: 450, y: 150, intensity: 0.6, location: 'Food Court' },
          ],
          recommendations: [
            {
              id: 'rec-1',
              type: 'warning',
              title: 'High Congestion Expected',
              description: 'Stage area will experience high congestion between 1-2 PM',
              priority: 'high',
              action: 'Deploy additional staff'
            },
            {
              id: 'rec-2',
              type: 'info',
              title: 'Optimize Entry Flow',
              description: 'Consider opening additional entry points',
              priority: 'medium',
              action: 'Open side entrances'
            }
          ],
          scenarios: {
            entry: { peak_time: '12:00', capacity_utilization: 0.85 },
            exit: { peak_time: '17:00', capacity_utilization: 0.78 },
            congestion: { max_density: 189, critical_areas: ['Stage Area', 'Main Entrance'] }
          },
          generatedAt: new Date().toISOString()
        };
        
        resolve({ data: mockForecastResult });
      }, 2000); // 2 second delay to simulate API call
    });
  },
};
