/**
 * SVG to StadiumMapJSON parser with strict validation
 * Converts SVG elements to normalized stadium layout data
 */

import { XMLParser } from 'fast-xml-parser';
import { 
  StadiumMapJSON, 
  SvgNode, 
  ViewBox, 
  ParsedZone, 
  ParsedExit, 
  ParsedToilet,
  PctPoint 
} from '../types/stadium';
import { 
  parseStadiumMap, 
  clampCoordinates, 
  validatePolygonPoints,
  validateLayerConsistency 
} from './schema';

// XML parser configuration
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  preserveOrder: false,
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true
});

/**
 * Parse SVG string and extract viewBox
 */
function parseViewBox(svgString: string): ViewBox {
  const viewBoxMatch = svgString.match(/viewBox\s*=\s*["']([^"']+)["']/);
  if (!viewBoxMatch) {
    throw new Error('SVG must have a viewBox attribute');
  }
  
  const viewBoxValues = viewBoxMatch[1].trim().split(/\s+/);
  if (viewBoxValues.length !== 4) {
    throw new Error('ViewBox must have exactly 4 values: minX minY width height');
  }
  
  const [minX, minY, width, height] = viewBoxValues.map(Number);
  
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(width) || !isFinite(height)) {
    throw new Error('ViewBox values must be finite numbers');
  }
  
  if (width <= 0 || height <= 0) {
    throw new Error('ViewBox width and height must be positive');
  }
  
  return { minX, minY, width, height };
}

/**
 * Normalize coordinates from SVG space to percentage space [0..100] × [0..62.5]
 */
function normalizeCoordinates(
  x: number, 
  y: number, 
  viewBox: ViewBox
): PctPoint {
  const normalizedX = ((x - viewBox.minX) / viewBox.width) * 100;
  const normalizedY = ((y - viewBox.minY) / viewBox.height) * 62.5;
  return clampCoordinates(normalizedX, normalizedY);
}

/**
 * Parse polygon points string into coordinate array
 */
function parsePolygonPoints(pointsString: string): [number, number][] {
  const coords = pointsString.trim().split(/\s+/);
  if (coords.length % 2 !== 0) {
    throw new Error('Polygon points must have even number of coordinates');
  }
  
  const points: [number, number][] = [];
  for (let i = 0; i < coords.length; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    
    if (!isFinite(x) || !isFinite(y)) {
      throw new Error(`Invalid coordinate at position ${i}: ${coords[i]}, ${coords[i + 1]}`);
    }
    
    points.push([x, y]);
  }
  
  return points;
}

/**
 * Recursively collect all nodes from SVG tree
 */
function collectNodes(node: any): SvgNode[] {
  const nodes: SvgNode[] = [];
  
  if (typeof node === 'object' && node !== null) {
    if (Array.isArray(node)) {
      for (const item of node) {
        nodes.push(...collectNodes(item));
      }
    } else {
      const tag = Object.keys(node)[0];
      const content = node[tag];
      
      if (typeof content === 'object' && content !== null) {
        const attrs = content['@_'] || {};
        const children: SvgNode[] = [];
        
        // Collect child nodes
        for (const [key, value] of Object.entries(content)) {
          if (key !== '@_') {
            children.push(...collectNodes({ [key]: value }));
          }
        }
        
        nodes.push({
          tag,
          attrs,
          children
        });
      }
    }
  }
  
  return nodes;
}

/**
 * Extract meta information from SVG
 */
function extractMeta(nodes: SvgNode[]): { layers?: number; sections?: number } {
  const metaNode = nodes.find(node => 
    node.tag === 'g' && node.attrs.id === 'meta'
  );
  
  if (!metaNode) {
    return {};
  }
  
  const layers = metaNode.attrs['data-layers'] ? 
    parseInt(metaNode.attrs['data-layers'], 10) : undefined;
  const sections = metaNode.attrs['data-sections'] ? 
    parseInt(metaNode.attrs['data-sections'], 10) : undefined;
  
  return { layers, sections };
}

/**
 * Parse zones from polygon elements
 */
function parseZones(nodes: SvgNode[], viewBox: ViewBox): ParsedZone[] {
  const zones: ParsedZone[] = [];
  
  for (const node of nodes) {
    if (node.tag === 'polygon' && 
        (node.attrs.class === 'zone' || node.attrs['data-type'] === 'zone')) {
      
      const id = node.attrs['data-id'];
      const name = node.attrs['data-name'];
      const layer = node.attrs['data-layer'];
      const points = node.attrs.points;
      
      if (!id) throw new Error('Zone missing data-id attribute');
      if (!name) throw new Error('Zone missing data-name attribute');
      if (!layer) throw new Error('Zone missing data-layer attribute');
      if (!points) throw new Error('Zone missing points attribute');
      
      const layerNum = parseInt(layer, 10);
      if (!isFinite(layerNum) || layerNum < 1) {
        throw new Error(`Zone ${id}: data-layer must be a positive integer`);
      }
      
      const rawPoints = parsePolygonPoints(points);
      if (!validatePolygonPoints(rawPoints)) {
        throw new Error(`Zone ${id}: invalid polygon points`);
      }
      
      const normalizedPoints = rawPoints.map(([x, y]) => 
        normalizeCoordinates(x, y, viewBox)
      );
      
      zones.push({
        id,
        name,
        layer: layerNum,
        points: normalizedPoints
      });
    }
  }
  
  return zones;
}

