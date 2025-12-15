import { parseXYZ } from './xyzParser.js';
import { generateSurface } from './surfaceGenerator.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';

let scene, camera, renderer, controls;
let lodPoints = [];
let currentLODPoints = [];
let cloud = null;
let surface = null;
let lastLODIndex = -1;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 10, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setClearColor(0x111111);
  document.body.appendChild(renderer.domElement);

  // add simple lighting for surface meshes
  const amb = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 2, 3);
  scene.add(dir);

  controls = new OrbitControls(camera, renderer.domElement);

  document.getElementById("file").addEventListener("change", loadXYZ);
  document.getElementById("exportBtn").addEventListener("click", exportLOD);
  document.getElementById("smoothBtn").addEventListener("click", toggleSmooth);

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

  const reader = new FileReader();
  reader.onload = () => {
    const points = parseXYZ(reader.result);
    // Deactivated LOD: use full-resolution points directly
    currentLODPoints = points;
    buildCloud(currentLODPoints);
  };
  reader.readAsText(file);
}

function createLODs(points) {
  lodPoints = [];
  lodPoints.push(points); // LOD0: alle punkter
  lodPoints.push(points.filter((_, i) => i % 10 === 0)); // LOD1: 10%
  lodPoints.push(points.filter((_, i) => i % 100 === 0)); // LOD2: 1%
  lastLODIndex = -1; // force rebuild on next update
}

// Build the point cloud geometry from given points (no LOD)
function buildCloud(points) {
  if (cloud) scene.remove(cloud);
  if (surface) { scene.remove(surface); surface = null; }

  const pos = [];
  const col = [];
  const hasColor = points.some(p => p.r !== null);

  points.forEach(p => {
    pos.push(p.x, p.y, p.z);
    if (hasColor) {
      if (p.r !== null) col.push(p.r / 255, p.g / 255, p.b / 255);
      else col.push(1, 1, 1);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (hasColor) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  cloud = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.1, sizeAttenuation: true, vertexColors: hasColor })
  );
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
  if (dbg) dbg.textContent = `Points: ${points.length}`;
}

function updateLOD() {
  // If no LODs have been generated yet, nothing to update
  if (!lodPoints || lodPoints.length === 0) {
    const dbg = document.getElementById('debug-info');
    if (dbg) dbg.textContent = `Points: 0`;
    return;
  }

  const distance = camera.position.length();
  let idx = 0;
  if (distance < 20) idx = 0;
  else if (distance < 50) idx = 1;
  else idx = 2;
  // clamp available LODs
  idx = Math.min(idx, lodPoints.length - 1);
  currentLODPoints = lodPoints[idx] || [];

  // only rebuild geometry when LOD index changed
  if (idx === lastLODIndex && cloud) {
    // update debug overlay and return
    const dbg = document.getElementById('debug-info');
    if (dbg) dbg.textContent = `Points: ${currentLODPoints.length}`;
    return;
  }
  lastLODIndex = idx;
}


// Build the point cloud geometry from given points (no LOD)
function buildCloud(points) {
  if (cloud) scene.remove(cloud);
  if (surface) { scene.remove(surface); surface = null; }

  const pos = [];
  const col = [];
  const hasColor = points.some(p => p.r !== null);

  points.forEach(p => {
    pos.push(p.x, p.y, p.z);
    if (hasColor) {
      if (p.r !== null) col.push(p.r / 255, p.g / 255, p.b / 255);
      else col.push(1, 1, 1);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (hasColor) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  cloud = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.1, sizeAttenuation: true, vertexColors: hasColor })
  );
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
  if (dbg) dbg.textContent = `Points: ${points.length}`;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function exportLOD() {
  if (!currentLODPoints || currentLODPoints.length === 0) return;

  let content = '';
  currentLODPoints.forEach(p => {
    if (p.r !== null) content += `${p.x} ${p.y} ${p.z} ${p.r} ${p.g} ${p.b}\n`;
    else content += `${p.x} ${p.y} ${p.z}\n`;
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CloudStream3D_LOD.xyz";
  a.click();
  URL.revokeObjectURL(url);
}

function toggleSmooth() {
  if (surface) {
    scene.remove(surface);
    surface = null;
  } else {
    surface = generateSurface(currentLODPoints);
    scene.add(surface);
  }
}

init();
