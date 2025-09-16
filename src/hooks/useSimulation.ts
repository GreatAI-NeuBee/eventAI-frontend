import { useEffect, useCallback } from 'react';
import { useEventStore } from '../store/eventStore';
import { eventAPI } from '../api/apiClient';

export const useSimulation = (eventId?: string) => {
  const {
    simulationResult,
    isLoading,
    error,
    setSimulationResult,
    setLoading,
    setError,
    updateEvent,
  } = useEventStore();

  // Fetch simulation results
  const fetchSimulationResults = useCallback(async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await eventAPI.getSimulationResults(id);
      setSimulationResult(response.data);
      updateEvent(id, { status: 'completed' });
    } catch (error: any) {
      console.error('Error fetching simulation results:', error);
      setError(error.response?.data?.message || 'Failed to fetch simulation results');
      updateEvent(id, { status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setSimulationResult, setLoading, setError, updateEvent]);

  // Check simulation status and poll if needed
  const checkSimulationStatus = useCallback(async (id: string) => {
    if (!id) return;

    try {
      const response = await eventAPI.getSimulationStatus(id);
      const status = response.data.status;
      
      updateEvent(id, { status });

      if (status === 'completed') {
        await fetchSimulationResults(id);
      } else if (status === 'processing') {
        // Continue polling every 3 seconds
        setTimeout(() => checkSimulationStatus(id), 3000);
      }
    } catch (error: any) {
      console.error('Error checking simulation status:', error);
      setError(error.response?.data?.message || 'Failed to check simulation status');
      updateEvent(id, { status: 'error' });
    }
  }, [fetchSimulationResults, updateEvent, setError]);

  // Start simulation monitoring
  const startSimulationMonitoring = useCallback((id: string) => {
    if (!id) return;
    
    setLoading(true);
    updateEvent(id, { status: 'processing' });
    checkSimulationStatus(id);
  }, [checkSimulationStatus, setLoading, updateEvent]);

  // Effect to start monitoring if eventId is provided
  useEffect(() => {
    if (eventId) {
      startSimulationMonitoring(eventId);
    }
  }, [eventId, startSimulationMonitoring]);

  return {
    simulationResult,
    isLoading,
    error,
    fetchSimulationResults,
    startSimulationMonitoring,
    checkSimulationStatus,
  };
};
