import React from "react";
import {
  Map,
  Triangle,
  Download,
  RotateCcw,
  Square,
  MousePointer2,
  Plus,
  Minus,
} from "lucide-react";
// If you already have helpers, keep these imports.
// (Not required by this component to function.)
import { addToilet } from "../../utils/toiletutils";
import type { Toilet } from "../../utils/toiletutils";

/* =========================
   Types
   ========================= */
type PctPoint = [number, number];

type EditorZone = {
  id: string;
  name: string;
  layer: number;
  points: PctPoint[]; // polygon
  // curved label metadata (circular only)
  startDeg?: number;
  endDeg?: number;
  sectionIndex?: number; // 1-based
};

type EditorExit = {
  id: string;
  name: string;
  position: PctPoint;
  capacity?: number; // persons per hour (editable)
};

export type StadiumMapJSON = {
  sections: number;
  layers: number;
  exits: number;
  zones: { id: string; name: string; layer: number; points: PctPoint[] }[];
  exitsList: { id: string; name: string; position: PctPoint; capacity?: number }[];
  toiletsList?: { id: string; position: PctPoint; label?: string; fixtures?: number }[];
};

/* =========================
   ViewBox + Geometry helpers
   ========================= */
const vbW = 100;
const vbH = 62.5;

const CIRCLE_MARGIN = 3; // margin from edges
const ANG_GAP = 2; // small angular gap between sections (degrees)
const EXIT_DEFAULT_CAP = 800; // persons/hour default
const TOILET_HIT_R = 2.0; // svg units for click hit-testing

function circleOuterRadius(): number {
  return Math.min(vbW / 2 - CIRCLE_MARGIN, vbH / 2 - CIRCLE_MARGIN);
}
function circleCenter(): [number, number] {
  return [50, 31.25];
}

