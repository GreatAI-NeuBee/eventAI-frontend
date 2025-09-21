// EventDetails.tsx — render <VenueLayoutCard />
import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/common/Card";
import { useEventStore } from "../store/eventStore";
import { DUMMY_FORECAST } from "../data/DUMMY_FORECAST";

/* ========= Types ========= */
type PctPoint = [number, number];
type StadiumMapJSON = {
  sections: number;
  layers: number;
  exits?: number;
  zones: { id: string; name: string; layer: number; points: PctPoint[] }[];
  exitsList?: { id: string; name: string; position: PctPoint; capacity?: number }[];
  toiletsList?: { id: string; position: PctPoint; label?: string; fixtures?: number }[];
};
type FloorZonePolygon = {
  id: string;
  name: string;
  layer: number;
  section: number;
  points: Array<[number, number]>;
  congestion: number; // 0..100
};
type GatePoint = { ds: string; yhat: number; yhat_lower?: number; yhat_upper?: number };
type GateSeries = Record<string, GatePoint[]>; // gateId -> points
type InOutForecast = { arrivals: GateSeries; exits: GateSeries };

type Phase = "arrivals" | "exits";

type Particle = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  bornAt: number;
  ttl: number;
  phase: Phase;
};

export interface EventData {
  id: string;
  name: string;
  venue?: string;
  venueLayout?: unknown;     // object or JSON string
  forecastResult?: unknown;  // object or JSON string
}

/* ========= Colors / helpers ========= */
const COLORS = { red: "#DA5C53", blue: "#4AA3BA", green: "#A8E4B1" };
const bandedColor = (p: number) => (p >= 67 ? COLORS.red : p >= 34 ? COLORS.blue : COLORS.green);

const stableMul = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 0.75 + (h % 401) / 1000; // 0.75..1.151
};

/* ========= Series helpers ========= */
const toKey = (d: string | Date) => {
  const ds = typeof d === "string" ? d : d.toISOString().slice(0, 19).replace("T", " ");
  // round to minute (incoming data already at :00 or :05 etc)
  return ds.slice(0, 16) + ":00";
};

function gateLoadsAt(series: GateSeries, dsKey: string): Record<string, number> {
  const perGate: Record<string, number> = {};
  Object.entries(series).forEach(([gateId, points]) => {
    const p = points.find((pt) => toKey(pt.ds) === dsKey);
    perGate[gateId] = p ? p.yhat : 0;
  });
  return perGate;
}

function indexSeriesByTime(series: GateSeries) {
  const m = new Map<string, number>();
  Object.values(series).forEach((points) => {
    points.forEach((p) => {
      const key = toKey(p.ds);
      m.set(key, (m.get(key) ?? 0) + (p.yhat ?? 0));
    });
  });
  return m;
}

function mergeArrivalsThenExits(fc: InOutForecast) {
  const arr = indexSeriesByTime(fc.arrivals);
  const ex = indexSeriesByTime(fc.exits);
  const parse = (s: string) => new Date(s.replace(" ", "T") + "Z");
  const arrivals = Array.from(arr.entries()).map(([ds, y]) => ({ time: parse(ds), dsKey: ds, load: y, kind: "arrivals" as const }));
  const exits = Array.from(ex.entries()).map(([ds, y]) => ({ time: parse(ds), dsKey: ds, load: y, kind: "exits" as const }));
  const both = [...arrivals, ...exits].sort((a, b) => a.time.getTime() - b.time.getTime());
  const maxLoad = both.reduce((m, r) => Math.max(m, r.load), 1);
  return both.map((r) => ({ ...r, norm: Math.min(1, r.load / maxLoad) }));
}

function buildFramesFromForecast(plan: StadiumMapJSON, fc: InOutForecast) {
  const merged = mergeArrivalsThenExits(fc);
  return merged.map((r) => {
    const byId: Record<string, number> = {};
    plan.zones.forEach((z) => {
      const v = r.norm * stableMul(z.id);
      byId[z.id] = Math.round(100 * Math.max(0, Math.min(1, v)));
    });
    return { time: r.time, dsKey: r.dsKey, phase: r.kind as Phase, byId };
  });
}

