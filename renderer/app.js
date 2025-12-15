import { parseXYZ } from './xyzParser.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';

let scene, camera, renderer, controls;
let cloud = null;
let currentPoints = [];
let pointSize = 0.1;
let useZColor = false;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 10, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setClearColor(0x111111);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  document.getElementById("file").addEventListener("change", loadXYZ);
  document.getElementById("pointSize").addEventListener("input", (e) => {
    pointSize = parseFloat(e.target.value);
    if (cloud) {
      cloud.material.size = pointSize;
      cloud.material.needsUpdate = true;
    }
  });
  document.getElementById("zColorToggle").addEventListener("change", (e) => {
    useZColor = e.target.checked;
    if (currentPoints.length > 0) buildCloud(currentPoints);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function loadXYZ(e) {
  const file = e.target.files[0];
  if (!file) return;

  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';
  loadingDiv.textContent = 'Loading...';

  const reader = new FileReader();
  reader.onload = () => {
    const points = parseXYZ(reader.result);
    currentPoints = points;
    buildCloud(points);
    loadingDiv.style.display = 'none';
  };
  reader.readAsText(file);
}

// Build the point cloud geometry from given points (no LOD)
function buildCloud(points) {
  if (cloud) scene.remove(cloud);

  const pos = [];
  const col = [];
  const hasColor = points.some(p => p.r !== null);

  // Compute min/max for statistics and z-coloring
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  });

  points.forEach(p => {
    pos.push(p.x, p.y, p.z);
    if (useZColor) {
      // Blue to red gradient based on Z
      const normalizedZ = maxZ === minZ ? 0.5 : (p.z - minZ) / (maxZ - minZ);
      const r = normalizedZ;
      const g = 0;
      const b = 1 - normalizedZ;
      col.push(r, g, b);
    } else if (hasColor) {
      if (p.r !== null) col.push(p.r / 255, p.g / 255, p.b / 255);
      else col.push(1, 1, 1);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (useZColor || hasColor) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  const material = new THREE.PointsMaterial({ size: pointSize, sizeAttenuation: true });
  if (useZColor || hasColor) {
    material.vertexColors = true;
  }

  cloud = new THREE.Points(geometry, material);
  scene.add(cloud);

  // center camera on the cloud
  if (pos.length > 0) {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = bbox.getSize(new THREE.Vector3()).length();
    const distance = Math.max(size * 0.5, 1);
    camera.position.copy(center.clone().add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(distance * 2 + 1)));
    controls.target.copy(center);
    controls.update();
    camera.lookAt(center);
  }

  const dbg = document.getElementById('debug-info');
  if (dbg) {
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    // Compute approximate average point distance
    let avgDistance = 0;
    const numSamples = Math.min(1000, points.length * (points.length - 1) / 2);
    let sampleCount = 0;
    for (let i = 0; i < Math.min(100, points.length); i++) {
      for (let j = i + 1; j < Math.min(i + 11, points.length); j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dz = points[i].z - points[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        avgDistance += dist;
        sampleCount++;
      }
    }
    if (sampleCount > 0) avgDistance /= sampleCount;

    dbg.innerHTML = `
      Points: ${points.length}<br>
      X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (size: ${sizeX.toFixed(2)})<br>
      Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (size: ${sizeY.toFixed(2)})<br>
      Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (size: ${sizeZ.toFixed(2)})<br>
      Avg Point Distance: ${avgDistance.toFixed(4)}
    `;
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