// ---- Limits ----
const LIMITS = {
  LAYERS_MIN: 1,
  LAYERS_MAX: 6,
  SECTIONS_MIN: 1,
  SECTIONS_MAX: 16,
  ROWS_MIN: 1,
  ROWS_MAX: 5,
  COLS_MIN: 1,
  COLS_MAX: 8,
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/** Pack concentric rings inside a single outer circle. */
function computeRingPack(layers: number, voidRatio = 0.35, gap = 1.6) {
  const R = circleOuterRadius();
  const [cx, cy] = circleCenter();
  const rVoid = Math.max(4, R * voidRatio);
  const usable = R - rVoid - Math.max(0, layers - 1) * gap;
  const thick = layers > 0 ? Math.max(1, usable / layers) : 0;
  return { cx, cy, R, rVoid, thick, gap };
}

/* =========================
   Shape helpers
   ========================= */
function ringSectorPoints(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
  steps = 16
): PctPoint[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pts: PctPoint[] = [];
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

function rectCell(x: number, y: number, w: number, h: number): PctPoint[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** SVG arc path for a circle center (cx,cy), radius r, start->end in degrees (clockwise). */
function arcPathD(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a0 = toRad(startDeg);
  const a1 = toRad(endDeg);
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const delta = Math.abs(endDeg - startDeg);
  const largeArc = delta > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} ${sweep} ${x1} ${y1}`;
}

/* =========================
   Component
   ========================= */
type LayoutMode = "circular" | "rect" | "custom";

const StadiumMapEditor: React.FC<{
  initialLayers?: number;
  onChange?: (json: StadiumMapJSON) => void;
}> = ({ initialLayers = 2, onChange }) => {
  // UI State
  const [layout, setLayout] = React.useState<LayoutMode>("circular");

  // Per-layout toilets (so each layout’s toilets “stick” to that layout)
  const [toiletsByLayout, setToiletsByLayout] = React.useState<
    Record<LayoutMode, Toilet[]>
  >({
    circular: [],
    rect: [],
    custom: [],
  });
  const toilets = toiletsByLayout[layout]; // active list for current layout
  const [hoverToiletId, setHoverToiletId] = React.useState<string | null>(null);

  // Circular config
  const [layers, setLayers] = React.useState<number>(
    clamp(Math.max(initialLayers, 1), LIMITS.LAYERS_MIN, LIMITS.LAYERS_MAX)
  );
  const [sectionsPerLayer, setSectionsPerLayer] = React.useState<number[]>(
    Array.from({ length: layers }, (_, i) =>
      clamp(i === 0 ? 1 : 4, LIMITS.SECTIONS_MIN, LIMITS.SECTIONS_MAX)
    )
  );

  // Rect config
  const [rows, setRows] = React.useState<number>(2);
  const [cols, setCols] = React.useState<number>(3);

  // Custom shapes + free exits
  const [zones, setZones] = React.useState<EditorZone[]>([]);
  const [exits, setExits] = React.useState<EditorExit[]>([]);

  // Tools
  const [tool, setTool] = React.useState<
    "idle" | "draw-section" | "add-exit" | "add-rect" | "move" | "add-toilet"
  >("idle");

  // Drafting (free polygon for custom)
  const [draftPoints, setDraftPoints] = React.useState<PctPoint[]>([]);
  const [draftLayer, setDraftLayer] = React.useState<number>(1);
  const [draftName, setDraftName] = React.useState<string>("");

  // Drag state (custom rectangles)
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const dragStartRef = React.useRef<{ id: string; start: [number, number] } | null>(
    null
  );

  /* =========================
     Candidate exits
     ========================= */
  const candidateExits = React.useMemo<PctPoint[]>(() => {
    if (layout === "circular") {
      const { cx, cy, R } = computeRingPack(layers, 0.35, 1.6);
      const N = 16;
      const OFFSET = 0.8;
      return Array.from({ length: N }, (_, i) => {
        const a = (i * 360) / N;
        const rad = (a * Math.PI) / 180;
        const r = R + OFFSET;
        return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
      });
    }
    if (layout === "rect") {
      const inset = 5;
      const left = inset,
        right = vbW - inset,
        top = inset,
        bottom = vbH - inset;
      const spots: PctPoint[] = [];
      for (let i = 1; i <= 4; i++) {
        const x = left + (i * (right - left)) / 5;
        spots.push([x, top - 0.3]);
        spots.push([x, bottom + 0.3]);
      }
      for (let i = 1; i <= 2; i++) {
        const y = top + (i * (bottom - top)) / 3;
        spots.push([left - 0.3, y]);
        spots.push([right + 0.3, y]);
      }
      return spots;
    }
    return [];
  }, [layout, layers]);

  /* =========================
     Fixed zones (circular/rect)
     ========================= */
  const fixedZones = React.useMemo<EditorZone[]>(() => {
    if (layout === "circular") {
      const { cx, cy, rVoid, thick, gap } = computeRingPack(layers, 0.35, 1.6);
      const out: EditorZone[] = [];
      for (let li = 0; li < layers; li++) {
        const rIn = rVoid + li * (thick + gap);
        const rOut = rIn + thick;
        const S = Math.max(1, sectionsPerLayer[li] ?? 1);
        const step = 360 / S;
        for (let s = 0; s < S; s++) {
          const startDeg = -90 + s * step + ANG_GAP;
          const endDeg = -90 + (s + 1) * step - ANG_GAP;
          const pts = ringSectorPoints(cx, cy, rIn, rOut, startDeg, endDeg, 18);
          out.push({
            id: `L${li + 1}-S${s + 1}`,
            name: `Layer ${li + 1} · Section ${s + 1}`,
            layer: li + 1,
            points: pts,
            startDeg,
            endDeg,
            sectionIndex: s + 1,
          });
        }
      }
      return out;
    }
    if (layout === "rect") {
      const inset = 5;
      const W = vbW - inset * 2;
      const H = vbH - inset * 2;
      const cw = W / Math.max(cols, 1);
      const ch = H / Math.max(rows, 1);
      const out: EditorZone[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          out.push({
            id: `R${r + 1}C${c + 1}`,
            name: `R${r + 1} · C${c + 1}`,
            layer: 1,
            points: rectCell(inset + c * cw, inset + r * ch, cw, ch),
          });
        }
      }
      return out;
    }
    return [];
  }, [layout, layers, sectionsPerLayer, rows, cols]);

  const effectiveZones: EditorZone[] = layout === "custom" ? zones : fixedZones;
  const effectiveExits: EditorExit[] = exits;

  /* =========================
     Toilets helpers
     ========================= */
  const setToiletsForLayout = (mode: LayoutMode, updater: (prev: Toilet[]) => Toilet[]) =>
    setToiletsByLayout((prev) => ({
      ...prev,
      [mode]: updater(prev[mode]),
    }));

  const addToiletAt = (p: PctPoint) => {
    // If you have a helper creator, you can call it here instead:
    // const t = addToilet(p); // ensure your util returns {id, position, ...}
    const t: Toilet = {
      id: `wc-${Date.now()}`,
      position: p,
      label: `WC ${toilets.length + 1}`,
      fixtures: 0,
    };
    setToiletsForLayout(layout, (prev) => [...prev, t]);
  };

  const removeToiletById = (id: string) => {
    setToiletsForLayout(layout, (prev) => prev.filter((x) => x.id !== id));
  };

  const findNearestToilet = (p: PctPoint, list: Toilet[]) => {
    let best: { idx: number; dist2: number } | null = null;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const dx = t.position[0] - p[0];
      const dy = t.position[1] - p[1];
      const d2 = dx * dx + dy * dy;
      if (best === null || d2 < best.dist2) best = { idx: i, dist2: d2 };
    }
    if (!best) return null;
    return Math.sqrt(best.dist2) <= TOILET_HIT_R ? list[best.idx] : null;
  };

  // Export JSON
  const exportJSON: StadiumMapJSON = React.useMemo(() => {
    const maxLayer =
      effectiveZones.length
        ? Math.max(...effectiveZones.map((z) => z.layer))
        : layout === "rect"
        ? 1
        : Math.max(layers, 1);

    return {
      sections: effectiveZones.length,
      layers: maxLayer,
      exits: effectiveExits.length,
      zones: effectiveZones.map(({ id, name, layer, points }) => ({
        id,
        name,
        layer,
        points,
      })),
      exitsList: effectiveExits.map((e) => ({
        id: e.id,
        name: e.name,
        position: e.position,
        capacity: e.capacity ?? EXIT_DEFAULT_CAP,
      })),
      // ✅ Export toilets for the CURRENT layout
      toiletsList: toilets.map((t) => ({
        id: t.id,
        position: t.position,
        label: t.label,
        fixtures: t.fixtures,
      })),
    };
  }, [effectiveZones, effectiveExits, layers, layout, toilets]);

  React.useEffect(() => {
    onChange?.(exportJSON);
  }, [exportJSON, onChange]);

  /* ============ Canvas helpers ============ */
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const toPct = (
    evt: React.MouseEvent<SVGSVGElement, MouseEvent>
  ): PctPoint | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * vbW;
    const y = ((evt.clientY - rect.top) / rect.height) * vbH;
    return [x, y];
  };

  /* ============ Interactions ============ */
  const onCanvasClick = (evt: React.MouseEvent<SVGSVGElement>) => {
    const p = toPct(evt);
    if (!p) return;

    // Toilets: toggle add/remove on click (per current layout)
    if (tool === "add-toilet") {
      const hit = findNearestToilet(p, toilets);
      if (hit) removeToiletById(hit.id);
      else addToiletAt(p);
      return;
    }

    // Exits
    if (tool === "add-exit") {
      if (layout === "custom") {
        const id = `exit-${Date.now()}`;
        setExits((prev) => [
          ...prev,
          {
            id,
            name: `Exit ${prev.length + 1}`,
            position: p,
            capacity: EXIT_DEFAULT_CAP,
          },
        ]);
        return;
      }
      let best: { idx: number; dist: number } | null = null;
      for (let i = 0; i < candidateExits.length; i++) {
        const q = candidateExits[i];
        const dx = q[0] - p[0];
        const dy = q[1] - p[1];
        const d2 = dx * dx + dy * dy;
        if (best === null || d2 < best.dist) {
          best = { idx: i, dist: d2 };
        }
      }
      if (best !== null && Math.sqrt(best.dist) < 2.5) {
        const snap = candidateExits[best.idx];
        const key = `${snap[0].toFixed(2)},${snap[1].toFixed(2)}`;
        const existingIdx = exits.findIndex(
          (e) =>
            `${e.position[0].toFixed(2)},${e.position[1].toFixed(2)}` === key
        );
        if (existingIdx >= 0) {
          setExits((prev) => prev.filter((_, i) => i !== existingIdx));
        } else {
          const id = `exit-${Date.now()}`;
          setExits((prev) => [
            ...prev,
            { id, name: `Exit ${prev.length + 1}`, position: snap },
          ]);
        }
      }
      return;
    }

    if (layout === "custom" && tool === "draw-section") {
      setDraftPoints((pts) => [...pts, p]);
      return;
    }
  };

  const addRectZone = () => {
    const w = 12,
      h = 8;
    const x = vbW / 2 - w / 2;
    const y = vbH / 2 - h / 2;
    const id = `rect-${Date.now()}`;
    setZones((prev) => [
      ...prev,
      {
        id,
        name: `Rect ${prev.length + 1}`,
        layer: 1,
        points: rectCell(x, y, w, h),
      },
    ]);
  };

  const onZoneMouseDown = (zid: string, evt: React.MouseEvent<SVGGElement>) => {
    if (!(layout === "custom" && tool === "move")) return;
    const p = toPct(evt as unknown as React.MouseEvent<SVGSVGElement>);
    if (!p) return;
    setDraggingId(zid);
    dragStartRef.current = { id: zid, start: p };
  };

  const onCanvasMouseMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    if (
      !(
        layout === "custom" &&
        tool === "move" &&
        draggingId &&
        dragStartRef.current
      )
    )
      return;
    const p = toPct(evt);
    if (!p) return;
    const prev = dragStartRef.current.start;
    const dx = p[0] - prev[0];
    const dy = p[1] - prev[1];
    setZones((zs) =>
      zs.map((z) =>
        z.id === draggingId
          ? { ...z, points: z.points.map(([x, y]) => [x + dx, y + dy] as PctPoint) }
          : z
      )
    );
    dragStartRef.current = { id: draggingId, start: p };
  };

  const onCanvasMouseUp = () => {
    setDraggingId(null);
    dragStartRef.current = null;
  };

  const onCanvasMouseLeave = () => {
    setDraggingId(null);
    dragStartRef.current = null;
  };

  const finishSection = () => {
    if (draftPoints.length < 3) return;
    const id = `sec-${Date.now()}`;
    const name = draftName.trim() || `Custom ${zones.length + 1}`;
    setZones((prev) => [
      ...prev,
      { id, name, layer: draftLayer || 1, points: draftPoints },
    ]);
    setDraftPoints([]);
    setDraftName("");
    setTool("idle");
  };

  const clearDraft = () => setDraftPoints([]);
  const removeLastPoint = () =>
    setDraftPoints((pts) => (pts.length ? pts.slice(0, -1) : pts));

  const clearAll = () => {
    setZones([]);
    setExits([]);
    setDraftPoints([]);
    setDraftName("");
    setTool("idle");
    // keep toilets — they are per-layout and should persist by design
  };

  React.useEffect(() => {
    setSectionsPerLayer((prev) => {
      const next = [...prev];
      // Extend or shrink to match layers
      if (layers > next.length) {
        while (next.length < layers) {
          next.push(clamp(4, LIMITS.SECTIONS_MIN, LIMITS.SECTIONS_MAX));
        }
      } else {
        next.length = layers;
      }
      // Clamp each layer’s sections
      for (let i = 0; i < next.length; i++) {
        next[i] = clamp(
          Number.isFinite(next[i]) ? next[i] : 1,
          LIMITS.SECTIONS_MIN,
          LIMITS.SECTIONS_MAX
        );
      }
      return next;
    });
  }, [layers]);

  // Colors
  const Z_FILL = "rgba(59,130,246,0.25)";
  const Z_STROKE = "#2563eb";
  const EXIT_FILL = "#ef4444";
  const BG = "#ffffff";
  const BORDER = "#e5e7eb";

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Stadium Map Editor
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Layout Type
                </label>
                <select
                  value={layout}
                  onChange={(e) => {
                    const v = e.target.value as LayoutMode;
                    setLayout(v);
                    setTool("idle");
                    setDraftPoints([]);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="circular">Circular</option>
                  <option value="rect">Rectangular</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {layout === "circular" && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Layers</span>
                    <div className="flex items-center border rounded-md">
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        onClick={() =>
                          setLayers((n) =>
                            clamp(n - 1, LIMITS.LAYERS_MIN, LIMITS.LAYERS_MAX)
                          )
                        }
                        disabled={layers <= LIMITS.LAYERS_MIN}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center">
                        {layers}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        onClick={() =>
                          setLayers((n) =>
                            clamp(n + 1, LIMITS.LAYERS_MIN, LIMITS.LAYERS_MAX)
                          )
                        }
                        disabled={layers >= LIMITS.LAYERS_MAX}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: layers }, (_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">
                          L{i + 1} Sections
                        </span>
                        <input
                          type="number"
                          min={LIMITS.SECTIONS_MIN}
                          max={LIMITS.SECTIONS_MAX}
                          value={sectionsPerLayer[i] ?? LIMITS.SECTIONS_MIN}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10);
                            const v = clamp(
                              Number.isFinite(raw) ? raw : LIMITS.SECTIONS_MIN,
                              LIMITS.SECTIONS_MIN,
                              LIMITS.SECTIONS_MAX
                            );
                            setSectionsPerLayer((prev) => {
                              const next = [...prev];
                              next[i] = v;
                              return next;
                            });
                          }}
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {layout === "rect" && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Rows</span>
                    <input
                      type="number"
                      min={LIMITS.ROWS_MIN}
                      max={LIMITS.ROWS_MAX}
                      value={rows}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        setRows(
                          clamp(
                            Number.isFinite(raw) ? raw : LIMITS.ROWS_MIN,
                            LIMITS.ROWS_MIN,
                            LIMITS.ROWS_MAX
                          )
                        );
                      }}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Columns</span>
                    <input
                      type="number"
                      min={LIMITS.COLS_MIN}
                      max={LIMITS.COLS_MAX}
                      value={cols}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        setCols(
                          clamp(
                            Number.isFinite(raw) ? raw : LIMITS.COLS_MIN,
                            LIMITS.COLS_MIN,
                            LIMITS.COLS_MAX
                          )
                        );
                      }}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>

                  <span className="text-xs text-gray-500">
                    (Rows {LIMITS.ROWS_MIN}–{LIMITS.ROWS_MAX}, Cols{" "}
                    {LIMITS.COLS_MIN}–{LIMITS.COLS_MAX})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTool((t) => (t === "add-exit" ? "idle" : "add-exit"))}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                tool === "add-exit"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
              }`}
              title={
                layout === "custom"
                  ? "Click anywhere to place exit"
                  : "Click highlighted spots to place/remove exit"
              }
            >
              <Triangle className="h-4 w-4" />
              {tool === "add-exit" ? "Placing Exits" : "Add Exit"}
            </button>

            <button
              type="button"
              onClick={() =>
                setTool((t) => (t === "add-toilet" ? "idle" : "add-toilet"))
              }
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                tool === "add-toilet"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
              }`}
              title="Click anywhere to place a toilet"
            >
              🚻
              {tool === "add-toilet" ? "Placing Toilets" : "Add Toilet"}
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
           
          </div>
        </div>

        {/* Custom layout tools */}
        {layout === "custom" && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Tools</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTool((t) => (t === "add-rect" ? "idle" : "add-rect"))}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  tool === "add-rect"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Square className="h-4 w-4" /> Rectangle
              </button>
              <button
                type="button"
                onClick={() =>
                  setTool((t) => (t === "draw-section" ? "idle" : "draw-section"))
                }
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  tool === "draw-section"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Map className="h-4 w-4" /> Polygon
              </button>
              <button
                type="button"
                onClick={() => setTool((t) => (t === "move" ? "idle" : "move"))}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  tool === "move"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <MousePointer2 className="h-4 w-4" /> Move
              </button>

              {(tool === "add-rect" ||
                (tool === "draw-section" && draftPoints.length >= 3)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (tool === "add-rect") {
                      addRectZone();
                    } else if (tool === "draw-section") {
                      finishSection();
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Draft meta (custom polygon) */}
      {layout === "custom" && tool === "draw-section" && (
        <div className="bg-white p-4 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Name
            </label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g., Section 132"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layer
            </label>
            <input
              type="number"
              min={1}
              value={draftLayer}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                setDraftLayer(Number.isFinite(raw) ? raw : 1);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={removeLastPoint}
              disabled={!draftPoints.length}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Undo Last
            </button>
            <button
              type="button"
              onClick={clearDraft}
              disabled={!draftPoints.length}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={finishSection}
              disabled={draftPoints.length < 3}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Finish
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="relative w-full aspect-[16/10]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            onClick={onCanvasClick}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={() => {
              setDraggingId(null);
              dragStartRef.current = null;
            }}
          >
            {/* ==== CIRCULAR ONLY: defs + circle frame ==== */}
            {layout === "circular" && (
              <defs>
                <clipPath id="stadiumClip">
                  {(() => {
                    const { cx, cy, R } = computeRingPack(layers, 0.35, 1.6);
                    return <circle cx={cx} cy={cy} r={R} />;
                  })()}
                </clipPath>
              </defs>
            )}

            {/* ==== CIRCULAR ONLY: outer circle frame/background ==== */}
            {layout === "circular" &&
              (() => {
                const { cx, cy, R } = computeRingPack(layers, 0.35, 1.6);
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={R}
                    fill={BG}
                    stroke={BORDER}
                    strokeWidth={0.6}
                  />
                );
              })()}

            {/* ==== ZONES ==== */}
            {layout === "circular" ? (
              <g clipPath="url(#stadiumClip)">
                {fixedZones.map((z) => {
                  const { cx, cy } = computeRingPack(layers, 0.35, 1.6);
                  // mid radius of this wedge for text path
                  const rMid =
                    z.points.reduce((acc, [x, y]) => {
                      const dx = x - cx;
                      const dy = y - cy;
                      return acc + Math.hypot(dx, dy);
                    }, 0) / z.points.length;

                  const pathId = `arc-${z.id}`;
                  const startDeg = z.startDeg ?? -90;
                  const endDeg = z.endDeg ?? -60;
                  const d = arcPathD(cx, cy, rMid, startDeg, endDeg);

                  return (
                    <g
                      key={z.id}
                      onMouseDown={(e) => onZoneMouseDown(z.id, e)}
                      style={{ cursor: "default" }}
                    >
                      <polygon
                        points={z.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
                        fill={Z_FILL}
                        stroke={Z_STROKE}
                        strokeWidth={0.4}
                      />
                      <defs>
                        <path id={pathId} d={d} />
                      </defs>
                      <text fontSize={2.2} fill="#111827" fontWeight="bold">
                        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                          {`S${z.sectionIndex ?? 1}`}
                        </textPath>
                      </text>
                    </g>
                  );
                })}
              </g>
            ) : (
              // RECT or CUSTOM zones
              <>
                {(layout === "custom" ? zones : fixedZones).map((z) => (
                  <g
                    key={z.id}
                    onMouseDown={(e) => onZoneMouseDown(z.id, e)}
                    style={{ cursor: layout === "custom" && tool === "move" ? "move" : "default" }}
                  >
                    <polygon
                      points={z.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
                      fill={Z_FILL}
                      stroke={Z_STROKE}
                      strokeWidth={0.4}
                    />
                    <text
                      x={z.points.reduce((s, p) => s + p[0], 0) / z.points.length}
                      y={z.points.reduce((s, p) => s + p[1], 0) / z.points.length}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={2.2}
                      fill="#111827"
                      fontWeight="bold"
                    >
                      {z.name}
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* ==== EXITS (rendered outside clipped area for circular) ==== */}
            {exits.map((e) => (
              <g key={e.id}>
                <circle cx={e.position[0]} cy={e.position[1]} r={1.2} fill={EXIT_FILL} />
                {/* label on hover only? If you want capacity on hover, add hover state like exitsHoverId */}
                {/* Keeping text hidden per your last change */}
              </g>
            ))}

            {/* ==== TOILETS (only show in circular) ==== */}
            {layout === "circular" &&
              toilets.map((t) => (
                <g
                  key={t.id}
                  onMouseEnter={() => setHoverToiletId(t.id)}
                  onMouseLeave={() => setHoverToiletId(null)}
                  style={{ cursor: tool === "add-toilet" ? "pointer" : "default" }}
                >
                  <text
                    x={t.position[0]}
                    y={t.position[1]}
                    fontSize={3.2}            // tweak size if you like
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {"🚻"}
                  </text>
                </g>
              ))}

            {/* Draft (custom) */}
            {layout === "custom" && draftPoints.length > 0 && (
              <g>
                <polyline
                  points={draftPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={0.5}
                />
                {draftPoints.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={0.7} fill="#10b981" />
                ))}
              </g>
            )}

            {/* Candidate exit spots (fixed only; works for both circular/rect) */}
            {layout !== "custom" &&
              tool === "add-exit" &&
              candidateExits.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={1.0} fill="rgba(34,197,94,0.6)" />
              ))}
          </svg>

          {/* Helper text */}
          <div className="absolute bottom-3 left-3 text-xs text-gray-600 bg-white/90 backdrop-blur rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
            {layout === "custom"
              ? tool === "add-rect"
                ? "Click 'Confirm' to add a rectangle at the center, then use the Move tool to reposition it"
                : tool === "draw-section"
                ? "Click to add polygon vertices • Click 'Finish' when done"
                : tool === "move"
                ? "Click and drag to move shapes"
                : tool === "add-exit"
                ? "Click anywhere to place an exit"
                : "Select a tool to begin editing"
              : tool === "add-exit"
              ? "Click on a highlighted spot to add/remove an exit"
              : `${layout === "circular" ? "Circular" : "Rectangular"} layout • Adjust settings above`}
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-3 text-xs text-gray-600 bg-white/90 backdrop-blur rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Sections:</div>
              <div>{effectiveZones.length}</div>
              <div className="font-medium">Layers:</div>
              <div>{exportJSON.layers}</div>
              <div className="font-medium">Exits:</div>
              <div>{exits.length}</div>
              {layout === "circular" && (
                <>
                  <div className="font-medium">Toilets:</div>
                  <div>{toilets.length}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {exits.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800">
              Exit Capacity Estimates
            </h3>
            <div className="text-xs text-gray-600">
              Total:&nbsp;
              <span className="font-semibold">
                {exits
                  .reduce(
                    (sum, e) => sum + (e.capacity ?? EXIT_DEFAULT_CAP),
                    0
                  )
                  .toLocaleString()}{" "}
                pax/hr
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {exits.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-3 justify-between rounded-md border border-gray-200 px-3 py-2"
              >
                <div className="text-sm font-medium text-gray-800">{e.name}</div>

                <label className="flex items-center gap-2 text-xs text-gray-700">
                  Capacity (pax/hr)
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={e.capacity ?? EXIT_DEFAULT_CAP}
                    onChange={(ev) => {
                      const raw = parseInt(ev.target.value, 10);
                      const val = Number.isFinite(raw) ? Math.max(0, raw) : 0;
                      setExits((prev) =>
                        prev.map((x) =>
                          x.id === e.id ? { ...x, capacity: val } : x
                        )
                      );
                    }}
                    className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </label>

                <div className="text-xs text-gray-500">
                  ~{Math.round((e.capacity ?? EXIT_DEFAULT_CAP) / 60)} pax/min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON preview */}
   
    </div>
  );
};

export default StadiumMapEditor;
