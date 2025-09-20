import React from "react";
import { Map, Square, MousePointer2, Download, XCircle } from "lucide-react";
import { vbW, vbH } from "./StadiumGeometry";
import type { StadiumMapJSON, EditorZone, EditorExit, PctPoint } from "./stadiumTypes";



type Props = { value?: StadiumMapJSON; onChange?: (json: StadiumMapJSON) => void };

const CustomEditor: React.FC<Props> = ({ onChange }) => {
  const [zones, setZones] = React.useState<EditorZone[]>([]);
  const [exits, setExits] = React.useState<EditorExit[]>([]);
  const [tool, setTool] = React.useState<"idle" | "add-rect" | "draw" | "move">("idle");
  const [draft, setDraft] = React.useState<PctPoint[]>([]);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const dragStart = React.useRef<PctPoint | null>(null);

  const toPct = (evt: React.MouseEvent) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return [
      ((evt.clientX - r.left) / r.width) * vbW,
      ((evt.clientY - r.top) / r.height) * vbH,
    ] as PctPoint;
  };

  const addRect = () => {
    const w = 12,
      h = 8,
      x = vbW / 2 - w / 2,
      y = vbH / 2 - h / 2;
    setZones((prev) => [
      ...prev,
      {
        id: `rect-${Date.now()}`,
        name: `Rect ${prev.length + 1}`,
        layer: 1,
        points: [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
      },
    ]);
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (tool !== "draw") return;
    setDraft((d) => [...d, toPct(e)]);
  };

  const onMouseDownZone = (id: string, e: React.MouseEvent) => {
    if (tool !== "move") return;
    setDragId(id);
    dragStart.current = toPct(e);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragId || tool !== "move" || !dragStart.current) return;
    const p = toPct(e);
    const dx = p[0] - dragStart.current[0];
    const dy = p[1] - dragStart.current[1];
    setZones((zs) =>
      zs.map((z) =>
        z.id === dragId
          ? { ...z, points: z.points.map(([x, y]) => [x + dx, y + dy] as PctPoint) }
          : z
      )
    );
    dragStart.current = p;
  };
  const onMouseUp = () => {
    setDragId(null);
    dragStart.current = null;
  };

  const finishPolygon = () => {
    if (draft.length >= 3) {
      setZones((prev) => [
        ...prev,
        {
          id: `poly-${Date.now()}`,
          name: `Custom ${prev.length + 1}`,
          layer: 1,
          points: draft,
        },
      ]);
      setDraft([]);
    }
  };

  React.useEffect(() => {
    const json: StadiumMapJSON = {
      sections: zones.length,
      layers: zones.length ? Math.max(...zones.map((z) => z.layer)) : 1,
      exits: exits.length,
      zones: zones.map(({ id, name, layer, points }) => ({ id, name, layer, points })),
      exitsList: exits.map((e) => ({ ...e })),
    };
    onChange?.(json);
  }, [zones, exits, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`px-3 py-2 border rounded ${tool === "add-rect" ? "bg-blue-600 text-white" : ""}`}
          onClick={() => setTool((t) => (t === "add-rect" ? "idle" : "add-rect"))}
        >
          <Square className="h-4 w-4 inline mr-1" /> Rectangle
        </button>
        <button
          className={`px-3 py-2 border rounded ${tool === "draw" ? "bg-blue-600 text-white" : ""}`}
          onClick={() => setTool((t) => (t === "draw" ? "idle" : "draw"))}
        >
          <Map className="h-4 w-4 inline mr-1" /> Polygon
        </button>
        <button
          className={`px-3 py-2 border rounded ${tool === "move" ? "bg-blue-600 text-white" : ""}`}
          onClick={() => setTool((t) => (t === "move" ? "idle" : "move"))}
        >
          <MousePointer2 className="h-4 w-4 inline mr-1" /> Move
        </button>

        {(tool === "add-rect" || (tool === "draw" && draft.length >= 3)) && (
          <button
            className="ml-2 px-3 py-2 rounded bg-green-600 text-white"
            onClick={() => (tool === "add-rect" ? addRect() : finishPolygon())}
          >
            Confirm
          </button>
        )}

        <button
          className="ml-auto px-3 py-2 border rounded"
          onClick={() => {
            setZones([]);
            setExits([]);
            setDraft([]);
          }}
        >
          <XCircle className="h-4 w-4 inline mr-1" /> Reset
        </button>
        <button
          className="px-3 py-2 border rounded"
          onClick={() => {
            const blob = new Blob(
              [
                JSON.stringify(
                  { sections: zones.length, layers: 1, exits: exits.length, zones, exitsList: exits },
                  null,
                  2
                ),
              ],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `custom-map-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4 inline mr-1" /> Export
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-auto"
          onClick={onCanvasClick}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {zones.map((z) => (
            <g
              key={z.id}
              onMouseDown={(e) => onMouseDownZone(z.id, e)}
              style={{ cursor: tool === "move" ? "move" : "default" }}
            >
              <polygon
                points={z.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill="rgba(59,130,246,0.25)"
                stroke="#2563eb"
                strokeWidth={0.4}
              />
              <text
                x={z.points.reduce((s, p) => s + p[0], 0) / z.points.length}
                y={z.points.reduce((s, p) => s + p[1], 0) / z.points.length}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={2.2}
                fill="#111827"
              >
                {z.name}
              </text>
            </g>
          ))}

          {draft.length > 0 && (
            <g>
              <polyline
                points={draft.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill="none"
                stroke="#10b981"
                strokeWidth={0.5}
              />
              {draft.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={0.7} fill="#10b981" />
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default CustomEditor;
