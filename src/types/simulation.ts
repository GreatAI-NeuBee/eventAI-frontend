interface SimulationResult {
  eventId: string;
  crowdDensity: {
    timestamp: string;
    location: string;
    density: number;
  }[];
  hotspots: {
    x: number;
    y: number;
    intensity: number;
    location: string;
  }[];
  recommendations: {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
  }[];
  scenarios: {
    entry: any;
    exit: any;
    congestion: any;
  };
}

interface EventData {
  id: string;
  name: string;
  capacity: number;
  date: string;
  venue: string;
  venueLocation?: {
    lat: number;
    lng: number;
    address?: string;
    placeId?: string;
    name?: string;
  };
  status: 'draft' | 'processing' | 'completed' | 'error';
  createdAt: string;
}

export type { SimulationResult, EventData };
