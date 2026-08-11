// ============================================================
// IPC Handlers — Maneja la comunicación Renderer ↔ Main Process.
// Incluye: archivos, diálogos, red, tray, updater, ventana.
// ============================================================

const { ipcMain, dialog, shell, app } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

const { obtenerEstadoRed, verificarConexion } = require("../network");
const { actualizarEstadoTray } = require("../tray");
const { verificarActualizaciones, instalarActualizacion } = require("../updater");
const { obtenerFFmpegPath } = require("../backend/server");

let mainWindowRef = null;
let backendPort = null;

/**
 * Registra todos los IPC handlers.
 * @param {BrowserWindow} mainWindow
 */
function registrarIPCHandlers(mainWindow) {
  mainWindowRef = mainWindow;

  // === Backend ===
  ipcMain.handle("get-backend-port", () => backendPort);

  // === Red ===
  ipcMain.handle("get-network-status", () => obtenerEstadoRed());

  // === Archivos: Abrir diálogo de archivo ===
  ipcMain.handle("dialog-open-file", async (_, options = {}) => {
    const result = await dialog.showOpenDialog(mainWindowRef, {
      title: options.title || "Seleccionar archivos",
      filters: options.filters || [
        { name: "Audio", extensions: ["mp3", "ogg", "flac", "wav", "aac", "m4a", "wma"] },
        { name: "Todos", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
      defaultPath: options.defaultPath || app.getPath("music"),
    });
    return result;
  });


  // === Archivos: Abrir diálogo de carpeta ===
  ipcMain.handle("dialog-open-folder", async (_, options = {}) => {
    const result = await dialog.showOpenDialog(mainWindowRef, {
      title: options.title || "Seleccionar carpeta",
      properties: ["openDirectory"],
      defaultPath: options.defaultPath || app.getPath("music"),
    });
    return result;
  });

  // === Archivos: Obtener metadata de un archivo ===
  ipcMain.handle("file-get-meta", async (_, filePath) => {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return {
        path: filePath,
        name: path.basename(filePath),
        ext,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        isAudio: [".mp3", ".ogg", ".flac", ".wav", ".aac", ".m4a"].includes(ext),
      };
    } catch (err) {
      return { error: err.message };
    }
  });

  // === Archivos: Leer buffer de archivo ===
  ipcMain.handle("file-read-buffer", async (_, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return buffer;
    } catch (err) {
      return { error: err.message };
    }
  });

  // === Archivos: Paths de archivos dropeados ===
  ipcMain.handle("file-dropped-paths", async (_, files) => {
    // files viene del renderer como array de {path, name, type}
    return files.map((f) => ({
      path: f.path,
      name: f.name || path.basename(f.path),
      ext: path.extname(f.path).toLowerCase(),
      size: fs.existsSync(f.path) ? fs.statSync(f.path).size : 0,
    }));
  });


  // === Tray: recibir acciones del renderer ===
  ipcMain.on("tray-action", (_, action) => {
    log.debug(`[IPC] Tray action: ${action}`);
    // Actualizar estado del tray basado en la acción
    if (action === "playing") actualizarEstadoTray({ reproduciendo: true });
    if (action === "paused" || action === "stopped") actualizarEstadoTray({ reproduciendo: false });
    if (action === "muted") actualizarEstadoTray({ muted: true });
    if (action === "unmuted") actualizarEstadoTray({ muted: false });
    if (action === "on-air") actualizarEstadoTray({ enVivo: true });
    if (action === "off-air") actualizarEstadoTray({ enVivo: false });
  });

  // === Auto-updater ===
  ipcMain.handle("updater-check", async () => {
    return await verificarActualizaciones();
  });
  ipcMain.on("updater-install", () => {
    instalarActualizacion();
  });

  // === Ventana ===
  ipcMain.on("window-minimize", () => mainWindowRef?.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindowRef?.isMaximized()) {
      mainWindowRef.unmaximize();
    } else {
      mainWindowRef?.maximize();
    }
  });
  ipcMain.on("window-close", () => mainWindowRef?.close());

  // === App info ===
  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-app-path", () => app.getPath("userData"));
  ipcMain.handle("get-ffmpeg-path", () => obtenerFFmpegPath());

  // === Utilidades ===
  ipcMain.handle("open-external", async (_, url) => {
    await shell.openExternal(url);
  });
  ipcMain.handle("show-in-folder", async (_, filePath) => {
    shell.showItemInFolder(filePath);
  });
}

/**
 * Establece el puerto del backend (llamado desde main.js).
 */
function setBackendPort(port) {
  backendPort = port;
}

module.exports = { registrarIPCHandlers, setBackendPort };
