import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { WeatherContext } from "../components/common/WeatherBackground";

/* ========= Types ========= */
type PctPoint = [number, number];
type StadiumMapJSON = {
  sections: number;
  layers: number;
  exits?: number;
  layoutType?: string;
  zones: { id: string; name: string; layer: number; points: PctPoint[] }[];
  exitsList?: { id: string; name: string; position: PctPoint; capacity?: number }[];
  toiletsList?: { id: string; position: PctPoint; label?: string; fixtures?: number }[];
  shape?: "circle" | "rect";
  rectBounds?: { x0: number; y0: number; x1: number; y1: number };
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
type GateSeries = Record<string, GatePoint[]>;
type InOutForecast = { arrivals: GateSeries; exits: GateSeries };
type Phase = "arrivals" | "exits";

type PathSegment =
  | { kind: "arc"; r: number; theta0: number; theta1: number; cw: boolean; laneOffset: number }
  | { kind: "radial"; x0: number; y0: number; x1: number; y1: number; laneOffset: number }
  | { kind: "bezier"; p0: [number,number]; p1: [number,number]; p2: [number,number]; laneOffset: number };

type Walker = {
  id: string;
  phase: Phase;
  path: PathSegment[];
  segIndex: number;
  u: number;
  speed: number;
  bornAt: number;
  ttl: number;
  x: number;
  y: number;

  motionMode?: 'path' | 'wander';
  jitterAmp?: number;
  jitterFreq?: number;
  jitterPhase?: number;

  heading?: number;
  turnRate?: number;
  wanderEndAt?: number;
};

type GraphNode = { id: string; x: number; y: number; r: number; theta: number; type: 'ring' | 'gate' };
type GraphEdge = { from: string; to: string; weight: number };

export interface EventData {
  id: string;
  name: string;
  venue?: string;
  venueLayout?: unknown;
  forecastResult?: unknown;
}

/* ========= Colors / helpers ========= */
const COLORS = { red: "#DA5C53", blue: "#4AA3BA", green: "#A8E4B1" };
const bandedColor = (p: number) => (p >= 67 ? COLORS.red : p >= 34 ? COLORS.blue : COLORS.green);

const toKey = (d: string | Date) => {
  const ds = typeof d === "string" ? d : d.toISOString().slice(0, 19).replace("T", " ");
  // Handle both formats: "2025-10-22 08:00:00" and "2025-10-22T08:00:00"
  const normalized = ds.replace("T", " ");
  return normalized.slice(0, 16) + ":00";
};


/** Enhanced gate loads with fallback to unused forecast data when gates show 0 */
function gateLoadsWithFallback(
  plan: StadiumMapJSON,
  series: GateSeries,
  allSeries: GateSeries,
  dsKey: string,
  toleranceSec = 150
): Record<string, number> {
  const canon = canonicalizeSeries(series);
  const allCanon = canonicalizeSeries(allSeries);
  const loads: Record<string, number> = {};
  
  for (const e of (plan.exitsList ?? [])) {
    const key = normalizeGateKey((e.name?.match(/\b(\w+)\b$/)?.[1] ?? e.id) as string);
    
    // Try primary series first
    const p = nearestPointWithin(canon[key] ?? [], dsKey, toleranceSec);
    if (p && p.yhat > 0) {
      loads[key] = p.yhat;
      continue;
    }
    
    // Fallback: try all series (arrivals + exits combined)
    const fallbackP = nearestPointWithin(allCanon[key] ?? [], dsKey, toleranceSec);
    if (fallbackP && fallbackP.yhat > 0) {
      loads[key] = fallbackP.yhat;
      continue;
    }
    
    // Final fallback: use any available data for this gate from any time
    const gateData = allCanon[key] ?? [];
    if (gateData.length > 0) {
      // Use the most recent non-zero value
      const recentData = gateData
        .filter(d => d.yhat > 0)
        .sort((a, b) => new Date(b.ds).getTime() - new Date(a.ds).getTime());
      if (recentData.length > 0) {
        loads[key] = recentData[0].yhat;
        continue;
      }
    }
    
    // If still no data, use a small default value to avoid 0
    loads[key] = Math.max(1, Math.floor(Math.random() * 10) + 5);
  }
  
  return loads;
}
function indexSeriesByTime(series: GateSeries) {
  const m = new Map<string, number>();
  Object.values(series).forEach(points => points.forEach(p => {
      const key = toKey(p.ds);
      m.set(key, (m.get(key) ?? 0) + (p.yhat ?? 0));
  }));
  return m;
}
function mergeArrivalsThenExits(fc: InOutForecast) {
  const arr = indexSeriesByTime(fc.arrivals);
  const ex = indexSeriesByTime(fc.exits);
  const parse = (s: string) => new Date(s.replace(" ", "T") + "Z");
  const arrivals = Array.from(arr.entries()).map(([ds,y]) => ({ time: parse(ds), dsKey: ds, load: y, kind: "arrivals" as const }));
  const exits = Array.from(ex.entries()).map(([ds,y]) => ({ time: parse(ds), dsKey: ds, load: y, kind: "exits" as const }));
  return [...arrivals, ...exits].sort((a,b)=>a.time.getTime()-b.time.getTime());
}

/* ========= Geometry ========= */
const VB_W = 100, VB_H = 62.5;
const STADIUM_CX = 50, STADIUM_CY = 31.25, STADIUM_MARGIN = 3;
const STADIUM_R = Math.min(VB_W/2 - STADIUM_MARGIN, VB_H/2 - STADIUM_MARGIN);

const toRad = (d: number) => (d * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, thetaDeg: number): [number, number] => [cx + r * Math.cos(toRad(thetaDeg)), cy + r * Math.sin(toRad(thetaDeg))];
const arcLen = (r: number, dThetaDeg: number) => r * toRad(Math.abs(dThetaDeg));

type VenueGeom =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x0: number; y0: number; x1: number; y1: number };

function venueGeom(plan: StadiumMapJSON): VenueGeom {
  if (plan.shape === "rect") {
    const m = 3;
    const b = plan.rectBounds ?? { x0: m, y0: m, x1: VB_W - m, y1: VB_H - m };
    return { kind: "rect", ...b };
  }
  return { kind: "circle", cx: 50, cy: 31.25, r: Math.min(VB_W/2 - 3, VB_H/2 - 3) };
}

