# CongestionMap Component

A traffic congestion-aware route planner with draggable routes and real-time traffic visualization.

## Features

- **🔄 Draggable Routes**: Users can drag the route line to modify the path
- **🚦 Traffic Visualization**: Color-coded polyline segments showing congestion levels
- **📊 Real-time Updates**: Congestion data updates when route is modified
- **🎨 Visual Indicators**: Green (good flow), Orange (moderate), Red (heavy congestion)
- **📈 Statistics Dashboard**: Real-time traffic flow analysis and statistics

## Usage

```tsx
import CongestionMap, { LatLng } from './components/CongestionMap';

const MyComponent = () => {
  const origin: LatLng = { lat: 3.1390, lng: 101.6869 };
  const destination: LatLng = { lat: 3.1410, lng: 101.6900 };

  return (
    <CongestionMap
      origin={origin}
      destination={destination}
      height={600}
      onRouteChanged={(route) => console.log('Route changed:', route)}
      onCongestionData={(segments) => console.log('Congestion data:', segments)}
    />
  );
};
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `origin` | `LatLng` | ✅ | - | Starting point coordinates |
| `destination` | `LatLng` | ✅ | - | End point coordinates |
| `waypoints` | `LatLng[]` | ❌ | `[]` | Optional intermediate waypoints |
| `height` | `number \| string` | ❌ | `500` | Map height in pixels or CSS string |
| `onRouteChanged` | `function` | ❌ | - | Callback when route is modified |
| `onCongestionData` | `function` | ❌ | - | Callback when congestion data updates |

## Traffic Color Coding

- **🟢 Green (#4CAF50)**: Good traffic flow (≥80% of speed limit)
- **🟠 Orange (#FF9800)**: Moderate congestion (50-79% of speed limit)
- **🔴 Red (#F44336)**: Heavy congestion (<50% of speed limit)

## Dashboard Features

- **Route Information**: Distance and duration display
- **Traffic Statistics**: Percentage breakdown of congestion levels
- **Real-time Updates**: Statistics update as route is modified
- **Interactive Legend**: Visual guide for traffic flow colors

## Demo

Visit `/congestion-dashboard` to see the complete implementation with:
- Interactive traffic map
- Real-time congestion visualization
- Statistics dashboard
- Route modification capabilities

## Technical Implementation

- Uses `@react-google-maps/api` with `DirectionsService` and `DirectionsRenderer`
- Simulates Google Routes API congestion data (replace with real API calls)
- Custom polyline rendering for traffic visualization
- Real-time route modification with drag and drop
- TypeScript strict with comprehensive type definitions

