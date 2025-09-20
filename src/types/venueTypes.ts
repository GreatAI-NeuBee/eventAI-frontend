// Types for customizable venue layouts

export interface VenueGeometry {
  viewBoxWidth: number;
  viewBoxHeight: number;
  centerX: number;
  centerY: number;
  shape: 'circular' | 'rectangle';
}

export interface RingConfiguration {
  baseInnerRadius: number;
  ringThickness: number;
  ringGap: number;
  layers: number;
}

export interface SectionConfiguration {
  sections: number;
  sectionGap: number; // gap between sections in degrees
}

export interface ExitConfiguration {
  exits: number;
  exitWidth: number;
  exitDepth: number;
  customAngles?: number[]; // optional custom positioning
}

export interface ParkingConfiguration {
  enabled: boolean;
  areas: number;
  capacity: number;
  distance: number; // distance from main venue
}

export interface ZoneStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string;
  fillOpacity: number;
}

export interface ColorScheme {
  low: string;    // green
  medium: string; // blue  
  high: string;   // red
  background: string;
  outline: string;
  exit: string;
}

export interface VenueConfiguration {
  id: string;
  name: string;
  description?: string;
  geometry: VenueGeometry;
  rings: RingConfiguration;
  sections: SectionConfiguration;
  exits: ExitConfiguration;
  parking: ParkingConfiguration;
  colors: ColorScheme;
  styles: {
    rings: ZoneStyle;
    sections: ZoneStyle;
    exits: ZoneStyle;
    parking: ZoneStyle;
  };
}

// Preset venue types
export type VenueType = 'stadium' | 'arena' | 'theater' | 'conference' | 'outdoor' | 'custom';

export interface VenuePreset {
  type: VenueType;
  name: string;
  description: string;
  configuration: VenueConfiguration;
}

// Default configurations
export const DEFAULT_STADIUM_CONFIG: VenueConfiguration = {
  id: 'stadium-default',
  name: 'Standard Stadium',
  description: 'Traditional stadium layout with concentric rings',
  geometry: {
    viewBoxWidth: 100,
    viewBoxHeight: 62.5,
    centerX: 50,
    centerY: 31.25,
    shape: 'circular'
  },
  rings: {
    baseInnerRadius: 14,
    ringThickness: 6.5,
    ringGap: 2.2,
    layers: 2
  },
  sections: {
    sections: 5,
    sectionGap: 2
  },
  exits: {
    exits: 4,
    exitWidth: 5,
    exitDepth: 2.4
  },
  parking: {
    enabled: false,
    areas: 0,
    capacity: 0,
    distance: 0
  },
  colors: {
    low: '#A8E4B1',
    medium: '#4AA3BA', 
    high: '#DA5C53',
    background: '#0f172a',
    outline: '#334155',
    exit: '#f8fafc'
  },
  styles: {
    rings: {
      strokeColor: '#334155',
      strokeWidth: 0.8,
      strokeDasharray: '1,1',
      fillOpacity: 0.45
    },
    sections: {
      strokeColor: '#334155',
      strokeWidth: 0.6,
      strokeDasharray: '2,1',
      fillOpacity: 0.4
    },
    exits: {
      strokeColor: '#1e293b',
      strokeWidth: 0.35,
      fillOpacity: 1
    },
    parking: {
      strokeColor: '#6b7280',
      strokeWidth: 0.5,
      fillOpacity: 0.3
    }
  }
};

export const DEFAULT_ARENA_CONFIG: VenueConfiguration = {
  id: 'arena-default',
  name: 'Indoor Arena',
  description: 'Compact arena layout for indoor events',
  geometry: {
    viewBoxWidth: 100,
    viewBoxHeight: 80,
    centerX: 50,
    centerY: 40,
    shape: 'circular'
  },
  rings: {
    baseInnerRadius: 18,
    ringThickness: 8,
    ringGap: 1.5,
    layers: 3
  },
  sections: {
    sections: 8,
    sectionGap: 1
  },
  exits: {
    exits: 6,
    exitWidth: 4,
    exitDepth: 2
  },
  parking: {
    enabled: false,
    areas: 0,
    capacity: 0,
    distance: 0
  },
  colors: {
    low: '#A8E4B1',
    medium: '#4AA3BA',
    high: '#DA5C53',
    background: '#1e293b',
    outline: '#475569',
    exit: '#f1f5f9'
  },
  styles: {
    rings: {
      strokeColor: '#475569',
      strokeWidth: 0.6,
      fillOpacity: 0.5
    },
    sections: {
      strokeColor: '#475569',
      strokeWidth: 0.4,
      strokeDasharray: '1,0.5',
      fillOpacity: 0.3
    },
    exits: {
      strokeColor: '#334155',
      strokeWidth: 0.3,
      fillOpacity: 1
    },
    parking: {
      strokeColor: '#6b7280',
      strokeWidth: 0.5,
      fillOpacity: 0.3
    }
  }
};

export const DEFAULT_RECTANGLE_CONFIG: VenueConfiguration = {
  id: 'rectangle-default',
  name: 'Rectangle Venue',
  description: 'Rectangular layout for conferences and exhibitions',
  geometry: {
    viewBoxWidth: 100,
    viewBoxHeight: 62.5,
    centerX: 50,
    centerY: 31.25,
    shape: 'rectangle'
  },
  rings: {
    baseInnerRadius: 0, // Not used for rectangle
    ringThickness: 8,
    ringGap: 3,
    layers: 2
  },
  sections: {
    sections: 4,
    sectionGap: 1
  },
  exits: {
    exits: 4,
    exitWidth: 6,
    exitDepth: 3
  },
  parking: {
    enabled: false,
    areas: 0,
    capacity: 0,
    distance: 0
  },
  colors: {
    low: '#A8E4B1',
    medium: '#4AA3BA',
    high: '#DA5C53',
    background: '#f8fafc',
    outline: '#475569',
    exit: '#e2e8f0'
  },
  styles: {
    rings: {
      strokeColor: '#475569',
      strokeWidth: 0.8,
      fillOpacity: 0.4
    },
    sections: {
      strokeColor: '#475569',
      strokeWidth: 0.6,
      strokeDasharray: '3,1',
      fillOpacity: 0.3
    },
    exits: {
      strokeColor: '#374151',
      strokeWidth: 0.4,
      fillOpacity: 1
    },
    parking: {
      strokeColor: '#6b7280',
      strokeWidth: 0.5,
      fillOpacity: 0.3
    }
  }
};

export const VENUE_PRESETS: VenuePreset[] = [
  {
    type: 'stadium',
    name: 'Stadium',
    description: 'Large outdoor stadium with multiple tiers',
    configuration: DEFAULT_STADIUM_CONFIG
  },
  {
    type: 'arena',
    name: 'Arena',
    description: 'Indoor arena with compact seating',
    configuration: DEFAULT_ARENA_CONFIG
  },
  {
    type: 'conference',
    name: 'Rectangle',
    description: 'Rectangular venue for conferences and exhibitions',
    configuration: DEFAULT_RECTANGLE_CONFIG
  }
];
