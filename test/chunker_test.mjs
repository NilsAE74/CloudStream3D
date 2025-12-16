/**
 * Test the chunker module
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the chunker (CommonJS module)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chunkFileNode } = require('../main/chunker-main.cjs');

const TEST_FILE = join(__dirname, '../samples/test_chunking.xyz');
const OUTPUT_DIR = join(__dirname, '../samples/test_output');

// Clean up output directory if it exists
if (existsSync(OUTPUT_DIR)) {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

console.log('Testing chunker module...');
console.log(`Input file: ${TEST_FILE}`);
console.log(`Output dir: ${OUTPUT_DIR}`);
console.log('');

// Test with very small chunk size to force multiple chunks
const chunkSizeMB = 0.001; // Very small to create multiple chunks

let progressUpdates = 0;
const progressCallback = (progress) => {
  progressUpdates++;
  if (progressUpdates % 10 === 0) {
    console.log(`Progress: ${progress.percent.toFixed(1)}% - Part ${progress.currentPartIndex}, Points: ${progress.currentPartPoints}`);
  }
};

try {
  const metadata = await chunkFileNode(
    TEST_FILE,
    OUTPUT_DIR,
    { chunkSizeMB },
    progressCallback
  );
  
  console.log('\nChunking completed!');
  console.log(`Total chunks: ${metadata.totalChunks}`);
  console.log(`Total points: ${metadata.totalPoints}`);
  console.log(`Total bytes: ${metadata.totalBytes}`);
  
  // Verify metadata
  console.log('\nChunk details:');
  let totalPoints = 0;
  for (const chunk of metadata.chunks) {
    console.log(`  ${chunk.filename}: ${chunk.points} points, ${chunk.bytes} bytes`);
    totalPoints += chunk.points;
  }
  
  console.log(`\nSum of chunk points: ${totalPoints}`);
  console.log(`Metadata total points: ${metadata.totalPoints}`);
  
  if (totalPoints === metadata.totalPoints) {
    console.log('✓ Point count matches!');
  } else {
    console.log('✗ Point count mismatch!');
    process.exit(1);
  }
  
  // Verify that chunks actually exist
  for (const chunk of metadata.chunks) {
    const chunkPath = join(OUTPUT_DIR, chunk.filename);
    if (!existsSync(chunkPath)) {
      console.log(`✗ Chunk file missing: ${chunk.filename}`);
      process.exit(1);
    }
  }
  console.log('✓ All chunk files exist!');
  
  // Verify metadata file exists
  const metadataPath = join(OUTPUT_DIR, 'chunks_metadata.json');
  if (!existsSync(metadataPath)) {
    console.log('✗ Metadata file missing!');
    process.exit(1);
  }
  console.log('✓ Metadata file exists!');
  
  // Read and verify first chunk has valid XYZ data
  const firstChunk = readFileSync(join(OUTPUT_DIR, metadata.chunks[0].filename), 'utf8');
  const firstLines = firstChunk.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
  console.log(`\nFirst chunk has ${firstLines.length} valid lines`);
  console.log(`First line: ${firstLines[0]}`);
  
  // Verify no line is split (each line should have at least 3 numbers)
  let validLines = 0;
  for (const line of firstLines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3 && !isNaN(parseFloat(parts[0]))) {
      validLines++;
    }
  }
  console.log(`Valid XYZ lines in first chunk: ${validLines}`);
  
  if (validLines === firstLines.length) {
    console.log('✓ All lines in first chunk are valid XYZ points!');
  } else {
    console.log('✗ Some lines in first chunk are invalid!');
    process.exit(1);
  }
  
  console.log('\n✓ All tests passed!');
  
} catch (error) {
  console.error('Error during chunking:', error);
  process.exit(1);
}
