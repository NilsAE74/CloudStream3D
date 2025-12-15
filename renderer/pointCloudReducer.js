/**
 * Point Cloud Reduction Module
 * Provides 4 different methods for reducing point cloud density
 */

/**
 * Method 1: Random Sampling
 * Randomly selects a percentage of points from the cloud
 */
export function randomSampling(points, targetPercentage) {
  if (targetPercentage >= 100) return [...points];
  
  const targetCount = Math.floor(points.length * targetPercentage / 100);
  const result = [];
  const indices = new Set();
  
  while (indices.size < targetCount && indices.size < points.length) {
    const idx = Math.floor(Math.random() * points.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      result.push(points[idx]);
    }
  }
  
  return result;
}

/**
 * Method 2: Grid-based Voxel Downsampling
 * Divides space into voxels and keeps one point per voxel (the centroid)
 */
export function voxelDownsampling(points, targetPercentage) {
  if (targetPercentage >= 100) return [...points];
  if (points.length === 0) return [];
  
  // Calculate bounds
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
  
  // Calculate voxel size based on target percentage
  const targetCount = Math.floor(points.length * targetPercentage / 100);
  const volumeRatio = points.length / targetCount;
  const voxelSizeBase = Math.pow(volumeRatio, 1/3);
  
  // Divide space into approximately 100 voxels per dimension as a baseline
  const VOXEL_GRID_DIVISIONS = 100;
  const voxelSize = Math.max(sizeX, sizeY, sizeZ) / VOXEL_GRID_DIVISIONS * voxelSizeBase;
  
  // Group points into voxels
  const voxelMap = new Map();
  
  points.forEach(p => {
    const vx = Math.floor((p.x - minX) / voxelSize);
    const vy = Math.floor((p.y - minY) / voxelSize);
    const vz = Math.floor((p.z - minZ) / voxelSize);
    const key = `${vx},${vy},${vz}`;
    
    if (!voxelMap.has(key)) {
      voxelMap.set(key, []);
    }
    voxelMap.get(key).push(p);
  });
  
  // Calculate centroid for each voxel
  const result = [];
  voxelMap.forEach(voxelPoints => {
    let sumX = 0, sumY = 0, sumZ = 0;
    let sumR = 0, sumG = 0, sumB = 0;
    let hasColor = false;
    
    voxelPoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumZ += p.z;
      if (p.r !== null) {
        hasColor = true;
        sumR += p.r;
        sumG += p.g;
        sumB += p.b;
      }
    });
    
    const count = voxelPoints.length;
    result.push({
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count,
      r: hasColor ? Math.round(sumR / count) : null,
      g: hasColor ? Math.round(sumG / count) : null,
      b: hasColor ? Math.round(sumB / count) : null
    });
  });
  
  return result;
}

/**
 * Method 3: Every Nth Point
 * Keeps every Nth point from the original sequence
 */
export function everyNthPoint(points, targetPercentage) {
  if (targetPercentage >= 100) return [...points];
  
  const step = Math.max(1, Math.floor(100 / targetPercentage));
  const result = [];
  
  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }
  
  return result;
}

/**
 * Method 4: Distance-based Filtering
 * Keeps points that are at least a minimum distance apart
 */
export function distanceBasedFiltering(points, targetPercentage) {
  if (targetPercentage >= 100) return [...points];
  if (points.length === 0) return [];
  
  // Calculate average distance between points (sampling)
  let avgDistance = 0;
  const sampleSize = Math.min(1000, points.length);
  let sampleCount = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    const idx1 = Math.floor(Math.random() * points.length);
    const idx2 = Math.floor(Math.random() * points.length);
    if (idx1 !== idx2) {
      const p1 = points[idx1];
      const p2 = points[idx2];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      avgDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
      sampleCount++;
    }
  }
  
  if (sampleCount > 0) avgDistance /= sampleCount;
  
  // Calculate minimum distance based on target percentage
  const densityFactor = Math.sqrt(100 / targetPercentage);
  const minDistance = avgDistance * densityFactor * 0.5;
  
  const result = [];
  const kept = [];
  const targetCount = points.length * targetPercentage / 100;
  
  for (const p of points) {
    let farEnough = true;
    
    for (const kp of kept) {
      const dx = p.x - kp.x;
      const dy = p.y - kp.y;
      const dz = p.z - kp.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist < minDistance) {
        farEnough = false;
        break;
      }
    }
    
    if (farEnough) {
      result.push(p);
      kept.push(p);
      
      // Stop if we've reached approximately the target
      if (result.length >= targetCount) {
        break;
      }
    }
  }
  
  return result;
}

/**
 * Apply the selected reduction method
 */
export function reducePointCloud(points, method, targetPercentage) {
  switch (method) {
    case 'random':
      return randomSampling(points, targetPercentage);
    case 'voxel':
      return voxelDownsampling(points, targetPercentage);
    case 'nth':
      return everyNthPoint(points, targetPercentage);
    case 'distance':
      return distanceBasedFiltering(points, targetPercentage);
    default:
      return points;
  }
}

/**
 * Invert Z-values of all points
 */
export function invertZValues(points) {
  return points.map(p => ({
    x: p.x,
    y: p.y,
    z: -p.z,
    r: p.r,
    g: p.g,
    b: p.b
  }));
}

/**
 * Export points to XYZ format string
 */
export function exportToXYZ(points) {
  let output = '';
  points.forEach(p => {
    if (p.r !== null && p.g !== null && p.b !== null) {
      output += `${p.x} ${p.y} ${p.z} ${p.r} ${p.g} ${p.b}\n`;
    } else {
      output += `${p.x} ${p.y} ${p.z}\n`;
    }
  });
  return output;
}
