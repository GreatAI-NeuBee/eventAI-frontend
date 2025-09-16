import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';

interface CrowdDensityData {
  timestamp: string;
  location: string;
  density: number;
}

interface SimulationChartProps {
  data: CrowdDensityData[];
  title?: string;
}

const SimulationChart: React.FC<SimulationChartProps> = ({ data, title = 'Crowd Density Over Time' }) => {
  // Transform data for recharts
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by timestamp and create entries for each location
    const grouped = data.reduce((acc, item) => {
      const time = new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      if (!acc[time]) {
        acc[time] = { time };
      }
      
      acc[time][item.location] = item.density;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [data]);

  // Get unique locations for lines
  const locations = React.useMemo(() => {
    const locationSet = new Set(data.map(item => item.location));
    return Array.from(locationSet);
  }, [data]);

  // Color palette for different locations
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
  ];

  if (!data || data.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No simulation data available
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Crowd Density', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem'
              }}
            />
            <Legend />
            {locations.map((location, index) => (
              <Line
                key={location}
                type="monotone"
                dataKey={location}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SimulationChart;
