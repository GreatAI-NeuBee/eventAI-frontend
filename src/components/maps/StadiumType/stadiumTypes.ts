// maps/StadiumType/stadiumTypes.ts
export type PctPoint = [number, number];

export type EditorZone = {
  id: string;
  name: string;
  layer: number;
  points: PctPoint[];
};

export type EditorExit = {
  id: string;
  name: string;
  position: PctPoint;
};

export type StadiumMapJSON = {
  sections: number;
  layers: number;
  exits: number;
  zones: { id: string; name: string; layer: number; points: PctPoint[] }[];
  exitsList: { id: string; name: string; position: PctPoint }[];
};

// (optional helpers)
export const LIMITS = {
  LAYERS_MIN: 1, LAYERS_MAX: 8,
  SECTIONS_MIN: 1, SECTIONS_MAX: 24,
  ROWS_MIN: 1, ROWS_MAX: 20,
  COLS_MIN: 1, COLS_MAX: 30,
};
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
