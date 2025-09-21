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
  getEventHistory: async (userEmail?: string) => {
    if (USE_MOCK_EVENT_HISTORY) {
      console.log('🎭 Using mock data for getEventHistory');
      return mockApiClient.getEventHistory();
    }
    
    try {
      console.log('🌐 Using real API for getEventHistory:', `${apiClient.defaults.baseURL}/events`);
      // Add userEmail as query parameter if provided
      const params = userEmail ? { userEmail } : {};
      return await apiClient.get('/events', { params });
    } catch (error: any) {
      // If server returns 500 error, temporarily fallback to mock data
      if (error.response?.status === 500) {
        console.warn('⚠️ Server error (500), falling back to mock data for getEventHistory');
        const mockResponse = await mockApiClient.getEventHistory();
        // Add a flag to indicate this is fallback data
        (mockResponse as any)._isFallbackData = true;
        return mockResponse;
      }
      // Re-throw other errors
      throw error;
    }
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
  generateForecast: (forecastData: {
    eventid: string;
    gates: string[];
    gates_crowd: number[];
    schedule_start_time: string;
    event_end_time: string;
    event_capacity: number;
    method_exits: string;
    freq: string;
  }) => {
    console.log('🌐 Using real API for generateForecast:', `${apiClient.defaults.baseURL}/forecast`);
    console.log('🔮 Forecast data:', forecastData);
    return apiClient.post('/forecast', forecastData, {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Update event with attachment data
  updateEventAttachments: (eventId: string, attachmentData: {
    attachmentLinks: string[];
    attachmentContext: string;
  }) => {
    console.log('🌐 Using real API for updateEventAttachments:', `${apiClient.defaults.baseURL}/events/${eventId}/attachments`);
    return apiClient.patch(`/events/${eventId}/attachments`, attachmentData, {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Get event attachments
  getEventAttachments: (eventId: string) => {
    console.log('🌐 Using real API for getEventAttachments:', `${apiClient.defaults.baseURL}/events/${eventId}/attachments`);
    return apiClient.get(`/events/${eventId}/attachments`);
  },
};
