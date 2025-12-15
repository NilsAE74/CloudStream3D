#!/usr/bin/env node

/**
 * Standalone script to identify boundary points in a point cloud
 * 
 * This script demonstrates the boundary point detection feature:
 * 1. Identifies all edge points (randpunkter) using convex hull
 * 2. Stores them in a separate array
 * 3. Can export them with red color marking
 * 
 * Usage:
 *   node scripts/identify_boundary_points.mjs <input.xyz> [output.xyz]
 * 
 * If output file is specified, boundary points will be marked in red
 * and interior points in white.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseXYZ } from '../renderer/xyzParser.js';
import { identifyBoundaryPoints } from '../renderer/pointCloudReducer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printUsage() {
  const scriptName = path.basename(__filename);
  console.log(`Usage: node ${scriptName} <input.xyz> [output.xyz]`);
  console.log('');
  console.log('Arguments:');
  console.log('  input.xyz   - Input XYZ point cloud file');
  console.log('  output.xyz  - (Optional) Output file with boundary points marked in red');
  console.log('');
  console.log('Example:');
  console.log(`  node scripts/${scriptName} samples/sample.xyz`);
  console.log(`  node scripts/${scriptName} samples/sample.xyz output_marked.xyz`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    printUsage();
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file '${inputFile}' not found`);
    process.exit(1);
  }
  
  console.log('=== Boundary Point Detection ===');
  console.log(`Input file: ${inputFile}`);
  console.log('');
  
  // Read and parse the XYZ file
  console.log('Reading file...');
  const fileContent = fs.readFileSync(inputFile, 'utf8');
  
  console.log('Parsing points...');
  const points = parseXYZ(fileContent);
  console.log(`Parsed ${points.length} points`);
  
  if (points.length === 0) {
    console.error('Error: No points found in input file');
    process.exit(1);
  }
  
  // Identify boundary points
  console.log('');
  console.log('Identifying boundary points...');
  const boundaryIndices = identifyBoundaryPoints(points);
  
  // Store boundary points in separate array (as per requirement)
  const boundaryPointsArray = Array.from(boundaryIndices).map(idx => points[idx]);
  
  console.log('');
  console.log('=== Results ===');
  console.log(`Total points:     ${points.length}`);
  console.log(`Boundary points:  ${boundaryIndices.size} (${(boundaryIndices.size / points.length * 100).toFixed(1)}%)`);
  console.log(`Interior points:  ${points.length - boundaryIndices.size} (${((points.length - boundaryIndices.size) / points.length * 100).toFixed(1)}%)`);
  
  // Show some examples
  console.log('');
  console.log('Sample boundary points (first 5):');
  boundaryPointsArray.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, z=${p.z.toFixed(2)}`);
  });
  
  // Export to file if requested
  if (outputFile) {
    console.log('');
    console.log(`Exporting to ${outputFile}...`);
    
    let output = '# Boundary points marked in RED, interior points in WHITE\n';
    
    points.forEach((p, idx) => {
      const isBoundary = boundaryIndices.has(idx);
      const r = isBoundary ? 255 : 255;
      const g = isBoundary ? 0 : 255;
      const b = isBoundary ? 0 : 255;
      
      output += `${p.x} ${p.y} ${p.z} ${r} ${g} ${b}\n`;
    });
    
    fs.writeFileSync(outputFile, output, 'utf8');
    console.log(`✓ Exported ${points.length} points to ${outputFile}`);
    console.log(`  - ${boundaryIndices.size} boundary points in RED`);
    console.log(`  - ${points.length - boundaryIndices.size} interior points in WHITE`);
  }
  
  console.log('');
  console.log('✓ Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