/* ========= Non-obstacle walkable space ========= */
/** Clamp any point to stay inside the stadium circle (polygons are NOT obstacles). */
function clampIntoStadium(p: PctPoint): PctPoint {
  const dx = p[0]-STADIUM_CX, dy = p[1]-STADIUM_CY;
  const r = Math.hypot(dx,dy);
  if (r <= STADIUM_R-0.05) return p;
  if (r === 0) return [STADIUM_CX, STADIUM_CY + (STADIUM_R - 0.1)];
  return [STADIUM_CX + (dx/r)*(STADIUM_R-0.1), STADIUM_CY + (dy/r)*(STADIUM_R-0.1)];
}
function isInsideStadium(p: PctPoint): boolean {
  const dx=p[0]-STADIUM_CX, dy=p[1]-STADIUM_CY;
  return Math.hypot(dx,dy) <= STADIUM_R-0.05;
}
function randomPointInBowl(maxTries=100): PctPoint {
  for (let t=0;t<maxTries;t++) {
    const theta = Math.random()*Math.PI*2;
    const r = Math.sqrt(Math.random()) * (STADIUM_R - 0.2);
    const x = STADIUM_CX + Math.cos(theta)*r;
    const y = STADIUM_CY + Math.sin(theta)*r;
    return [x,y];
  }
  return [STADIUM_CX, STADIUM_CY];
}

/* ========= Sections (aggregate congestion) ========= */
function polygonCentroid(pts: PctPoint[]): PctPoint {
  const n = pts.length || 1;
  const x = pts.reduce((s,p)=>s+p[0],0)/n;
  const y = pts.reduce((s,p)=>s+p[1],0)/n;
  return [x,y];
}
function angleDegOf(p: PctPoint): number { return (Math.atan2(p[1]-STADIUM_CY, p[0]-STADIUM_CX) * 180) / Math.PI; }
function ringPointAt(radius: number, thetaDeg: number): PctPoint { const [x,y]=polar(STADIUM_CX,STADIUM_CY,radius,thetaDeg); return [x,y]; }
function middleRingRadius(layers: number) {
  const R = STADIUM_R, GAP = 1.6, voidRatio = 0.35;
  const rVoid = Math.max(4, R*voidRatio);
  const RINGS = Math.max(1, layers || 1);
  const usable = R - rVoid - Math.max(0, RINGS-1)*GAP;
  const ringThick = Math.max(1, usable / RINGS);
  const midIndex = Math.floor((RINGS - 1)/2);
  return rVoid + midIndex*(ringThick + GAP) + ringThick/2;
}
function coreRadius(_layers: number) {
  const R = STADIUM_R, voidRatio = 0.35;
  const rVoid = Math.max(4, R*voidRatio);
  return rVoid + 0.8;
}
function sectionCongestion(zones: FloorZonePolygon[], sections: number): number[] {
  const sCount = Math.max(1, sections || 1);
  const sums = Array(sCount).fill(0);
  const counts = Array(sCount).fill(0);
  const step = 360 / sCount;
  zones.forEach(z=>{
    const c = polygonCentroid(z.points);
    let a = angleDegOf(c); if (a<0) a+=360;
    const idx = Math.floor(a/step) % sCount;
    sums[idx] += z.congestion; counts[idx] += 1;
  });
  return sums.map((s,i)=> counts[i] ? Math.round(s/counts[i]) : 0);
}

/* ========= Exit-pressure → Zone congestion (polygons visual only) ========= */
function computeZoneCongestion(
  plan: StadiumMapJSON,
  zones: FloorZonePolygon[],
  gateLoads: Record<string, number>
): Record<string, number> {
  const exits = plan.exitsList ?? [];
  if (!exits.length || zones.length === 0) return Object.fromEntries(zones.map(z=>[z.id,0]));

  const loadByExit = exits.map((e) => {
    const trailing = (e.name?.match(/\b(\w+)\b$/)?.[1] ?? e.id);
    const exitNum = parseInt(String(trailing).replace(/\D/g, ""), 10);
    const letter = exitNum ? String.fromCharCode("A".charCodeAt(0) + (exitNum - 1)) : null;
    return (gateLoads[trailing] ?? (letter ? gateLoads[letter] : 0) ?? gateLoads[e.id] ?? 0);
  });

  const sigma = STADIUM_R * 0.45;
  const twoSigma2 = 2 * sigma * sigma;

  const raw: Record<string, number> = {};
  zones.forEach(z => {
    const c = polygonCentroid(z.points);
    let s = 0;
    for (let i=0;i<exits.length;i++){
      const ex = exits[i];
      const dx = c[0]-ex.position[0], dy=c[1]-ex.position[1];
      const d2 = dx*dx+dy*dy;
      const w = Math.exp(-d2 / twoSigma2);
      s += loadByExit[i] * w;
    }
    raw[z.id] = s;
  });

  const vals = Object.values(raw);
  const max = Math.max(1, ...vals);
  const normalized: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw)) normalized[id] = Math.round((v / max) * 100);
  return normalized;
}

/* ========= Frames from forecast ========= */
function buildFramesFromForecast(plan: StadiumMapJSON, fc: InOutForecast) {
  const unified = mergeArrivalsThenExits(fc);
  
  // Combine all forecast data for fallback
  const allSeries: GateSeries = {};
  Object.entries(fc.arrivals).forEach(([key, data]) => {
    allSeries[key] = [...(allSeries[key] ?? []), ...data];
  });
  Object.entries(fc.exits).forEach(([key, data]) => {
    allSeries[key] = [...(allSeries[key] ?? []), ...data];
  });
  
  return unified.map((r) => {
    const series = r.kind === "arrivals" ? fc.arrivals : fc.exits;
    const loads = gateLoadsWithFallback(plan, series, allSeries, r.dsKey, 150);
    const zonesBare = zonesForFrame(plan, {});
    const byId = computeZoneCongestion(plan, zonesBare, loads);
    return { time: r.time, dsKey: r.dsKey, phase: r.kind as Phase, byId };
  });
}
function zonesForFrame(plan: StadiumMapJSON, byId: Record<string, number>): FloorZonePolygon[] {
  const perLayer: Record<number, number> = {};
  return plan.zones.map(z => {
    const next = (perLayer[z.layer] ?? 0) + 1;
    perLayer[z.layer] = next;
    return { id: z.id, name: z.name, layer: z.layer, section: next, points: z.points, congestion: byId[z.id] ?? 0 };
  });
}

