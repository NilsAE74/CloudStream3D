export function parseXYZ(text) {
  const points = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const p = line.trim().split(/\s+/).map(Number);
    if (p.length >= 3) {
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
