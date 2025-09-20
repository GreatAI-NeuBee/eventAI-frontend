import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, Map, DoorOpen, Settings } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import VenueConfigEditor from "../components/venue/VenueConfigEditor";
import { useEventStore } from "../store/eventStore";
import type { VenueConfiguration } from "../types/venueTypes";
import { DEFAULT_STADIUM_CONFIG } from "../types/venueTypes";

// ==== Types ====
export type FloorZonePolygon = {
  id: string;
  name: string;
  layer: number;   // 1..N
  section: number; // 1..S
  points: Array<[number, number]>; // [%x, %y] in a 100 × 62.5 viewBox
  congestion: number; // 0..100
};

// Dynamic color banding based on venue configuration
function bandedColor(p: number, colors: { low: string; medium: string; high: string }) {
  const v = Math.max(0, Math.min(100, p));
  if (v >= 67) return colors.high;
  if (v >= 34) return colors.medium;
  return colors.low;
}

// Build a ring sector polygon in % coords (viewBox 0..100 × 62.5)
function ringSectorPoints(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
  steps = 10
): Array<[number, number]> {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pts: Array<[number, number]> = [];
  const step = (endDeg - startDeg) / steps;
  for (let i = 0; i <= steps; i++) {
    const a = toRad(startDeg + i * step);
    pts.push([cx + rOuter * Math.cos(a), cy + rOuter * Math.sin(a)]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = toRad(startDeg + i * step);
    pts.push([cx + rInner * Math.cos(a), cy + rInner * Math.sin(a)]);
  }
  return pts;
}

// Build rectangle sector points for rectangular venues
function rectangleSectorPoints(
  cx: number,
  cy: number,
  width: number,
  height: number,
  sectionIndex: number,
  totalSections: number,
  layer: number,
  layerThickness: number
): Array<[number, number]> {
  const sectionWidth = width / totalSections;
  const left = cx - width / 2 + sectionIndex * sectionWidth;
  const right = left + sectionWidth;
  const layerTop = cy - height / 2 + (layer - 1) * layerThickness;
  const layerBottom = layerTop + layerThickness;
  
  return [
    [left, layerTop],
    [right, layerTop],
    [right, layerBottom],
    [left, layerBottom]
  ];
}

// Little gate polygon at angle θ
function gateRectPoints(
  cx: number,
  cy: number,
  r: number,
  thetaDeg: number,
  width = 4,
  depth = 2
): Array<[number, number]> {
  const theta = (thetaDeg * Math.PI) / 180;
  const tx = -Math.sin(theta), ty = Math.cos(theta); // tangent unit
  const nx = Math.cos(theta), ny = Math.sin(theta);  // outward normal
  const cxp = cx + r * nx;
  const cyp = cy + r * ny;
  const hw = width / 2;
  const p1: [number, number] = [cxp - hw * tx, cyp - hw * ty];
  const p2: [number, number] = [cxp + hw * tx, cyp + hw * ty];
  const p3: [number, number] = [p2[0] + depth * nx, p2[1] + depth * ny];
  const p4: [number, number] = [p1[0] + depth * nx, p1[1] + depth * ny];
  return [p1, p2, p3, p4];
}

// ---- Demo fallback (safe to remove later) ----
const DEMO_EVENT_ID = "demo-evt-001";
const DEMO_EVENT = {
  id: DEMO_EVENT_ID,
  name: "Demo Concert Night",
  capacity: 45000,
  date: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
  venue: "Stadium Alpha",
  venueLocation: { name: "Stadium Alpha", lat: 0, lng: 0 },
};

// ====== Dynamic SVG Venue with CENTER readout ======
const DynamicVenueSVG: React.FC<{
  config: VenueConfiguration;
  zones: FloorZonePolygon[];
}> = ({ config, zones }) => {
  // Extract configuration
  const { geometry, rings, sections, exits, colors, styles, parking } = config;
  const { viewBoxWidth: vbW, viewBoxHeight: vbH, centerX: cx, centerY: cy, shape } = geometry;
  const { baseInnerRadius: baseInner, ringThickness, ringGap, layers } = rings;
  const { sections: sectionCount } = sections;
  const { exits: exitCount, exitWidth, exitDepth, customAngles } = exits;
  
  // Calculate dimensions based on shape
  const isCircular = shape === 'circular';
  const outerMost = isCircular ? baseInner + layers * ringThickness + (layers - 1) * ringGap : 0;
  
  // For rectangular venues
  const rectWidth = isCircular ? 0 : vbW * 0.7; // 70% of viewbox width
  const rectHeight = isCircular ? 0 : vbH * 0.6; // 60% of viewbox height

  // Exits - use custom angles if provided, otherwise distribute evenly
  const exitAngles = customAngles || Array.from({ length: exitCount }, (_, i) => (i * 360) / exitCount);

  // Center readout (current hovered zone)
  const [centerZone, setCenterZone] = useState<FloorZonePolygon | null>(null);
  const clearCenter = () => setCenterZone(null);

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-gray-300 bg-gray-900 shadow">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        onMouseLeave={clearCenter}
      >
        {/* Render based on venue shape */}
        {isCircular ? (
          <>
            {/* Circular venue - Field/void */}
            <circle cx={cx} cy={cy} r={baseInner - 1.5} fill={colors.background} />

            {/* Base rings outlines */}
            {Array.from({ length: layers }, (_, li) => {
              const rIn = baseInner + li * (ringThickness + ringGap);
              const rOut = rIn + ringThickness;
              return (
                <g key={`ring-${li}`}>
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={rIn} 
                    fill="none" 
                    stroke={styles.rings.strokeColor} 
                    strokeWidth={styles.rings.strokeWidth} 
                    strokeDasharray={styles.rings.strokeDasharray} 
                  />
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={rOut} 
                    fill="none" 
                    stroke={styles.rings.strokeColor} 
                    strokeWidth={styles.rings.strokeWidth} 
                  />
                </g>
              );
            })}

            {/* Section dividers */}
            {Array.from({ length: sectionCount }, (_, i) => {
              const angle = (i * 360) / sectionCount;
              const rad = (angle * Math.PI) / 180;
              const x1 = cx + baseInner * Math.cos(rad);
              const y1 = cy + baseInner * Math.sin(rad);
              const x2 = cx + outerMost * Math.cos(rad);
              const y2 = cy + outerMost * Math.sin(rad);
              return (
                <line
                  key={`divider-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={styles.sections.strokeColor}
                  strokeWidth={styles.sections.strokeWidth}
                  strokeDasharray={styles.sections.strokeDasharray}
                />
              );
            })}
          </>
        ) : (
          <>
            {/* Rectangle venue - Stage/field area */}
            <rect 
              x={cx - rectWidth / 2} 
              y={cy - rectHeight / 2} 
              width={rectWidth} 
              height={rectHeight} 
              fill={colors.background}
              stroke={styles.rings.strokeColor}
              strokeWidth={styles.rings.strokeWidth}
            />

            {/* Layer dividers for rectangular venue */}
            {Array.from({ length: layers - 1 }, (_, li) => {
              const layerThickness = rectHeight / layers;
              const y = cy - rectHeight / 2 + (li + 1) * layerThickness;
              return (
                <line
                  key={`layer-${li}`}
                  x1={cx - rectWidth / 2}
                  y1={y}
                  x2={cx + rectWidth / 2}
                  y2={y}
                  stroke={styles.rings.strokeColor}
                  strokeWidth={styles.rings.strokeWidth}
                  strokeDasharray={styles.rings.strokeDasharray}
                />
              );
            })}

            {/* Section dividers for rectangular venue */}
            {Array.from({ length: sectionCount - 1 }, (_, i) => {
              const sectionWidth = rectWidth / sectionCount;
              const x = cx - rectWidth / 2 + (i + 1) * sectionWidth;
              return (
                <line
                  key={`section-${i}`}
                  x1={x}
                  y1={cy - rectHeight / 2}
                  x2={x}
                  y2={cy + rectHeight / 2}
                  stroke={styles.sections.strokeColor}
                  strokeWidth={styles.sections.strokeWidth}
                  strokeDasharray={styles.sections.strokeDasharray}
                />
              );
            })}
          </>
        )}

        {/* Section wedges (solid colors, no labels) */}
        {zones.map((z) => {
          const fill = bandedColor(z.congestion, { low: colors.low, medium: colors.medium, high: colors.high });
          const fillOpacity = styles.rings.fillOpacity + (z.congestion / 100) * 0.25;
          const pts = z.points.map(([x, y]) => `${x},${y}`).join(" ");
          return (
            <polygon
              key={z.id}
              points={pts}
              fill={fill}
              opacity={fillOpacity}
              stroke={colors.outline}
              strokeOpacity={styles.sections.fillOpacity}
              strokeWidth={0.25}
              onMouseEnter={() => setCenterZone(z)}
              onMouseMove={() => setCenterZone(z)}
              onMouseLeave={clearCenter}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Exit gates */}
        {isCircular ? (
          // Circular exits
          exitAngles.map((ang, idx) => {
            const gatePts = gateRectPoints(cx, cy, outerMost + 1.5, ang, exitWidth, exitDepth)
              .map(([x, y]) => `${x},${y}`)
              .join(" ");
            return (
              <polygon 
                key={`exit-${idx}`} 
                points={gatePts} 
                fill={colors.exit} 
                stroke={styles.exits.strokeColor} 
                strokeWidth={styles.exits.strokeWidth} 
              />
            );
          })
        ) : (
          // Rectangle exits
          Array.from({ length: exitCount }, (_, idx) => {
            const exitWidth = 8;
            const exitHeight = 3;
            
            // Position exits around the perimeter
            let x, y;
            if (idx === 0) {
              // Top exit
              x = cx - exitWidth / 2;
              y = cy - rectHeight / 2 - exitHeight;
            } else if (idx === 1) {
              // Right exit
              x = cx + rectWidth / 2;
              y = cy - exitHeight / 2;
            } else if (idx === 2) {
              // Bottom exit
              x = cx - exitWidth / 2;
              y = cy + rectHeight / 2;
            } else {
              // Left exit
              x = cx - rectWidth / 2 - exitWidth;
              y = cy - exitHeight / 2;
            }
            
            return (
              <rect
                key={`exit-${idx}`}
                x={x}
                y={y}
                width={exitWidth}
                height={exitHeight}
                fill={colors.exit}
                stroke={styles.exits.strokeColor}
                strokeWidth={styles.exits.strokeWidth}
              />
            );
          })
        )}

        {/* Parking Areas */}
        {parking.enabled && parking.areas > 0 && (
          <g>
            {Array.from({ length: parking.areas }, (_, idx) => {
              // Position parking areas around the venue
              const angle = (idx * 360) / parking.areas;
              const distance = isCircular ? outerMost + 12 : Math.max(rectWidth, rectHeight) / 2 + 15;
              const parkX = cx + distance * Math.cos((angle * Math.PI) / 180);
              const parkY = cy + distance * Math.sin((angle * Math.PI) / 180);
              
              return (
                <g key={`parking-${idx}`}>
                  {/* Parking area background */}
                  <rect
                    x={parkX - 6}
                    y={parkY - 4}
                    width={12}
                    height={8}
                    fill={colors.outline}
                    fillOpacity={styles.parking.fillOpacity}
                    stroke={styles.parking.strokeColor}
                    strokeWidth={styles.parking.strokeWidth}
                    rx={1}
                  />
                  
                  {/* Car symbol */}
                  <g transform={`translate(${parkX}, ${parkY})`}>
                    {/* Car body */}
                    <rect x={-3} y={-1.5} width={6} height={3} fill="#666" rx={0.5} />
                    {/* Car wheels */}
                    <circle cx={-2} cy={-2} r={0.5} fill="#333" />
                    <circle cx={2} cy={-2} r={0.5} fill="#333" />
                    <circle cx={-2} cy={2} r={0.5} fill="#333" />
                    <circle cx={2} cy={2} r={0.5} fill="#333" />
                  </g>
                  
                  {/* Parking capacity label */}
                  <text
                    x={parkX}
                    y={parkY + 6}
                    textAnchor="middle"
                    fontSize={2}
                    fill={styles.parking.strokeColor}
                    fontWeight="bold"
                  >
                    P{idx + 1}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Legend */}
        <g transform="translate(4,57)">
          <rect x={0} y={0} width={36} height={3.5} rx={1.5} fill="url(#legendGradient)" />
          <text x={0} y={-1.5} fontSize={2.2} fill="#e2e8f0" fontWeight="bold">Low</text>
          <text x={36} y={-1.5} fontSize={2.2} fill="#e2e8f0" fontWeight="bold" textAnchor="end">High</text>
        </g>

        <defs>
          <linearGradient id="legendGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={colors.low} />
            <stop offset="50%"  stopColor={colors.medium} />
            <stop offset="100%" stopColor={colors.high} />
          </linearGradient>
        </defs>
      </svg>

      {/* CENTER READOUT */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] text-center pointer-events-none"
        aria-live="polite"
      >
        {centerZone ? (
          <div className="px-5 py-4 rounded-xl shadow-xl border border-gray-200">
            <div className="text-xl text-gray-900 mb-1 tracking-wide">
              {centerZone.name || `L${centerZone.layer} · S${centerZone.section}`}
            </div>
            <div className="text-sm text-gray-600">
              Congestion:{" "}
              <span 
                className="font-semibold" 
                style={{ 
                  color: bandedColor(centerZone.congestion, { 
                    low: config.colors.low, 
                    medium: config.colors.medium, 
                    high: config.colors.high 
                  }) 
                }}
              >
                {Math.round(centerZone.congestion)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2 bg-white/80 rounded-lg shadow border border-gray-200 text-gray-700">
            Hover a section
          </div>
        )}
      </div>
    </div>
  );
};

const OngoingEvent: React.FC = () => {
  const { currentEvent, simulationResult, isLoading } = useEventStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId: paramId } = useParams();
  const [searchParams] = useSearchParams();

  // Venue configuration state
  const [venueConfig, setVenueConfig] = useState<VenueConfiguration>(DEFAULT_STADIUM_CONFIG);
  const [showConfigEditor, setShowConfigEditor] = useState(false);

  // Resolve eventId (fallback to demo)
  const eventId =
    paramId ?? searchParams.get("eventId") ?? location.state?.eventId ?? currentEvent?.id ?? DEMO_EVENT_ID;
  const activeEvent: any = currentEvent ?? DEMO_EVENT;

  // Build zones either from API or generated sectors based on venue config
  const zones: FloorZonePolygon[] = useMemo(() => {
    const apiZones = (simulationResult as any)?.zones as FloorZonePolygon[] | undefined;
    if (apiZones?.length) return apiZones;

    const { geometry, rings, sections } = venueConfig;
    const { centerX: cx, centerY: cy, shape } = geometry;
    const { baseInnerRadius: baseInner, ringThickness, ringGap, layers } = rings;
    const { sections: sectionCount, sectionGap } = sections;
    const isCircular = shape === 'circular';

    const list: FloorZonePolygon[] = [];
    
    if (isCircular) {
      // Circular venue zones
      const stepAngle = 360 / sectionCount;
      for (let layer = 1; layer <= layers; layer++) {
        const li = layer - 1;
        const rIn = baseInner + li * (ringThickness + ringGap);
        const rOut = rIn + ringThickness;
        for (let s = 1; s <= sectionCount; s++) {
          const start = -90 + (s - 1) * stepAngle + sectionGap;
          const end = -90 + s * stepAngle - sectionGap;
          const pts = ringSectorPoints(cx, cy, rIn, rOut, start, end, 14);
          const congestion = ((layer * 17 + s * 29) % 101); // deterministic demo
          const name = `Layer ${layer} · Section ${s}`;
          list.push({ id: `L${layer}-S${s}`, name, layer, section: s, points: pts, congestion });
        }
      }
    } else {
      // Rectangular venue zones
      const rectWidth = geometry.viewBoxWidth * 0.7;
      const rectHeight = geometry.viewBoxHeight * 0.6;
      const layerThickness = rectHeight / layers;
      
      for (let layer = 1; layer <= layers; layer++) {
        for (let s = 0; s < sectionCount; s++) {
          const pts = rectangleSectorPoints(cx, cy, rectWidth, rectHeight, s, sectionCount, layer, layerThickness);
          const congestion = ((layer * 23 + s * 31) % 101); // deterministic demo
          const name = `Layer ${layer} · Section ${s + 1}`;
          list.push({ id: `L${layer}-S${s + 1}`, name, layer, section: s + 1, points: pts, congestion });
        }
      }
    }
    
    return list;
  }, [simulationResult, venueConfig]);

  const avgCongestion = useMemo(
    () => (zones.length ? Math.round(zones.reduce((sum, z) => sum + z.congestion, 0) / zones.length) : 0),
    [zones]
  );
  const maxZone = useMemo(
    () => (zones.length ? zones.reduce((p, z) => (z.congestion > p.congestion ? z : p), zones[0]) : null),
    [zones]
  );

  const eventDate = activeEvent?.date ? new Date(activeEvent.date) : null;

  if (isLoading && !simulationResult) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Spinner size="lg" className="mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading live event…</h2>
          <p className="text-gray-600">Preparing live congestion view.</p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No event selected</h2>
          <p className="text-gray-600 mb-6">Open an event first, or pass an eventId via URL/query/state.</p>
          <div className="space-x-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            <Button onClick={() => navigate("/new-event")}>Create New Event</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{activeEvent?.name || "On-going Event"}</h1>
          <p className="mt-2 text-gray-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" /> Live congestion monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigEditor(!showConfigEditor)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {showConfigEditor ? 'Hide Config' : 'Customize Venue'}
          </Button>
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Event in progress</span>
          </div>
        </div>
      </div>

      {/* Venue Configuration Editor */}
      {showConfigEditor && (
        <VenueConfigEditor
          config={venueConfig}
          onChange={setVenueConfig}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{activeEvent?.capacity?.toLocaleString?.() || "—"}</div>
            <div className="text-sm text-gray-600">Capacity</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-cyan-50 to-cyan-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: venueConfig.colors.medium }}>{avgCongestion}%</div>
            <div className="text-sm text-gray-600">Avg Congestion</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-rose-50 to-rose-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: venueConfig.colors.high }}>{maxZone ? maxZone.congestion : 0}%</div>
            <div className="text-sm text-gray-600">{maxZone ? `Peak Zone (L${maxZone.layer}·S${maxZone.section})` : "Peak Zone"}</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(eventDate ?? new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-sm text-gray-600">Local Time</div>
          </div>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Floor plan */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-gradient-to-b from-white to-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Venue Floor Plan</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  {venueConfig.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-4 w-4" /> {venueConfig.exits.exits} exits
                </span>
                <span>{venueConfig.rings.layers} layers</span>
                <span>{venueConfig.sections.sections} sections</span>
                {venueConfig.parking.enabled && (
                  <span className="flex items-center gap-1 text-blue-600">
                    🅿️ {venueConfig.parking.areas} parking
                  </span>
                )}
              </div>
            </div>
            <DynamicVenueSVG config={venueConfig} zones={zones} />
          </Card>

          {/* Watchlist */}
          <Card className="bg-gradient-to-b from-white to-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Congestion Watchlist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {zones.slice().sort((a, b) => b.congestion - a.congestion).map((z) => (
                <div key={z.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="font-medium text-gray-900">L{z.layer} · S{z.section}</p>
                    <p className="text-xs text-gray-600">Zone area</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-12 rounded-full" 
                      style={{ 
                        background: bandedColor(z.congestion, { 
                          low: venueConfig.colors.low, 
                          medium: venueConfig.colors.medium, 
                          high: venueConfig.colors.high 
                        }) 
                      }} 
                    />
                    <span 
                      className="text-sm font-semibold" 
                      style={{ 
                        color: bandedColor(z.congestion, { 
                          low: venueConfig.colors.low, 
                          medium: venueConfig.colors.medium, 
                          high: venueConfig.colors.high 
                        }) 
                      }}
                    >
                      {Math.round(z.congestion)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-white to-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Info</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between"><span className="text-gray-600">Event:</span> <span className="font-medium">{activeEvent?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Venue:</span> <span className="font-medium">{activeEvent?.venue || activeEvent?.venueLocation?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Date:</span> <span className="font-medium">{activeEvent?.date ? new Date(activeEvent.date).toLocaleString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Capacity:</span> <span className="font-medium">{activeEvent?.capacity?.toLocaleString?.() || "—"}</span></div>
            </div>
          </Card>

          <Card className="bg-gradient-to-b from-white to-red-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h3>
            {zones.some((z) => z.congestion >= 80) ? (
              <div className="space-y-3">
                {zones.filter((z) => z.congestion >= 80).map((z) => (
                  <div key={z.id} className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-700">High congestion in L{z.layer} · S{z.section}</p>
                      <p className="text-xs text-red-700/80">Consider redirecting flow or opening adjacent gates.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" /> No high-congestion alerts</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OngoingEvent;
