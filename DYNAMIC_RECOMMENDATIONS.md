# Dynamic Recommendations System

## Overview
The recommendations bar on the right side of the dashboard is now dynamically connected to the crowd density graph data. This creates a real-time, interactive experience where recommendations are generated based on actual simulation data.

## Key Features

### 1. **Dynamic Recommendation Generation**
- Recommendations are now generated in real-time based on crowd density data
- Different thresholds trigger different types of recommendations:
  - **Critical (>90% density)**: High priority warnings with emergency actions
  - **High (80-90% density)**: High priority warnings with crowd control actions
  - **Moderate (70-80% density)**: Medium priority monitoring recommendations
  - **Low (<30% density)**: Success indicators for optimal flow

### 2. **Location-Based Filtering**
- Click on any location in the chart to filter recommendations for that specific area
- Use the "Focus" dropdown in the chart to select a specific location
- Recommendations automatically update to show only relevant alerts for the selected location

### 3. **Interactive Highlighting**
- Hover over chart lines to highlight corresponding recommendations
- Click on location tags in recommendations to focus the chart on that area
- Visual indicators show which location is currently selected

### 4. **Real-Time Data Analysis**
- Trend analysis detects rapid crowd increases/decreases
- Hotspot detection identifies high-intensity areas
- Predictive recommendations based on historical patterns

## How It Works

### Data Flow
1. **Simulation Data** → **Dynamic Analysis** → **Recommendations**
2. The `useDynamicRecommendations` hook analyzes crowd density data
3. Recommendations are generated based on current density levels and trends
4. UI components update in real-time to reflect the analysis

### User Interactions
- **Chart Interaction**: Hover/click on chart elements to filter recommendations
- **Recommendation Interaction**: Click location tags to focus chart
- **Filter Controls**: Use dropdown menus to select specific locations

## Technical Implementation

### New Components
- `useDynamicRecommendations.ts`: Hook for generating dynamic recommendations
- Enhanced `RecommendationCard.tsx`: Supports location data and highlighting
- Enhanced `SimulationChart.tsx`: Supports location selection and highlighting

### Data Structure
```typescript
interface DynamicRecommendation {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  location?: string;        // NEW: Location reference
  density?: number;         // NEW: Current density level
  timestamp?: string;       // NEW: When the data was captured
}
```

## Benefits

1. **Real-Time Insights**: Recommendations reflect actual simulation data, not static mock data
2. **Contextual Actions**: Actions are specific to the actual density levels and locations
3. **Interactive Experience**: Users can explore specific areas and get targeted recommendations
4. **Predictive Analysis**: System can identify trends and provide proactive recommendations
5. **Visual Connection**: Clear visual link between chart data and recommendations

## Usage Examples

- **High Congestion Alert**: When Main Entrance density exceeds 90%, system shows "Critical Congestion" warning with "Deploy Emergency Crowd Control" action
- **Location Filtering**: Click on "Food Court" in chart to see only food-related recommendations
- **Trend Analysis**: System detects rapid crowd increase and suggests "Prepare Contingency Plans"
- **Optimal Flow**: When density is low, system shows success message "Optimal Flow at [Location]"

This system transforms the static recommendations into a dynamic, data-driven decision support tool that helps event managers respond to real-time crowd conditions.