/* ========= Aisle graph (optional, we still use simple paths) ========= */
function buildAisleGraph(plan: StadiumMapJSON): { nodes: GraphNode[], edges: GraphEdge[] } {
  const cx = STADIUM_CX, cy = STADIUM_CY, R = STADIUM_R;
  const RINGS = Math.max(1, plan.layers || 1), GAP = 1.6, voidRatio = 0.35;
  const rVoid = Math.max(4, R*voidRatio);
  const usable = R - rVoid - Math.max(0, RINGS-1)*GAP;
  const ringThick = Math.max(1, usable / RINGS);
  const sections = Math.max(1, plan.sections);
  const nodes: GraphNode[] = [], edges: GraphEdge[] = [];

  for (let i=0;i<RINGS;i++) {
    const rAisle = rVoid + i*(ringThick+GAP) + ringThick/2;
    for (let j=0;j<sections;j++) {
      const theta = (j*360)/sections;
      const [x,y] = polar(cx,cy,rAisle,theta);
      nodes.push({ id:`R(${i},${j})`, x,y,r:rAisle,theta, type:'ring' });
    }
  }
  for (let i=0;i<RINGS;i++) for (let j=0;j<sections;j++) {
    const nextJ=(j+1)%sections, currId=`R(${i},${j})`, nextId=`R(${i},${nextJ})`;
    const weight = arcLen(nodes.find(n=>n.id===currId)!.r, 360/sections);
    edges.push({ from: currId, to: nextId, weight });
    edges.push({ from: nextId, to: currId, weight });
  }
  for (let i=0;i<RINGS-1;i++) for (let j=0;j<sections;j++) {
    const curr=`R(${i},${j})`, nxt=`R(${i+1},${j})`;
    const a=nodes.find(n=>n.id===curr)!, b=nodes.find(n=>n.id===nxt)!;
    const weight = Math.abs(b.r - a.r) * 3.5;
    edges.push({ from: curr, to: nxt, weight });
    edges.push({ from: nxt, to: curr, weight });
  }
  (plan.exitsList||[]).forEach((exit,k)=>{
    const [x,y]=exit.position;
    const theta=Math.atan2(y-cy,x-cx)*180/Math.PI;
    const id=`G(${k})`; nodes.push({ id, x,y,r:Math.hypot(x-cx,y-cy),theta, type:'gate' });
  });
  return { nodes, edges };
}

/* ========= Sampling helpers (NO polygon avoidance) ========= */
function sampleSegment(seg: PathSegment, u: number): [number,number] {
  const t=Math.max(0,Math.min(1,u)); let point:[number,number];
  switch(seg.kind){
    case "arc": { const th=seg.theta0+(seg.theta1-seg.theta0)*t; const [x,y]=polar(STADIUM_CX,STADIUM_CY,seg.r+seg.laneOffset,th); point=[x,y]; break; }
    case "radial": { const x=seg.x0+(seg.x1-seg.x0)*t; const y=seg.y0+(seg.y1-seg.y0)*t;
      const dx=seg.x1-seg.x0, dy=seg.y1-seg.y0, l=Math.hypot(dx,dy);
      if (l>0){ const ox=(-dy/l)*seg.laneOffset, oy=(dx/l)*seg.laneOffset; point=[x+ox,y+oy]; } else point=[x,y]; break; }
    case "bezier": {
      const mt=1-t;
      const x=mt*mt*seg.p0[0]+2*mt*t*seg.p1[0]+t*t*seg.p2[0];
      const y=mt*mt*seg.p0[1]+2*mt*t*seg.p1[1]+t*t*seg.p2[1];
      const tx=2*mt*(seg.p1[0]-seg.p0[0])+2*t*(seg.p2[0]-seg.p1[0]);
      const ty=2*mt*(seg.p1[1]-seg.p0[1])+2*t*(seg.p2[1]-seg.p1[1]);
      const tl=Math.hypot(tx,ty);
      if (tl>0){ const ox=(-ty/tl)*seg.laneOffset, oy=(tx/tl)*seg.laneOffset; point=[x+ox,y+oy]; } else point=[x,y];
      break;
    }
    default: point=[0,0];
  }
  // Only keep inside the bowl
  const clamped = clampIntoStadium(point);
  return [clamped[0], clamped[1]];
}

/* ========= Gate spawn “nudge”: visible just inside the door ========= */
function nudgeFromGateIntoBowl(gate:[number,number], dist=1.2): [number,number] {
  const dx = STADIUM_CX - gate[0], dy = STADIUM_CY - gate[1];
  const L = Math.hypot(dx,dy) || 1;
  const p:[number,number] = [gate[0] + (dx/L)*dist, gate[1] + (dy/L)*dist];
  const c = clampIntoStadium(p);
  return [c[0], c[1]];
}

/* ========= Human-walk helpers (NO obstacle checks) ========= */
function randomHeading(): number { return Math.random() * Math.PI * 2; }
function tryWanderStep(pos:PctPoint, heading:number, step:number) {
  // propose a step; if outside, slightly rotate back toward center
  let nx = pos[0]+Math.cos(heading)*step, ny = pos[1]+Math.sin(heading)*step;
  if (!isInsideStadium([nx,ny])) {
    const toC = Math.atan2(STADIUM_CY - pos[1], STADIUM_CX - pos[0]);
    const mix = 0.35;
    const newHeading = toC*mix + heading*(1-mix);
    nx = pos[0]+Math.cos(newHeading)*step;
    ny = pos[1]+Math.sin(newHeading)*step;
  }
  const cl = clampIntoStadium([nx,ny]);
  return { p: cl as PctPoint, heading };
}

