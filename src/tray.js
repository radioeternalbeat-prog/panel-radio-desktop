// ============================================================
// Tray Icon — Controles mínimos en la bandeja del sistema.
// Play / Pause / Stop / Mute + Mostrar/Ocultar ventana + Salir
// ============================================================

const { Tray, Menu, nativeImage, app } = require("electron");
const path = require("path");
const log = require("electron-log");

let tray = null;
let mainWindowRef = null;

// Estado de reproducción (sincronizado con el renderer vía IPC)
let estado = {
  reproduciendo: false,
  muted: false,
  enVivo: false,
};

function getIconPath() {
  const iconName = process.platform === "win32" ? "tray-icon.ico" : "tray-icon.png";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "build", iconName);
  }
  return path.join(__dirname, "../build", iconName);
}

function construirMenu() {
  return Menu.buildFromTemplate([
    {
      label: estado.enVivo ? "AL AIRE" : "Panel Radio Online",
      enabled: false,
      icon: estado.enVivo ? undefined : undefined,
    },
    { type: "separator" },
    {
      label: estado.reproduciendo ? "Pausar" : "Reproducir",
      click: () => enviarAccion(estado.reproduciendo ? "pause" : "play"),
    },
    {
      label: "Detener",
      click: () => enviarAccion("stop"),
    },
    {
      label: estado.muted ? "Activar sonido" : "Silenciar",
      click: () => enviarAccion("mute-toggle"),
    },
    { type: "separator" },
    {
      label: "Mostrar Panel",
      click: () => {
        if (mainWindowRef) {
          mainWindowRef.show();
          mainWindowRef.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Salir",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function enviarAccion(action) {
  if (mainWindowRef && mainWindowRef.webContents) {
    mainWindowRef.webContents.send("tray-action-triggered", action);
  }
}

/**
 * Crea el tray icon.
 * @param {BrowserWindow} mainWindow
 */
function crearTray(mainWindow) {
  mainWindowRef = mainWindow;

  try {
    const iconPath = getIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

    tray.setToolTip("Panel Radio Online");
    tray.setContextMenu(construirMenu());

    // Click en tray: mostrar/ocultar ventana
    tray.on("click", () => {
      if (mainWindowRef) {
        if (mainWindowRef.isVisible()) {
          mainWindowRef.hide();
        } else {
          mainWindowRef.show();
          mainWindowRef.focus();
        }
      }
    });

    log.info("Tray icon creado");
  } catch (err) {
    log.warn("No se pudo crear tray icon:", err.message);
  }
}

/**
 * Actualiza el estado del tray (llamado desde IPC).
 */
function actualizarEstadoTray(nuevoEstado) {
  estado = { ...estado, ...nuevoEstado };
  if (tray) {
    tray.setContextMenu(construirMenu());
    tray.setToolTip(
      estado.enVivo
        ? "Panel Radio Online — AL AIRE"
        : estado.reproduciendo
          ? "Panel Radio Online — Reproduciendo"
          : "Panel Radio Online"
    );
  }
}

/**
 * Destruye el tray icon.
 */
function destruirTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { crearTray, destruirTray, actualizarEstadoTray };
