// Mock transit API that provides realistic MRT/LRT data
// This replaces the Prasarana API when it's not available or has CORS issues

export interface MockTrain {
  id: string;
  routeId: string;
  direction: number;
  latitude: number;
  longitude: number;
  speed: number;
  bearing: number;
  stopId?: string;
  currentStatus: string;
  occupancyStatus: string;
  congestionLevel: string;
  lastUpdated: Date;
}

export class MockTransitAPI {
  private static instance: MockTransitAPI;

  static getInstance(): MockTransitAPI {
    if (!MockTransitAPI.instance) {
      MockTransitAPI.instance = new MockTransitAPI();
    }
    return MockTransitAPI.instance;
  }

  /**
   * Get nearby trains for a venue location
   */
  async getNearbyTrains(
    venueLat: number, 
    venueLng: number, 
    radiusKm: number = 5,
    category: 'mrt' | 'lrt' = 'mrt'
  ): Promise<MockTrain[]> {
    console.log(`🚇 Getting nearby ${category.toUpperCase()} trains for venue:`, venueLat, venueLng);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const trains: MockTrain[] = [];
    const now = new Date();
    
    // Generate 3-6 trains around the venue
    const numTrains = Math.floor(Math.random() * 4) + 3;
    
    for (let i = 0; i < numTrains; i++) {
      // Generate positions within radius
      const angle = (Math.PI * 2 * i) / numTrains + Math.random() * 0.5;
      const distance = Math.random() * (radiusKm / 111); // Convert km to degrees (roughly)
      
      const trainLat = venueLat + Math.cos(angle) * distance;
      const trainLng = venueLng + Math.sin(angle) * distance;
      
      const train: MockTrain = {
        id: `${category}_${i + 1}`,
        routeId: `${category.toUpperCase()}_${String(i + 1).padStart(2, '0')}`,
        direction: Math.floor(Math.random() * 2),
        latitude: trainLat,
        longitude: trainLng,
        speed: Math.random() * 60 + 20, // 20-80 km/h
        bearing: Math.random() * 360,
        stopId: `stop_${i + 1}`,
        currentStatus: this.getRandomStatus(),
        occupancyStatus: this.getRandomOccupancy(),
        congestionLevel: this.getRandomCongestion(),
        lastUpdated: new Date(now.getTime() - Math.random() * 300000) // Within last 5 minutes
      };
      
      trains.push(train);
    }
    
    console.log(`✅ Found ${trains.length} ${category.toUpperCase()} trains near venue`);
    return trains;
  }

  /**
   * Get train schedules
   */
  async getTrainSchedules(category: 'mrt' | 'lrt' = 'mrt'): Promise<any[]> {
    console.log(`📅 Getting ${category.toUpperCase()} schedules...`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const schedules = [];
    const now = new Date();
    
    // Generate 3-5 upcoming trains
    const numSchedules = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < numSchedules; i++) {
      const arrivalTime = new Date(now.getTime() + (i + 1) * 3 * 60000); // 3 min intervals
      
      schedules.push({
        id: `schedule_${i + 1}`,
        tripId: `trip_${i + 1}`,
        routeId: `${category.toUpperCase()}_${String(i + 1).padStart(2, '0')}`,
        direction: Math.floor(Math.random() * 2),
        startTime: arrivalTime.toTimeString().slice(0, 5),
        startDate: now.toISOString().slice(0, 10),
        stopTimeUpdates: [],
        timestamp: now
      });
    }
    
    console.log(`✅ Generated ${schedules.length} ${category.toUpperCase()} schedules`);
    return schedules;
  }

  /**
   * Get random train status
   */
  private getRandomStatus(): string {
    const statuses = ['Incoming', 'Stopped', 'In Transit'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  /**
   * Get random occupancy status
   */
  private getRandomOccupancy(): string {
    const occupancies = [
      'Empty',
      'Many Seats Available', 
      'Few Seats Available',
      'Standing Room Only',
      'Crushed Standing Room Only'
    ];
    return occupancies[Math.floor(Math.random() * occupancies.length)];
  }

  /**
   * Get random congestion level
   */
  private getRandomCongestion(): string {
    const congestions = [
      'Running Smoothly',
      'Stop and Go', 
      'Congestion'
    ];
    return congestions[Math.floor(Math.random() * congestions.length)];
  }
}

// Export singleton instance
export const mockTransitAPI = MockTransitAPI.getInstance();





