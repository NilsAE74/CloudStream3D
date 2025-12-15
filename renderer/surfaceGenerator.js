import * as THREE from './lib/three.module.js';
import { ConvexGeometry } from './lib/ConvexGeometry.js';

export function generateSurface(points) {
  if (!points || points.length === 0) return null;

  // Try to detect a regular grid (X x Y) and triangulate it for a smooth mesh
  const xs = Array.from(new Set(points.map(p => p.x))).sort((a, b) => a - b);
  const ys = Array.from(new Set(points.map(p => p.y))).sort((a, b) => a - b);

  let geometry = null;

  if (xs.length * ys.length === points.length) {
    // Build grid index map (x index + y index * nx)
    const nx = xs.length;
    const ny = ys.length;
    const map = new Map();
    const vertices = new Float32Array(points.length * 3);
    const colors = [];

    // create a lookup for quick access
    const pointMap = new Map();
    points.forEach((p, i) => pointMap.set(`${p.x},${p.y}`, p));

    let idx = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const key = `${xs[i]},${ys[j]}`;
        const p = pointMap.get(key);
        if (!p) return fallback(points);
        vertices[idx * 3 + 0] = p.x;
        vertices[idx * 3 + 1] = p.y;
        vertices[idx * 3 + 2] = p.z;
        if (p.r !== null) colors.push(p.r / 255, p.g / 255, p.b / 255);
        idx++;
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (colors.length > 0) geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const indices = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = i + j * nx;
        const b = (i + 1) + j * nx;
        const c = i + (j + 1) * nx;
        const d = (i + 1) + (j + 1) * nx;
        // two triangles per grid cell
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    geom.setIndex(indices);
    geom.computeVertexNormals();

    geometry = geom;
  } else {
    geometry = fallback(points);
  }

  if (!geometry) return null;

  const material = new THREE.MeshStandardMaterial({
    vertexColors: geometry.getAttribute('color') ? true : false,
    side: THREE.DoubleSide,
    flatShading: false
  });

  return new THREE.Mesh(geometry, material);
}

function fallback(points) {
  // fallback: try convex hull based mesh
  try {
    const verts = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    return new ConvexGeometry(verts);
  } catch (e) {
    // last resort: return null so caller can handle
    console.warn('Surface generation fallback failed:', e);
    return null;
  }
}
