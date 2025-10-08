/**
 * Zod schemas for strict validation of stadium layout data
 * Enforces bounds, types, and business rules
 */

import { z } from 'zod';
import { StadiumMapJSON, InOutForecast, ValidationError } from '../types/stadium';

// Coordinate validation with clamping to [0..100] × [0..62.5]
const pctPointSchema = z.tuple([z.number(), z.number()])
  .transform(([x, y]) => [
    Math.max(0, Math.min(100, x)),
    Math.max(0, Math.min(62.5, y))
  ] as [number, number]);

// Zone schema with strict validation
const zoneSchema = z.object({
  id: z.string().min(1, "Zone ID is required"),
  name: z.string().min(1, "Zone name is required"),
  layer: z.number().int().min(1, "Layer must be ≥ 1").max(20, "Layer must be ≤ 20"),
  points: z.array(pctPointSchema)
    .min(3, "Zone must have at least 3 points")
    .max(100, "Zone has too many points")
}).strict();

// Exit schema
const exitSchema = z.object({
  id: z.string().min(1, "Exit ID is required"),
  name: z.string().min(1, "Exit name is required"),
  position: pctPointSchema,
  capacity: z.number().int().min(1, "Capacity must be ≥ 1").max(10000, "Capacity must be ≤ 10000").optional()
}).strict();

// Toilet schema
const toiletSchema = z.object({
  id: z.string().min(1, "Toilet ID is required"),
  position: pctPointSchema,
  label: z.string().optional(),
  fixtures: z.number().int().min(1, "Fixtures must be ≥ 1").max(100, "Fixtures must be ≤ 100").optional()
}).strict();

// Main stadium map schema with strict validation
export const stadiumMapSchema = z.object({
  sections: z.number().int().min(1, "Sections must be ≥ 1").max(120, "Sections must be ≤ 120"),
  layers: z.number().int().min(1, "Layers must be ≥ 1").max(20, "Layers must be ≤ 20"),
  exits: z.number().int().min(0, "Exits must be ≥ 0").max(200, "Exits must be ≤ 200").optional(),
  zones: z.array(zoneSchema)
    .max(2000, "Too many zones (max 2000)")
    .default([]),
  exitsList: z.array(exitSchema)
    .max(200, "Too many exits (max 200)")
    .default([]),
  toiletsList: z.array(toiletSchema)
    .max(200, "Too many toilets (max 200)")
    .default([])
}).strict();

// Forecast schema for gate series
const timeFrameSchema = z.object({
  predicted: z.number().finite("Predicted must be finite"),
  timestamp: z.string().regex(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    "Timestamp must be YYYY-MM-DD HH:mm:SS format"
  ),
  dataSource: z.string().min(1, "Data source is required"),
  lower_bound: z.number().finite().optional(),
  upper_bound: z.number().finite().optional()
}).strict();

const gateSeriesSchema = z.object({
  capacity: z.number().int().min(1, "Capacity must be ≥ 1").max(100000, "Capacity must be ≤ 100000"),
  timeFrames: z.array(timeFrameSchema).min(1, "Gate series must have at least one time frame")
}).strict();

export const forecastSchema = z.record(z.string(), gateSeriesSchema);

// Validation helper functions
export function parseStadiumMap(json: unknown): StadiumMapJSON {
  try {
    return stadiumMapSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Validation: ${firstError.path.join('.')} - ${firstError.message}`);
    }
    throw new Error(`Validation: Invalid stadium map data`);
  }
}

export function parseForecast(json: unknown): InOutForecast {
  try {
    return forecastSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Validation: ${firstError.path.join('.')} - ${firstError.message}`);
    }
    throw new Error(`Validation: Invalid forecast data`);
  }
}

// Helper to create validation errors with meaningful messages
export function createValidationError(message: string, path?: string): ValidationError {
  return {
    message: `Validation: ${message}`,
    path,
    code: 'VALIDATION_ERROR'
  };
}

// Coordinate clamping helper
export function clampCoordinates(x: number, y: number): [number, number] {
  return [
    Math.max(0, Math.min(100, x)),
    Math.max(0, Math.min(62.5, y))
  ];
}

// Validate polygon points (minimum 3, no duplicates)
export function validatePolygonPoints(points: [number, number][]): boolean {
  if (points.length < 3) return false;
  
  // Check for duplicate points
  const uniquePoints = new Set(points.map(p => `${p[0]},${p[1]}`));
  return uniquePoints.size === points.length;
}

// Validate layer consistency
export function validateLayerConsistency(zones: { layer: number }[]): boolean {
  if (zones.length === 0) return true;
  
  const layers = zones.map(z => z.layer);
  const minLayer = Math.min(...layers);
  const maxLayer = Math.max(...layers);
  
  // Check for gaps in layer numbering
  for (let i = minLayer; i <= maxLayer; i++) {
    if (!layers.includes(i)) return false;
  }
  
  return true;
}

