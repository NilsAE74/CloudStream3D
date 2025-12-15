export function parseXYZ(text) {
  const points = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const p = line.trim().split(/\s+/).map(Number);
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
  return points;
}
