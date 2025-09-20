import type { EventData, SimulationResult } from '../types/simulation';

// Mock event data
export const mockEvents: EventData[] = [
  {
    id: 'event-1',
    name: 'Tech Conference 2024',
    dateStart: '2024-12-15T09:00:00Z',
    dateEnd: '2024-12-15T18:00:00Z',
    venue: 'Convention Center Downtown',
    venueLocation: {
      lat: 37.7843676,
      lng: -122.4007407,
      address: "747 Howard St, San Francisco, CA 94103",
      placeId: "ChIJiX4p7X2AhYARbDw5qoA4Vdk",
      name: "Moscone Center"
    },
    status: 'completed',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'event-2',
    name: 'Music Festival Summer',
    dateStart: '2024-07-20T14:00:00Z',
    dateEnd: '2024-07-20T23:00:00Z',
    venue: 'Central Park Amphitheater',
    venueLocation: {
      lat: 37.7694,
      lng: -122.4862,
      address: "Golden Gate Park, San Francisco, CA 94117",
      placeId: "ChIJIQBpAG2ahYAR_6128GcTUEo",
      name: "Golden Gate Park Music Concourse"
    },
    status: 'completed',
    createdAt: '2024-02-05T14:30:00Z',
  },
  {
    id: 'event-3',
    name: 'Corporate Gala Night',
    dateStart: '2024-11-30T18:00:00Z',
    dateEnd: '2024-11-30T23:30:00Z',
    venue: 'Grand Ballroom Hotel',
    venueLocation: {
      lat: 37.7879,
      lng: -122.4075,
      address: "335 Powell St, San Francisco, CA 94102",
      placeId: "ChIJIQBpAG2ahYAR_6128GcTUEo",
      name: "St. Francis Hotel"
    },
    status: 'processing',
    createdAt: '2024-03-12T16:45:00Z',
  },
];

// Mock simulation results
export const generateMockSimulationResult = (eventId: string): SimulationResult => {
  // Generate realistic crowd density data over time
  const crowdDensityData: { timestamp: string; location: string; density: number; }[] = [];
  const locations = ['Main Entrance', 'Food Court', 'Stage Area', 'Exit Gate A', 'Exit Gate B', 'VIP Section'];
  const timeSlots = 24; // 24 time points (hourly simulation)
  
  for (let hour = 0; hour < timeSlots; hour++) {
    locations.forEach(location => {
      let baseDensity = 0;
      
      // Create realistic crowd patterns
      if (location === 'Main Entrance') {
        // High density at start, low at end
        baseDensity = Math.max(0, 0.9 - (hour / timeSlots) * 0.8);
      } else if (location === 'Stage Area') {
        // Peak during middle hours
        baseDensity = Math.sin((hour / timeSlots) * Math.PI) * 0.8 + 0.2;
      } else if (location.includes('Exit Gate')) {
        // High density at end
        baseDensity = Math.min(0.9, (hour / timeSlots) * 0.8 + 0.1);
      } else if (location === 'Food Court') {
        // Multiple peaks (meal times)
        baseDensity = (Math.sin((hour / timeSlots) * Math.PI * 3) + 1) * 0.3 + 0.2;
      } else {
        // VIP Section - steady moderate density
        baseDensity = 0.4 + Math.random() * 0.2;
      }
      
      // Add some random variation
      const density = Math.max(0, Math.min(1, baseDensity + (Math.random() - 0.5) * 0.2));
      
      crowdDensityData.push({
        timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
        location,
        density: Math.round(density * 100) / 100,
      });
    });
  }

  // Generate hotspots
  const hotspots = [
    { x: 0.2, y: 0.3, intensity: 0.95, location: 'Main Entrance Bottleneck' },
    { x: 0.8, y: 0.2, intensity: 0.87, location: 'Food Court Queue' },
    { x: 0.5, y: 0.7, intensity: 0.92, location: 'Stage Front Area' },
    { x: 0.1, y: 0.8, intensity: 0.78, location: 'Restroom Area' },
    { x: 0.9, y: 0.9, intensity: 0.65, location: 'Emergency Exit' },
    { x: 0.6, y: 0.1, intensity: 0.58, location: 'VIP Entrance' },
    { x: 0.3, y: 0.9, intensity: 0.73, location: 'Merchandise Stand' },
    { x: 0.7, y: 0.6, intensity: 0.82, location: 'Bar Area' },
  ];

  // Generate recommendations based on hotspots and density
  const recommendations = [
    {
      id: 'rec-1',
      type: 'warning' as const,
      title: 'High Congestion at Main Entrance',
      description: 'Crowd density at main entrance exceeds 90%. Consider opening additional entry points or implementing timed entry.',
      priority: 'high' as const,
      action: 'Open Secondary Entrance',
    },
    {
      id: 'rec-2',
      type: 'warning' as const,
      title: 'Food Court Bottleneck Detected',
      description: 'Long queues forming at food vendors. Recommend additional staff or temporary food stations.',
      priority: 'medium' as const,
      action: 'Deploy Mobile Food Units',
    },
    {
      id: 'rec-3',
      type: 'info' as const,
      title: 'Stage Area Capacity Optimal',
      description: 'Crowd distribution near stage is within safe limits. Monitor for sudden changes.',
      priority: 'low' as const,
      action: 'Continue Monitoring',
    },
    {
      id: 'rec-4',
      type: 'warning' as const,
      title: 'Exit Route Congestion Expected',
      description: 'Based on patterns, exit congestion likely in 2 hours. Prepare crowd control measures.',
      priority: 'high' as const,
      action: 'Pre-position Security Staff',
    },
    {
      id: 'rec-5',
      type: 'success' as const,
      title: 'VIP Area Well Managed',
      description: 'VIP section maintaining optimal capacity with good flow patterns.',
      priority: 'low' as const,
      action: 'Maintain Current Setup',
    },
  ];

  // Generate scenario data
  const scenarios = {
    entry: {
      peakTime: '09:30 AM',
      expectedWaitTime: '12 minutes',
      recommendedActions: [
        'Open Gate C 30 minutes early',
        'Deploy 2 additional staff at main entrance',
        'Activate digital queue management system',
      ],
      crowdFlow: 'Heavy influx expected between 9:00-10:30 AM',
      riskLevel: 'Medium',
      alternativeRoutes: ['Side Entrance B', 'VIP Entrance (overflow)'],
    },
    exit: {
      peakTime: '11:30 PM',
      expectedWaitTime: '18 minutes',
      recommendedActions: [
        'Open all emergency exits for normal use',
        'Position crowd control barriers',
        'Announce staggered exit by sections',
      ],
      crowdFlow: 'Massive exodus expected after main event ends',
      riskLevel: 'High',
      alternativeRoutes: ['North Exit', 'Parking Lot Direct Access'],
    },
    congestion: {
      criticalAreas: ['Main Entrance', 'Food Court', 'Restrooms'],
      peakCongestionTime: '2:00 PM - 3:00 PM',
      mitigationStrategies: [
        'Implement one-way flow in corridors',
        'Set up temporary facilities outside',
        'Use mobile apps to redirect crowds',
      ],
      riskAssessment: 'Moderate risk of bottlenecks during lunch hours',
      monitoringPoints: ['Entrance sensors', 'CCTV zones 3-7', 'Staff reports'],
    },
  };

  return {
    eventId,
    crowdDensity: crowdDensityData,
    hotspots,
    recommendations,
    scenarios,
  };
};

