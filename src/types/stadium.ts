/**
 * Shared TypeScript types for stadium layout system
 * Compatible with existing VenueLayoutCard simulation code
 */

export type PctPoint = [number, number];

export type StadiumMapJSON = {
  sections: number;
  layers: number;
  exits?: number;
  zones: { 
    id: string; 
    name: string; 
    layer: number; 
    points: PctPoint[] 
  }[];
  exitsList?: { 
    id: string; 
    name: string; 
    position: PctPoint; 
    capacity?: number 
  }[];
  toiletsList?: { 
    id: string; 
    position: PctPoint; 
    label?: string; 
    fixtures?: number 
  }[];
};

// Gate types for forecast compatibility
export type GateSeries = {
  capacity: number;
  timeFrames: {
    predicted: number;
    timestamp: string;
    dataSource: string;
    lower_bound?: number;
    upper_bound?: number;
  }[];
};

export type InOutForecast = {
  [gateId: string]: GateSeries;
};

// Validation error type
export type ValidationError = {
  message: string;
  path?: string;
  code?: string;
};

// SVG parsing intermediate types
export type SvgNode = {
  tag: string;
  attrs: Record<string, string>;
  children: SvgNode[];
};

export type ParsedZone = {
  id: string;
  name: string;
  layer: number;
  points: PctPoint[];
};

export type ParsedExit = {
  id: string;
  name: string;
  position: PctPoint;
  capacity?: number;
};

export type ParsedToilet = {
  id: string;
  position: PctPoint;
  label?: string;
  fixtures?: number;
};

// ViewBox type for SVG parsing
export type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

