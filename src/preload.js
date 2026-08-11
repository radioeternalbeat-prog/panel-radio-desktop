// ============================================================
// Preload Script — Bridge IPC entre Renderer y Main Process
// Expone APIs seguras al frontend vía contextBridge.
// ============================================================

const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");

contextBridge.exposeInMainWorld("electronAPI", {
  // === Información del sistema ===
  platform: process.platform,
  isElectron: true,

  // === Backend ===
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),
  onBackendPort: (cb) => {
    ipcRenderer.on("backend-port", (_, port) => cb(port));
  },

  // === Red / Conectividad ===
  getNetworkStatus: () => ipcRenderer.invoke("get-network-status"),
  onNetworkStatus: (cb) => {
    ipcRenderer.on("network-status", (_, status) => cb(status));
  },

  // === Sistema de archivos ===
  openFileDialog: (options) => ipcRenderer.invoke("dialog-open-file", options),
  openFolderDialog: (options) => ipcRenderer.invoke("dialog-open-folder", options),
  getFileMeta: (filePath) => ipcRenderer.invoke("file-get-meta", filePath),
  readFileBuffer: (filePath) => ipcRenderer.invoke("file-read-buffer", filePath),
  getDroppedFilePaths: (files) => ipcRenderer.invoke("file-dropped-paths", files),

  // === Tray / Controles ===
  trayAction: (action) => ipcRenderer.send("tray-action", action),
  onTrayAction: (cb) => {
    ipcRenderer.on("tray-action-triggered", (_, action) => cb(action));
  },

  // === Auto-updater ===
  checkForUpdates: () => ipcRenderer.invoke("updater-check"),
  onUpdateAvailable: (cb) => {
    ipcRenderer.on("update-available", (_, info) => cb(info));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.on("update-downloaded", (_, info) => cb(info));
  },
  installUpdate: () => ipcRenderer.send("updater-install"),

  // === Ventana ===
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  maximizeWindow: () => ipcRenderer.send("window-maximize"),
  closeWindow: () => ipcRenderer.send("window-close"),

  // === App info ===
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  // === FFmpeg ===
  getFFmpegPath: () => ipcRenderer.invoke("get-ffmpeg-path"),

  // === Utilidades ===
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  showItemInFolder: (filePath) => ipcRenderer.invoke("show-in-folder", filePath),
});