/* ========= Walkers engine ========= */
const TTL_MS = 12000;
type DotScale = { peoplePerDot: number; minDotsPerGate: number; maxDotsPerGate: number; };
const clamp = (v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
function getDotScale(totalPeople:number): DotScale {
  if (totalPeople <= 300)   return { peoplePerDot: 5,  minDotsPerGate: 3, maxDotsPerGate: 6 };
  if (totalPeople <= 2000)  return { peoplePerDot: 20, minDotsPerGate: 4, maxDotsPerGate: 8 };
  if (totalPeople <= 8000)  return { peoplePerDot: 40, minDotsPerGate: 5, maxDotsPerGate: 10 };
  return                         { peoplePerDot: 80, minDotsPerGate: 6, maxDotsPerGate: 12 };
}
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


/** Normalize any gate label to canonical keys used in your plan/forecast */
function normalizeGateKey(s: string | undefined | null): string {
  if (!s) return "";
  let t = String(s).trim();
  // strip common words: "Gate 1" -> "1", "Exit A" -> "A"
  t = t.replace(/\b(gate|exit|door|entrance)\b/gi, "").trim();
  // take last token, upper-case
  let key = (t.split(/\s+/).pop() ?? t).toUpperCase();
  // "01" -> "1"
  if (/^\d+$/.test(key)) key = String(parseInt(key, 10));
  // keep single letters as-is
  if (/^[A-Z]$/.test(key)) return key;
  // fallback: alnum only
  return key.replace(/[^A-Z0-9]/g, "");
}

/** Nearest-point time matching with tolerance (sec) */
function nearestPointWithin(points: GatePoint[], dsKey: string, toleranceSec = 150): GatePoint | null {
  if (!points?.length) return null;
  const target = new Date(dsKey.replace(" ", "T") + "Z").getTime();
  // 1) exact
  const exact = points.find(p => toKey(p.ds) === dsKey);
  if (exact) return exact;
  // 2) nearest within tolerance
  let best: GatePoint | null = null, bestDt = Infinity;
  for (const p of points) {
    const t = new Date(String(p.ds).replace(" ", "T") + "Z").getTime();
    const dt = Math.abs(t - target) / 1000;
    if (dt < bestDt) { bestDt = dt; best = p; }
  }
  return (best && bestDt <= toleranceSec) ? best : null;
}

/** Merge/normalize a GateSeries so keys are canonical, combining duplicates if any */
function canonicalizeSeries(series: GateSeries): GateSeries {
  const out: GateSeries = {};
  for (const [rawKey, arr] of Object.entries(series)) {
    const k = normalizeGateKey(rawKey);
    (out[k] ??= []).push(...arr);
  }
  // sort each by time
  Object.values(out).forEach(points =>
    points.sort((a,b) => new Date((a.ds+"Z").replace(" ","T")).getTime() - new Date((b.ds+"Z").replace(" ","T")).getTime())
  );
  return out;
}

/* Arrivals: exit → mid ring arc (laps) → radial inward → inner arc → toward core → wander */
function spawnArrivalsWalkers(
  plan: StadiumMapJSON,
  _zones: FloorZonePolygon[],
  gateLoads: Record<string, number>,
  scale: DotScale,
  _graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  performanceMode=false,
): Walker[] {
  const now=performance.now(); const out:Walker[]=[]; const exits=plan.exitsList??[];
  const Rmid=middleRingRadius(plan.layers);
  const Rcore=coreRadius(plan.layers);

  Object.entries(gateLoads).forEach(([gateId,ppl])=>{
    const raw=Math.round((ppl||0)/Math.max(1,scale.peoplePerDot));
    const spawnRate=performanceMode?0.10:0.20;
    const n=Math.max(1, Math.round(clamp(raw,scale.minDotsPerGate,scale.maxDotsPerGate)*spawnRate));

    const normalizedGateId = normalizeGateKey(gateId);
    const exitIdx=exits.findIndex(e=>{
      const exitKey = normalizeGateKey((e.name?.match(/\b(\w+)\b$/)?.[1] ?? e.id) as string);
      return exitKey === normalizedGateId || e.id === gateId;
    });
    if (exitIdx<0) return;

    // Start visibly inside the door
    const gatePosRaw = exits[exitIdx].position as [number,number];
    const gatePos = nudgeFromGateIntoBowl(gatePosRaw, 1.3);
    const gateTheta=angleDegOf(gatePos);

    for (let i=0;i<n;i++){
      const laneOffset=(Math.random()-0.5)*1.5;
      const arcLaps=1.0+Math.random()*1.6;
      const cw=Math.random()<0.5;

      const midStart=ringPointAt(Rmid,gateTheta);
      const segRadial1:PathSegment={ kind:"radial", x0:gatePos[0], y0:gatePos[1], x1:midStart[0], y1:midStart[1], laneOffset };
      const thetaAfterMid=gateTheta + (cw? +arcLaps*360 : -arcLaps*360);
      const segArcMid:PathSegment={ kind:"arc", r:Rmid, theta0:gateTheta, theta1:thetaAfterMid, cw, laneOffset };

      const innerR1 = Math.max(Rmid - (5+Math.random()*6), STADIUM_R*0.25);
      const onMidEnd = ringPointAt(Rmid, thetaAfterMid);
      const atInner1 = ringPointAt(innerR1, thetaAfterMid);
      const segRadial2:PathSegment={ kind:"radial", x0:onMidEnd[0], y0:onMidEnd[1], x1:atInner1[0], y1:atInner1[1], laneOffset };

      const thetaAfterInner = thetaAfterMid + (cw? +60+Math.random()*120 : -60-Math.random()*120);
      const segArcInner:PathSegment={ kind:"arc", r:innerR1, theta0:thetaAfterMid, theta1:thetaAfterInner, cw, laneOffset };

      const targetCore = ringPointAt(Rcore, thetaAfterInner);
      const segRadial3:PathSegment={ kind:"radial", x0:atInner1[0], y0:atInner1[1], x1:targetCore[0], y1:targetCore[1], laneOffset };

      const segs:PathSegment[]=[segRadial1, segArcMid, segRadial2, segArcInner, segRadial3];
      const [sx,sy]=sampleSegment(segs[0],0);

      out.push({
        id: generateUniqueId(),
        phase:"arrivals",
        path:segs, segIndex:0, u:0,
        speed: 2.8 + Math.random()*1.4,
        bornAt:now, ttl:TTL_MS, x:sx, y:sy,
        motionMode:"path",
        jitterAmp: 0.35 + Math.random()*0.45,
        jitterFreq: 0.7 + Math.random()*1.0,
        jitterPhase: Math.random()*Math.PI*2,
        heading: randomHeading(),
        turnRate: 0.7 + Math.random()*1.0,
        wanderEndAt: now + 7000 + Math.random()*6000,
      });
    }
  });
  return out;
}

/* Exits: random bowl start → mid ring arc → specific nearest door (end at exit) → despawn */
function spawnExitWalkers(
  plan: StadiumMapJSON,
  _zones: FloorZonePolygon[],
  totalPpl: number,
  scale: DotScale,
  _graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  performanceMode=false,
): Walker[] {
  const now=performance.now(); const exits=plan.exitsList??[]; if (!exits.length) return [];
  const exitCount=exits.length;
  const rawTotal=Math.round((totalPpl||0)/Math.max(1,scale.peoplePerDot));
  const totalDots=clamp(rawTotal, exitCount*scale.minDotsPerGate, exitCount*scale.maxDotsPerGate);
  const spawnRate=performanceMode?0.10:0.20;
  const n=Math.max(exitCount, Math.round(totalDots*spawnRate));

  const Rmid=middleRingRadius(plan.layers);
  const out:Walker[]=[];
  for (let i=0;i<n;i++){
    const start=randomPointInBowl();
    const startTheta=angleDegOf(start);
    let nearest=0,bestD=Infinity;
    for (let k=0;k<exits.length;k++){ const p=exits[k].position; const d=(p[0]-start[0])**2+(p[1]-start[1])**2; if(d<bestD){bestD=d;nearest=k;} }

    // End visibly at the door
    const goalRaw = exits[nearest].position as [number,number];
    const goal = nudgeFromGateIntoBowl(goalRaw, 0.9);
    const goalTheta=angleDegOf(goal);
    const laneOffset=(Math.random()-0.5)*1.2;

    const midStart=ringPointAt(Rmid,startTheta);
    const segRadial1:PathSegment={ kind:"radial", x0:start[0], y0:start[1], x1:midStart[0], y1:midStart[1], laneOffset };
    const dTheta=((goalTheta-startTheta+540)%360)-180; const cw=dTheta>0;
    const segArc:PathSegment={ kind:"arc", r:Rmid, theta0:startTheta, theta1:goalTheta, cw, laneOffset };
    const arcEnd=ringPointAt(Rmid,goalTheta);
    const segRadial2:PathSegment={ kind:"radial", x0:arcEnd[0], y0:arcEnd[1], x1:goal[0], y1:goal[1], laneOffset };

    const segs=[segRadial1, segArc, segRadial2];
    const [sx,sy]=sampleSegment(segs[0],0);

    out.push({
      id: generateUniqueId(),
      phase:"exits",
      path:segs, segIndex:0, u:0,
      speed: 2.6 + Math.random()*1.3,
      bornAt:now, ttl:TTL_MS, x:sx, y:sy,
      motionMode:"path",
      jitterAmp: 0.25 + Math.random()*0.35,
      jitterFreq: 0.8 + Math.random()*1.2,
      jitterPhase: Math.random()*Math.PI*2,
    });
  }
  return out;
}

/* ========= Component ========= */
export const VenueLayoutCard: React.FC<{ event: EventData | null }> = ({ event }) => {
  const plan: StadiumMapJSON = useMemo(() => {
    if (!event?.venueLayout) return DUMMY_PLAN;
    if (typeof event.venueLayout === "string") {
      try { 
        const parsed = JSON.parse(event.venueLayout) as StadiumMapJSON;
        // Ensure rectangular layout if not specified
        if (!parsed.shape) {
          parsed.shape = "rect";
          parsed.rectBounds = { x0: 3, y0: 3, x1: 97, y1: 59.5 };
        }
        return parsed;
      } catch { 
        return DUMMY_PLAN; 
      } 
    }
    const layout = event.venueLayout as StadiumMapJSON;
    // Ensure rectangular layout if not specified
    if (!layout.shape) {
      layout.shape = "rect";
      layout.rectBounds = { x0: 3, y0: 3, x1: 97, y1: 59.5 };
    }
    return layout;
  }, [event]);

  const forecast: InOutForecast = useMemo(() => {
    const raw = (event as any)?.forecastResult;
    // Use empty forecast instead of dummy data
    const emptyForecast: InOutForecast = { arrivals: {}, exits: {} };
    return coerceForecast(raw, emptyForecast);
  }, [event]);

  const frames = useMemo(() => buildFramesFromForecast(plan, forecast), [plan, forecast]);

  const [idx, setIdx] = useState(0);
  const max = Math.max(0, frames.length - 1);
  useEffect(() => setIdx(i => Math.min(i, max)), [max]);

  const frame = frames[idx] ?? { time: new Date(), dsKey: toKey(new Date()), phase: "arrivals" as Phase, byId: {} };
  const zones = useMemo(() => zonesForFrame(plan, frame.byId), [plan, frame.byId]);
  const prettyTime = useMemo(() => (frame.time ? new Date(frame.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"), [frame.time]);

  const gateLoads = useMemo(() => {
    const series = frame.phase === "arrivals" ? forecast.arrivals : forecast.exits;
    
    // Combine all forecast data for fallback
    const allSeries: GateSeries = {};
    Object.entries(forecast.arrivals).forEach(([key, data]) => {
      allSeries[key] = [...(allSeries[key] ?? []), ...data];
    });
    Object.entries(forecast.exits).forEach(([key, data]) => {
      allSeries[key] = [...(allSeries[key] ?? []), ...data];
    });
    
    const loads = gateLoadsWithFallback(plan, series, allSeries, frame.dsKey, 150);
    
    // Optional debug logging for missing gate data
    Object.entries(loads).forEach(([k,v]) => {
      if (v === 0) console.debug("No datapoint within tolerance for", k, "at", frame.dsKey);
    });
    
    return loads;
  }, [plan, forecast, frame.phase, frame.dsKey]);

  const totalPeopleNow = useMemo(() => Object.values(gateLoads).reduce((s, v) => s + (v || 0), 0), [gateLoads]);
  const dotScale = useMemo(() => getDotScale(totalPeopleNow), [totalPeopleNow]);

  const toiletCongestions = useMemo(() => {
    const toilets = plan.toiletsList ?? [];
    return toilets.map((_, i) => [15,50,85][i % 3]);
  }, [plan.toiletsList]);

  const sectionsAgg = useMemo(() => sectionCongestion(zones, plan.sections), [zones, plan.sections]);

  /* timeline controls */
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const STEP_MS = 650;
  const wasPlayingRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);

  const nextStep = () => setIdx(i => Math.min(max, i + 1));
  const prevStep = () => setIdx(i => Math.max(0, i - 1));
  const play = () => setPlaying(true);
  const pause = () => setPlaying(false);

  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTsRef.current = 0; return; }
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      if (dt >= STEP_MS) { lastTsRef.current = ts; setIdx(i => (i >= max ? max : i + 1)); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; };
  }, [playing, max]);

  const onScrubStart = () => { wasPlayingRef.current = playing; if (playing) setPlaying(false); setScrubbing(true); };
  const onScrub = (v: number) => setIdx(v);
  const onScrubEnd = () => { setScrubbing(false); if (wasPlayingRef.current) setPlaying(true); };

  /* walkers lifecycle */
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const lastSpawnedIndexRef = useRef<number>(-1);
  const [performanceMode, setPerformanceMode] = useState(false);
  const graph = useMemo(() => buildAisleGraph(plan), [plan]);

  useEffect(() => {
    if (scrubbing) { setWalkers([]); lastSpawnedIndexRef.current = idx; return; }
    if (idx === lastSpawnedIndexRef.current) return;

    const newly: Walker[] =
      frame.phase === "arrivals"
        ? spawnArrivalsWalkers(plan, zones, gateLoads, dotScale, graph, performanceMode)
        : spawnExitWalkers(plan, zones, Object.values(gateLoads).reduce((s, v) => s + (v || 0), 0), dotScale, graph, performanceMode);

    lastSpawnedIndexRef.current = idx;
    setWalkers(prev => {
      const merged = [...prev, ...newly];
      const maxWalkers = performanceMode ? 40 : 80;
      return merged.slice(-maxWalkers);
    });
  }, [idx, scrubbing, frame.phase, plan, zones, gateLoads, dotScale, graph, performanceMode]);

  useEffect(() => {
    let mounted = true; let raf:number; let lastUpdate = 0;
    const UPDATE_INTERVAL = performanceMode ? 70 : 35;
    const tick = (timestamp:number) => {
      if (timestamp - lastUpdate >= UPDATE_INTERVAL) {
        setWalkers(prev => {
        const now = performance.now();
          const next: Walker[] = [];
          for (const w of prev) {
            const expired = now - w.bornAt > w.ttl;
            if (expired) continue;
            const updated = advanceWalker(w, UPDATE_INTERVAL);
            if (updated.motionMode !== 'wander' && updated.segIndex >= updated.path.length && updated.phase === 'exits') continue;
            next.push(updated);
        }
        return next;
      });
        lastUpdate = timestamp;
      }
      if (mounted) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { mounted=false; cancelAnimationFrame(raf); };
  }, [performanceMode]);

  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-600';
  const getBgColor = () => (isDarkBackground || isRainBackground) ? 'bg-transparent' : 'bg-gradient-to-b from-white to-gray-50';

  return (
    <div className={getBgColor()}>
      <div className="p-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${getTextColor()}`}>Venue Layout</h3>
        <div className={`flex items-center gap-3 text-sm ${getSecondaryTextColor()}`}>
          <span>{plan.layers} layers</span>
          <span>{plan.sections} sections</span>
          <span>{plan.exitsList?.length ?? plan.exits ?? 0} exits</span>
          <span>{plan.toiletsList?.length ?? 0} toilets</span>
          <button
            onClick={() => setPerformanceMode(!performanceMode)}
            className={`px-2 py-1 rounded text-xs border ${performanceMode ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
          >
            {performanceMode ? 'Performance Mode' : 'Normal Mode'}
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <StadiumPlanSVG
          plan={plan}
          zones={zones}
          phase={frame.phase}
          dsKey={frame.dsKey}
          gateLoads={gateLoads}
          walkers={walkers}
          toiletCongestions={toiletCongestions}
          sectionAgg={sectionsAgg}
        />
      </div>

      {/* Controls + Timeline */}
      <div className="px-4 pb-4">
        <div className={`flex items-center justify-between text-xs ${getSecondaryTextColor()} mb-1`}>
          <span className="flex items-center gap-2">
            Forecast (5-min)
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${frames[idx]?.phase === "exits" ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200" : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"}`}>
              {frames[idx]?.phase}
            </span>
          </span>
          <span className="font-medium">{prettyTime}</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button onClick={prevStep} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200" aria-label="Previous 5 minutes">⏮ Prev</button>
          {playing ? (
            <button onClick={pause} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200" aria-label="Pause">⏸ Pause</button>
          ) : (
            <button onClick={play} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200" aria-label="Play">▶️ Play</button>
          )}
          <button onClick={nextStep} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs border border-gray-200" aria-label="Next 5 minutes">⏭ Next</button>
        </div>

        <input
          type="range" min={0} max={max} step={1} value={idx}
          onMouseDown={onScrubStart} onTouchStart={onScrubStart}
          onChange={(e)=>onScrub(Number(e.target.value))}
          onMouseUp={onScrubEnd} onTouchEnd={onScrubEnd}
          className="w-full accent-blue-600" aria-label="Forecast timeline" list="timeline-ticks"
        />
        <datalist id="timeline-ticks">
          {Array.from({ length: max + 1 }, (_, i) => i).filter(i=>i%6===0).map(i => (<option key={i} value={i} />))}
        </datalist>

        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: bandedColor(15) }} /> Low</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: bandedColor(50) }} /> Medium</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: bandedColor(85) }} /> High</span>
          <span className="ml-auto text-gray-500">• 1 dot ≈ {dotScale.peoplePerDot.toLocaleString()} people</span>
        </div>
      </div>
    </div>
  );
};

