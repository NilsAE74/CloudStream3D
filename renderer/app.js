import { parseXYZ } from './xyzParser.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { reducePointCloud, invertZValues, exportToXYZ } from './pointCloudReducer.js';

let scene, camera, renderer, controls;
let cloud = null;
let originalPoints = [];
let currentPoints = [];
let pointSize = 0.1;
let useZColor = true;
let reductionMethod = 'none';
let reductionPercent = 100;
let invertZ = false;
let decimalPlaces = 6;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  // Position camera so Z-axis points upward
  camera.position.set(10, 10, 10);
  camera.up.set(0, 0, 1); // Set up vector to point in +Z direction

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setClearColor(0x111111);
  document.body.appendChild(renderer.domElement);

  // Add lighting for mesh visualization
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 10);
  scene.add(directionalLight);

  controls = new OrbitControls(camera, renderer.domElement);

  document.getElementById("file").addEventListener("change", loadXYZ);
  document.getElementById("loadSampleWave").addEventListener("click", loadSampleWave);
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
  
  document.getElementById("decimalPlaces").addEventListener("change", (e) => {
    decimalPlaces = Math.max(0, Math.min(10, parseInt(e.target.value) || 6));
    document.getElementById("decimalPlaces").value = decimalPlaces;
  });
  
  document.getElementById("saveReduced").addEventListener("click", saveReducedCloud);
  document.getElementById("calculateDistance").addEventListener("click", calculateDistanceStats);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function generateWaveData(width = 20, height = 20, wavelength = 4, amplitude = 5) {
  const points = [];
  const step = width / 40; // Create a grid of points
  
  for (let x = -width / 2; x < width / 2; x += step) {
    for (let y = -height / 2; y < height / 2; y += step) {
      const z = amplitude * Math.sin((x + y) / wavelength) * Math.cos(x / wavelength);
      points.push({
        x: x,
        y: y,
        z: z,
        r: null,
        g: null,
        b: null
      });
    }
  }
  
  return points;
}

function loadSampleWave() {
  const loadingDiv = document.getElementById('loading');
  loadingDiv.style.display = 'block';
  loadingDiv.textContent = 'Generating wave...';

  setTimeout(() => {
    originalPoints = generateWaveData();
    
    setTimeout(() => {
      // Enable save button
      document.getElementById("saveReduced").disabled = false;
      
      // Apply current reduction and inversion settings
      applyReductionAndInversion();
      
      loadingDiv.style.display = 'none';
    }, 10);
  }, 10);
}

// Create a circle texture for points
function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

const circleTexture = createCircleTexture();

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
    
    setTimeout(() => {
      // Enable save button
      document.getElementById("saveReduced").disabled = false;
      
      // Apply current reduction and inversion settings
      applyReductionAndInversion();
      
      loadingDiv.style.display = 'none';
    }, 10);
  };
  reader.readAsText(file);
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
      processedPoints = reducePointCloud(processedPoints, reductionMethod, reductionPercent);
    }
    
    // Apply Z inversion if enabled
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
  
  const xyzContent = exportToXYZ(currentPoints, decimalPlaces);
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

  const material = new THREE.PointsMaterial({ 
    size: pointSize, 
    sizeAttenuation: true,
    map: circleTexture,
    alphaTest: 0.5
  });
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
    // Position camera at an angle with Z-up orientation
    camera.position.copy(center.clone().add(new THREE.Vector3(1, 1, 0.5).normalize().multiplyScalar(distance * 2 + 1)));
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
      Points: ${points.length}<br>
      X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (size: ${sizeX.toFixed(2)})<br>
      Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)} (size: ${sizeY.toFixed(2)})<br>
      Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (size: ${sizeZ.toFixed(2)})<br>
      <em>Click "Calculate Distance Stats" to compute distances</em>
    `;
  }
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
