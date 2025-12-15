import { parseXYZ } from './xyzParser.js';

let scene, camera, renderer, controls, cloud;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 10, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

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
    renderPoints(points);
  };
  reader.readAsText(file);
}

function renderPoints(points) {
  if (cloud) scene.remove(cloud);

  const pos = [];
  const col = [];
  let hasColor = false;

  for (const p of points) {
    pos.push(p.x, p.y, p.z);
    if (p.r !== null) {
      hasColor = true;
      col.push(p.r / 255, p.g / 255, p.b / 255);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (hasColor) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  cloud = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: hasColor
    })
  );

  scene.add(cloud);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
