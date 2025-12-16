# CloudStream3D

CloudStream3D is a desktop application for viewing large XYZ point clouds using GPU-accelerated rendering.

## Features
- XYZ file loading
- RGB support
- 3D navigation (orbit, pan, zoom)
- **File Chunking** - Split large XYZ files into smaller chunks for easier processing
- Electron-based Windows application
- Builds to standalone `.exe`

## Tech Stack
- Electron
- Three.js
- Node.js

## Development

```bash
npm install
npm start
```

## File Chunking Feature

The file chunking feature allows you to split large XYZ point cloud files into smaller, more manageable chunks without splitting individual point lines.

### How to Use

1. **Launch the application** using `npm start`
2. **Load a file** using the file input at the top of the UI
3. **Configure chunk size** (default: 100 MB) in the "File Chunking" section
4. **Click "Split Large File"** to start the chunking process
5. **Monitor progress** via the progress bar and status text
6. **Find your chunks** in a new `chunks_output` folder next to your original file

### Features

- **Line-preserving**: Each point (line) stays intact - no line splitting
- **Progress tracking**: Real-time progress updates showing bytes processed and current chunk
- **Metadata generation**: Creates a `chunks_metadata.json` file with information about all chunks
- **Configurable size**: Set chunk size in MB (1-1000 MB)
- **Memory efficient**: Uses streaming I/O to handle files of any size

### Output Structure

After chunking, you'll find:
- `originalname_part_0000.xyz` - First chunk
- `originalname_part_0001.xyz` - Second chunk
- ... (additional chunks as needed)
- `chunks_metadata.json` - Metadata file with chunk details

### Metadata Format

The `chunks_metadata.json` file contains:
```json
{
  "original": "filename",
  "totalBytes": 123456789,
  "totalPoints": 1000000,
  "totalChunks": 5,
  "chunkSizeMB": 100,
  "chunks": [
    {
      "filename": "filename_part_0000.xyz",
      "points": 200000,
      "bytes": 20971520
    }
  ]
}
```

### Testing

A test file is included at `samples/test_chunking.xyz` with 200 points for manual verification.

**Test steps:**
1. Load `samples/test_chunking.xyz` in the app
2. Set chunk size to a very small value (e.g., 0.001 MB) to force multiple chunks
3. Click "Split Large File"
4. Verify that chunks are created in `samples/chunks_output/`
5. Check that the sum of points in all chunks equals the original point count
6. Verify no lines are split by opening chunks in a text editor
