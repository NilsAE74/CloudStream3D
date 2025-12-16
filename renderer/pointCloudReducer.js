/**
 * Point Cloud Reduction Module
 * Provides methods for reducing point cloud density
 */

/**
 * Identify boundary/outer points using a 2D convex hull on the horizontal plane (x, y).
 * Z-coordinate is ignored to find points furthest out in horizontal direction.
 * Returns indices of points that lie on the 2D convex hull boundary.
 */
export function identifyBoundaryPoints(points) {
  if (points.length === 0) return new Set();
  // For less than 3 points, all points are on the boundary (degenerate case)
  if (points.length < 3) return new Set(points.map((_, idx) => idx));

  // Create array of {x, y, index} for 2D convex hull computation
  const points2D = points.map((p, idx) => ({ x: p.x, y: p.y, index: idx }));

  // Compute 2D convex hull using Andrew's monotone chain algorithm
  const hull2D = convexHull2D(points2D);

  // Convert hull point indices to a Set
  const boundaryIndices = new Set(hull2D.map(p => p.index));

  return boundaryIndices;
}

/**
 * Compute 2D convex hull using Andrew's monotone chain algorithm.
 * Returns array of points that form the convex hull in counter-clockwise order.
 * @param {Array} points - Array of {x, y, index} objects
 * @returns {Array} - Array of points on the convex hull
 */
function convexHull2D(points) {
  if (points.length < 3) return points;

  // Sort points lexicographically (first by x, then by y)
  const sorted = [...points].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  // Cross product of vectors OA and OB where O is the origin point
  // Returns: positive for counter-clockwise turn, negative for clockwise, zero for collinear
  const cross = (o, a, b) => {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  };

  // Build lower hull
  const lower = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  // Build upper hull
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  // Concatenate lower and upper hull
  return lower.concat(upper);
}

/**
 * Method 1: Grid-based Voxel Downsampling
 * Divides space into voxels and keeps one point per voxel (the centroid)
 * Always preserves boundary points (if provided)
 */
export function voxelDownsampling(points, targetPercentage, boundaryIndices = null) {
  if (targetPercentage >= 100) return [...points];
  if (points.length === 0) return [];
  
  // Use provided boundary indices or empty set
  if (!boundaryIndices) {
    boundaryIndices = new Set();
  }
  const boundaryPoints = Array.from(boundaryIndices).map(idx => points[idx]);
  
  // Separate boundary points from interior points
  const interiorPoints = [];
  const interiorIndices = [];
  
  points.forEach((p, idx) => {
    if (!boundaryIndices.has(idx)) {
      interiorPoints.push(p);
      interiorIndices.push(idx);
    }
  });
  
  // If all points are boundary points, return them all
  if (interiorPoints.length === 0) return [...points];
  
  // Calculate target count for interior points (accounting for boundary points)
  const totalTarget = Math.max(1, Math.floor(points.length * targetPercentage / 100));
  const interiorTarget = Math.max(1, totalTarget - boundaryPoints.length);
  
  // If boundary points already meet or exceed target, return just them
  if (boundaryPoints.length >= totalTarget) {
    return boundaryPoints;
  }
  
  // Calculate bounds for voxel grid
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  interiorPoints.forEach(p => {
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
  
  // Calculate voxel size based on target percentage for interior points
  const targetCount = interiorTarget;
  
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
  
  // Group interior points into voxels
  const voxelMap = new Map();
  
  interiorPoints.forEach(p => {
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
  
  // Combine boundary points with downsampled interior points
  return [...boundaryPoints, ...interiorResult];
}

/**
 * Method 2: Z-Gradient Based Downsampling
 * Keeps more points in areas with high Z-variation (slopes, edges)
 * and fewer points in flat areas (low delta Z)
 * Always preserves boundary points (if provided)
 */
export function zGradientDownsampling(points, targetPercentage, boundaryIndices = null) {
  if (targetPercentage >= 100) return [...points];
  if (points.length === 0) return [];
  
  // Use provided boundary indices or empty set
  if (!boundaryIndices) {
    boundaryIndices = new Set();
  }
  const boundaryPoints = Array.from(boundaryIndices).map(idx => points[idx]);
  
  // Separate interior points
  const interiorPoints = [];
  const interiorIndices = [];
  
  points.forEach((p, idx) => {
    if (!boundaryIndices.has(idx)) {
      interiorPoints.push({ point: p, idx });
    }
  });
  
  // If all points are boundary points, return them all
  if (interiorPoints.length === 0) return [...points];
  
  // Calculate target count for interior points
  const totalTarget = Math.max(1, Math.floor(points.length * targetPercentage / 100));
  const interiorTarget = Math.max(1, totalTarget - boundaryPoints.length);
  
  // If boundary points already meet or exceed target, return just them
  if (boundaryPoints.length >= totalTarget) {
    return boundaryPoints;
  }
  
  // Calculate Z-gradient importance for interior points only
  const pointsWithGradient = interiorPoints.map(({ point: p, idx }) => {
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
  
  // Take top interiorTarget points
  const interiorResult = pointsWithGradient.slice(0, interiorTarget).map(item => item.point);
  
  // Combine boundary points with downsampled interior points
  return [...boundaryPoints, ...interiorResult];
}

/**
 * Apply the selected reduction method
 */
export function reducePointCloud(points, method, targetPercentage, boundaryIndices = null) {
  switch (method) {
    case 'voxel':
      return voxelDownsampling(points, targetPercentage, boundaryIndices);
    case 'zgradient':
      return zGradientDownsampling(points, targetPercentage, boundaryIndices);
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