// Mock API responses
export const mockApiResponses = {
  createEvent: (eventData: any): Promise<{ data: EventData }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Parse venue location if provided
        let venueLocation = null;
        if (eventData.get('venueLocation')) {
          try {
            venueLocation = JSON.parse(eventData.get('venueLocation'));
          } catch (e) {
            console.warn('Failed to parse venue location:', e);
          }
        }

        // Parse venue layout if provided
        let venueLayout = null;
        if (eventData.get('venueLayout')) {
          try {
            venueLayout = JSON.parse(eventData.get('venueLayout'));
          } catch (e) {
            console.warn('Failed to parse venue layout:', e);
          }
        }

        const newEvent: EventData = {
          id: `event-${Date.now()}`,
          name: eventData.get('name') || 'New Event',
          dateStart: eventData.get('dateStart') || new Date().toISOString(),
          dateEnd: eventData.get('dateEnd') || new Date(Date.now() + 3600000).toISOString(), // 1 hour later
          venue: eventData.get('venue') || 'Unknown Venue',
          description: eventData.get('description') || '',
          venueLocation: venueLocation,
          venueLayout: venueLayout,
          userEmail: eventData.get('userEmail') || '',
          status: 'processing',
          createdAt: new Date().toISOString(),
        };
        resolve({ data: newEvent });
      }, 1000);
    });
  },

  getSimulationResults: (eventId: string): Promise<{ data: SimulationResult }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const simulationResult = generateMockSimulationResult(eventId);
        resolve({ data: simulationResult });
      }, 2000);
    });
  },

  getEventHistory: (): Promise<{ data: EventData[] }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: mockEvents });
      }, 500);
    });
  },

  getEvent: (eventId: string): Promise<{ data: EventData }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const event = mockEvents.find(e => e.id === eventId) || mockEvents[0];
        resolve({ data: event });
      }, 300);
    });
  },

  getSimulationStatus: (eventId: string): Promise<{ data: { status: string } }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate processing for 5 seconds, then completed
        const event = mockEvents.find(e => e.id === eventId);
        const status = event?.status === 'processing' ? 'completed' : 'completed';
        resolve({ data: { status } });
      }, 1000);
    });
  },
};

// Helper function to generate random event data
export const generateRandomEvent = (): Partial<EventData> => {
  const eventTypes = ['Conference', 'Festival', 'Concert', 'Exhibition', 'Gala', 'Workshop'];
  const venues = ['Convention Center', 'Stadium', 'Arena', 'Park', 'Hotel Ballroom', 'Theater'];
  
  const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const randomVenue = venues[Math.floor(Math.random() * venues.length)];
  
  const startDate = new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + (Math.random() * 8 + 2) * 60 * 60 * 1000); // 2-10 hours later
  
  return {
    name: `${randomEventType} ${new Date().getFullYear()}`,
    venue: `${randomVenue} Downtown`,
    dateStart: startDate.toISOString(),
    dateEnd: endDate.toISOString(),
  };
};
