interface SimulationResult {
  eventId: string;
  crowdDensity: {
    timestamp: string;
    location: string;
    density: number;
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

interface PopularityContent {
  metadata?: {
    inputData?: {
      feat?: string;
      type?: string;
      location?: string;
    };
    analyzedAt?: string;
    modelVersion?: string;
  };
  popularityLevel?: string;
  popularityScore?: number;
  crowdFlowAnalysis?: {
    entrySpeed?: string;
    entrySpeedRationale?: string;
    bottleneckAreas?: string[];
    peakCongestionTimes?: string[];
  };
  historicalIncidents?: Array<{
    date?: string;
    cause?: string;
    incident?: string;
    casualties?: string;
  }>;
  audienceDemographics?: {
    ageGroups?: {
      teens?: number;
      seniors?: number;
      children?: number;
      middleAged?: number;
      youngAdults?: number;
    };
    behaviorProfile?: string;
    primaryAgeRange?: string;
    mobilityConsiderations?: string;
  };
  operationalRecommendations?: {
    crowdControl?: string[];
    entranceManagement?: string[];
    staffingRequirements?: {
      rationale?: string;
      medicalStaff?: number;
      assistanceStaff?: number;
      securityPersonnel?: number;
      crowdControlOfficers?: number;
    };
    emergencyPreparedness?: string[];
    specialConsiderations?: string[];
  };
  expectedTurnout?: {
    minimum?: number;
    expected?: number;
    maximum?: number;
  };
  riskAssessment?: {
    highRisks?: string[];
    mediumRisks?: string[];
    weatherRelatedRisks?: string[];
  };
  safetyMeasures?: {
    mandatory?: string[];
    recommended?: string[];
    equipmentNeeded?: string[];
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
  status: 'draft' | 'processing' | 'completed' | 'error' | 'active';
  createdAt: string;
  attachmentUrls?: string[]; // Array of attachment URLs
  attachmentFilenames?: string[]; // Array of attachment filenames (corresponds to URLs by index)
  popularityContent?: PopularityContent; // AI-analyzed popularity and crowd insights
  predict_result?: any; // Live prediction data from the backend
  forecast_result?: any; // Forecast prediction data from the backend
  nearby_result?: any; // Nearby events from SerpAPI (stored by backend)
}

export type { SimulationResult, EventData, PopularityContent };
