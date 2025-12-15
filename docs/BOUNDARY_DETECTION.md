# Boundary Point Detection (Randpunkter)

## Overview

CloudStream3D includes an automatic boundary point detection feature that identifies and visualizes edge points in a point cloud. These boundary points (Norwegian: "randpunkter") are displayed in red color and are stored separately for processing.

## How It Works

### 1. Detection Algorithm

The boundary detection uses a **3D Convex Hull** algorithm implemented in `identifyBoundaryPoints()` function:

- Takes all points in the cloud as input
- Computes the convex hull (the smallest convex 3D shape that contains all points)
- Returns the indices of points that lie on the surface of the convex hull
- These points represent the outer boundary/edges of the point cloud

**File**: `renderer/pointCloudReducer.js` (lines 13-46)

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
   - Algorithm: 3D Convex Hull

2. **`buildBoundaryCloud(points, boundaryIndices)`**
   - Input: All points and boundary indices Set
   - Creates a separate Three.js Points object for boundary visualization
   - Applies red color and special rendering properties

3. **`reducePointCloud(points, method, targetPercentage, boundaryIndices)`**
   - Respects boundary points during reduction
   - Passes boundary indices to reduction methods
   - Ensures boundary points are always included

### Algorithm Complexity

- **Time**: O(n log n) average case, O(n²) worst case for convex hull computation
- **Space**: O(n) for storing boundary indices
- **Typical Results**: 
  - Cube: 8 boundary points (corners)
  - Sphere surface: ~70% of points (entire surface)
  - Mixed geometry: Varies based on shape

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

### Why Convex Hull?

The convex hull algorithm identifies the **outermost points** that form the smallest convex shape containing all points. This is ideal for:

- Terrain data (finds edge of surveyed area)
- Object scans (finds object boundary)
- Point cloud cleaning (preserves shape outline)

### Limitations

- Only detects the **convex boundary** (outermost envelope)
- Concave features (holes, indentations) are not detected as boundaries
- Interior points in concave regions may be marked as boundary points
- For more sophisticated edge detection, consider:
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
