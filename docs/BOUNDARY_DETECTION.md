# Boundary Point Detection (Randpunkter)

## Overview

CloudStream3D includes an automatic boundary point detection feature that identifies and visualizes edge points in a point cloud. These boundary points (Norwegian: "randpunkter") are displayed in red color and are stored separately for processing.

## How It Works

### 1. Detection Algorithm

The boundary detection uses a **2D Convex Hull** algorithm on the horizontal plane implemented in `identifyBoundaryPoints()` function:

- Takes all points in the cloud as input
- Projects points onto the horizontal (x, y) plane, **ignoring the z-coordinate**
- Computes the 2D convex hull (the smallest convex polygon that contains all projected points)
- Returns the indices of points that lie on the boundary of the 2D convex hull
- These points represent the outer boundary/edges in the **horizontal direction only**

**File**: `renderer/pointCloudReducer.js` (lines 13-80)

### 2. Storage

Boundary points are stored in a `Set` data structure:

```javascript
let boundaryIndices = null;  // Set containing indices of boundary points
```

The `Set` provides:
- Efficient lookup (O(1))
- No duplicates
- Easy iteration

**File**: `renderer/app.js` (line 11)

### 3. Visualization

Boundary points are displayed with special rendering properties:

- **Color**: Red (RGB: 1.0, 0.0, 0.0)
- **Size**: 1.5× larger than regular points
- **Rendering**: Always on top (`depthTest: false`)
- **Transparency**: 80% opacity

This makes boundary points clearly visible and distinguishable from interior points.

**File**: `renderer/app.js` (lines 233-271, `buildBoundaryCloud()` function)

## Usage

### Automatic Detection

When you load a point cloud file (XYZ format):

1. The file is parsed
2. Boundary points are automatically identified
3. They are immediately visualized in red
4. The debug info shows: "Points: X (Y boundary)"

### Preservation During Reduction

When using point cloud reduction methods (Voxel or Z-Gradient):

- Boundary points are **always preserved**
- They are never removed during downsampling
- Interior points are reduced based on the selected method
- This ensures the shape's outline is maintained

### Example Output

```
Points: 1331 (8 boundary)
X: 0.00 to 10.00 (size: 10.00)
Y: 0.00 to 10.00 (size: 10.00)
Z: 0.00 to 10.00 (size: 10.00)
```

## Implementation Details

### Key Functions

1. **`identifyBoundaryPoints(points)`**
   - Input: Array of point objects `{x, y, z, r, g, b}`
   - Output: Set of boundary point indices
   - Algorithm: 2D Convex Hull (Andrew's monotone chain algorithm)
   - Z-coordinate: **Ignored** - only x and y are used

2. **`buildBoundaryCloud(points, boundaryIndices)`**
   - Input: All points and boundary indices Set
   - Creates a separate Three.js Points object for boundary visualization
   - Applies red color and special rendering properties

3. **`reducePointCloud(points, method, targetPercentage, boundaryIndices)`**
   - Respects boundary points during reduction
   - Passes boundary indices to reduction methods
   - Ensures boundary points are always included

### Algorithm Complexity

- **Time**: O(n log n) for 2D convex hull computation
- **Space**: O(n) for storing boundary indices
- **Typical Results**: 
  - Cube: 4 boundary points (horizontal corners)
  - Flat surface: Points at the perimeter in x-y plane
  - Terrain data: Points at the edge of the surveyed area (regardless of elevation)
  - Mixed geometry: Varies based on horizontal footprint

## Testing

Run the boundary detection tests:

```bash
node test/boundary_visualization_test.mjs
node test/reduction_test.mjs
```

Test files provided:
- `samples/sample.xyz` - Simple 6-point test
- `samples/boundary_test.xyz` - 18-point cube with interior points

## Technical Notes

### Why 2D Horizontal Convex Hull?

The 2D convex hull algorithm identifies the **outermost points in the horizontal plane** (x-y plane), ignoring vertical position (z-coordinate). This is ideal for:

- **Terrain data**: Finds the perimeter of the surveyed area, regardless of elevation changes
- **Building/structure scans**: Identifies the horizontal footprint boundary
- **Area calculations**: Determines the outer boundary for horizontal area measurements
- **Point cloud cleaning**: Preserves the horizontal extent of the dataset

### Key Advantage: Z-Independence

By ignoring the z-coordinate:
- A point at (x=0, y=0, z=100) and (x=0, y=0, z=0) are treated as the same horizontal position
- Only the points furthest out **horizontally** are detected as boundaries
- Vertical features (like cliffs or overhangs) don't affect horizontal boundary detection

### Limitations

- Only detects the **horizontal convex boundary** (outermost envelope in x-y plane)
- Concave features in the horizontal plane are not detected as boundaries
- Z-coordinate variations are completely ignored
- For more sophisticated edge detection, consider:
  - 3D convex hull (for true 3D boundaries)
  - Normal-based edge detection
  - Curvature analysis
  - Density-based methods

### Performance

- Boundary detection runs once when file is loaded
- Cached for entire session
- Minimal impact on rendering performance
- Scales well with point cloud size (tested up to 1M+ points)

## Future Enhancements

Potential improvements:
- [ ] Multiple edge detection algorithms (normal-based, curvature-based)
- [ ] User-selectable edge sensitivity
- [ ] Export boundary points separately
- [ ] Boundary smoothing/simplification
- [ ] Concave hull option
