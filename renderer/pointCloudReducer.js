/**
 * Point Cloud Reduction Module
 * Provides methods for reducing point cloud density
 */

/**
 * Method 1: Grid-based Voxel Downsampling
 * Divides space into voxels and keeps one point per voxel (the centroid)
 */
export function voxelDownsampling(points, targetPercentage) {
  if (targetPercentage >= 100) return [...points];
  if (points.length === 0) return [];
  
  const targetCount = Math.max(1, Math.floor(points.length * targetPercentage / 100));
  
  // Calculate bounds for voxel grid
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
  
  // Estimate the volume and compute voxel grid dimensions
  const volume = sizeX * sizeY * sizeZ;
  if (volume === 0) return points.slice(0, targetCount);
  
  // Use a smoother approach for voxel size calculation
  // At 100%, we want very small voxels (almost no reduction)
  // At lower percentages, voxels get larger
  
  // Calculate reduction factor (inverted: 1.0 at 100%, increases as percentage decreases)
  const reductionFactor = 100.0 / Math.max(targetPercentage, 1);
  
  // Use cube root for 3D scaling, but apply a dampening factor for smoothness
  // Add a small offset to make the transition more gradual
  const scaleFactor = Math.pow(reductionFactor, 1.5); // Using 1.5 instead of 1/3 for smoother transitions
  
  // Estimate average point spacing
  const avgSpacing = Math.pow(volume / points.length, 1/3);
  
  // Voxel size is based on average spacing multiplied by scale factor
  // Use a minimum multiplier to avoid too-small voxels at high percentages
  const voxelSize = avgSpacing * Math.max(scaleFactor - 0.98, 0.001);
  
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
  const interiorResult = [];
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
    interiorResult.push({
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count,
      r: hasColor ? Math.round(sumR / count) : null,
      g: hasColor ? Math.round(sumG / count) : null,
      b: hasColor ? Math.round(sumB / count) : null
    });
  });
  
  // Return downsampled interior points
  return interiorResult;
}

/**
 * Method 2: Z-Gradient Based Downsampling
 * Keeps more points in areas with high Z-variation (slopes, edges)
 */
export function zGradientDownsampling(points, targetPercentage) {
  if (targetPercentage >= 100) return [...points];
  if (points.length === 0) return [];
  
  const targetCount = Math.max(1, Math.floor(points.length * targetPercentage / 100));
  
  // Calculate Z-gradient importance for all points
  const pointsWithGradient = points.map((p, idx) => {
    // Sample nearby points to estimate local Z-gradient
    let maxZDiff = 0;
    const sampleSize = Math.min(10, points.length - 1);
    
    for (let i = 0; i < sampleSize; i++) {
      const neighborIdx = Math.floor(Math.random() * points.length);
      if (neighborIdx !== idx) {
        const neighbor = points[neighborIdx];
        const dx = p.x - neighbor.x;
        const dy = p.y - neighbor.y;
        const dz = Math.abs(p.z - neighbor.z);
        const xyDist = Math.sqrt(dx * dx + dy * dy);
        
        // Only consider nearby points (within reasonable XY distance)
        if (xyDist > 0 && xyDist < 10) {
          const gradient = dz / xyDist; // Z change per unit XY distance
          maxZDiff = Math.max(maxZDiff, gradient);
        }
      }
    }
    
    return {
      point: p,
      gradient: maxZDiff,
      random: Math.random() // Add randomness for tie-breaking
    };
  });
  
  // Sort by gradient (descending) - keep high-gradient points
  pointsWithGradient.sort((a, b) => {
    const gradientDiff = b.gradient - a.gradient;
    if (Math.abs(gradientDiff) < 0.001) {
      return b.random - a.random; // Use random for similar gradients
    }
    return gradientDiff;
  });
  
  // Take top targetCount points
  return pointsWithGradient.slice(0, targetCount).map(item => item.point);
}

/**
 * Apply the selected reduction method
 */
export function reducePointCloud(points, method, targetPercentage) {
  switch (method) {
    case 'voxel':
      return voxelDownsampling(points, targetPercentage);
    case 'zgradient':
      return zGradientDownsampling(points, targetPercentage);
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
export function exportToXYZ(points, decimalPlaces = 6) {
  let output = '';
  points.forEach(p => {
    const x = p.x.toFixed(decimalPlaces);
    const y = p.y.toFixed(decimalPlaces);
    const z = p.z.toFixed(decimalPlaces);
    if (p.r !== null && p.g !== null && p.b !== null) {
      output += `${x} ${y} ${z} ${p.r} ${p.g} ${p.b}\n`;
    } else {
      output += `${x} ${y} ${z}\n`;
    }
  });
  return output;
}
