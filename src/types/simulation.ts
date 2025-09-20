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
  dateStart: string;
  dateEnd: string;
  venue: string;
  description?: string;
  venueLocation?: {
    lat: number;
    lng: number;
    address?: string;
    placeId?: string;
    name?: string;
  };
  venueLayout?: any; // JSON object for venue configuration
  userEmail?: string; // Email of the user who created the event
  status: 'draft' | 'processing' | 'completed' | 'error';
  createdAt: string;
}

export type { SimulationResult, EventData };
