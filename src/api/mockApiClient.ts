import { mockApiResponses } from '../data/mockData';

// Mock API client that simulates real API behavior with fake data
const mockApiClient = {
  // Create new event simulation
  createEvent: mockApiResponses.createEvent,
  
  // Get simulation results
  getSimulationResults: mockApiResponses.getSimulationResults,
  
  // Get event history
  getEventHistory: mockApiResponses.getEventHistory,
  
  // Get specific event details
  getEvent: mockApiResponses.getEvent,
  
  // Check simulation status
  getSimulationStatus: mockApiResponses.getSimulationStatus,
};

export default mockApiClient;
