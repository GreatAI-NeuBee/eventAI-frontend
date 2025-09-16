import axios from 'axios';
import mockApiClient from './mockApiClient';

// Configuration for mock mode
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false'; // Default to true for demo

// Central Axios instance for API calls
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
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
  // Create new event simulation
  createEvent: (eventData: FormData) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data for createEvent');
      return mockApiClient.createEvent(eventData);
    }
    return apiClient.post('/events', eventData, {
      headers: { 'Content-Type': 'multipart/form-data' }
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
  getEventHistory: () => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data for getEventHistory');
      return mockApiClient.getEventHistory();
    }
    return apiClient.get('/events');
  },
  
  // Get specific event details
  getEvent: (eventId: string) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data for getEvent');
      return mockApiClient.getEvent(eventId);
    }
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
};
