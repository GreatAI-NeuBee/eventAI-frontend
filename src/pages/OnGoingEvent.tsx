import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, Map, DoorOpen } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import { useEventStore } from "../store/eventStore";

// ==== Types ====
export type FloorZonePolygon = {
  id: string;
  name: string;
  layer: number;   // 1..N
  section: number; // 1..S
  points: Array<[number, number]>; // [%x, %y] in a 100 × 62.5 viewBox
  congestion: number; // 0..100
};

// ==== Colors (your palette) ====
const COLORS = {
  red: "#DA5C53",
  blue: "#4AA3BA",
  green: "#A8E4B1",
};

// green (low) → blue (medium) → red (high)
function bandedColor(p: number) {
  const v = Math.max(0, Math.min(100, p));
  if (v >= 67) return COLORS.red;
  if (v >= 34) return COLORS.blue;
  return COLORS.green;
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

// ====== SVG Stadium (no image) with CENTER readout ======
const StadiumPlanSVG: React.FC<{
  sections: number;
  layers: number;
  exits: number;
  zones: FloorZonePolygon[];
}> = ({ sections, layers, exits, zones }) => {
  // Geometry
  const vbW = 100;
  const vbH = 62.5;
  const cx = 50;
  const cy = 31.25;
  const baseInner = 14;
  const ringThickness = 6.5;
  const ringGap = 2.2;
  const outerMost = baseInner + layers * ringThickness + (layers - 1) * ringGap;

  // Exits
  const exitAngles = Array.from({ length: exits }, (_, i) => (i * 360) / exits);

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
        {/* Field/void */}
        <circle cx={cx} cy={cy} r={baseInner - 1.5} fill="#0f172a" />

        {/* Base rings outlines */}
        {Array.from({ length: layers }, (_, li) => {
          const rIn = baseInner + li * (ringThickness + ringGap);
          const rOut = rIn + ringThickness;
          return (
            <g key={`ring-${li}`}>
              <circle cx={cx} cy={cy} r={rIn} fill="none" stroke="#334155" strokeWidth={0.8} strokeDasharray="1,1" />
              <circle cx={cx} cy={cy} r={rOut} fill="none" stroke="#334155" strokeWidth={0.8} />
            </g>
          );
        })}

        {/* Section dividers */}
        {Array.from({ length: sections }, (_, i) => {
          const angle = (i * 360) / sections;
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
              stroke="#334155"
              strokeWidth={0.6}
              strokeDasharray="2,1"
            />
          );
        })}

        {/* Section wedges (solid colors, no labels) */}
        {zones.map((z) => {
          const fill = bandedColor(z.congestion);
          const fillOpacity = 0.45 + (z.congestion / 100) * 0.25; // 0.45..0.70
          const pts = z.points.map(([x, y]) => `${x},${y}`).join(" ");
          return (
            <polygon
              key={z.id}
              points={pts}
              fill={fill}
              opacity={fillOpacity}
              stroke="#0b1220"
              strokeOpacity={0.4}
              strokeWidth={0.25}
              onMouseEnter={() => setCenterZone(z)}
              onMouseMove={() => setCenterZone(z)}
              onMouseLeave={clearCenter}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Exit gates */}
        {exitAngles.map((ang, idx) => {
          const gatePts = gateRectPoints(cx, cy, outerMost + 1.5, ang, 5, 2.4)
            .map(([x, y]) => `${x},${y}`)
            .join(" ");
          return <polygon key={`exit-${idx}`} points={gatePts} fill="#f8fafc" stroke="#1e293b" strokeWidth={0.35} />;
        })}

        {/* Legend */}
        <g transform="translate(4,57)">
          <rect x={0} y={0} width={36} height={3.5} rx={1.5} fill="url(#legendGradient)" />
          <text x={0} y={-1.5} fontSize={2.2} fill="#e2e8f0" fontWeight="bold">Low</text>
          <text x={36} y={-1.5} fontSize={2.2} fill="#e2e8f0" fontWeight="bold" textAnchor="end">High</text>
        </g>

        <defs>
          <linearGradient id="legendGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={COLORS.green} />
            <stop offset="50%"  stopColor={COLORS.blue} />
            <stop offset="100%" stopColor={COLORS.red} />
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
              <span className="font-semibold" style={{ color: bandedColor(centerZone.congestion) }}>
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

  // Resolve eventId (fallback to demo)
  const eventId =
    paramId ?? searchParams.get("eventId") ?? location.state?.eventId ?? currentEvent?.id ?? DEMO_EVENT_ID;
  const activeEvent: any = currentEvent ?? DEMO_EVENT;

  // Params (fixed for now)
  const SECTIONS = 5;
  const LAYERS = 2;
  const EXITS = 4;

  // Build zones either from API or generated sectors
  const zones: FloorZonePolygon[] = useMemo(() => {
    const apiZones = (simulationResult as any)?.zones as FloorZonePolygon[] | undefined;
    if (apiZones?.length) return apiZones;

    const cx = 50, cy = 31.25;
    const baseInner = 14;
    const ringThickness = 6.5;
    const ringGap = 2.2;
    const stepAngle = 360 / SECTIONS;

    const list: FloorZonePolygon[] = [];
    for (let layer = 1; layer <= LAYERS; layer++) {
      const li = layer - 1;
      const rIn = baseInner + li * (ringThickness + ringGap);
      const rOut = rIn + ringThickness;
      for (let s = 1; s <= SECTIONS; s++) {
        const start = -90 + (s - 1) * stepAngle + 2; // small gap
        const end = -90 + s * stepAngle - 2;
        const pts = ringSectorPoints(cx, cy, rIn, rOut, start, end, 14);
        const congestion = ((layer * 17 + s * 29) % 101); // deterministic demo
        // You can set a numeric name like "132" here if you want the big number in center:
        // const name = String(100 + (layer - 1) * 10 + s); // e.g., 131, 132, ...
        const name = `Layer ${layer} · Section ${s}`;
        list.push({ id: `L${layer}-S${s}`, name, layer, section: s, points: pts, congestion });
      }
    }
    return list;
  }, [simulationResult]);

  const avgCongestion = useMemo(
    () => (zones.length ? Math.round(zones.reduce((sum, z) => sum + z.congestion, 0) / zones.length) : 0),
    [zones]
  );
  const maxZone = useMemo(
    () => (zones.length ? zones.reduce((p, z) => (z.congestion > p.congestion ? z : p), zones[0]) : null),
    [zones]
  );

  const eventDate = activeEvent?.dateStart ? new Date(activeEvent.dateStart) : null;

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
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Event in progress</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{zones.length || "—"}</div>
            <div className="text-sm text-gray-600">Active Zones</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-cyan-50 to-cyan-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.blue }}>{avgCongestion}%</div>
            <div className="text-sm text-gray-600">Avg Congestion</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-rose-50 to-rose-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.red }}>{maxZone ? maxZone.congestion : 0}%</div>
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
                <h2 className="text-xl font-semibold text-gray-900">Venue Floor Plan (SVG)</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1"><DoorOpen className="h-4 w-4" /> {EXITS} exits</span>
                <span>{LAYERS} layers</span>
                <span>{SECTIONS} sections</span>
              </div>
            </div>
            <StadiumPlanSVG sections={SECTIONS} layers={LAYERS} exits={EXITS} zones={zones} />
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
                    <div className="h-3 w-12 rounded-full" style={{ background: bandedColor(z.congestion) }} />
                    <span className="text-sm font-semibold" style={{ color: bandedColor(z.congestion) }}>
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
              <div className="flex justify-between"><span className="text-gray-600">Start:</span> <span className="font-medium">{activeEvent?.dateStart ? new Date(activeEvent.dateStart).toLocaleString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">End:</span> <span className="font-medium">{activeEvent?.dateEnd ? new Date(activeEvent.dateEnd).toLocaleString() : "—"}</span></div>
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