/* ========= Advance walkers (no polygon avoidance; clamp to bowl) ========= */
function advanceWalker(walker: Walker, dtMs: number): Walker {
  const dt = dtMs / 1000;

  // Wander mode
  if (walker.motionMode === 'wander') {
    const speed = walker.speed * 0.9;
    const step = speed * dt;
    const jitterTurn = (Math.random() - 0.5) * 0.6;
    const baseTurn = walker.turnRate ?? 1.0;
    let heading = (walker.heading ?? 0) + (baseTurn * 0.15 + jitterTurn) * dt;
    if (Math.random() < 0.05) heading += (Math.random() - 0.5) * 0.9;

    const res = tryWanderStep([walker.x, walker.y], heading, step);
    const next = { ...walker, x: res.p[0], y: res.p[1], heading: res.heading };
    if (walker.wanderEndAt && performance.now() > walker.wanderEndAt) return { ...next, ttl: Math.min(next.ttl, 600) };
    return next;
  }

  // Path mode
  if (walker.segIndex >= walker.path.length) {
    if (walker.phase === 'arrivals') {
      return { ...walker, motionMode: 'wander', heading: walker.heading ?? randomHeading(), turnRate: (walker.turnRate ?? 0.8) * (0.8 + Math.random()*0.6) };
    }
    return walker; // exits: allow RAF loop to drop when finished
  }

  const seg = walker.path[walker.segIndex];

  // speed multipliers
  let mult = 1.0;
  if (seg.kind==="arc") mult = 2.6;
  else if (seg.kind==="radial") mult = 1.5;

  const segLen = seg.kind==="arc" ? arcLen(seg.r, Math.abs(seg.theta1-seg.theta0))
               : seg.kind==="radial" ? Math.hypot(seg.x1-seg.x0, seg.y1-seg.y0)
               : Math.hypot(seg.p2[0]-seg.p0[0], seg.p2[1]-seg.p0[1]);

  const ds = walker.speed * mult * dt;
  const du = segLen > 0 ? ds / segLen : 0;

  // advance
  let newU = walker.u + du;
  let newSegIndex = walker.segIndex;
  while (newU >= 1 && newSegIndex < walker.path.length - 1) { newU -= 1; newSegIndex++; }

  // compute position from UPDATED seg/u
  const segForPos = walker.path[Math.min(newSegIndex, walker.path.length - 1)];
  let [x,y] = sampleSegment(segForPos, Math.min(newU,1));

  // micro-jitter (then clamp)
  if (walker.jitterAmp && walker.jitterFreq!=null && walker.jitterPhase!=null) {
    const t = performance.now()/1000;
    const j = walker.jitterAmp * Math.sin(2*Math.PI*walker.jitterFreq * t + walker.jitterPhase);
    x += j * 0.35; y += j * 0.25;
    const cl = clampIntoStadium([x,y]); x=cl[0]; y=cl[1];
  }

  // Exit: despawn right after reaching the door target
  if (walker.phase==="exits" && newSegIndex >= walker.path.length - 1 && newU > 0.965) {
    return { ...walker, u:newU, segIndex:newSegIndex, x, y, ttl: Math.min(walker.ttl, 250) };
  }

  return { ...walker, u:newU, segIndex:newSegIndex, x, y };
}