function zonesForFrame(plan: StadiumMapJSON, byId: Record<string, number>): FloorZonePolygon[] {
  const perLayer: Record<number, number> = {};
  return plan.zones.map((z) => {
    const next = (perLayer[z.layer] ?? 0) + 1;
    perLayer[z.layer] = next;
    return {
      id: z.id,
      name: z.name,
      layer: z.layer,
      section: next,
      points: z.points,
      congestion: byId[z.id] ?? 0,
    };
  });
}


/* ========= Dummy forecast (kept from your message) ========= */
/* ========= Your DUMMY PLAN =========
   Paste the full "zones" array you used before.
====================================================================== */

const DUMMY_PLAN: StadiumMapJSON = {
  exits: 4,
  zones: [
    // ⬇️ PASTE your real zones here (L1-S1.. etc). The demo still works with an empty array.
  ],
  layers: 3,
  sections: 12,
  exitsList: [
    { id: "exit-1758421259521", name: "Exit 1", capacity: 1000, position: [50, 2.2] },
    { id: "exit-1758421260513", name: "Exit 2", capacity: 1000, position: [79.05, 31.25] },
    { id: "exit-1758421261685", name: "Exit 3", capacity: 800, position: [50, 60.3] },
    { id: "exit-1758421262697", name: "Exit 4", capacity: 800, position: [20.95, 31.25] },
  ],
  toiletsList: [
    { id: "wc-1758421268271", label: "WC 1", fixtures: 0, position: [60.013, 15.641] },
    { id: "wc-1758421268891", label: "WC 2", fixtures: 0, position: [37.369, 16.688] },
    { id: "wc-1758421269500", label: "WC 3", fixtures: 0, position: [40.118, 37.107] },
  ],
};

