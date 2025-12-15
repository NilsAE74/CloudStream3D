const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  // Opprett hovedvindu
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      // preload script (kan brukes til secure context bridge)
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Last inn HTML-frontenden
  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Legg til standard meny (File, View)
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggledevtools" },
        { role: "resetzoom" },
        { role: "togglefullscreen" }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Vent til app er klar
app.whenReady().then(() => {
  createWindow();

  // På macOS, åpne nytt vindu om ingen vinduer er åpne
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Lukk app på alle plattformer unntatt macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
