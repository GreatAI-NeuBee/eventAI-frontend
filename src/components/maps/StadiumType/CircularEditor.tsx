import React from "react";
import { Plus, Minus, Download } from "lucide-react";
import {
  ANG_GAP,
  computeRingPack,
  ringSectorPoints,
  vbW,
  vbH,
} from "./StadiumGeometry";
import {
  clamp,
  LIMITS
} from "./stadiumTypes";
import type { StadiumMapJSON, EditorZone, EditorExit } from "./stadiumTypes";


type Props = {
  value?: StadiumMapJSON;
  onChange?: (json: StadiumMapJSON) => void;
};

const CircularEditor: React.FC<Props> = ({ value, onChange }) => {
  const [layers, setLayers] = React.useState<number>(
    clamp(value?.layers ?? 2, LIMITS.LAYERS_MIN, LIMITS.LAYERS_MAX)
  );
  const [sectionsPerLayer, setSectionsPerLayer] = React.useState<number[]>(
    Array.from({ length: layers }, (_, i) =>
      clamp(i === 0 ? 1 : 4, LIMITS.SECTIONS_MIN, LIMITS.SECTIONS_MAX)
    )
  );
  const [exits, setExits] = React.useState<EditorExit[]>([]);

  React.useEffect(() => {
    setSectionsPerLayer((prev) => {
      const next = [...prev];
      if (layers > next.length) while (next.length < layers) next.push(4);
      else next.length = layers;
      for (let i = 0; i < next.length; i++) {
        next[i] = clamp(
          next[i] ?? 1,
          LIMITS.SECTIONS_MIN,
          LIMITS.SECTIONS_MAX
        );
      }
      return next;
    });
  }, [layers]);

  const zones: EditorZone[] = React.useMemo(() => {
    const { cx, cy, rVoid, thick, gap } = computeRingPack(layers);
    const out: EditorZone[] = [];
    for (let li = 0; li < layers; li++) {
      const rIn = rVoid + li * (thick + gap);
      const rOut = rIn + thick;
      const S = Math.max(1, sectionsPerLayer[li] ?? 1);
      const step = 360 / S;
      for (let s = 0; s < S; s++) {
        const start = -90 + s * step + ANG_GAP;
        const end = -90 + (s + 1) * step - ANG_GAP;
        out.push({
          id: `L${li + 1}-S${s + 1}`,
          name: `S${s + 1}`,
          layer: li + 1,
          points: ringSectorPoints(cx, cy, rIn, rOut, start, end, 18),
        });
      }
    }
    return out;
  }, [layers, sectionsPerLayer]);

  const candidateExits = React.useMemo(() => {
    const { cx, cy, R } = computeRingPack(layers);
    const N = 16,
      OFFSET = 0.8;
    return Array.from({ length: N }, (_, i) => {
      const a = (i * 2 * Math.PI) / N;
      return [
        cx + (R + OFFSET) * Math.cos(a),
        cy + (R + OFFSET) * Math.sin(a),
      ] as [number, number];
    });
  }, [layers]);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * vbW;
    const y = ((e.clientY - rect.top) / rect.height) * vbH;

    let best: { idx: number; dist2: number } | null = null;
    candidateExits.forEach((p, idx) => {
      const dx = p[0] - x,
        dy = p[1] - y;
      const d2 = dx * dx + dy * dy;
      if (best === null || d2 < best.dist2) best = { idx, dist2: d2 };
    });
    if (best && Math.sqrt(best.dist2) < 2.5) {
      const snap = candidateExits[best.idx];
      const key = `${snap[0].toFixed(2)},${snap[1].toFixed(2)}`;
      const existing = exits.findIndex(
        (ex) =>
          `${ex.position[0].toFixed(2)},${ex.position[1].toFixed(2)}` === key
      );
      if (existing >= 0)
        setExits((prev) => prev.filter((_, i) => i !== existing));
      else
        setExits((prev) => [
          ...prev,
          { id: `exit-${Date.now()}`, name: `Exit ${prev.length + 1}`, position: snap },
        ]);
    }
  };

  React.useEffect(() => {
    const json: StadiumMapJSON = {
      sections: zones.length,
      layers,
      exits: exits.length,
      zones: zones.map(({ id, name, layer, points }) => ({
        id,
        name,
        layer,
        points,
      })),
      exitsList: exits.map((e) => ({ ...e })),
    };
    onChange?.(json);
  }, [zones, exits, layers, onChange]);

  const { cx, cy, R } = computeRingPack(layers);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Layers</span>
          <button
            className="px-2 py-1 border rounded"
            onClick={() =>
              setLayers((n) => clamp(n - 1, LIMITS.LAYERS_MIN, LIMITS.LAYERS_MAX))
            }
            disabled={layers <= LIMITS.LAYERS_MIN}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-sm w-6 text-center">{layers}</span>
          <button
            className="px-2 py-1 border rounded"
            onClick={() =>
              setLayers((n) => clamp(n + 1, LIMITS.LAYERS_MIN, LIMITS.LAYERS_MAX))
            }
            disabled={layers >= LIMITS.LAYERS_MAX}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: layers }, (_, i) => (
            <label key={i} className="text-xs flex items-center gap-1">
              L{i + 1}
              <input
                type="number"
                min={LIMITS.SECTIONS_MIN}
                max={LIMITS.SECTIONS_MAX}
                value={sectionsPerLayer[i] ?? 1}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10);
                  const v = clamp(
                    Number.isFinite(raw) ? raw : 1,
                    LIMITS.SECTIONS_MIN,
                    LIMITS.SECTIONS_MAX
                  );
                  setSectionsPerLayer((prev) => {
                    const next = [...prev];
                    next[i] = v;
                    return next;
                  });
                }}
                className="w-16 px-2 py-1 border rounded"
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 border rounded"
          onClick={() => {
            const blob = new Blob(
              [
                JSON.stringify(
                  {
                    sections: zones.length,
                    layers,
                    exits: exits.length,
                    zones,
                    exitsList: exits,
                  },
                  null,
                  2
                ),
              ],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `circular-map-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden bg-white">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-auto"
          onClick={handleCanvasClick}
        >
          <defs>
            <clipPath id="clip-circ">
              <circle cx={cx} cy={cy} r={R} />
            </clipPath>
          </defs>

          <circle cx={cx} cy={cy} r={R} fill="#fff" stroke="#e5e7eb" strokeWidth={0.6} />

          <g clipPath="url(#clip-circ)">
            {zones.map((z) => {
              // short label path (curved-ish) along outer arc
              const labelId = `path-${z.id}`;
              const outer = z.points.slice(0, z.points.length / 2); // first half was outer arc
              const p1 = outer[Math.max(1, Math.floor(outer.length * 0.35))];
              const p2 = outer[Math.min(outer.length - 1, Math.floor(outer.length * 0.65))];

              return (
                <g key={z.id}>
                  <polygon
                    points={z.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
                    fill="rgba(59,130,246,0.25)"
                    stroke="#2563eb"
                    strokeWidth={0.4}
                  />
                  <path id={labelId} d={`M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]}`} fill="none" />
                  <text fontSize={2.2} fill="#111827" fontWeight="bold">
                    {/* TS-friendly: xlinkHref */}
                    <textPath xlinkHref={`#${labelId}`} startOffset="50%" textAnchor="middle">
                      {z.name}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>

          {/* candidate spots + exits */}
          {candidateExits.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={1.0} fill="rgba(34,197,94,0.6)" />
          ))}
          {exits.map((e) => (
            <g key={e.id}>
              <circle cx={e.position[0]} cy={e.position[1]} r={1.2} fill="#ef4444" />
              <text x={e.position[0] + 1.8} y={e.position[1]} fontSize={2} fill="#374151" dominantBaseline="middle">
                {e.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default CircularEditor;
