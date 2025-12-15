import fs from 'fs';
import { parseXYZ } from '../renderer/xyzParser.js';

const text = fs.readFileSync(new URL('../samples/sample.xyz', import.meta.url), 'utf8');
const points = parseXYZ(text);
console.log('Parsed points:', points.length);
console.log(points.slice(0, 6));
