// preload.cjs
// Secure bridge between main and renderer processes

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Chunk file API
  chunkFile: (params) => {
    return new Promise((resolve, reject) => {
      // Set up one-time listeners for completion or error
      ipcRenderer.once('chunk:done', (event, metadata) => {
        resolve(metadata);
      });
      
      ipcRenderer.once('chunk:error', (event, error) => {
        reject(new Error(error.message));
      });
      
      // Invoke the chunking operation
      ipcRenderer.invoke('chunk:start', params).catch(reject);
    });
  },
  
  // Progress listener
  onChunkProgress: (callback) => {
    ipcRenderer.on('chunk:progress', (event, progressData) => {
      callback(progressData);
    });
  },
  
  // Remove progress listener
  removeChunkProgressListener: () => {
    ipcRenderer.removeAllListeners('chunk:progress');
  }
});