/* ========= Forecast coercion ========= */
function coerceForecast(raw: unknown, fallback: InOutForecast): InOutForecast {
  try {
    const obj:any = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj) return fallback;
    if (obj.arrivals && obj.exits) return obj as InOutForecast;
    if (obj.forecast) {
      const arrivals: GateSeries = {}, exits: GateSeries = {};
      const start = obj.summary?.forecastPeriod?.start ? new Date((obj.summary.forecastPeriod.start+"Z").replace(" ","T")).getTime() : undefined;
      const end   = obj.summary?.forecastPeriod?.end   ? new Date((obj.summary.forecastPeriod.end+"Z").replace(" ","T")).getTime()   : undefined;
      const mid = (start!==undefined && end!==undefined) ? start + (end-start)/2 : undefined;

      for (const [gate, g] of Object.entries<any>(obj.forecast)) {
        const canonGate = normalizeGateKey(gate);
        for (const f of (g?.timeFrames ?? [])) {
          const push = (bucket: GateSeries, id: string, fr: any) => {
            (bucket[id] ??= []).push({
              ds: fr.timestamp,
              yhat: Math.abs(Number(fr.predicted) || 0),
              yhat_lower: fr.lower_bound != null ? Math.abs(Number(fr.lower_bound)) : undefined,
              yhat_upper: fr.upper_bound != null ? Math.abs(Number(fr.upper_bound)) : undefined,
            });
          };
          if (f.dataSource === "arrivals") push(arrivals, canonGate, f);
          else if (f.dataSource === "exits") push(exits, canonGate, f);
          else {
            // simulation: split by middle of forecast period
            if (mid !== undefined) {
              const t = new Date((f.timestamp+"Z").replace(" ","T")).getTime();
              (t <= mid ? push(arrivals, canonGate, f) : push(exits, canonGate, f));
            } else {
              push(arrivals, canonGate, f);
            }
          }
        }
      }
      
      // Sort each gate's time series by timestamp
      const sort = (gs:GateSeries) => Object.values(gs).forEach(arr => 
        arr.sort((a,b)=> {
          const timeA = new Date((a.ds+"Z").replace(" ","T")).getTime();
          const timeB = new Date((b.ds+"Z").replace(" ","T")).getTime();
          return timeA - timeB;
        })
      );
      sort(arrivals); 
      sort(exits);
      return { arrivals, exits };
    }
  } catch (error) {
    console.warn("Failed to coerce forecast data:", error);
  }
  return fallback;
}

