// import axios from 'axios';

// Rapid KL API configuration
// const RAPID_KL_BASE_URL = 'https://api.data.gov.my/gtfs-realtime/vehicle-position';

// Available agencies for Rapid KL
export const RAPID_KL_AGENCIES = {
  LRT: 'lrt',
  MRT: 'mrt',
  MONORAIL: 'monorail',
  BRT: 'brt',
  BUS: 'bus'
} as const;

export type RapidKlAgency = typeof RAPID_KL_AGENCIES[keyof typeof RAPID_KL_AGENCIES];

// GTFS Realtime types
export interface VehiclePosition {
  id: string;
  vehicle: {
    id: string;
    label?: string;
    license_plate?: string;
  };
  position: {
    latitude: number;
    longitude: number;
    bearing?: number;
    odometer?: number;
    speed?: number;
  };
  current_status?: 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO';
  stop_id?: string;
  current_stop_sequence?: number;
  timestamp?: number;
  congestion_level?: 'UNKNOWN_CONGESTION_LEVEL' | 'RUNNING_SMOOTHLY' | 'STOP_AND_GO' | 'CONGESTION' | 'SEVERE_CONGESTION';
  occupancy_status?: 'EMPTY' | 'MANY_SEATS_AVAILABLE' | 'FEW_SEATS_AVAILABLE' | 'STANDING_ROOM_ONLY' | 'CRUSHED_STANDING_ROOM_ONLY' | 'FULL' | 'NOT_ACCEPTING_PASSENGERS' | 'NO_DATA_AVAILABLE' | 'NOT_BOARDABLE';
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number; // Distance from venue in meters
  lines?: string[]; // LRT, MRT, Monorail, etc.
  agency?: RapidKlAgency;
}

export interface RapidKlResponse {
  header: {
    gtfs_realtime_version: string;
    incrementality: string;
    timestamp: number;
  };
  entity: Array<{
    id: string;
    vehicle: VehiclePosition;
  }>;
}

// Create axios instance for Rapid KL API
// const rapidKlClient = axios.create({
//   baseURL: RAPID_KL_BASE_URL,
//   timeout: 10000,
//   headers: {
//     'Accept': 'application/x-protobuf',
//     'User-Agent': 'Event-Buddy-Frontend/1.0'
//   }
// });

// Rapid KL API functions
export const rapidKlAPI = {
  // Get vehicle positions for a specific agency
  getVehiclePositions: async (agency: RapidKlAgency): Promise<VehiclePosition[]> => {
    try {
      // For now, return mock data since the API might not be accessible
      // In production, you would make the actual API call here
      console.log(`Fetching vehicle positions for ${agency}...`);
      
      // Mock vehicle positions data
      const mockPositions: VehiclePosition[] = [
        {
          id: `${agency}-001`,
          vehicle: {
            id: `${agency}-train-001`,
            label: `${agency.toUpperCase()} Train 001`
          },
          position: {
            latitude: 3.1579 + (Math.random() - 0.5) * 0.01,
            longitude: 101.7116 + (Math.random() - 0.5) * 0.01,
            bearing: Math.random() * 360,
            speed: Math.random() * 50
          },
          current_status: 'IN_TRANSIT_TO',
          stop_id: `${agency}-station-001`,
          current_stop_sequence: Math.floor(Math.random() * 10),
          timestamp: Date.now(),
          congestion_level: 'RUNNING_SMOOTHLY',
          occupancy_status: 'FEW_SEATS_AVAILABLE'
        }
      ];
      
      return mockPositions;
    } catch (error) {
      console.error('Error fetching Rapid KL vehicle positions:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Get all vehicle positions from all agencies
  getAllVehiclePositions: async (): Promise<VehiclePosition[]> => {
    try {
      const agencies = Object.values(RAPID_KL_AGENCIES);
      const allPositions = await Promise.allSettled(
        agencies.map(agency => rapidKlAPI.getVehiclePositions(agency))
      );

      const positions: VehiclePosition[] = [];
      allPositions.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          positions.push(...result.value);
        } else {
          console.warn(`Failed to fetch positions for ${agencies[index]}:`, result.reason);
        }
      });

      return positions;
    } catch (error) {
      console.error('Error fetching all vehicle positions:', error);
      throw new Error('Failed to fetch vehicle positions from all agencies');
    }
  },

  // Find nearby stations based on venue location
  findNearbyStations: async (
    venueLat: number, 
    venueLng: number, 
    radiusKm: number = 2
  ): Promise<Station[]> => {
    try {
      // Mock station data - in production, this would come from GTFS static data
      const mockStations: Station[] = [
        {
          id: 'klcc-lrt',
          name: 'KLCC LRT Station',
          latitude: 3.1579,
          longitude: 101.7116,
          lines: ['LRT'],
          agency: 'lrt'
        },
        {
          id: 'klcc-mrt',
          name: 'KLCC MRT Station',
          latitude: 3.1579,
          longitude: 101.7116,
          lines: ['MRT'],
          agency: 'mrt'
        },
        {
          id: 'bukit-bintang-monorail',
          name: 'Bukit Bintang Monorail Station',
          latitude: 3.1490,
          longitude: 101.7108,
          lines: ['Monorail'],
          agency: 'monorail'
        },
        {
          id: 'pavilion-kl-monorail',
          name: 'Pavilion KL Monorail Station',
          latitude: 3.1490,
          longitude: 101.7108,
          lines: ['Monorail'],
          agency: 'monorail'
        },
        {
          id: 'kl-sentral-lrt',
          name: 'KL Sentral LRT Station',
          latitude: 3.1344,
          longitude: 101.6869,
          lines: ['LRT'],
          agency: 'lrt'
        },
        {
          id: 'kl-sentral-mrt',
          name: 'KL Sentral MRT Station',
          latitude: 3.1344,
          longitude: 101.6869,
          lines: ['MRT'],
          agency: 'mrt'
        }
      ];

      // Calculate distances and filter by radius
      const nearbyStations = mockStations
        .map(station => ({
          ...station,
          distance: calculateDistance(venueLat, venueLng, station.latitude, station.longitude)
        }))
        .filter(station => station.distance <= radiusKm * 1000) // Convert km to meters
        .sort((a, b) => a.distance - b.distance);

      return nearbyStations;
    } catch (error) {
      console.error('Error finding nearby stations:', error);
      throw new Error('Failed to find nearby stations');
    }
  },

  // Get frequency information for a specific station
  getStationFrequency: async (stationId: string, agency: RapidKlAgency): Promise<{
    stationId: string;
    agency: RapidKlAgency;
    currentFrequency: number; // trains per hour
    peakFrequency: number;
    offPeakFrequency: number;
    lastUpdated: string;
  }> => {
    try {
      // Mock frequency data - in production, this would be calculated from GTFS data
      const mockFrequency = {
        stationId,
        agency,
        currentFrequency: Math.floor(Math.random() * 10) + 5, // 5-15 trains per hour
        peakFrequency: 12,
        offPeakFrequency: 6,
        lastUpdated: new Date().toISOString()
      };

      return mockFrequency;
    } catch (error) {
      console.error('Error getting station frequency:', error);
      throw new Error('Failed to get station frequency');
    }
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default rapidKlAPI;