/* ========= Geometry helpers ========= */
function polygonCentroid(pts: PctPoint[]): PctPoint {
  // simple centroid (not area-weighted)
  const n = pts.length || 1;
  const x = pts.reduce((s, p) => s + p[0], 0) / n;
  const y = pts.reduce((s, p) => s + p[1], 0) / n;
  return [x, y];
}
function nearestExit(exits: StadiumMapJSON["exitsList"] = [], p: PctPoint): PctPoint {
  if (!exits.length) return p;
  let best = exits[0].position, bd = Infinity;
  exits.forEach((e) => {
    const d = (p[0]-e.position[0])**2 + (p[1]-e.position[1])**2;
    if (d < bd) { bd = d; best = e.position; }
  });
  return best;
}
function randomInPolygon(pts: PctPoint[]): PctPoint {
  // quick fallback using centroid jitter if polygon missing
  if (pts.length < 3) {
    const c = polygonCentroid(pts);
    return [c[0] + (Math.random()-0.5)*2, c[1] + (Math.random()-0.5)*2];
  }
  // bounding box rejection (good enough for convex-ish sectors)
  const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  for (let tries = 0; tries < 20; tries++) {
    const x = minX + Math.random()*(maxX-minX);
    const y = minY + Math.random()*(maxY-minY);
    if (pointInPolygon([x,y], pts)) return [x,y];
  }
  return polygonCentroid(pts);
}
function pointInPolygon(p: PctPoint, pts: PctPoint[]): boolean {
  let inside = false;
  for (let i=0,j=pts.length-1;i<pts.length;j=i++) {
    const xi=pts[i][0], yi=pts[i][1], xj=pts[j][0], yj=pts[j][1];
    const intersect = ((yi>p[1]) !== (yj>p[1])) && (p[0] < (xj-xi)*(p[1]-yi)/(yj-yi+1e-9)+xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/* ========= Particles engine ========= */
const DOTS_PER_PEOPLE = 10;         // 1 dot ≈ 10 people (keep)
const MIN_DOTS_PER_GATE = 30;       // ✅ lower bound per gate
const MAX_DOTS_PER_GATE = 40;       // ✅ upper bound per gate
const SPEED = 7.5 / 1000;
const TTL_MS = 7000;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

let PARTICLE_ID = 1;

function spawnArrivalsDots(
  plan: StadiumMapJSON,
  zones: FloorZonePolygon[],
  gateLoads: Record<string, number>
): Particle[] {
  const targets = zones.length ? zones.map(z => polygonCentroid(z.points)) : [[50,31.25]];
  const pickTarget = () => targets[Math.floor(Math.random()*targets.length)];
  const now = performance.now();
  const out: Particle[] = [];
  const exits = plan.exitsList ?? [];

  // build a lookup for gate positions (works with "Exit 1/2/3/4" or IDs)
  const gatesById: Record<string, PctPoint> = {};
  exits.forEach(e => {
    const key = e.name?.match(/\b(\w+)\b$/)?.[1] ?? e.id; // trailing token or id
    gatesById[key] = e.position;
    gatesById[e.id] = e.position;
  });

  Object.entries(gateLoads).forEach(([gateId, ppl]) => {
    // ⬇️ clamp dots per gate to [30, 40]
    const raw = Math.round((ppl || 0) / DOTS_PER_PEOPLE);
    const dots = clamp(raw, MIN_DOTS_PER_GATE, MAX_DOTS_PER_GATE);

    const start = gatesById[gateId] ?? exits[0]?.position ?? [50, 2.2];
    for (let i = 0; i < dots; i++) {
      const [tx, ty] = pickTarget();
      const jitter = () => (Math.random() - 0.5) * 0.8;
      const x = start[0] + jitter(), y = start[1] + jitter();
      const dx = tx - x, dy = ty - y;
      const mag = Math.hypot(dx, dy) || 1;
      const vx = (dx / mag) * SPEED, vy = (dy / mag) * SPEED;
      out.push({ id: PARTICLE_ID++, x, y, tx, ty, vx, vy, bornAt: now, ttl: TTL_MS, phase: "arrivals" });
    }
  });

  return out;
}

function spawnExitDots(
  plan: StadiumMapJSON,
  zones: FloorZonePolygon[],
  totalPpl: number
): Particle[] {
  const now = performance.now();
  const exits = plan.exitsList ?? [];
  const exitCount = Math.max(1, exits.length);

  // ⬇️ total dots ≈ ppl/10, then clamp to exitCount * [30..40]
  const rawTotal = Math.round((totalPpl || 0) / DOTS_PER_PEOPLE);
  const totalDots = clamp(rawTotal, exitCount * MIN_DOTS_PER_GATE, exitCount * MAX_DOTS_PER_GATE);

  // distribute across zones weighted by congestion
  const out: Particle[] = [];
  const totalWeight = zones.reduce((s, z) => s + (z.congestion || 1), 0) || 1;

  for (const z of zones) {
    const share = Math.round(totalDots * (z.congestion || 1) / totalWeight);
    for (let i = 0; i < share; i++) {
      const [x, y] = randomInPolygon(z.points);
      const [tx, ty] = nearestExit(exits, [x, y]);
      const dx = tx - x, dy = ty - y;
      const mag = Math.hypot(dx, dy) || 1;
      const vx = (dx / mag) * SPEED, vy = (dy / mag) * SPEED;
      out.push({ id: PARTICLE_ID++, x, y, tx, ty, vx, vy, bornAt: now, ttl: TTL_MS, phase: "exits" });
    }
  }
  return out;
}


/* ========= Inline StadiumPlanSVG ========= */
const StadiumPlanSVG: React.FC<{
  plan: StadiumMapJSON;
  zones: FloorZonePolygon[];
  phase: Phase;
  dsKey: string;
  gateLoads: Record<string, number>;
  particles: Particle[];
}> = ({ plan, zones, phase, dsKey, gateLoads, particles }) => {
  const vbW = 100, vbH = 62.5;
  const cx = 50, cy = 31.25;
  const MARGIN = 3;
  const R = Math.min(vbW / 2 - MARGIN, vbH / 2 - MARGIN);
  const isExitPhase = phase === "exits";

  const RINGS = Math.max(1, plan.layers || 1);
  const GAP = 1.6;
  const voidRatio = 0.35;
  const rVoid = Math.max(4, R * voidRatio);
  const usable = R - rVoid - Math.max(0, RINGS - 1) * GAP;
  const ringThick = Math.max(1, usable / RINGS);

  const sectionAngles = Array.from({ length: Math.max(1, plan.sections) }, (_, i) => (i * 360) / Math.max(1, plan.sections));

  const [centerZone, setCenterZone] = useState<FloorZonePolygon | null>(null);

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-gray-300 bg-white">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <defs>
          <clipPath id="stadiumClip"><circle cx={cx} cy={cy} r={R} /></clipPath>
          <pattern id="exitHatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="4" fill="rgba(244,63,94,0.12)" />
          </pattern>
        </defs>

        <circle cx={cx} cy={cy} r={R} fill="#ffffff" stroke="#e5e7eb" strokeWidth={0.8} />

        <g clipPath="url(#stadiumClip)">
          {/* rings */}
          {Array.from({ length: RINGS }, (_, li) => {
            const rIn = rVoid + li * (ringThick + GAP);
            const rOut = rIn + ringThick;
            return (
              <g key={`ring-${li}`}>
                <circle cx={cx} cy={cy} r={rIn} fill="none" stroke="#cbd5e1" strokeOpacity={0.35} strokeWidth={0.5} strokeDasharray="1,1" />
                <circle cx={cx} cy={cy} r={rOut} fill="none" stroke="#cbd5e1" strokeOpacity={0.6} strokeWidth={0.5} />
              </g>
            );
          })}

          {/* section dividers + labels */}
          {sectionAngles.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = cx + (rVoid - 0.5) * Math.cos(rad);
            const y1 = cy + (rVoid - 0.5) * Math.sin(rad);
            const x2 = cx + (R - 0.5) * Math.cos(rad);
            const y2 = cy + (R - 0.5) * Math.sin(rad);
            const lx = cx + (R + 1.2) * Math.cos(rad + Math.PI / plan.sections);
            const ly = cy + (R + 1.2) * Math.sin(rad + Math.PI / plan.sections);
            return (
              <g key={`sec-${i}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeOpacity={0.5} strokeWidth={0.4} strokeDasharray="2,1" />
                {/* number every other section to avoid clutter */}
                {i % 2 === 0 ? (
                  <text x={lx} y={ly} fontSize={2.2} textAnchor="middle" dominantBaseline="middle" fill="#64748b">
                    {i + 1}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* zones */}
          {zones.map((z) => {
            const pts = z.points.map(([x, y]) => `${x},${y}`).join(" ");
            const fillBase = bandedColor(z.congestion);
            const fillOpacity = 0.45 + (z.congestion / 100) * 0.25;
            const strokeProps = isExitPhase
              ? { stroke: "#7f1d1d", strokeOpacity: 0.35, strokeWidth: 0.35, strokeDasharray: "1.2 1" }
              : { stroke: "#0b1220", strokeOpacity: 0.25, strokeWidth: 0.25 };

            return (
              <g key={z.id}>
                <polygon
                  points={pts}
                  fill={fillBase}
                  opacity={fillOpacity}
                  {...strokeProps}
                  onMouseEnter={() => setCenterZone(z)}
                  onMouseMove={() => setCenterZone(z)}
                  onMouseLeave={() => setCenterZone(null)}
                  style={{ cursor: "pointer" }}
                />
                {isExitPhase ? <polygon points={pts} fill="url(#exitHatch)" opacity={0.9} pointerEvents="none" /> : null}
              </g>
            );
          })}

          {/* toilets */}
          {(plan.toiletsList ?? []).map((t) => (
            <g key={t.id}>
              <text x={t.position[0]} y={t.position[1]} fontSize={3} textAnchor="middle" dominantBaseline="central">🚻</text>
              {t.label ? (
                <text x={t.position[0] + 2.2} y={t.position[1]} fontSize={1.8} fill="#0f172a" dominantBaseline="middle">
                  {t.label}
                </text>
              ) : null}
            </g>
          ))}

          {/* particles */}
          <g>
            {particles.map((p) => (
              <circle key={p.id} cx={p.x} cy={p.y} r={0.5} fill={p.phase === "exits" ? "#ef4444" : "#2563eb"} opacity={0.9} />
            ))}
          </g>
        </g>

        {/* exits pins + current loads */}
        {(plan.exitsList ?? []).map((e) => {
          // find a reasonable key: match trailing number in exit name "Exit 1" => "1"
          const maybeKey = (e.name?.match(/\b(\w+)\b$/)?.[1] ?? e.id);
          const ppl = Math.round(gateLoads[maybeKey] || 0);
          const dotFill = isExitPhase ? "#ef4444" : "#10b981";
          return (
            <g key={e.id}>
              <circle cx={e.position[0]} cy={e.position[1]} r={0.95} fill={dotFill} stroke="#0b1220" strokeOpacity={0.25} strokeWidth={0.2} />
              {isExitPhase ? <circle cx={e.position[0]} cy={e.position[1]} r={0.95} className="animate-ping" fill="#ef4444" opacity={0.35} /> : null}

              {/* people count badge */}
              <g transform={`translate(${e.position[0] + 1.8}, ${e.position[1] - 1.8})`}>
                <rect rx={0.8} ry={0.8} width={12} height={4} fill="#111827" opacity={0.85} />
                <text x={6} y={2.6} textAnchor="middle" fontSize={1.8} fill="#f9fafb">
                  {ppl.toLocaleString()}
                </text>
              </g>
            </g>
          );
        })}

        {/* timestamp */}
        <text x={vbW - 1.5} y={vbH - 1.5} textAnchor="end" fontSize={2.2} fill="#334155">
          {dsKey.slice(11, 16)}
        </text>
      </svg>

      {/* hover tooltip */}
      {centerZone ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-sm shadow">
          <div className="font-semibold">{centerZone.name}</div>
          <div>
            Congestion:{" "}
            <span style={{ color: bandedColor(centerZone.congestion) }}>{Math.round(centerZone.congestion)}%</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* ========= Card ========= */
export const VenueLayoutCard: React.FC<{ event: EventData | null }> = ({ event }) => {
  // parse venueLayout
  const plan: StadiumMapJSON = useMemo(() => {
    if (!event?.venueLayout) return DUMMY_PLAN;
    if (typeof event.venueLayout === "string") {
      try { return JSON.parse(event.venueLayout) as StadiumMapJSON; } catch { return DUMMY_PLAN; }
    }
    return event.venueLayout as StadiumMapJSON;
  }, [event]);

  // parse forecast (optional)
  const forecast: InOutForecast = useMemo(() => {
    const raw = (event as any)?.forecastResult;
    if (!raw) return DUMMY_FORECAST;
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as InOutForecast; } catch { return DUMMY_FORECAST; }
    }
    return raw as InOutForecast;
  }, [event]);

  // frames
  const frames = useMemo(() => buildFramesFromForecast(plan, DUMMY_FORECAST), [plan]);
  const [idx, setIdx] = useState(0);
  const max = Math.max(0, frames.length - 1);
  useEffect(() => setIdx((i) => Math.min(i, max)), [max]);

  const frame = frames[idx] ?? { time: new Date(), dsKey: toKey(new Date()), phase: "arrivals" as Phase, byId: {} };
  const zones = useMemo(() => zonesForFrame(plan, frame.byId), [plan, frame.byId]);
  const prettyTime = useMemo(
    () => (frame.time ? new Date(frame.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"),
    [frame.time]
  );

  /* ========== gate loads for badges and particle spawns ========== */
  const gateLoads = useMemo(() => {
    const series = frame.phase === "arrivals" ? DUMMY_FORECAST.arrivals : DUMMY_FORECAST.exits;
    return gateLoadsAt(series, frame.dsKey);
  }, [frame.phase, frame.dsKey]);

  /* ========== playback controls + slider fix ========== */
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const STEP_MS = 900; // 0.9s per 5-minute step
  const wasPlayingRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);

  const nextStep = () => setIdx((i) => Math.min(max, i + 1));
  const prevStep = () => setIdx((i) => Math.max(0, i - 1));
  const play = () => setPlaying(true);
  const pause = () => setPlaying(false);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = 0;
      return;
    }
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      if (dt >= STEP_MS) {
        lastTsRef.current = ts;
        setIdx((i) => (i >= max ? max : i + 1));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, max]);

  const onScrubStart = () => {
    wasPlayingRef.current = playing;
    if (playing) setPlaying(false);
    setScrubbing(true);
  };
  const onScrub = (v: number) => setIdx(v);
  const onScrubEnd = () => {
    setScrubbing(false);
    if (wasPlayingRef.current) setPlaying(true);
  };

  /* ========== particles lifecycle (independent RAF for smooth motion) ========== */
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastSpawnedIndexRef = useRef<number>(-1);

  // spawn when advancing one step (but not while scrubbing to avoid floods)
  useEffect(() => {
    if (scrubbing) {
      setParticles([]); // reset when user jumps around
      lastSpawnedIndexRef.current = idx;
      return;
    }
    if (idx === lastSpawnedIndexRef.current) return;
    const newly: Particle[] =
      frame.phase === "arrivals"
        ? spawnArrivalsDots(plan, zones, gateLoads)
        : spawnExitDots(plan, zones, Object.values(gateLoads).reduce((s, v) => s + (v || 0), 0));
    lastSpawnedIndexRef.current = idx;
    setParticles((prev) => [...prev, ...newly].slice(-2000)); // cap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, frame.phase, frame.dsKey, zones]); // (gateLoads implied by dsKey + phase)

  // motion RAF
  useEffect(() => {
    let mounted = true;
    let raf: number;
    const tick = () => {
      setParticles((prev) => {
        const now = performance.now();
        const next: Particle[] = [];
        for (const p of prev) {
          const nx = p.x + p.vx * 16; // approx 60fps
          const ny = p.y + p.vy * 16;
          const done = (nx - p.tx) ** 2 + (ny - p.ty) ** 2 < 0.5 ** 2;
          const expired = now - p.bornAt > p.ttl;
          if (!done && !expired) next.push({ ...p, x: nx, y: ny });
        }
        return next;
      });
      if (mounted) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Card className="bg-gradient-to-b from-white to-gray-50">
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Venue Layout</h3>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{plan.layers} layers</span>
          <span>{plan.sections} sections</span>
          <span>{plan.exitsList?.length ?? plan.exits ?? 0} exits</span>
          <span>{plan.toiletsList?.length ?? 0} toilets</span>
        </div>
      </div>

      <div className="px-4 pb-2">
        <StadiumPlanSVG
          plan={plan}
          zones={zones}
          phase={frame.phase}
          dsKey={frame.dsKey}
          gateLoads={gateLoads}
          particles={particles}
        />
      </div>

      {/* Controls + Timeline */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span className="flex items-center gap-2">
            Forecast (5-min)
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                frame.phase === "exits"
                  ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                  : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {frame.phase}
            </span>
          </span>
          <span className="font-medium">{prettyTime}</span>
        </div>

        {/* transport controls */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={prevStep}
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200"
            aria-label="Previous 5 minutes"
          >
            ⏮ Prev
          </button>
          {playing ? (
            <button
              onClick={pause}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200"
              aria-label="Pause"
            >
              ⏸ Pause
            </button>
          ) : (
            <button
              onClick={play}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200"
              aria-label="Play"
            >
              ▶️ Play
            </button>
          )}
          <button
            onClick={nextStep}
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200"
            aria-label="Next 5 minutes"
          >
            ⏭ Next
          </button>
        </div>

        {/* Slider (scrub-safe) */}
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={idx}
          onMouseDown={onScrubStart}
          onTouchStart={onScrubStart}
          onChange={(e) => onScrub(Number(e.target.value))}
          onMouseUp={onScrubEnd}
          onTouchEnd={onScrubEnd}
          className="w-full accent-blue-600"
          aria-label="Forecast timeline"
          list="timeline-ticks"
        />
        <datalist id="timeline-ticks">
          {Array.from({ length: max + 1 }, (_, i) => i)
            .filter((i) => i % 6 === 0)
            .map((i) => (
              <option key={i} value={i} />
            ))}
        </datalist>

        {/* legend */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ background: bandedColor(15) }} /> Low
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ background: bandedColor(50) }} /> Medium
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ background: bandedColor(85) }} /> High
          </span>
          <span className="ml-auto text-gray-500">• 1 dot ≈ 10 people</span>
        </div>
      </div>
    </Card>
  );
};

/* Usage in EventDetails JSX:
   <VenueLayoutCard />
*/
