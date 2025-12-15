import { parseXYZ } from './xyzParser.js';
import { generateSurface } from './surfaceGenerator.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';

let scene, camera, renderer, controls;
let lodPoints = [];
let currentLODPoints = [];
let cloud = null;
let surface = null;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 10, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

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
    createLODs(points);
    updateLOD();
  };
  reader.readAsText(file);
}

function createLODs(points) {
  lodPoints = [];
  lodPoints.push(points); // LOD0: alle punkter
  lodPoints.push(points.filter((_, i) => i % 10 === 0)); // LOD1: 10%
  lodPoints.push(points.filter((_, i) => i % 100 === 0)); // LOD2: 1%
}

function updateLOD() {
  let distance = camera.position.length();
  if (distance < 20) currentLODPoints = lodPoints[0];
  else if (distance < 50) currentLODPoints = lodPoints[1];
  else currentLODPoints = lodPoints[2];

  if (cloud) scene.remove(cloud);
  if (surface) scene.remove(surface);

  const pos = [];
  const col = [];
  let hasColor = false;

  currentLODPoints.forEach(p => {
    pos.push(p.x, p.y, p.z);
    if (p.r !== null) {
      hasColor = true;
      col.push(p.r / 255, p.g / 255, p.b / 255);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (hasColor) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  cloud = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.05, vertexColors: hasColor })
  );
  scene.add(cloud);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateLOD();
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
