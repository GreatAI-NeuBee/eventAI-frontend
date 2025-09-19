import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';
import Card from '../common/Card';

interface CrowdDensityData {
  timestamp: string;
  location: string;
  density: number;
}

interface SimulationChartProps {
  data: CrowdDensityData[];
  predictedData?: CrowdDensityData[];
  title?: string;
  showPredictionsDefault?: boolean;
  onlyLocation?: string;
}

const SimulationChart: React.FC<SimulationChartProps> = ({ data, predictedData, title = 'Crowd Density Over Time', showPredictionsDefault = true, onlyLocation }) => {
  const [showPredictions, setShowPredictions] = React.useState<boolean>(showPredictionsDefault);
  const [hiddenSeries, setHiddenSeries] = React.useState<Record<string, boolean>>({});
  const [hoveredSeries, setHoveredSeries] = React.useState<string | null>(null);
  const [maxVisible, setMaxVisible] = React.useState<number>(0); // 0 = show all
  const [focusLocation, setFocusLocation] = React.useState<string>('ALL');
  const [viewMode, setViewMode] = React.useState<'combined' | 'smallMultiples'>('smallMultiples');
  const [modalLocation, setModalLocation] = React.useState<string | null>(null);

  const handleLegendClick = (o: any) => {
    const { dataKey } = o;
    setHiddenSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };
  // Transform data for recharts
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by timestamp and create entries for each location
    const sourceActual = onlyLocation ? data.filter(d => d.location === onlyLocation) : data;
    const grouped = sourceActual.reduce((acc, item) => {
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

    // Merge predicted values if provided
    if (predictedData && predictedData.length > 0) {
      const sourcePred = onlyLocation ? predictedData.filter(d => d.location === onlyLocation) : predictedData;
      sourcePred.forEach(item => {
        const time = new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        if (!grouped[time]) {
          grouped[time] = { time };
        }
        grouped[time][`${item.location} (Pred)`] = item.density;
      });
    }

    return Object.values(grouped);
  }, [data, predictedData, onlyLocation]);

  // Get unique locations for lines
  const locations = React.useMemo(() => {
    const inScope = onlyLocation ? data.filter(d => d.location === onlyLocation) : data;
    const locationSet = new Set(inScope.map(item => item.location));
    return Array.from(locationSet);
  }, [data, onlyLocation]);

  // Compute top-N locations at the latest timestamp to reduce clutter
  const visibleLocations = React.useMemo(() => {
    // If a single location is focused, show only that
    if (focusLocation !== 'ALL') return [focusLocation];
    // Otherwise apply top-N if set
    if (maxVisible === 0 || maxVisible >= locations.length) return locations;
    if (!Array.isArray(chartData) || chartData.length === 0) return locations;
    const last = chartData[chartData.length - 1] as Record<string, any>;
    const pairs = locations.map(loc => ({ loc, value: typeof last[loc] === 'number' ? last[loc] : 0 }));
    return pairs.sort((a, b) => b.value - a.value).slice(0, maxVisible).map(p => p.loc);
  }, [locations, chartData, maxVisible, focusLocation]);

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
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="flex items-center gap-4 mb-2 justify-between">
        <div className="flex items-center gap-4">
        {predictedData && predictedData.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={showPredictions}
              onChange={(e) => setShowPredictions(e.target.checked)}
            />
            Show Predictions
          </label>
        )}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>View</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="smallMultiples">Small multiples</option>
              <option value="combined">Combined</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Focus</span>
          <select
            value={focusLocation}
            onChange={(e) => setFocusLocation(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="ALL">All locations</option>
            {locations.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 opacity-100">
          <span>Show top</span>
          <select
            value={focusLocation !== 'ALL' ? 0 : maxVisible}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMaxVisible(v);
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-60"
            disabled={focusLocation !== 'ALL'}
          >
            <option value={0}>All</option>
            {[3,4,5,6,8,10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>locations</span>
        </div>
      </div>
      {viewMode === 'combined' ? (
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
              formatter={(value: any, name: any) => [
                typeof value === 'number' ? value.toFixed(2) : value,
                name
              ]}
              wrapperStyle={{ pointerEvents: 'auto', zIndex: 20 }}
              filterNull
            />
            <Legend align="center" verticalAlign="top" onClick={handleLegendClick} />
            {locations.map((location, index) => (
              <React.Fragment key={location}>
                <Line
                  type="monotone"
                  name={location}
                  dataKey={location}
                  stroke={colors[index % colors.length]}
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 6 }}
                  hide={!!hiddenSeries[location] || !visibleLocations.includes(location)}
                  strokeOpacity={hoveredSeries && hoveredSeries !== location ? 0.25 : 1}
                  onMouseOver={() => setHoveredSeries(location)}
                  onMouseOut={() => setHoveredSeries(null)}
                />
                {showPredictions && predictedData && predictedData.length > 0 && (
                  <Line
                    type="monotone"
                    name={`${location} (Pred)`}
                    dataKey={`${location} (Pred)`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="6 6"
                    hide={!!hiddenSeries[`${location} (Pred)`] || !visibleLocations.includes(location)}
                    strokeOpacity={hoveredSeries && hoveredSeries !== location ? 0.15 : 0.85}
                    onMouseOver={() => setHoveredSeries(location)}
                    onMouseOut={() => setHoveredSeries(null)}
                  />
                )}
              </React.Fragment>
            ))}
            <ReferenceLine y={1} stroke="#e5e7eb" ifOverflow="extendDomain" />
            <Brush dataKey="time" height={18} travellerWidth={10} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((location, index) => {
            const series = chartData.map((row: any) => ({
              time: row.time,
              actual: row[location],
              pred: row[`${location} (Pred)`],
            }));
            return (
              <div
                key={location}
                className="h-48 border border-gray-200 rounded-md p-2 hover:shadow cursor-pointer"
                onClick={() => setModalLocation(location)}
              >
                <div className="text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                    {location}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={series} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} hide />
                    <YAxis domain={[0,1]} tick={{ fontSize: 10 }} width={24} />
                    <Tooltip wrapperStyle={{ zIndex: 20 }} formatter={(v: any, n: any) => [typeof v === 'number' ? v.toFixed(2) : v, n]} />
                    <Line type="monotone" dataKey="actual" stroke={colors[index % colors.length]} strokeWidth={1.5} dot={false} name={location} />
                    {showPredictions && (
                      <Line type="monotone" dataKey="pred" stroke={colors[index % colors.length]} strokeDasharray="6 6" strokeWidth={1.25} dot={false} name={`${location} (Pred)`} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}

      {modalLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalLocation(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[95vw] max-w-4xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-gray-900">{modalLocation} - Detailed View</h4>
              <button
                aria-label="Close"
                className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setModalLocation(null)}
              >
                Close
              </button>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.map((row: any) => ({ time: row.time, actual: row[modalLocation], pred: row[`${modalLocation} (Pred)`] }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis domain={[0,1]} tick={{ fontSize: 12 }} label={{ value: 'Crowd Density', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(v: any, n: any) => [typeof v === 'number' ? v.toFixed(2) : v, n]} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name={modalLocation} stroke="#111827" strokeWidth={2} dot={{ r: 2 }} />
                  {showPredictions && (
                    <Line type="monotone" dataKey="pred" name={`${modalLocation} (Pred)`} stroke="#6B7280" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                  )}
                  <Brush dataKey="time" height={18} travellerWidth={10} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SimulationChart;
