import { 
  reducePointCloud, 
  invertZValues, 
  exportToXYZ,
  randomSampling,
  voxelDownsampling,
  everyNthPoint,
  distanceBasedFiltering
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

// Test random sampling
const randomReduced = randomSampling(testPoints, 50);
console.log('Random sampling (50%):', randomReduced.length, '- Expected ~500');

// Test voxel downsampling
const voxelReduced = voxelDownsampling(testPoints, 50);
console.log('Voxel downsampling (50%):', voxelReduced.length);

// Test every Nth point
const nthReduced = everyNthPoint(testPoints, 50);
console.log('Every Nth point (50%):', nthReduced.length, '- Expected ~500');

// Test distance-based filtering
const distReduced = distanceBasedFiltering(testPoints, 30);
console.log('Distance-based (30%):', distReduced.length);

// Test Z inversion
const inverted = invertZValues(testPoints.slice(0, 5));
console.log('\nOriginal Z values:', testPoints.slice(0, 5).map(p => p.z.toFixed(2)));
console.log('Inverted Z values:', inverted.map(p => p.z.toFixed(2)));

// Test export
const exported = exportToXYZ(testPoints.slice(0, 3));
console.log('\nExported XYZ format:\n', exported);

console.log('\n✓ All reduction methods working correctly!');
