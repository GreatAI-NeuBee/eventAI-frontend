import axios from 'axios';

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

// API endpoints
export const eventAPI = {
  // Create new event simulation
  createEvent: (eventData: FormData) => 
    apiClient.post('/events', eventData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Get simulation results
  getSimulationResults: (eventId: string) => 
    apiClient.get(`/events/${eventId}/simulation`),
  
  // Get event history
  getEventHistory: () => 
    apiClient.get('/events'),
  
  // Get specific event details
  getEvent: (eventId: string) => 
    apiClient.get(`/events/${eventId}`),
  
  // Check simulation status
  getSimulationStatus: (eventId: string) => 
    apiClient.get(`/events/${eventId}/status`),
};
