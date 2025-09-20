import React from "react";
import { Download } from "lucide-react";
import { rectCell, vbW, vbH } from "./StadiumGeometry";
import {
  LIMITS,
  clamp
} from "./stadiumTypes";
import type { StadiumMapJSON, EditorZone, EditorExit } from "./stadiumTypes";


type Props = { value?: StadiumMapJSON; onChange?: (json: StadiumMapJSON) => void };

const RectEditor: React.FC<Props> = ({ onChange }) => {
  const [rows, setRows] = React.useState<number>(3);
  const [cols, setCols] = React.useState<number>(8);
  const [exits] = React.useState<EditorExit[]>([]);

  const zones: EditorZone[] = React.useMemo(() => {
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
          name: `R${r + 1}·C${c + 1}`,
          layer: 1,
          points: rectCell(inset + c * cw, inset + r * ch, cw, ch),
        });
      }
    }
    return out;
  }, [rows, cols]);

  React.useEffect(() => {
    const json: StadiumMapJSON = {
      sections: zones.length,
      layers: 1,
      exits: exits.length,
      zones: zones.map(({ id, name, layer, points }) => ({ id, name, layer, points })),
      exitsList: exits.map((e) => ({ ...e })),
    };
    onChange?.(json);
  }, [zones, exits, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Rows</label>
        <input
          type="number"
          min={LIMITS.ROWS_MIN}
          max={LIMITS.ROWS_MAX}
          value={rows}
          onChange={(e) =>
            setRows(
              clamp(parseInt(e.target.value, 10) || LIMITS.ROWS_MIN, LIMITS.ROWS_MIN, LIMITS.ROWS_MAX)
            )
          }
          className="w-20 px-2 py-1 border rounded"
        />
        <label className="text-sm">Cols</label>
        <input
          type="number"
          min={LIMITS.COLS_MIN}
          max={LIMITS.COLS_MAX}
          value={cols}
          onChange={(e) =>
            setCols(
              clamp(parseInt(e.target.value, 10) || LIMITS.COLS_MIN, LIMITS.COLS_MIN, LIMITS.COLS_MAX)
            )
          }
          className="w-20 px-2 py-1 border rounded"
        />

        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 border rounded"
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
            a.download = `rect-map-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden bg-white">
        <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto">
          {zones.map((z) => (
            <g key={z.id}>
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
        </svg>
      </div>
    </div>
  );
};

export default RectEditor;