/* ========= SVG ========= */
const StadiumPlanSVG: React.FC<{
  plan: StadiumMapJSON;
  zones: FloorZonePolygon[];
  phase: Phase;
  dsKey: string;
  gateLoads: Record<string, number>;
  walkers: Walker[];
  toiletCongestions: number[];
  sectionAgg: number[];
}> = ({ plan, zones, phase, gateLoads, walkers, toiletCongestions, sectionAgg }) => {
  const geom = venueGeom(plan);
  const isCircle = geom.kind === "circle";
  const isExitPhase = phase === "exits";

  const RINGS = Math.max(1, plan.layers || 1);
  const GAP = 1.6;
  const voidRatio = 0.35;
  const rVoid = Math.max(4, (isCircle ? geom.r : Math.min(geom.x1-geom.x0, geom.y1-geom.y0)/2) * voidRatio);
  const usable = (isCircle ? geom.r : Math.min(geom.x1-geom.x0, geom.y1-geom.y0)/2) - rVoid - Math.max(0, RINGS - 1) * GAP;
  const ringThick = Math.max(1, usable / RINGS);

  const sections = Math.max(1, plan.sections);
  const sectionAngles = Array.from({ length: sections }, (_, i) => (i * 360) / sections);
  const sectionStep = 360 / sections;

  const [hoverInfo, setHoverInfo] = useState<{ name: string; congestion: number } | null>(null);

  const toRad = (d:number)=> (d*Math.PI)/180;
  const sectorPath = (cx:number, cy:number, r0:number, r1:number, a0:number, a1:number) => {
    const ra0 = toRad(a0), ra1 = toRad(a1);
    const p0x = cx + r0 * Math.cos(ra0), p0y = cy + r0 * Math.sin(ra0);
    const p1x = cx + r1 * Math.cos(ra0), p1y = cy + r1 * Math.sin(ra0);
    const p2x = cx + r1 * Math.cos(ra1), p2y = cy + r1 * Math.sin(ra1);
    const p3x = cx + r0 * Math.cos(ra1), p3y = cy + r0 * Math.sin(ra1);
    const largeArc = (a1 - a0) % 360 > 180 ? 1 : 0;
    return `
      M ${p0x} ${p0y}
      L ${p1x} ${p1y}
      A ${r1} ${r1} 0 ${largeArc} 1 ${p2x} ${p2y}
      L ${p3x} ${p3y}
      A ${r0} ${r0} 0 ${largeArc} 0 ${p0x} ${p0y}
      Z
    `;
  };

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-gray-300 bg-white">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <defs>
          {isCircle
            ? <clipPath id="venueClip"><circle cx={geom.cx} cy={geom.cy} r={geom.r} /></clipPath>
            : <clipPath id="venueClip"><rect x={geom.x0} y={geom.y0} width={geom.x1-geom.x0} height={geom.y1-geom.y0} rx={1.2} ry={1.2}/></clipPath>}
          <pattern id="exitHatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="4" fill="rgba(244,63,94,0.12)" />
          </pattern>
        </defs>

        {isCircle
          ? <circle cx={geom.cx} cy={geom.cy} r={geom.r} fill="#fff"/>
          : <rect x={geom.x0} y={geom.y0} width={geom.x1-geom.x0} height={geom.y1-geom.y0} fill="#fff" stroke="#e5e7eb" strokeWidth={0.8}/>}

        <g clipPath="url(#venueClip)">
          {/* rings - only for circular layouts */}
          {isCircle && Array.from({ length: RINGS }, (_, li) => {
            const rIn = rVoid + li * (ringThick + GAP);
            const rOut = rIn + ringThick;
            return (
              <g key={`ring-${li}`}>
                <circle cx={geom.cx} cy={geom.cy} r={rIn} fill="none" stroke="#cbd5e1" strokeOpacity={0.35} strokeWidth={0.5} strokeDasharray="1,1" />
                <circle cx={geom.cx} cy={geom.cy} r={rOut} fill="none" stroke="#cbd5e1" strokeOpacity={0.6} strokeWidth={0.5} />
              </g>
            );
          })}

          {/* Section dividers - only for circular layouts */}
          {isCircle && sectionAngles.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = geom.cx + (rVoid - 0.5) * Math.cos(rad);
            const y1 = geom.cy + (rVoid - 0.5) * Math.sin(rad);
            const x2 = geom.cx + (geom.r - 0.5) * Math.cos(rad);
            const y2 = geom.cy + (geom.r - 0.5) * Math.sin(rad);
            return (
              <g key={`sec-line-${i}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeOpacity={0.45} strokeWidth={0.35} strokeDasharray="2,1" />
              </g>
            );
          })}

          {/* Section hover targets - only for circular layouts */}
          {isCircle && sectionAngles.map((angle, i) => {
            const a0 = angle;
            const a1 = angle + sectionStep;
            const pct = sectionAgg[i] ?? 0;
            return (
              <g
                key={`sec-hover-${i}`}
                onMouseEnter={() => setHoverInfo({ name: `Section ${i + 1}`, congestion: pct })}
                onMouseMove={() => setHoverInfo({ name: `Section ${i + 1}`, congestion: pct })}
                onMouseLeave={() => setHoverInfo(null)}
                style={{ cursor: "pointer" }}
              >
                <path d={sectorPath(geom.cx, geom.cy, rVoid, geom.r, a0, a1)} fill="transparent" stroke="transparent" />
              </g>
            );
          })}

          {/* Polygons colored by congestion (visual only, NOT obstacles) */}
          {zones.map(z => {
            const pts = z.points.map(([x,y])=>`${x},${y}`).join(" ");
             const fillBase = bandedColor(z.congestion);
            const fillOpacity = 0.35 + (z.congestion/100)*0.25;
             const strokeProps = isExitPhase
               ? { stroke: "#7f1d1d", strokeOpacity: 0.35, strokeWidth: 0.35, strokeDasharray: "1.2 1" }
               : { stroke: "#0b1220", strokeOpacity: 0.25, strokeWidth: 0.25 };
             return (
              <g
                key={z.id}
                   onMouseEnter={() => setHoverInfo({ name: z.name, congestion: z.congestion })}
                   onMouseMove={() => setHoverInfo({ name: z.name, congestion: z.congestion })}
                   onMouseLeave={() => setHoverInfo(null)}
                   style={{ cursor: "pointer" }}
              >
                <polygon points={pts} fill={fillBase} opacity={fillOpacity} {...strokeProps} />
                 {isExitPhase ? <polygon points={pts} fill="url(#exitHatch)" opacity={0.9} pointerEvents="none" /> : null}
               </g>
             );
           })}

          {/* toilets */}
          {(plan.toiletsList ?? []).map((t, i) => (
            <g key={t.id}
                 onMouseEnter={() => setHoverInfo({ name: t.label ?? t.id, congestion: toiletCongestions[i] ?? 0 })}
                 onMouseMove={() => setHoverInfo({ name: t.label ?? t.id, congestion: toiletCongestions[i] ?? 0 })}
               onMouseLeave={() => setHoverInfo(null)} style={{ cursor: "pointer" }}>
                 <circle
                   cx={t.position[0]}
                   cy={t.position[1]}
                r={2.0}
                   fill="none"
                   stroke={bandedColor(toiletCongestions[i])}
                   strokeWidth={0.5}
                   opacity={0.9}
                 >
                <animate attributeName="r" values="2;3;2" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite" />
                 </circle>
                 <text x={t.position[0]} y={t.position[1]} fontSize={3} textAnchor="middle" dominantBaseline="central">🚻</text>
               </g>
          ))}

          {/* walkers */}
           <g>
            {walkers.map(w => (
              <circle key={w.id} cx={w.x} cy={w.y} r={0.55} fill={w.phase==="exits" ? "#ef4444" : "#2563eb"} opacity={0.95} />
             ))}
           </g>
         </g>

         {/* exits pins + current loads */}
         {(plan.exitsList ?? []).map((e) => {
          const key = normalizeGateKey((e.name?.match(/\b(\w+)\b$/)?.[1] ?? e.id) as string);
          const ppl = gateLoads[key] ?? 0;

           const dotFill = isExitPhase ? "#ef4444" : "#10b981";
           return (
             <g key={e.id}>
               <circle cx={e.position[0]} cy={e.position[1]} r={0.95} fill={dotFill} stroke="#0b1220" strokeOpacity={0.25} strokeWidth={0.2} />
               <g transform={`translate(${e.position[0] + 1.8}, ${e.position[1] - 1.8})`}>
                 <rect rx={0.8} ry={0.8} width={12} height={4} fill="#111827" opacity={0.85} />
                <text x={6} y={2.6} textAnchor="middle" fontSize={1.8} fill="#f9fafb">{Math.round(ppl).toLocaleString()}</text>
               </g>
             </g>
           );
         })}
       </svg>
 
      {/* unified hover tooltip */}
      {hoverInfo ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-sm shadow">
          <div className="font-semibold">{hoverInfo.name}</div>
          <div>
            Congestion:{" "}
            <span style={{ color: bandedColor(hoverInfo.congestion) }}>{Math.round(hoverInfo.congestion)}%</span>
          </div>
        </div>
      ) : null}
    </div>
   );
 };

/* ========= Dummy plan (updated to match forecast data) ========= */
const DUMMY_PLAN: StadiumMapJSON = {
  shape: "rect",
  rectBounds: { x0: 3, y0: 3, x1: 97, y1: 59.5 },
  exits: 7,
  zones: [],
  layers: 3,
  sections: 12,
  exitsList: [
    { id: "1", name: "Gate 1", capacity: 50, position: [50, 2.2] },
    { id: "2", name: "Gate 2", capacity: 50, position: [79.05, 31.25] },
    { id: "A", name: "Gate A", capacity: 800, position: [50, 60.3] },
    { id: "B", name: "Gate B", capacity: 800, position: [20.95, 31.25] },
    { id: "C", name: "Gate C", capacity: 800, position: [50, 2.2] },
    { id: "D", name: "Gate D", capacity: 800, position: [79.05, 31.25] },
    { id: "E", name: "Gate E", capacity: 800, position: [50, 60.3] },
  ],
  toiletsList: [
    { id: "wc-1758421268271", label: "WC 1", fixtures: 0, position: [60.013, 15.641] },
    { id: "wc-1758421268891", label: "WC 2", fixtures: 0, position: [37.369, 16.688] },
    { id: "wc-1758421269500", label: "WC 3", fixtures: 0, position: [40.118, 37.107] },
  ],
};

