# CloudStream3D

CloudStream3D is a desktop application for viewing large XYZ point clouds using GPU-accelerated rendering.

## Features
- XYZ file loading
- RGB support
- 3D navigation (orbit, pan, zoom)
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

- To show a smooth surface in the renderer: load a point cloud and click the "Show Smooth Surface" button. The app will attempt a grid-based triangulation (works best for regular height-map-like clouds) and will fall back to a convex hull mesh when triangulation is not possible.
