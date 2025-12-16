import { parseXYZ } from './xyzParser.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { reducePointCloud, invertZValues, exportToXYZ, identifyBoundaryPoints } from './pointCloudReducer.js';

let scene, camera, renderer, controls;
let cloud = null;
let boundaryCloud = null;
let originalPoints = [];
let currentPoints = [];
let boundaryIndices = null;
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

  document.getElementById("file").addEventListener("change", loadXYZ);
  document.getElementById("pointSize").addEventListener("input", (e) => {
    pointSize = parseFloat(e.target.value);
    if (cloud) {
      cloud.material.size = pointSize;
      cloud.material.needsUpdate = true;
    }
    if (boundaryCloud) {
      boundaryCloud.material.size = pointSize * 1.5;
      boundaryCloud.material.needsUpdate = true;
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
  document.getElementById("calculateDistance").addEventListener("click", calculateDistanceStats);
  document.getElementById("identifyBoundary").addEventListener("click", identifyBoundary);

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
    loadingDiv.textContent = 'Parsing file...';
    const points = parseXYZ(reader.result);
    originalPoints = points;
    
    // Reset boundary indices when loading new file
    boundaryIndices = null;
    
    // Enable buttons
    document.getElementById("saveReduced").disabled = false;
    document.getElementById("identifyBoundary").disabled = false;
    
    // Apply current reduction and inversion settings
    applyReductionAndInversion();
    
    loadingDiv.style.display = 'none';
  };
  reader.readAsText(file);
}

function identifyBoundary() {
  if (originalPoints.length === 0) return;
  
  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';
  loadingDiv.textContent = 'Identifying boundary points...';
  
  // Use setTimeout to allow UI to update before heavy computation
  setTimeout(() => {
    boundaryIndices = identifyBoundaryPoints(originalPoints);
    console.log(`Found ${boundaryIndices.size} boundary points out of ${originalPoints.length}`);
    
    // Rebuild the boundary cloud with the new boundary indices
    buildBoundaryCloud(originalPoints, boundaryIndices);
    
    loadingDiv.style.display = 'none';
  }, 10);
}

function applyReductionAndInversion() {
  if (originalPoints.length === 0) return;
  
  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';
  loadingDiv.textContent = 'Processing...';
  
  // Use setTimeout to allow UI to update before heavy computation
  setTimeout(() => {
    let processedPoints = [...originalPoints];
    
    // Apply reduction if method is not 'none'
    if (reductionMethod !== 'none') {
      processedPoints = reducePointCloud(processedPoints, reductionMethod, reductionPercent, boundaryIndices);
    }
    
    // Apply Z inversion if enabled
    if (invertZ) {
      processedPoints = invertZValues(processedPoints);
    }
    
    currentPoints = processedPoints;
    buildCloud(processedPoints);
    buildBoundaryCloud(originalPoints, boundaryIndices);
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
    
    const boundaryCount = boundaryIndices ? boundaryIndices.size : 0;

    dbg.innerHTML = `
      Points: ${points.length} (${boundaryCount} boundary)<br>
      X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (size: ${sizeX.toFixed(2)})<br>
      Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (size: ${sizeY.toFixed(2)})<br>
      Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (size: ${sizeZ.toFixed(2)})<br>
      <em>Click "Calculate Distance Stats" to compute distances</em>
    `;
  }
}

function buildBoundaryCloud(points, boundaryIndices) {
  // Remove existing boundary cloud
  if (boundaryCloud) {
    scene.remove(boundaryCloud);
    boundaryCloud.geometry.dispose();
    boundaryCloud.material.dispose();
    boundaryCloud = null;
  }
  
  if (!boundaryIndices || boundaryIndices.size === 0) return;
  
  // Build geometry for boundary points
  const pos = [];
  const col = [];
  
  Array.from(boundaryIndices).forEach(idx => {
    const p = points[idx];
    pos.push(p.x, p.y, p.z);
    // Red color for boundary points
    col.push(1, 0, 0);
  });
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  
  // Make boundary points slightly larger and always visible
  const material = new THREE.PointsMaterial({ 
    size: pointSize * 1.5, 
    sizeAttenuation: true,
    vertexColors: true,
    depthTest: false, // Always render on top
    transparent: true,
    opacity: 0.8
  });
  
  boundaryCloud = new THREE.Points(geometry, material);
  scene.add(boundaryCloud);
}

function calculateDistanceStats() {
  if (currentPoints.length === 0) {
    alert('Please load a point cloud first');
    return;
  }

  const dbg = document.getElementById('debug-info');
  if (!dbg) return;

  const points = currentPoints;
  
  // Get bounds
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
  
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;

  dbg.innerHTML = `
    Points: ${points.length}<br>
    X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (size: ${sizeX.toFixed(2)})<br>
    Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (size: ${sizeY.toFixed(2)})<br>
    Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (size: ${sizeZ.toFixed(2)})<br>
    <em>Calculating distances...</em>
  `;

  // Use setTimeout to allow UI to update
  setTimeout(() => {
    // Compute approximate average point distance using random sampling
    let avgDistance = 0;
    const numSamples = Math.min(1000, points.length);
    let sampleCount = 0;
    
    // Sample random pairs of points for more accurate statistics
    for (let i = 0; i < numSamples; i++) {
      const idx1 = Math.floor(Math.random() * points.length);
      const idx2 = Math.floor(Math.random() * points.length);
      
      if (idx1 !== idx2) {
        const p1 = points[idx1];
        const p2 = points[idx2];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        avgDistance += dist;
        sampleCount++;
      }
    }
    
    if (sampleCount > 0) {
      avgDistance /= sampleCount;
    }
    
    // K-Nearest Neighbors (K=3) distance calculation
    // Select 100 random points and find average distance to their 3 nearest neighbors
    let knnDistance = 0;
    let knnDistX = 0;
    let knnDistY = 0;
    let knnDistZ = 0;
    const knnSamples = Math.min(100, points.length);
    const K = 3; // Number of nearest neighbors
    let knnCount = 0;
    
    for (let i = 0; i < knnSamples; i++) {
      const idx = Math.floor(Math.random() * points.length);
      const p = points[idx];
      
      // Find K nearest neighbors by checking all other points
      const distanceData = [];
      for (let j = 0; j < points.length; j++) {
        if (idx !== j) {
          const p2 = points[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dz = p.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          distanceData.push({ dist, dx: Math.abs(dx), dy: Math.abs(dy), dz: Math.abs(dz) });
        }
      }
      
      // Sort and get K smallest distances
      distanceData.sort((a, b) => a.dist - b.dist);
      const kNearest = distanceData.slice(0, K);
      
      // Calculate average of K nearest (total and per axis)
      const avgK = kNearest.reduce((sum, d) => sum + d.dist, 0) / kNearest.length;
      const avgKX = kNearest.reduce((sum, d) => sum + d.dx, 0) / kNearest.length;
      const avgKY = kNearest.reduce((sum, d) => sum + d.dy, 0) / kNearest.length;
      const avgKZ = kNearest.reduce((sum, d) => sum + d.dz, 0) / kNearest.length;
      
      knnDistance += avgK;
      knnDistX += avgKX;
      knnDistY += avgKY;
      knnDistZ += avgKZ;
      knnCount++;
    }
    
    if (knnCount > 0) {
      knnDistance /= knnCount;
      knnDistX /= knnCount;
      knnDistY /= knnCount;
      knnDistZ /= knnCount;
    }

    dbg.innerHTML = `
      Points: ${points.length}<br>
      X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (size: ${sizeX.toFixed(2)})<br>
      Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (size: ${sizeY.toFixed(2)})<br>
      Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (size: ${sizeZ.toFixed(2)})<br>
      Avg Point Distance: ${avgDistance.toFixed(4)}<br>
      Avg K-NN Distance (K=3):<br>
      &nbsp;&nbsp;Total: ${knnDistance.toFixed(4)}<br>
      &nbsp;&nbsp;X: ${knnDistX.toFixed(4)}<br>
      &nbsp;&nbsp;Y: ${knnDistY.toFixed(4)}<br>
      &nbsp;&nbsp;Z: ${knnDistZ.toFixed(4)}
    `;
  }, 10);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
