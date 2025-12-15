import { parseXYZ } from './xyzParser.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { reducePointCloud, invertZValues, exportToXYZ } from './pointCloudReducer.js';

let scene, camera, renderer, controls;
let cloud = null;
let originalPoints = [];
let currentPoints = [];
let pointSize = 0.1;
let useZColor = false;
let reductionMethod = 'none';
let reductionPercent = 100;
let invertZ = false;

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

  document.getElementById("loadDemo").addEventListener("click", loadDemoFile);
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
  
  document.getElementById("reductionMethod").addEventListener("change", (e) => {
    reductionMethod = e.target.value;
    applyReductionAndInversion();
  });
  
  document.getElementById("reductionPercent").addEventListener("input", (e) => {
    reductionPercent = parseFloat(e.target.value);
    document.getElementById("reductionPercentLabel").textContent = `${reductionPercent}%`;
    applyReductionAndInversion();
  });
  
  document.getElementById("invertZ").addEventListener("change", (e) => {
    invertZ = e.target.checked;
    applyReductionAndInversion();
  });
  
  document.getElementById("saveReduced").addEventListener("click", saveReducedCloud);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

async function loadDemoFile() {
  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';
  loadingDiv.textContent = 'Loading demo file...';

  try {
    const response = await fetch('test_cloud.xyz');
    const text = await response.text();
    const points = parseXYZ(text);
    originalPoints = points;
    
    document.getElementById("saveReduced").disabled = false;
    applyReductionAndInversion();
    
    loadingDiv.style.display = 'none';
  } catch (error) {
    loadingDiv.textContent = 'Error loading demo file';
    console.error(error);
  }
}

function applyReductionAndInversion() {
  if (originalPoints.length === 0) return;
  
  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';
  loadingDiv.textContent = 'Processing...';
  
  setTimeout(() => {
    let processedPoints = [...originalPoints];
    
    if (reductionMethod !== 'none') {
      processedPoints = reducePointCloud(processedPoints, reductionMethod, reductionPercent);
    }
    
    if (invertZ) {
      processedPoints = invertZValues(processedPoints);
    }
    
    currentPoints = processedPoints;
    buildCloud(processedPoints);
    loadingDiv.style.display = 'none';
  }, 10);
}

function saveReducedCloud() {
  if (currentPoints.length === 0) return;
  
  const xyzContent = exportToXYZ(currentPoints);
  const blob = new Blob([xyzContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `reduced_cloud_${currentPoints.length}pts.xyz`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCloud(points) {
  if (cloud) scene.remove(cloud);

  const pos = [];
  const col = [];
  const hasColor = points.some(p => p.r !== null);

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

    dbg.innerHTML = `
      Points: ${points.length} / ${originalPoints.length}<br>
      Reduction: ${((points.length / originalPoints.length) * 100).toFixed(1)}%<br>
      X: ${minX.toFixed(2)} to ${maxX.toFixed(2)}<br>
      Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)}<br>
      Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)}
    `;
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
