const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const { chunkFileNode } = require("./main/chunker-main.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  const menuTemplate = [
    { label: "File", submenu: [{ role: "quit" }] },
    { label: "View", submenu: [
      { role: "reload" },
      { role: "toggledevtools" },
      { role: "resetzoom" },
      { role: "togglefullscreen" }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC handler for file chunking
ipcMain.handle("chunk:start", async (event, payload) => {
  const { inputPath, outDir, chunkSizeMB } = payload;
  
  try {
    // Progress callback to send updates to renderer
    const progressCallback = (progressData) => {
      event.sender.send("chunk:progress", progressData);
    };
    
    // Execute chunking operation
    const metadata = await chunkFileNode(
      inputPath,
      outDir,
      { chunkSizeMB },
      progressCallback
    );
    
    // Send completion event
    event.sender.send("chunk:done", metadata);
    
    return { success: true, metadata };
  } catch (error) {
    // Send error event
    event.sender.send("chunk:error", { message: error.message });
    throw error;
  }
});
