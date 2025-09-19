import { useMemo } from 'react';
import { SimulationResult } from '../types/simulation';

interface DynamicRecommendation {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  location?: string;
  density?: number;
  timestamp?: string;
}

interface UseDynamicRecommendationsProps {
  simulationResult: SimulationResult | null;
  selectedLocation?: string;
  selectedTimeRange?: { start: string; end: string };
}

export const useDynamicRecommendations = ({
  simulationResult,
  selectedLocation,
  selectedTimeRange
}: UseDynamicRecommendationsProps) => {
  const recommendations = useMemo(() => {
    if (!simulationResult) return [];

    const dynamicRecommendations: DynamicRecommendation[] = [];
    const { crowdDensity, hotspots } = simulationResult;

    // Get the latest density data for each location
    const latestDensities = crowdDensity.reduce((acc, data) => {
      const existing = acc[data.location];
      if (!existing || new Date(data.timestamp) > new Date(existing.timestamp)) {
        acc[data.location] = data;
      }
      return acc;
    }, {} as Record<string, typeof crowdDensity[0]>);

    // Filter by selected location if provided
    const relevantDensities = selectedLocation 
      ? { [selectedLocation]: latestDensities[selectedLocation] }
      : latestDensities;

    // Analyze each location for recommendations
    Object.entries(relevantDensities).forEach(([location, data]) => {
      const density = data.density;
      const timestamp = data.timestamp;

      // High density warnings
      if (density > 0.9) {
        dynamicRecommendations.push({
          id: `high-density-${location}`,
          type: 'warning',
          title: `Critical Congestion at ${location}`,
          description: `Crowd density at ${location} is at ${Math.round(density * 100)}%. Immediate action required to prevent overcrowding.`,
          priority: 'high',
          action: 'Deploy Emergency Crowd Control',
          location,
          density,
          timestamp
        });
      } else if (density > 0.8) {
        dynamicRecommendations.push({
          id: `medium-density-${location}`,
          type: 'warning',
          title: `High Congestion at ${location}`,
          description: `Crowd density at ${location} is at ${Math.round(density * 100)}%. Consider opening additional routes or implementing crowd control measures.`,
          priority: 'high',
          action: 'Open Alternative Routes',
          location,
          density,
          timestamp
        });
      } else if (density > 0.7) {
        dynamicRecommendations.push({
          id: `moderate-density-${location}`,
          type: 'info',
          title: `Moderate Congestion at ${location}`,
          description: `Crowd density at ${location} is at ${Math.round(density * 100)}%. Monitor closely for potential bottlenecks.`,
          priority: 'medium',
          action: 'Increase Monitoring',
          location,
          density,
          timestamp
        });
      } else if (density < 0.3) {
        dynamicRecommendations.push({
          id: `low-density-${location}`,
          type: 'success',
          title: `Optimal Flow at ${location}`,
          description: `Crowd density at ${location} is at ${Math.round(density * 100)}%. Flow is optimal and well-managed.`,
          priority: 'low',
          action: 'Maintain Current Setup',
          location,
          density,
          timestamp
        });
      }
    });

    // Analyze hotspots for additional recommendations
    hotspots.forEach((hotspot, index) => {
      if (hotspot.intensity > 0.8) {
        dynamicRecommendations.push({
          id: `hotspot-${index}`,
          type: 'warning',
          title: `Hotspot Detected: ${hotspot.location}`,
          description: `High-intensity crowd concentration detected at ${hotspot.location} with ${Math.round(hotspot.intensity * 100)}% intensity.`,
          priority: 'high',
          action: 'Deploy Crowd Management Team',
          location: hotspot.location,
          density: hotspot.intensity
        });
      }
    });

    // Analyze trends for predictive recommendations
    const locations = [...new Set(crowdDensity.map(d => d.location))];
    locations.forEach(location => {
      const locationData = crowdDensity
        .filter(d => d.location === location)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      if (locationData.length >= 3) {
        const recent = locationData.slice(-3);
        const trend = recent[2].density - recent[0].density;
        
        if (trend > 0.2) {
          dynamicRecommendations.push({
            id: `trend-increasing-${location}`,
            type: 'warning',
            title: `Rapid Crowd Increase at ${location}`,
            description: `Crowd density at ${location} is rapidly increasing. Prepare for potential congestion in the next 30-60 minutes.`,
            priority: 'medium',
            action: 'Prepare Contingency Plans',
            location,
            density: recent[2].density
          });
        } else if (trend < -0.2) {
          dynamicRecommendations.push({
            id: `trend-decreasing-${location}`,
            type: 'info',
            title: `Crowd Dispersing at ${location}`,
            description: `Crowd density at ${location} is decreasing. Good flow management in progress.`,
            priority: 'low',
            action: 'Continue Current Strategy',
            location,
            density: recent[2].density
          });
        }
      }
    });

    // Sort by priority and remove duplicates
    const uniqueRecommendations = dynamicRecommendations.reduce((acc, rec) => {
      const existing = acc.find(r => r.id === rec.id);
      if (!existing) {
        acc.push(rec);
      }
      return acc;
    }, [] as DynamicRecommendation[]);

    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [simulationResult, selectedLocation, selectedTimeRange]);

  return recommendations;
};
