# Vector Stadium Layout Import System

A comprehensive React Native system for importing SVG stadium layouts and converting them to simulation-ready data structures.

## Overview

This system allows designers to create stadium layouts in Figma/Illustrator, export them as SVG files, and import them into a React Native app for stadium simulation and crowd flow analysis.

## Features

- ✅ **SVG Parsing**: Converts SVG files to normalized stadium layout data
- ✅ **Strict Validation**: Zod schemas ensure data integrity and bounds checking
- ✅ **Coordinate Normalization**: Converts any viewBox to standard 100×62.5 coordinate system
- ✅ **Visual Preview**: React Native SVG rendering of imported layouts
- ✅ **Type Safety**: Full TypeScript support with shared types
- ✅ **Error Handling**: Comprehensive error messages and validation
- ✅ **Expo & Bare RN**: Support for both Expo and bare React Native projects

## File Structure

```
src/
├── types/
│   └── stadium.ts                 # Shared TypeScript types
├── vector-import/
│   ├── schema.ts                  # Zod validation schemas
│   ├── svgToPlan.ts              # SVG parsing and normalization
│   ├── UploadSvg.tsx             # File upload component
│   ├── LayoutPreview.tsx          # Visual preview component
│   ├── examples/
│   │   └── sample-layout.svg     # Test SVG file
│   └── package-dependencies.md    # Required dependencies
└── screens/
    └── VectorImportScreen.tsx     # Main demo screen
```

## Quick Start

### 1. Install Dependencies

```bash
# Core dependencies
npm install zod fast-xml-parser react-native-svg

# For Expo projects
npm install expo-document-picker expo-file-system

# For bare React Native
npm install react-native-document-picker react-native-fs
```

### 2. Add to Navigation

```typescript
// In your navigation stack
import { VectorImportScreen } from '../screens/VectorImportScreen';

// Add route
<Stack.Screen 
  name="VectorImport" 
  component={VectorImportScreen} 
  options={{ title: 'Import Layout' }}
/>
```

### 3. Test with Sample SVG

1. Copy `src/vector-import/examples/sample-layout.svg` to your device
2. Navigate to the Vector Import screen
3. Upload the sample SVG
4. Verify the preview renders correctly

## SVG Authoring Rules

Designers must follow these rules when creating SVG files:

### Required Structure

```xml
<svg viewBox="minx miny width height" xmlns="http://www.w3.org/2000/svg">
  <!-- Required: viewBox attribute -->
  
  <!-- Optional: Metadata -->
  <g id="meta" data-layers="3" data-sections="12"></g>
  
  <!-- Zones (obstacles) -->
  <polygon 
    class="zone" 
    data-id="z-101" 
    data-name="North A" 
    data-layer="1" 
    points="x1,y1 x2,y2 x3,y3 ..."
  />
  
  <!-- Exits -->
  <circle 
    class="exit" 
    data-id="exit-1" 
    data-name="North Gate" 
    data-capacity="100"
    cx="400" 
    cy="30" 
    r="15"
  />
  
  <!-- Toilets -->
  <circle 
    class="toilet" 
    data-id="wc-1" 
    data-label="WC North" 
    data-fixtures="4"
    cx="450" 
    cy="120" 
    r="8"
  />
</svg>
```

### Attribute Requirements

#### Zones (Polygons)
- `class="zone"` or `data-type="zone"`
- `data-id`: Unique identifier (required)
- `data-name`: Display name (required)
- `data-layer`: Layer number 1-20 (required)
- `points`: Space-separated coordinates (required, min 3 points)

#### Exits (Circles)
- `class="exit"` or `data-type="exit"`
- `data-id`: Unique identifier (required)
- `data-name`: Display name (required)
- `cx`, `cy`: Center coordinates (required)
- `r`: Radius (required)
- `data-capacity`: Optional capacity number

#### Toilets (Circles)
- `class="toilet"` or `data-type="toilet"`
- `data-id`: Unique identifier (required)
- `cx`, `cy`: Center coordinates (required)
- `r`: Radius (required)
- `data-label`: Optional display label
- `data-fixtures`: Optional fixture count

## API Reference

### Core Functions

#### `svgStringToPlan(svgString: string): StadiumMapJSON`

Parses SVG string and returns normalized stadium layout data.

```typescript
import { svgStringToPlan } from '../vector-import/svgToPlan';

const plan = svgStringToPlan(svgContent);
// Returns: StadiumMapJSON with normalized coordinates
```

#### `parseStadiumMap(json: unknown): StadiumMapJSON`

Validates and parses stadium map data with strict bounds checking.

```typescript
import { parseStadiumMap } from '../vector-import/schema';

const plan = parseStadiumMap(rawData);
// Throws validation errors for invalid data
```

### Components

#### `<UploadSvg onPlan={handlePlan} onError={handleError} />`

File upload component with built-in validation.

```typescript
const handlePlan = (plan: StadiumMapJSON) => {
  console.log('Imported layout:', plan);
};

const handleError = (error: string) => {
  console.error('Import failed:', error);
};
```

#### `<LayoutPreview plan={plan} />`

Visual preview of imported layout.

```typescript
<LayoutPreview plan={stadiumPlan} />
```

## Validation Rules

### Coordinate Bounds
- All coordinates are clamped to [0..100] × [0..62.5]
- Out-of-bounds points are automatically adjusted

### Data Limits
- Zones: Maximum 2000
- Exits: Maximum 200
- Toilets: Maximum 200
- Layers: 1-20
- Sections: 1-120

### Polygon Validation
- Minimum 3 points per polygon
- No duplicate points allowed
- Layer numbering must be consistent

## Error Handling

The system provides detailed error messages:

```typescript
try {
  const plan = svgStringToPlan(svgContent);
} catch (error) {
  // Error messages include:
  // - "SVG Parse Error: Zone z-102: polygon needs at least 3 points"
  // - "Validation: zones - Too many zones (max 2000)"
  // - "SVG Parse Error: ViewBox must have exactly 4 values"
}
```

## Integration with Simulation

The imported `StadiumMapJSON` is compatible with the existing `VenueLayoutCard` simulation:

```typescript
// Pass imported plan to simulation
const event = {
  id: 'imported-layout',
  name: 'Imported Stadium',
  venueLayout: plan,
  forecastResult: forecastData
};

<VenueLayoutCard event={event} />
```

## Performance

- **Parse Time**: <250ms for 500-1000 polygons on modern devices
- **Memory**: Efficient coordinate normalization
- **Validation**: Fast Zod schema checking

## Troubleshooting

### Common Issues

1. **"Invalid SVG file"**: Ensure viewBox attribute is present
2. **"Zone missing data-id"**: All zones need unique IDs
3. **"Too many zones"**: Reduce polygon count or increase limits
4. **"Invalid coordinates"**: Check for non-finite numbers in points

### Debug Mode

Enable debug logging:

```typescript
// In svgToPlan.ts
const DEBUG = true;
if (DEBUG) console.log('Parsed nodes:', nodes);
```

## Future Enhancements

- [ ] Self-intersecting polygon detection
- [ ] AsyncStorage persistence
- [ ] Batch import multiple layouts
- [ ] Export to various formats
- [ ] Real-time validation in design tools

## License

This system is part of the EventAI frontend project.