/**
 * Parse exits from circle elements
 */
function parseExits(nodes: SvgNode[], viewBox: ViewBox): ParsedExit[] {
  const exits: ParsedExit[] = [];
  
  for (const node of nodes) {
    if (node.tag === 'circle' && 
        (node.attrs.class === 'exit' || node.attrs['data-type'] === 'exit')) {
      
      const id = node.attrs['data-id'];
      const name = node.attrs['data-name'];
      const cx = node.attrs.cx;
      const cy = node.attrs.cy;
      const capacity = node.attrs['data-capacity'];
      
      if (!id) throw new Error('Exit missing data-id attribute');
      if (!name) throw new Error('Exit missing data-name attribute');
      if (!cx || !cy) throw new Error('Exit missing cx/cy attributes');
      
      const x = parseFloat(cx);
      const y = parseFloat(cy);
      
      if (!isFinite(x) || !isFinite(y)) {
        throw new Error(`Exit ${id}: cx/cy must be finite numbers`);
      }
      
      const position = normalizeCoordinates(x, y, viewBox);
      const exit: ParsedExit = { id, name, position };
      
      if (capacity) {
        const capNum = parseInt(capacity, 10);
        if (!isFinite(capNum) || capNum < 1) {
          throw new Error(`Exit ${id}: data-capacity must be a positive integer`);
        }
        exit.capacity = capNum;
      }
      
      exits.push(exit);
    }
  }
  
  return exits;
}

/**
 * Parse toilets from circle elements
 */
function parseToilets(nodes: SvgNode[], viewBox: ViewBox): ParsedToilet[] {
  const toilets: ParsedToilet[] = [];
  
  for (const node of nodes) {
    if (node.tag === 'circle' && 
        (node.attrs.class === 'toilet' || node.attrs['data-type'] === 'toilet')) {
      
      const id = node.attrs['data-id'];
      const cx = node.attrs.cx;
      const cy = node.attrs.cy;
      const label = node.attrs['data-label'];
      const fixtures = node.attrs['data-fixtures'];
      
      if (!id) throw new Error('Toilet missing data-id attribute');
      if (!cx || !cy) throw new Error('Toilet missing cx/cy attributes');
      
      const x = parseFloat(cx);
      const y = parseFloat(cy);
      
      if (!isFinite(x) || !isFinite(y)) {
        throw new Error(`Toilet ${id}: cx/cy must be finite numbers`);
      }
      
      const position = normalizeCoordinates(x, y, viewBox);
      const toilet: ParsedToilet = { id, position };
      
      if (label) toilet.label = label;
      
      if (fixtures) {
        const fixNum = parseInt(fixtures, 10);
        if (!isFinite(fixNum) || fixNum < 1) {
          throw new Error(`Toilet ${id}: data-fixtures must be a positive integer`);
        }
        toilet.fixtures = fixNum;
      }
      
      toilets.push(toilet);
    }
  }
  
  return toilets;
}

/**
 * Main function: Convert SVG string to StadiumMapJSON
 */
export function svgStringToPlan(svgString: string): StadiumMapJSON {
  try {
    // Parse SVG and extract viewBox
    const viewBox = parseViewBox(svgString);
    
    // Parse XML
    const parsed = parser.parse(svgString);
    const nodes = collectNodes(parsed);
    
    // Extract meta information
    const meta = extractMeta(nodes);
    
    // Parse zones, exits, and toilets
    const zones = parseZones(nodes, viewBox);
    const exits = parseExits(nodes, viewBox);
    const toilets = parseToilets(nodes, viewBox);
    
    // Validate layer consistency
    if (zones.length > 0 && !validateLayerConsistency(zones)) {
      throw new Error('Zones have inconsistent layer numbering');
    }
    
    // Determine layers and sections
    const layers = meta.layers || (zones.length > 0 ? Math.max(...zones.map(z => z.layer)) : 1);
    const sections = meta.sections || 12;
    
    // Build stadium map
    const plan: StadiumMapJSON = {
      sections,
      layers,
      exits: exits.length > 0 ? exits.length : undefined,
      zones,
      exitsList: exits.length > 0 ? exits : undefined,
      toiletsList: toilets.length > 0 ? toilets : undefined
    };
    
    // Validate with Zod schema
    return parseStadiumMap(plan);
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`SVG Parse Error: ${error.message}`);
    }
    throw new Error('SVG Parse Error: Unknown error occurred');
  }
}

/**
 * Validate SVG string before parsing
 */
export function validateSvgString(svgString: string): boolean {
  try {
    // Basic SVG structure check
    if (!svgString.includes('<svg') || !svgString.includes('</svg>')) {
      return false;
    }
    
    // Check for required viewBox (with or without quotes)
    if (!svgString.match(/viewBox\s*=\s*["'][^"']+["']/)) {
      return false;
    }
    
    // Try to parse viewBox
    parseViewBox(svgString);
    
    return true;
  } catch {
    return false;
  }
}

