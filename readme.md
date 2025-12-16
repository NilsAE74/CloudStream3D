# CloudStream3D

CloudStream3D is a desktop application for viewing large XYZ point clouds using GPU-accelerated rendering.

## Features
- XYZ file loading
- RGB support
- 3D navigation (orbit, pan, zoom)
- **Boundary point detection** - Automatically identifies and highlights edge points in red
- Point cloud reduction (Voxel downsampling, Z-Gradient based)
- Distance statistics and K-NN calculations
- Electron-based Windows application
- Builds to standalone `.exe`

## Tech Stack
- Electron
- Three.js
- Node.js

## Development

```bash
npm install
npm start
```

## Boundary Point Detection (Randpunkter)

CloudStream3D automatically identifies boundary/edge points in your point cloud based on **horizontal position only**:

- **Automatic Detection**: When you load an XYZ file, boundary points are automatically identified using a 2D convex hull algorithm (x-y plane)
- **Z-Coordinate Ignored**: Only horizontal position (x, y) is considered - finds points furthest out horizontally regardless of elevation
- **Visual Highlighting**: Boundary points are displayed in **red color** and rendered 1.5× larger for easy identification
- **Always Preserved**: During point cloud reduction, boundary points are always preserved to maintain the shape outline
- **Separate Storage**: Boundary points are stored in a separate array for processing

### Using the Standalone Script

You can also use the command-line script to identify boundary points:

```bash
# Analyze boundary points
node scripts/identify_boundary_points.mjs samples/sample.xyz

# Export with boundary points marked in red
node scripts/identify_boundary_points.mjs samples/sample.xyz output_marked.xyz
```

For more details, see [docs/BOUNDARY_DETECTION.md](docs/BOUNDARY_DETECTION.md)

## Additional Features

- To show a smooth surface in the renderer: load a point cloud and click the "Show Smooth Surface" button. The app will attempt a grid-based triangulation (works best for regular height-map-like clouds) and will fall back to a convex hull mesh when triangulation is not possible.
