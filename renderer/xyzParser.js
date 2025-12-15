/**
 * Parse XYZ point cloud file
 * Optimized for handling large files (10M+ points)
 */
export function parseXYZ(text) {
  const points = [];
  
  // For very large files, use a more memory-efficient approach
  // Split by newlines without creating intermediate array for all lines
  let currentLine = '';
  const textLength = text.length;
  
  for (let i = 0; i < textLength; i++) {
    const char = text[i];
    
    if (char === '\n' || char === '\r') {
      if (currentLine.trim().length > 0) {
        const p = currentLine.trim().split(/\s+/).map(Number);
        // require at least 3 finite numbers (skip comments/invalid lines)
        if (p.length >= 3 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])) {
          points.push({
            x: p[0],
            y: p[1],
            z: p[2],
            r: p[3] ?? null,
            g: p[4] ?? null,
            b: p[5] ?? null
          });
        }
      }
      currentLine = '';
      
      // Skip \r\n combinations
      if (char === '\r' && i + 1 < textLength && text[i + 1] === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  
  // Handle last line if no trailing newline
  if (currentLine.trim().length > 0) {
    const p = currentLine.trim().split(/\s+/).map(Number);
    if (p.length >= 3 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])) {
      points.push({
        x: p[0],
        y: p[1],
        z: p[2],
        r: p[3] ?? null,
        g: p[4] ?? null,
        b: p[5] ?? null
      });
    }
  }
  
  return points;
}
