import { parseXYZ } from './xyzParser.js';
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';

let scene, camera, renderer, controls;
let cloud = null;

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
    buildCloud(points);
  };
  reader.readAsText(file);
}

// Build the point cloud geometry from given points (no LOD)
function buildCloud(points) {
  if (cloud) scene.remove(cloud);

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

init();
