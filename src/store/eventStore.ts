import { create } from 'zustand';
import type { EventData, SimulationResult } from '../types/simulation';

interface EventStore {
  // State
  events: EventData[];
  currentEvent: EventData | null;
  simulationResult: SimulationResult | null;
  isLoading: boolean;
  error: string | null;
  hasRunForecast: boolean;
  
  // Actions
  setEvents: (events: EventData[]) => void;
  setCurrentEvent: (event: EventData | null) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addEvent: (event: EventData) => void;
  updateEvent: (eventId: string, updates: Partial<EventData>) => void;
  clearError: () => void;
  setHasRunForecast: (hasRun: boolean) => void;
  reset: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  // Initial state
  events: [],
  currentEvent: null,
  simulationResult: null,
  isLoading: false,
  error: null,
  hasRunForecast: false,

  // Actions
  setEvents: (events) => set({ events }),
  
  setCurrentEvent: (event) => set({ currentEvent: event }),
  
  setSimulationResult: (result) => set({ simulationResult: result }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  addEvent: (event) => set((state) => ({ 
    events: [...state.events, event] 
  })),
  
  updateEvent: (eventId, updates) => set((state) => ({
    events: state.events.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    ),
    currentEvent: state.currentEvent?.id === eventId 
      ? { ...state.currentEvent, ...updates } 
      : state.currentEvent
  })),
  
  clearError: () => set({ error: null }),
  
  setHasRunForecast: (hasRun) => set({ hasRunForecast: hasRun }),
  
  reset: () => set({
    events: [],
    currentEvent: null,
    simulationResult: null,
    isLoading: false,
    error: null,
    hasRunForecast: false,
  }),
}));
