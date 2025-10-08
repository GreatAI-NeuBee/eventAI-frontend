# SVG Upload Guide for Venue Layout Builder

## How to Use the Upload Feature

1. **Open the Venue Layout Builder** in your application
2. **Look for the "Import Layout" section** in the controls panel
3. **Click "Upload SVG Layout"** button
4. **Select an SVG file** from your computer
5. **The layout will be automatically imported** and you'll see a success message

## SVG File Format Requirements

Your SVG file must follow this exact format:

### Required Structure
```xml
<svg viewBox="minx miny width height" xmlns="http://www.w3.org/2000/svg">
  <!-- Your content here -->
</svg>
```

### Zones (Polygons)
```xml
<polygon 
  class="zone" 
  data-id="z-101" 
  data-name="North A" 
  data-layer="1" 
  points="x1,y1 x2,y2 x3,y3 ..."
/>
```

**Required attributes:**
- `class="zone"`
- `data-id`: Unique identifier
- `data-name`: Display name
- `data-layer`: Layer number (1-20)
- `points`: Space-separated coordinates (minimum 3 points)

### Exits (Circles)
```xml
<circle 
  class="exit" 
  data-id="exit-1" 
  data-name="North Gate" 
  data-capacity="100"
  cx="400" 
  cy="30" 
  r="15"
/>
```

**Required attributes:**
- `class="exit"`
- `data-id`: Unique identifier
- `data-name`: Display name
- `cx`, `cy`: Center coordinates
- `r`: Radius
- `data-capacity`: Optional capacity number

### Toilets (Circles)
```xml
<circle 
  class="toilet" 
  data-id="wc-1" 
  data-label="WC North" 
  data-fixtures="4"
  cx="450" 
  cy="120" 
  r="8"
/>
```

**Required attributes:**
- `class="toilet"`
- `data-id`: Unique identifier
- `cx`, `cy`: Center coordinates
- `r`: Radius
- `data-label`: Optional display label
- `data-fixtures`: Optional fixture count

## Example Files

Two example SVG files are provided:

1. **`sample-venue-layout.svg`** - Complex layout with multiple zones, exits, and toilets
2. **`simple-venue-layout.svg`** - Simple layout for testing

## What Happens After Upload

1. **Coordinates are normalized** to the standard 100×62.5 viewBox
2. **Layout switches to "Custom" mode** to show imported elements
3. **All zones, exits, and toilets** are imported with their properties
4. **You can continue editing** the imported layout

## Tips for Creating SVG Files

1. **Use any design tool** (Figma, Illustrator, Inkscape, etc.)
2. **Export as SVG** with viewBox attribute
3. **Add the required data attributes** manually or via script
4. **Test with simple layouts first**
5. **Keep coordinate values reasonable** (the system will normalize them)

## Troubleshooting

- **"Invalid SVG file"**: Ensure viewBox attribute is present
- **"Zone missing data-id"**: All zones need unique IDs
- **"Invalid coordinates"**: Check for non-finite numbers in points
- **Empty import**: Verify class names match exactly ("zone", "exit", "toilet")

## Advanced Usage

You can also add metadata to your SVG:
```xml
<g id="meta" data-layers="3" data-sections="12"></g>
```

This helps the system understand your layout structure better.



