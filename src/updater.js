// ============================================================
// Auto-Updater — Actualizaciones automáticas vía GitHub Releases.
// Usa electron-updater para descargar e instalar actualizaciones.
// ============================================================

const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindowRef = null;

/**
 * Configura el auto-updater.
 * @param {BrowserWindow} mainWindow
 */
function configurarAutoUpdater(mainWindow) {
  mainWindowRef = mainWindow;

  // Configuración
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Eventos
  autoUpdater.on("checking-for-update", () => {
    log.info("[Updater] Buscando actualizaciones...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info(`[Updater] Actualización disponible: v${info.version}`);
    enviarAlRenderer("update-available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("[Updater] No hay actualizaciones disponibles");
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(`[Updater] Descargando: ${Math.round(progress.percent)}%`);
    enviarAlRenderer("update-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      speed: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info(`[Updater] Actualización descargada: v${info.version}`);
    enviarAlRenderer("update-downloaded", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("error", (err) => {
    log.error("[Updater] Error:", err.message);
  });

  // Verificar actualizaciones al iniciar (después de 10s)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn("[Updater] No se pudo verificar actualizaciones:", err.message);
    });
  }, 10000);

  // Verificar cada 4 horas
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

/**
 * Fuerza la instalación de la actualización descargada.
 */
function instalarActualizacion() {
  autoUpdater.quitAndInstall(false, true);
}

/**
 * Verifica manualmente si hay actualizaciones.
 */
async function verificarActualizaciones() {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

function enviarAlRenderer(channel, data) {
  if (mainWindowRef && mainWindowRef.webContents) {
    mainWindowRef.webContents.send(channel, data);
  }
}

module.exports = { configurarAutoUpdater, instalarActualizacion, verificarActualizaciones };
