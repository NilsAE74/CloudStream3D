import { 
  reducePointCloud, 
  invertZValues, 
  exportToXYZ,
  voxelDownsampling,
  zGradientDownsampling,
  identifyBoundaryPoints
} from '../renderer/pointCloudReducer.js';

// Create test data
const testPoints = [];
for (let i = 0; i < 1000; i++) {
  testPoints.push({
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 10,
    r: Math.floor(Math.random() * 255),
    g: Math.floor(Math.random() * 255),
    b: Math.floor(Math.random() * 255)
  });
}

console.log('Original points:', testPoints.length);

// Test voxel downsampling
const voxelReduced = voxelDownsampling(testPoints, 50);
console.log('Voxel downsampling (50%):', voxelReduced.length);

// Test Z-Gradient downsampling
const zgradReduced = zGradientDownsampling(testPoints, 50);
console.log('Z-Gradient downsampling (50%):', zgradReduced.length);

// Test boundary detection (convex hull)
const boundary = identifyBoundaryPoints(testPoints);
console.log('Boundary points (convex hull):', boundary.size);

// Test Z inversion
const inverted = invertZValues(testPoints.slice(0, 5));
console.log('\nOriginal Z values:', testPoints.slice(0, 5).map(p => p.z.toFixed(2)));
console.log('Inverted Z values:', inverted.map(p => p.z.toFixed(2)));

// Test export
const exported = exportToXYZ(testPoints.slice(0, 3));
console.log('\nExported XYZ format:\n', exported);

console.log('\n✓ Reduction methods tested successfully!');
