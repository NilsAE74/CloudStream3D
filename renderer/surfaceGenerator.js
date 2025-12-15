import * as THREE from 'three';

export function generateSurface(points) {
  if (!points || points.length === 0) return null;

  // Enkel grid-basert interpolasjon (for demo)
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];

  points.forEach(p => {
    vertices.push(p.x, p.y, p.z);
    if (p.r !== null) {
      colors.push(p.r / 255, p.g / 255, p.b / 255);
    }
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  if (colors.length > 0) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  // Lag mesh med PointsMaterial for demo
  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: colors.length > 0
  });

  const mesh = new THREE.Points(geometry, material);
  return mesh;
}
