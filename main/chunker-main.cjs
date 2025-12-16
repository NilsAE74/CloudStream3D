/**
 * chunker-main.js
 * Node.js module for chunking large XYZ files into smaller files
 * Runs in Electron main process
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Chunk a large XYZ file into smaller files
 * @param {string} inputPath - Full path to input .xyz file
 * @param {string} outDir - Output directory for chunks
 * @param {Object} options - Configuration options
 * @param {number} options.chunkSizeMB - Target chunk size in megabytes (default: 100)
 * @param {string} options.filenamePattern - Pattern for chunk filenames (default: "{base}_part_{index}.xyz")
 * @param {Function} progressCallback - Called with progress updates: { bytesRead, totalBytes, percent, currentPartIndex, currentPartPoints }
 * @returns {Promise<Object>} Metadata object with chunk information
 */
async function chunkFileNode(inputPath, outDir, options = {}, progressCallback = null) {
  // Validate input path
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  
  const stats = fs.statSync(inputPath);
  if (!stats.isFile()) {
    throw new Error(`Input path is not a file: ${inputPath}`);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Set defaults
  const chunkSizeMB = options.chunkSizeMB || 100;
  const chunkSizeBytes = chunkSizeMB * 1024 * 1024;
  const filenamePattern = options.filenamePattern || "{base}_part_{index}.xyz";
  
  const totalBytes = stats.size;
  const basename = path.basename(inputPath, path.extname(inputPath));
  
  // Metadata tracking
  const chunks = [];
  let currentChunkIndex = 0;
  let currentChunkLines = [];
  let currentChunkBytes = 0;
  let currentChunkPoints = 0;
  let totalPoints = 0;
  let bytesRead = 0;
  let currentWriteStream = null;
  
  // Progress reporting throttle
  let lastProgressReport = Date.now();
  const progressThrottleMs = 100; // Report progress at most every 100ms
  
  /**
   * Report progress if callback provided and throttle time has passed
   */
  function reportProgress(force = false) {
    if (!progressCallback) return;
    
    const now = Date.now();
    if (force || (now - lastProgressReport) >= progressThrottleMs) {
      const percent = totalBytes > 0 ? (bytesRead / totalBytes) * 100 : 0;
      progressCallback({
        bytesRead,
        totalBytes,
        percent: Math.min(percent, 100),
        currentPartIndex: currentChunkIndex,
        currentPartPoints: currentChunkPoints
      });
      lastProgressReport = now;
    }
  }
  
  /**
   * Write current chunk to file and reset accumulator
   */
  async function writeChunk() {
    if (currentChunkLines.length === 0) return;
    
    // Generate filename with zero-padded index
    const paddedIndex = String(currentChunkIndex).padStart(4, '0');
    const filename = filenamePattern
      .replace('{base}', basename)
      .replace('{index}', paddedIndex);
    
    const chunkPath = path.join(outDir, filename);
    
    // Write chunk
    const chunkContent = currentChunkLines.join('\n') + '\n';
    fs.writeFileSync(chunkPath, chunkContent, 'utf8');
    
    // Record chunk metadata
    chunks.push({
      filename,
      points: currentChunkPoints,
      bytes: currentChunkBytes
    });
    
    // Reset for next chunk
    currentChunkLines = [];
    currentChunkBytes = 0;
    currentChunkPoints = 0;
    currentChunkIndex++;
  }
  
  // Create readline interface for line-by-line processing
  const fileStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity // Handle both LF and CRLF
  });
  
  try {
    // Process file line by line
    for await (const line of rl) {
      const trimmed = line.trim();
      
      // Update bytes read (approximate, includes line breaks)
      const lineBytes = Buffer.byteLength(line + '\n', 'utf8');
      bytesRead += lineBytes;
      
      // Skip empty lines and comments
      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        reportProgress();
        continue;
      }
      
      // Check if this is a valid point line (at least 3 numbers)
      const parts = trimmed.split(/\s+/);
      const hasValidPoint = parts.length >= 3 && 
        !isNaN(parseFloat(parts[0])) && 
        !isNaN(parseFloat(parts[1])) && 
        !isNaN(parseFloat(parts[2]));
      
      if (!hasValidPoint) {
        reportProgress();
        continue;
      }
      
      // Add line to current chunk
      currentChunkLines.push(line);
      currentChunkBytes += lineBytes;
      currentChunkPoints++;
      totalPoints++;
      
      // Write chunk if size threshold exceeded
      if (currentChunkBytes >= chunkSizeBytes) {
        await writeChunk();
        reportProgress(true); // Force progress report after chunk write
      } else {
        reportProgress();
      }
    }
    
    // Write final chunk if any lines remain
    if (currentChunkLines.length > 0) {
      await writeChunk();
    }
    
    // Final progress report
    reportProgress(true);
    
    // Create metadata object
    const metadata = {
      original: basename,
      totalBytes,
      totalPoints,
      totalChunks: chunks.length,
      chunkSizeMB,
      chunks
    };
    
    // Write metadata to JSON file
    const metadataPath = path.join(outDir, 'chunks_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    
    return metadata;
    
  } catch (error) {
    // Clean up on error
    if (currentWriteStream) {
      currentWriteStream.end();
    }
    throw error;
  }
}

module.exports = { chunkFileNode };
